package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	v1 "angerlog/internal/api/v1"
	"angerlog/internal/config"
	"angerlog/internal/database"
	"angerlog/internal/models"
	"angerlog/internal/repository"
	"angerlog/internal/security"
	"angerlog/internal/service"

	"github.com/jackc/pgx/v5/pgxpool"
)

func getTestConfig() *config.Config {
	port := os.Getenv("TEST_DB_PORT")
	if port == "" {
		port = "54329"
	}

	return &config.Config{
		DatabaseURL:              "postgres://app_user:testpass@localhost:" + port + "/emotion_bottle_test",
		Username:                 "admin",
		Password:                 "testpass123",
		UserTimezone:             "Asia/Shanghai",
		SecretKey:                "test-secret-key-0123456789abcdef0123456789abcdef",
		CSRFSecret:               "test-csrf-secret-0123456789abcdef0123456789abcdef",
		Algorithm:                "HS256",
		AccessTokenExpireMinutes: 15,
		RefreshTokenExpireDays:   30,
		LoginRateLimit:           "5/5minutes",
		RateLimitLimit:           5,
		RateLimitWindowSeconds:   300,
		CORSOrigins:              "http://localhost:5173",
		CORSOriginsList:          []string{"http://localhost:5173"},
		FrontendDist:             "/nonexistent/dist",
		Port:                     "8000",
	}
}

type TestEnv struct {
	Pool        *pgxpool.Pool
	Cfg         *config.Config
	Handler     http.Handler
	Limiter     *security.LoginRateLimiter
	AuthService *service.AuthService
	LogService  *service.LogService
	StatsService *service.StatsService
	Server      *v1.Server
}

func setupTestEnv(t *testing.T) *TestEnv {
	t.Helper()
	cfg := getTestConfig()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := database.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		t.Fatalf("Failed to connect to test database at %s: %v", cfg.DatabaseURL, err)
	}

	if err := database.Migrate(ctx, pool); err != nil {
		t.Fatalf("Failed to run migrations: %v", err)
	}

	authRepo := repository.NewAuthRepository(pool)
	logRepo := repository.NewLogRepository(pool)
	statsRepo := repository.NewStatsRepository(pool)

	authService := service.NewAuthService(authRepo, cfg)
	logService := service.NewLogService(logRepo)
	statsService := service.NewStatsService(statsRepo)

	limiter := security.NewLoginRateLimiter(cfg.RateLimitLimit, cfg.RateLimitWindowSeconds)

	server := v1.NewServer(pool, cfg, authService, logService, statsService, limiter)
	handler := server.SetupRouter()

	env := &TestEnv{
		Pool:         pool,
		Cfg:          cfg,
		Handler:      handler,
		Limiter:      limiter,
		AuthService:  authService,
		LogService:   logService,
		StatsService: statsService,
		Server:       server,
	}

	cleanDB(t, env)
	return env
}

func cleanDB(t *testing.T, env *TestEnv) {
	t.Helper()
	env.Limiter.Clear()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := env.Pool.Exec(ctx, "TRUNCATE anger_logs, refresh_tokens, users RESTART IDENTITY CASCADE;")
	if err != nil {
		t.Fatalf("Failed to truncate tables: %v", err)
	}

	if err := database.UpsertDefaultUser(ctx, env.Pool, env.Cfg.Username, env.Cfg.Password, env.Cfg.UserTimezone); err != nil {
		t.Fatalf("Failed to seed default user: %v", err)
	}
}

func parseJSONResponse(t *testing.T, resp *http.Response) map[string]interface{} {
	t.Helper()
	var body map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("Failed to decode response JSON: %v", err)
	}
	return body
}

func loginClient(t *testing.T, env *TestEnv, username, password string) (*http.Response, string, string, string) {
	t.Helper()
	reqBody, _ := json.Marshal(models.LoginRequest{Username: username, Password: password})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(reqBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	env.Handler.ServeHTTP(w, req)
	resp := w.Result()

	var accessCookie, refreshCookie, csrfToken string
	for _, c := range resp.Cookies() {
		if c.Name == service.AccessCookie {
			accessCookie = c.Value
		}
		if c.Name == service.RefreshCookie {
			refreshCookie = c.Value
		}
	}

	bodyBytes, _ := io.ReadAll(resp.Body)
	resp.Body = io.NopCloser(bytes.NewReader(bodyBytes))

	if resp.StatusCode == http.StatusOK {
		var body struct {
			Code int `json:"code"`
			Data struct {
				CSRFToken string `json:"csrf_token"`
			} `json:"data"`
		}
		_ = json.Unmarshal(bodyBytes, &body)
		csrfToken = body.Data.CSRFToken
	}

	return resp, accessCookie, refreshCookie, csrfToken
}
