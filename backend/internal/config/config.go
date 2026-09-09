package config

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

var rateLimitRe = regexp.MustCompile(`^(\d+)/(\d+)(minute|minutes|second|seconds|hour|hours)$`)

type Config struct {
	DatabaseURL              string
	Username                 string
	Password                 string
	UserTimezone             string
	SecretKey                string
	CSRFSecret               string
	Algorithm                string
	AccessTokenExpireMinutes int
	RefreshTokenExpireDays   int
	LoginRateLimit           string
	RateLimitLimit           int
	RateLimitWindowSeconds   int
	CORSOrigins              string
	CORSOriginsList          []string
	FrontendDist             string
	Port                     string
}

func NormalizeDatabaseURL(raw string) string {
	raw = strings.TrimSpace(raw)
	if strings.HasPrefix(raw, "postgresql+asyncpg://") {
		return "postgres://" + strings.TrimPrefix(raw, "postgresql+asyncpg://")
	}
	if strings.HasPrefix(raw, "postgresql://") {
		return "postgres://" + strings.TrimPrefix(raw, "postgresql://")
	}
	return raw
}

func parseRateLimit(val string) (int, int, error) {
	matches := rateLimitRe.FindStringSubmatch(val)
	if len(matches) != 4 {
		return 0, 0, fmt.Errorf("LOGIN_RATE_LIMIT must be in format N/Xminutes, got: %s", val)
	}
	limit, err := strconv.Atoi(matches[1])
	if err != nil {
		return 0, 0, err
	}
	durVal, err := strconv.Atoi(matches[2])
	if err != nil {
		return 0, 0, err
	}
	unit := matches[3]
	multiplier := 60
	if strings.HasPrefix(unit, "second") {
		multiplier = 1
	} else if strings.HasPrefix(unit, "hour") {
		multiplier = 3600
	}
	return limit, durVal * multiplier, nil
}

func LoadConfig() (*Config, error) {
	// Try loading .env from repo root or working dir
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")
	if execPath, err := os.Executable(); err == nil {
		_ = godotenv.Load(filepath.Join(filepath.Dir(execPath), ".env"))
		_ = godotenv.Load(filepath.Join(filepath.Dir(execPath), "../.env"))
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}

	username := os.Getenv("USERNAME")
	if username == "" {
		username = "admin"
	}

	password := os.Getenv("PASSWORD")
	if password == "" {
		return nil, fmt.Errorf("PASSWORD is required")
	}

	tz := os.Getenv("USER_TIMEZONE")
	if tz == "" {
		tz = "Asia/Shanghai"
	}
	if _, err := time.LoadLocation(tz); err != nil {
		return nil, fmt.Errorf("invalid USER_TIMEZONE: %s", tz)
	}

	secretKey := os.Getenv("SECRET_KEY")
	if secretKey == "" {
		return nil, fmt.Errorf("SECRET_KEY is required")
	}

	csrfSecret := os.Getenv("CSRF_SECRET")
	if csrfSecret == "" {
		return nil, fmt.Errorf("CSRF_SECRET is required")
	}

	algorithm := os.Getenv("ALGORITHM")
	if algorithm == "" {
		algorithm = "HS256"
	}

	accessExpireMin := 15
	if v := os.Getenv("ACCESS_TOKEN_EXPIRE_MINUTES"); v != "" {
		if i, err := strconv.Atoi(v); err == nil && i > 0 {
			accessExpireMin = i
		}
	}

	refreshExpireDays := 30
	if v := os.Getenv("REFRESH_TOKEN_EXPIRE_DAYS"); v != "" {
		if i, err := strconv.Atoi(v); err == nil && i > 0 {
			refreshExpireDays = i
		}
	}

	rateLimitStr := os.Getenv("LOGIN_RATE_LIMIT")
	if rateLimitStr == "" {
		rateLimitStr = "5/5minutes"
	}
	limit, windowSeconds, err := parseRateLimit(rateLimitStr)
	if err != nil {
		return nil, err
	}

	corsOrigins := os.Getenv("CORS_ORIGINS")
	if corsOrigins == "" {
		corsOrigins = "http://localhost:5173"
	}
	var originsList []string
	for _, o := range strings.Split(corsOrigins, ",") {
		o = strings.TrimSpace(o)
		if o != "" {
			originsList = append(originsList, o)
		}
	}

	frontendDist := os.Getenv("FRONTEND_DIST")
	if frontendDist == "" {
		frontendDist = "/app/frontend/dist"
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	return &Config{
		DatabaseURL:              NormalizeDatabaseURL(dbURL),
		Username:                 username,
		Password:                 password,
		UserTimezone:             tz,
		SecretKey:                secretKey,
		CSRFSecret:               csrfSecret,
		Algorithm:                algorithm,
		AccessTokenExpireMinutes: accessExpireMin,
		RefreshTokenExpireDays:   refreshExpireDays,
		LoginRateLimit:           rateLimitStr,
		RateLimitLimit:           limit,
		RateLimitWindowSeconds:   windowSeconds,
		CORSOrigins:              corsOrigins,
		CORSOriginsList:          originsList,
		FrontendDist:             frontendDist,
		Port:                     port,
	}, nil
}

