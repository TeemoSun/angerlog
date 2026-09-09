package v1

import (
	"context"
	"net"
	"net/http"
	"strings"

	"angerlog/internal/config"
	"angerlog/internal/models"
	"angerlog/internal/security"
	"angerlog/internal/service"
)

type contextKey string

const (
	userContextKey  contextKey = "current_user"
	tokenContextKey contextKey = "access_token"
)

func SetUserContext(ctx context.Context, user *models.User) context.Context {
	return context.WithValue(ctx, userContextKey, user)
}

func GetUserFromContext(ctx context.Context) *models.User {
	if u, ok := ctx.Value(userContextKey).(*models.User); ok {
		return u
	}
	return nil
}

func SetTokenContext(ctx context.Context, token string) context.Context {
	return context.WithValue(ctx, tokenContextKey, token)
}

func GetTokenFromContext(ctx context.Context) string {
	if t, ok := ctx.Value(tokenContextKey).(string); ok {
		return t
	}
	return ""
}

func ClientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		if len(parts) > 0 {
			ip := strings.TrimSpace(parts[0])
			if ip != "" {
				return ip
			}
		}
	}
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return strings.TrimSpace(xri)
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil {
		return host
	}
	return r.RemoteAddr
}

type MiddlewareManager struct {
	authService *service.AuthService
	cfg         *config.Config
}

func NewMiddlewareManager(authService *service.AuthService, cfg *config.Config) *MiddlewareManager {
	return &MiddlewareManager{
		authService: authService,
		cfg:         cfg,
	}
}

func (m *MiddlewareManager) RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(service.AccessCookie)
		if err != nil || cookie.Value == "" {
			models.WriteError(w, models.ErrAccessExpired)
			return
		}

		userID, err := security.DecodeAccessToken(cookie.Value, m.cfg.SecretKey)
		if err != nil {
			models.WriteError(w, models.ErrAccessExpired)
			return
		}

		user, appErr := m.authService.GetUserByID(r.Context(), userID)
		if appErr != nil || user == nil {
			models.WriteError(w, models.ErrAccessExpired)
			return
		}

		ctx := SetUserContext(r.Context(), user)
		ctx = SetTokenContext(ctx, cookie.Value)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (m *MiddlewareManager) RequireCSRF(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := GetTokenFromContext(r.Context())
		if token == "" {
			models.WriteError(w, models.ErrAccessExpired)
			return
		}

		csrfHeader := r.Header.Get("X-CSRF-Token")
		if !security.VerifyCSRFToken(token, csrfHeader, m.cfg.CSRFSecret) {
			models.WriteError(w, models.ErrCSRF)
			return
		}

		next.ServeHTTP(w, r)
	})
}

