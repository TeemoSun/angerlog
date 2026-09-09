package tests

import (
	"strings"
	"testing"

	"angerlog/internal/security"

	"github.com/google/uuid"
)

func TestHashAndVerifyPassword(t *testing.T) {
	hashed, err := security.HashPassword("secret123")
	if err != nil {
		t.Fatalf("unexpected error hashing password: %v", err)
	}

	if !strings.HasPrefix(hashed, "$2a$12$") && !strings.HasPrefix(hashed, "$2b$12$") {
		t.Errorf("expected bcrypt hash with cost 12, got: %s", hashed)
	}

	if !security.VerifyPassword("secret123", hashed) {
		t.Errorf("expected secret123 to verify correctly")
	}

	if security.VerifyPassword("wrong", hashed) {
		t.Errorf("expected wrong password to fail verification")
	}
}

func TestAccessTokenRoundtrip(t *testing.T) {
	uid := uuid.New()
	secret := "test-secret"
	token, err := security.CreateAccessToken(uid, secret, 15)
	if err != nil {
		t.Fatalf("failed to create access token: %v", err)
	}

	parsedUID, err := security.DecodeAccessToken(token, secret)
	if err != nil {
		t.Fatalf("failed to decode access token: %v", err)
	}

	if parsedUID != uid {
		t.Errorf("expected user id %v, got %v", uid, parsedUID)
	}
}

func TestVerifyPasswordInvalidHashReturnsFalse(t *testing.T) {
	if security.VerifyPassword("x", "not-a-bcrypt-hash") {
		t.Errorf("expected invalid hash to return false")
	}
}

func TestCSRFTokenBinding(t *testing.T) {
	secret := "test-csrf-secret"
	uid1 := uuid.New()
	access1, _ := security.CreateAccessToken(uid1, "jwt-secret", 15)

	t1 := security.IssueCSRFToken(access1, secret)
	t2 := security.IssueCSRFToken(access1, secret)

	if t1 != t2 {
		t.Errorf("expected deterministic csrf tokens, got %s and %s", t1, t2)
	}

	if !security.VerifyCSRFToken(access1, t1, secret) {
		t.Errorf("expected csrf token to verify successfully")
	}

	if security.VerifyCSRFToken(access1, "bogus", secret) {
		t.Errorf("expected bogus csrf token to fail verification")
	}

	if security.VerifyCSRFToken(access1, "", secret) {
		t.Errorf("expected empty csrf token to fail verification")
	}

	uid2 := uuid.New()
	access2, _ := security.CreateAccessToken(uid2, "jwt-secret", 15)
	if security.VerifyCSRFToken(access2, t1, secret) {
		t.Errorf("expected csrf token bound to access1 to fail for access2")
	}
}

func TestRateLimitParser(t *testing.T) {
	cfg := getTestConfig()
	if cfg.RateLimitLimit != 5 || cfg.RateLimitWindowSeconds != 300 {
		t.Errorf("expected (5, 300), got (%d, %d)", cfg.RateLimitLimit, cfg.RateLimitWindowSeconds)
	}
}
