package v1

import (
	"encoding/json"
	"net/http"

	"angerlog/internal/config"
	"angerlog/internal/models"
	"angerlog/internal/security"
	"angerlog/internal/service"
)

type AuthHandler struct {
	authService *service.AuthService
	limiter     *security.LoginRateLimiter
	cfg         *config.Config
}

func NewAuthHandler(authService *service.AuthService, limiter *security.LoginRateLimiter, cfg *config.Config) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		limiter:     limiter,
		cfg:         cfg,
	}
}

func (h *AuthHandler) setAuthCookies(w http.ResponseWriter, accessToken, refreshToken string) {
	http.SetCookie(w, &http.Cookie{
		Name:     service.AccessCookie,
		Value:    accessToken,
		Path:     "/",
		MaxAge:   h.cfg.AccessTokenExpireMinutes * 60,
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     service.RefreshCookie,
		Value:    refreshToken,
		Path:     "/",
		MaxAge:   h.cfg.RefreshTokenExpireDays * 86400,
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
	})
}

func (h *AuthHandler) clearAuthCookies(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     service.AccessCookie,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     service.RefreshCookie,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	ip := ClientIP(r)
	if !h.limiter.Check(ip) {
		models.WriteError(w, models.ErrRateLimit)
		return
	}

	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		models.WriteError(w, models.ErrParam)
		return
	}

	user, appErr := h.authService.Authenticate(r.Context(), req.Username, req.Password)
	if appErr != nil {
		models.WriteError(w, appErr)
		return
	}

	// Login succeeded: reset rate limit attempts for this IP
	h.limiter.Reset(ip)

	accessToken, err := security.CreateAccessToken(user.ID, h.cfg.SecretKey, h.cfg.AccessTokenExpireMinutes)
	if err != nil {
		models.WriteError(w, models.ErrInternal)
		return
	}

	refreshToken, appErr := h.authService.IssueRefreshToken(r.Context(), user.ID)
	if appErr != nil {
		models.WriteError(w, appErr)
		return
	}

	h.setAuthCookies(w, accessToken, refreshToken)
	csrfToken := security.IssueCSRFToken(accessToken, h.cfg.CSRFSecret)

	models.WriteOK(w, models.LoginResponse{
		CSRFToken:   csrfToken,
		Username:    user.Username,
		Timezone:    user.Timezone,
		BottleStyle: user.BottleStyle,
	}, nil)
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(service.RefreshCookie)
	if err != nil || cookie.Value == "" {
		models.WriteError(w, models.ErrRefreshExpired)
		return
	}

	stored, appErr := h.authService.GetRefreshToken(r.Context(), cookie.Value)
	if appErr != nil || stored == nil {
		models.WriteError(w, models.ErrRefreshExpired)
		return
	}

	newRefreshToken, appErr := h.authService.RotateRefreshToken(r.Context(), cookie.Value, stored.UserID)
	if appErr != nil {
		models.WriteError(w, appErr)
		return
	}

	user, appErr := h.authService.GetUserByID(r.Context(), stored.UserID)
	if appErr != nil || user == nil {
		models.WriteError(w, models.ErrRefreshExpired)
		return
	}

	newAccessToken, err := security.CreateAccessToken(user.ID, h.cfg.SecretKey, h.cfg.AccessTokenExpireMinutes)
	if err != nil {
		models.WriteError(w, models.ErrInternal)
		return
	}

	h.setAuthCookies(w, newAccessToken, newRefreshToken)
	csrfToken := security.IssueCSRFToken(newAccessToken, h.cfg.CSRFSecret)

	models.WriteOK(w, models.RefreshResponse{
		CSRFToken:   csrfToken,
		Timezone:    user.Timezone,
		BottleStyle: user.BottleStyle,
	}, nil)
}

func (h *AuthHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	user := GetUserFromContext(r.Context())
	if user == nil {
		models.WriteError(w, models.ErrAccessExpired)
		return
	}

	models.WriteOK(w, models.MeResponse{
		Username:    user.Username,
		Timezone:    user.Timezone,
		BottleStyle: user.BottleStyle,
	}, nil)
}

func (h *AuthHandler) UpdateBottleStyle(w http.ResponseWriter, r *http.Request) {
	user := GetUserFromContext(r.Context())
	if user == nil {
		models.WriteError(w, models.ErrAccessExpired)
		return
	}

	var req models.BottleStyleUpdate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		models.WriteError(w, models.ErrParam)
		return
	}

	updated, appErr := h.authService.UpdateBottleStyle(r.Context(), user.ID, req.BottleStyle)
	if appErr != nil {
		models.WriteError(w, appErr)
		return
	}

	models.WriteOK(w, models.BottleStyleResponse{
		BottleStyle: updated.BottleStyle,
	}, nil)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	var rawToken string
	if cookie, err := r.Cookie(service.RefreshCookie); err == nil {
		rawToken = cookie.Value
	}

	_ = h.authService.Logout(r.Context(), rawToken)
	h.clearAuthCookies(w)
	models.WriteOK[any](w, nil, nil)
}

