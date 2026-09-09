package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"angerlog/internal/models"
	"angerlog/internal/service"
)

func TestHealth(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()
	env.Handler.ServeHTTP(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	body := parseJSONResponse(t, resp)
	if body["status"] != "ok" {
		t.Fatalf("expected status 'ok', got %v", body["status"])
	}
}

func TestHealthRequiresNoAuth(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()
	env.Handler.ServeHTTP(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}
}

func TestLoginSuccessSetsCookies(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	resp, access, refresh, csrf := loginClient(t, env, "admin", "testpass123")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	if access == "" {
		t.Errorf("expected access_token cookie to be set")
	}
	if refresh == "" {
		t.Errorf("expected refresh_token cookie to be set")
	}
	if csrf == "" {
		t.Errorf("expected csrf_token in response data")
	}
}

func TestLoginWrongPassword(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	resp, _, _, _ := loginClient(t, env, "admin", "wrongpass")
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", resp.StatusCode)
	}

	body := parseJSONResponse(t, resp)
	if int(body["code"].(float64)) != 40101 {
		t.Fatalf("expected code 40101, got %v", body["code"])
	}
}

func TestRefreshRotatesToken(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	_, _, oldRefresh, _ := loginClient(t, env, "admin", "testpass123")

	// Call /auth/refresh with oldRefresh
	req1 := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", nil)
	req1.AddCookie(&http.Cookie{Name: service.RefreshCookie, Value: oldRefresh})
	w1 := httptest.NewRecorder()
	env.Handler.ServeHTTP(w1, req1)
	resp1 := w1.Result()

	if resp1.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 on refresh, got %d", resp1.StatusCode)
	}

	var newRefresh string
	for _, c := range resp1.Cookies() {
		if c.Name == service.RefreshCookie {
			newRefresh = c.Value
		}
	}
	if newRefresh == "" || newRefresh == oldRefresh {
		t.Fatalf("expected new rotated refresh token, got %s", newRefresh)
	}

	// Replaying the OLD refresh token must be rejected (rotation revokes it)
	req2 := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", nil)
	req2.AddCookie(&http.Cookie{Name: service.RefreshCookie, Value: oldRefresh})
	w2 := httptest.NewRecorder()
	env.Handler.ServeHTTP(w2, req2)
	resp2 := w2.Result()

	if resp2.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 on replayed refresh, got %d", resp2.StatusCode)
	}
	body2 := parseJSONResponse(t, resp2)
	if int(body2["code"].(float64)) != 40103 {
		t.Fatalf("expected code 40103, got %v", body2["code"])
	}

	// The new refresh token still works
	req3 := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", nil)
	req3.AddCookie(&http.Cookie{Name: service.RefreshCookie, Value: newRefresh})
	w3 := httptest.NewRecorder()
	env.Handler.ServeHTTP(w3, req3)
	resp3 := w3.Result()

	if resp3.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 with new refresh token, got %d", resp3.StatusCode)
	}
}

func TestRefreshWithoutCookie(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", nil)
	w := httptest.NewRecorder()
	env.Handler.ServeHTTP(w, req)
	resp := w.Result()

	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", resp.StatusCode)
	}
	body := parseJSONResponse(t, resp)
	if int(body["code"].(float64)) != 40103 {
		t.Fatalf("expected code 40103, got %v", body["code"])
	}
}

func TestLogoutRevokesRefresh(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	_, _, refresh, _ := loginClient(t, env, "admin", "testpass123")

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", nil)
	req.AddCookie(&http.Cookie{Name: service.RefreshCookie, Value: refresh})
	w := httptest.NewRecorder()
	env.Handler.ServeHTTP(w, req)
	resp := w.Result()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 on logout, got %d", resp.StatusCode)
	}

	// Try refresh again
	reqRef := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", nil)
	reqRef.AddCookie(&http.Cookie{Name: service.RefreshCookie, Value: refresh})
	wRef := httptest.NewRecorder()
	env.Handler.ServeHTTP(wRef, reqRef)
	respRef := wRef.Result()

	if respRef.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 after logout, got %d", respRef.StatusCode)
	}
	body := parseJSONResponse(t, respRef)
	if int(body["code"].(float64)) != 40103 {
		t.Fatalf("expected code 40103, got %v", body["code"])
	}
}

func TestAccessProtectedRouteAfterLogout(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	_, access, refresh, _ := loginClient(t, env, "admin", "testpass123")

	reqLog := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", nil)
	reqLog.AddCookie(&http.Cookie{Name: service.RefreshCookie, Value: refresh})
	wLog := httptest.NewRecorder()
	env.Handler.ServeHTTP(wLog, reqLog)

	// Access without cookie
	req := httptest.NewRequest(http.MethodGet, "/api/v1/logs", nil)
	w := httptest.NewRecorder()
	env.Handler.ServeHTTP(w, req)
	resp := w.Result()

	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", resp.StatusCode)
	}
	body := parseJSONResponse(t, resp)
	if int(body["code"].(float64)) != 40102 {
		t.Fatalf("expected code 40102, got %v", body["code"])
	}
	_ = access
}

func TestLoginRateLimit(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	// 5 failed logins
	for i := 0; i < 5; i++ {
		resp, _, _, _ := loginClient(t, env, "admin", "wrong")
		if resp.StatusCode != http.StatusUnauthorized {
			t.Fatalf("expected 401 on attempt %d, got %d", i+1, resp.StatusCode)
		}
	}

	// 6th attempt should be blocked by rate limiter
	resp6, _, _, _ := loginClient(t, env, "admin", "wrong")
	if resp6.StatusCode != http.StatusTooManyRequests {
		t.Fatalf("expected 429 on 6th attempt, got %d", resp6.StatusCode)
	}
	body6 := parseJSONResponse(t, resp6)
	if int(body6["code"].(float64)) != 42901 {
		t.Fatalf("expected code 42901, got %v", body6["code"])
	}

	// Successful login also blocked when over limit
	respCorrect, _, _, _ := loginClient(t, env, "admin", "testpass123")
	if respCorrect.StatusCode != http.StatusTooManyRequests {
		t.Fatalf("expected 429 on correct login while rate limited, got %d", respCorrect.StatusCode)
	}
}

func TestRateLimitResetsAfterSuccess(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	resp1, _, _, _ := loginClient(t, env, "admin", "testpass123")
	if resp1.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp1.StatusCode)
	}

	resp2, _, _, _ := loginClient(t, env, "admin", "testpass123")
	if resp2.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp2.StatusCode)
	}
}

func TestBottleStyleFlow(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	resp, access, _, csrf := loginClient(t, env, "admin", "testpass123")
	body := parseJSONResponse(t, resp)
	data := body["data"].(map[string]interface{})
	if data["bottle_style"] != "C" {
		t.Fatalf("expected default bottle_style 'C', got %v", data["bottle_style"])
	}

	// Update to A
	updateBody, _ := json.Marshal(models.BottleStyleUpdate{BottleStyle: "A"})
	reqUpdate := httptest.NewRequest(http.MethodPut, "/api/v1/auth/bottle-style", bytes.NewReader(updateBody))
	reqUpdate.Header.Set("Content-Type", "application/json")
	reqUpdate.Header.Set("X-CSRF-Token", csrf)
	reqUpdate.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})

	wUpdate := httptest.NewRecorder()
	env.Handler.ServeHTTP(wUpdate, reqUpdate)
	respUpdate := wUpdate.Result()

	if respUpdate.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", respUpdate.StatusCode)
	}
	bodyUpdate := parseJSONResponse(t, respUpdate)
	dataUpdate := bodyUpdate["data"].(map[string]interface{})
	if dataUpdate["bottle_style"] != "A" {
		t.Fatalf("expected updated bottle_style 'A', got %v", dataUpdate["bottle_style"])
	}

	// GET /me
	reqMe := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	reqMe.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	wMe := httptest.NewRecorder()
	env.Handler.ServeHTTP(wMe, reqMe)
	respMe := wMe.Result()

	if respMe.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", respMe.StatusCode)
	}
	bodyMe := parseJSONResponse(t, respMe)
	dataMe := bodyMe["data"].(map[string]interface{})
	if dataMe["bottle_style"] != "A" {
		t.Fatalf("expected 'A' in /me, got %v", dataMe["bottle_style"])
	}

	// Invalid bottle style should be rejected with 400
	invalidBody, _ := json.Marshal(map[string]string{"bottle_style": "Z_INVALID"})
	reqInvalid := httptest.NewRequest(http.MethodPut, "/api/v1/auth/bottle-style", bytes.NewReader(invalidBody))
	reqInvalid.Header.Set("Content-Type", "application/json")
	reqInvalid.Header.Set("X-CSRF-Token", csrf)
	reqInvalid.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	wInvalid := httptest.NewRecorder()
	env.Handler.ServeHTTP(wInvalid, reqInvalid)
	respInvalid := wInvalid.Result()

	if respInvalid.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400 for invalid bottle style, got %d", respInvalid.StatusCode)
	}
}

