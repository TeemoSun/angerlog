package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"angerlog/internal/models"
	"angerlog/internal/service"

	"github.com/google/uuid"
)

func insertDirectLog(t *testing.T, env *TestEnv, reason string, intensity int, category *string, isDeleted bool, createdAt time.Time) uuid.UUID {
	t.Helper()
	var userID uuid.UUID
	err := env.Pool.QueryRow(context.Background(), "SELECT id FROM users WHERE username = 'admin'").Scan(&userID)
	if err != nil {
		t.Fatalf("failed to query admin user id: %v", err)
	}

	newID := uuid.New()
	_, err = env.Pool.Exec(context.Background(),
		`INSERT INTO anger_logs (id, user_id, trigger_reason, intensity, category, is_resolved, is_deleted, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, FALSE, $6, $7, $7)`,
		newID, userID, reason, intensity, category, isDeleted, createdAt,
	)
	if err != nil {
		t.Fatalf("failed to insert direct log: %v", err)
	}
	return newID
}

func TestSummaryBasic(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	_, access, _, _ := loginClient(t, env, "admin", "testpass123")

	catWork := "工作"
	catHome := "家庭"
	insertDirectLog(t, env, "a", 8, &catWork, false, time.Now().UTC())
	insertDirectLog(t, env, "b", 4, &catHome, false, time.Now().UTC())
	insertDirectLog(t, env, "c", 6, nil, false, time.Now().UTC())

	req := httptest.NewRequest(http.MethodGet, "/api/v1/stats/summary", nil)
	req.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	w := httptest.NewRecorder()
	env.Handler.ServeHTTP(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	body := parseJSONResponse(t, resp)
	data := body["data"].(map[string]interface{})
	if int(data["total_count"].(float64)) != 3 {
		t.Fatalf("expected total_count 3, got %v", data["total_count"])
	}
	if data["avg_intensity"].(float64) != 6.0 {
		t.Fatalf("expected avg_intensity 6.0, got %v", data["avg_intensity"])
	}
	if int(data["max_intensity"].(float64)) != 8 {
		t.Fatalf("expected max_intensity 8, got %v", data["max_intensity"])
	}
	if int(data["min_intensity"].(float64)) != 4 {
		t.Fatalf("expected min_intensity 4, got %v", data["min_intensity"])
	}
	if int(data["resolved_count"].(float64)) != 0 {
		t.Fatalf("expected resolved_count 0, got %v", data["resolved_count"])
	}

	catCounts := data["category_counts"].(map[string]interface{})
	if int(catCounts["工作"].(float64)) != 1 || int(catCounts["家庭"].(float64)) != 1 {
		t.Fatalf("expected category_counts 工作:1, 家庭:1, got %v", catCounts)
	}
}

func TestSummaryExcludesDeleted(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	_, access, _, csrf := loginClient(t, env, "admin", "testpass123")
	catWork := "工作"
	catSocial := "社交"

	logID := insertDirectLog(t, env, "d", 9, &catWork, false, time.Now().UTC())
	insertDirectLog(t, env, "e", 2, &catSocial, false, time.Now().UTC())

	// Soft delete logID
	reqDel := httptest.NewRequest(http.MethodDelete, "/api/v1/logs/"+logID.String(), nil)
	reqDel.Header.Set("X-CSRF-Token", csrf)
	reqDel.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	wDel := httptest.NewRecorder()
	env.Handler.ServeHTTP(wDel, reqDel)
	if wDel.Result().StatusCode != http.StatusOK {
		t.Fatalf("expected 200 on delete, got %d", wDel.Result().StatusCode)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/stats/summary", nil)
	req.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	w := httptest.NewRecorder()
	env.Handler.ServeHTTP(w, req)

	body := parseJSONResponse(t, w.Result())
	data := body["data"].(map[string]interface{})
	if int(data["total_count"].(float64)) != 1 || int(data["max_intensity"].(float64)) != 2 {
		t.Fatalf("expected total 1, max 2 after delete, got %v", data)
	}
}

func TestSummaryDateRange(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	_, access, _, _ := loginClient(t, env, "admin", "testpass123")
	cat := "工作"

	base := time.Date(2026, 8, 10, 12, 0, 0, 0, time.UTC)
	insertDirectLog(t, env, "in", 5, &cat, false, base)
	insertDirectLog(t, env, "out", 9, &cat, false, base.Add(30*24*time.Hour))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/stats/summary?start_date=2026-08-01&end_date=2026-08-31", nil)
	req.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	w := httptest.NewRecorder()
	env.Handler.ServeHTTP(w, req)

	body := parseJSONResponse(t, w.Result())
	data := body["data"].(map[string]interface{})
	if int(data["total_count"].(float64)) != 1 || int(data["max_intensity"].(float64)) != 5 {
		t.Fatalf("expected total 1, max 5, got %v", data)
	}
}

func TestSummaryDateRangeUsesUserTimezone(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	_, access, _, _ := loginClient(t, env, "admin", "testpass123")
	cat := "工作"

	// 2026-08-09 15:59 UTC = 上海 8-9 23:59 (不在 8-10 当天)
	insertDirectLog(t, env, "超界前", 3, &cat, false, time.Date(2026, 8, 9, 15, 59, 0, 0, time.UTC))
	// 2026-08-09 16:30 UTC = 上海 8-10 00:30 (在 8-10 当天)
	insertDirectLog(t, env, "凌晨", 5, &cat, false, time.Date(2026, 8, 9, 16, 30, 0, 0, time.UTC))
	// 2026-08-10 15:30 UTC = 上海 8-10 23:30 (在 8-10 当天)
	insertDirectLog(t, env, "深夜", 7, &cat, false, time.Date(2026, 8, 10, 15, 30, 0, 0, time.UTC))
	// 2026-08-10 16:00 UTC = 上海 8-11 00:00 (不在 8-10 当天)
	insertDirectLog(t, env, "超界", 9, &cat, false, time.Date(2026, 8, 10, 16, 0, 0, 0, time.UTC))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/stats/summary?start_date=2026-08-10&end_date=2026-08-10", nil)
	req.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	w := httptest.NewRecorder()
	env.Handler.ServeHTTP(w, req)

	body := parseJSONResponse(t, w.Result())
	data := body["data"].(map[string]interface{})
	if int(data["total_count"].(float64)) != 2 || int(data["max_intensity"].(float64)) != 7 {
		t.Fatalf("expected total 2, max 7 for timezone range, got %v", data)
	}
}

func TestTrendDateRangeUsesUserTimezone(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	_, access, _, _ := loginClient(t, env, "admin", "testpass123")
	cat := "工作"

	// 2026-08-09 18:30 UTC = 上海 8-10 02:30
	insertDirectLog(t, env, "t1", 4, &cat, false, time.Date(2026, 8, 9, 18, 30, 0, 0, time.UTC))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/stats/trend?granularity=day&start_date=2026-08-10&end_date=2026-08-10", nil)
	req.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	w := httptest.NewRecorder()
	env.Handler.ServeHTTP(w, req)

	body := parseJSONResponse(t, w.Result())
	data := body["data"].([]interface{})
	if len(data) != 1 {
		t.Fatalf("expected 1 trend point, got %v", data)
	}
	point := data[0].(map[string]interface{})
	if int(point["count"].(float64)) != 1 {
		t.Fatalf("expected count 1, got %v", point)
	}
}

func TestTrendDay(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	_, access, _, _ := loginClient(t, env, "admin", "testpass123")
	cat := "工作"

	base := time.Date(2026, 8, 15, 10, 0, 0, 0, time.UTC)
	insertDirectLog(t, env, "d1", 5, &cat, false, base)
	insertDirectLog(t, env, "d2", 7, &cat, false, base.Add(2*time.Hour))
	insertDirectLog(t, env, "d3", 3, &cat, false, base.Add(24*time.Hour))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/stats/trend?granularity=day", nil)
	req.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	w := httptest.NewRecorder()
	env.Handler.ServeHTTP(w, req)

	body := parseJSONResponse(t, w.Result())
	data := body["data"].([]interface{})
	if len(data) != 2 {
		t.Fatalf("expected 2 trend rows, got %v", data)
	}
	row0 := data[0].(map[string]interface{})
	if int(row0["count"].(float64)) != 2 || row0["avg_intensity"].(float64) != 6.0 {
		t.Fatalf("expected row 0 count 2, avg 6.0, got %v", row0)
	}
	row1 := data[1].(map[string]interface{})
	if int(row1["count"].(float64)) != 1 {
		t.Fatalf("expected row 1 count 1, got %v", row1)
	}
}

func TestHeatmapUsesUserTimezone(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	_, access, _, _ := loginClient(t, env, "admin", "testpass123")
	cat := "交通"

	// 2026-08-21 00:30 UTC = 上海 08:30 -> hour 8
	insertDirectLog(t, env, "tz", 6, &cat, false, time.Date(2026, 8, 21, 0, 30, 0, 0, time.UTC))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/stats/heatmap", nil)
	req.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	w := httptest.NewRecorder()
	env.Handler.ServeHTTP(w, req)

	body := parseJSONResponse(t, w.Result())
	cells := body["data"].([]interface{})
	if len(cells) != 1 {
		t.Fatalf("expected 1 cell, got %v", cells)
	}
	cell := cells[0].(map[string]interface{})
	if int(cell["day_of_week"].(float64)) != 5 || int(cell["hour_of_day"].(float64)) != 8 || int(cell["count"].(float64)) != 1 {
		t.Fatalf("expected day 5, hour 8, count 1, got %v", cell)
	}
}

func TestHeatmapISOWeekday(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	_, access, _, _ := loginClient(t, env, "admin", "testpass123")
	cat := "交通"

	// 2026-08-21 是周五，ISO 语义 day_of_week=5
	insertDirectLog(t, env, "fri", 6, &cat, false, time.Date(2026, 8, 21, 9, 0, 0, 0, time.UTC))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/stats/heatmap", nil)
	req.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	w := httptest.NewRecorder()
	env.Handler.ServeHTTP(w, req)

	body := parseJSONResponse(t, w.Result())
	cells := body["data"].([]interface{})
	if len(cells) != 1 || int(cells[0].(map[string]interface{})["day_of_week"].(float64)) != 5 {
		t.Fatalf("expected day_of_week 5, got %v", cells)
	}
}

func TestHeatmapExcludesDeleted(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	_, access, _, _ := loginClient(t, env, "admin", "testpass123")
	cat1 := "工作"
	cat2 := "其他"

	insertDirectLog(t, env, "del", 9, &cat1, true, time.Date(2026, 8, 21, 9, 0, 0, 0, time.UTC))
	insertDirectLog(t, env, "keep", 3, &cat2, false, time.Date(2026, 8, 21, 9, 0, 0, 0, time.UTC))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/stats/heatmap", nil)
	req.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	w := httptest.NewRecorder()
	env.Handler.ServeHTTP(w, req)

	body := parseJSONResponse(t, w.Result())
	cells := body["data"].([]interface{})
	if len(cells) != 1 || int(cells[0].(map[string]interface{})["count"].(float64)) != 1 {
		t.Fatalf("expected 1 cell with count 1, got %v", cells)
	}
}

func TestSummaryResolveRate(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	_, access, _, csrf := loginClient(t, env, "admin", "testpass123")
	cat := "工作"

	_, body1 := createLogHelper(t, env, access, csrf, "r1", 5, &cat, nil)
	createLogHelper(t, env, access, csrf, "r2", 5, &cat, nil)

	logID := body1["data"].(map[string]interface{})["id"].(string)

	// Resolve one
	updatePayload, _ := json.Marshal(models.LogUpdate{IsResolved: true})
	reqPut := httptest.NewRequest(http.MethodPut, "/api/v1/logs/"+logID, bytes.NewReader(updatePayload))
	reqPut.Header.Set("Content-Type", "application/json")
	reqPut.Header.Set("X-CSRF-Token", csrf)
	reqPut.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	wPut := httptest.NewRecorder()
	env.Handler.ServeHTTP(wPut, reqPut)
	if wPut.Result().StatusCode != http.StatusOK {
		t.Fatalf("expected 200 on put, got %d", wPut.Result().StatusCode)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/stats/summary", nil)
	req.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	w := httptest.NewRecorder()
	env.Handler.ServeHTTP(w, req)

	body := parseJSONResponse(t, w.Result())
	data := body["data"].(map[string]interface{})
	if int(data["resolved_count"].(float64)) != 1 || data["resolve_rate"].(float64) != 0.5 {
		t.Fatalf("expected resolved 1, resolve_rate 0.5, got %v", data)
	}
}

func TestTrendInvalidGranularity(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	_, access, _, _ := loginClient(t, env, "admin", "testpass123")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/stats/trend?granularity=year", nil)
	req.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	w := httptest.NewRecorder()
	env.Handler.ServeHTTP(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", resp.StatusCode)
	}
	body := parseJSONResponse(t, resp)
	if int(body["code"].(float64)) != 40001 {
		t.Fatalf("expected code 40001, got %v", body["code"])
	}
}
