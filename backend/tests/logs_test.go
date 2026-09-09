package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"angerlog/internal/models"
	"angerlog/internal/service"

	"github.com/google/uuid"
)

func createLogHelper(t *testing.T, env *TestEnv, access, csrf string, reason string, intensity int, category *string, createdAt *string) (*http.Response, map[string]interface{}) {
	t.Helper()
	bodyData := models.LogCreate{
		TriggerReason: reason,
		Intensity:     intensity,
		Category:      category,
		CreatedAt:     createdAt,
	}
	bodyBytes, _ := json.Marshal(bodyData)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/logs", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	if csrf != "" {
		req.Header.Set("X-CSRF-Token", csrf)
	}
	if access != "" {
		req.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	}

	w := httptest.NewRecorder()
	env.Handler.ServeHTTP(w, req)
	resp := w.Result()
	body := parseJSONResponse(t, resp)
	return resp, body
}

func TestCreateLogRequiresCSRF(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	_, access, _, _ := loginClient(t, env, "admin", "testpass123")
	cat := "交通"
	resp, body := createLogHelper(t, env, access, "", "堵车", 5, &cat, nil)

	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 without CSRF, got %d", resp.StatusCode)
	}
	if int(body["code"].(float64)) != 40301 {
		t.Fatalf("expected code 40301, got %v", body["code"])
	}
}

func TestCreateLogRequiresAuth(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	cat := "交通"
	resp, body := createLogHelper(t, env, "", "csrf-dummy", "堵车", 5, &cat, nil)

	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 without auth, got %d", resp.StatusCode)
	}
	if int(body["code"].(float64)) != 40102 {
		t.Fatalf("expected code 40102, got %v", body["code"])
	}
}

func TestCreateLogValidation(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	_, access, _, csrf := loginClient(t, env, "admin", "testpass123")

	// intensity 11
	resp, body := createLogHelper(t, env, access, csrf, "堵车", 11, nil, nil)
	if resp.StatusCode != http.StatusBadRequest || int(body["code"].(float64)) != 40001 {
		t.Fatalf("expected 400 with 40001 for intensity 11, got status %d, code %v", resp.StatusCode, body["code"])
	}

	// empty reason
	resp, body = createLogHelper(t, env, access, csrf, "   ", 5, nil, nil)
	if resp.StatusCode != http.StatusBadRequest || int(body["code"].(float64)) != 40001 {
		t.Fatalf("expected 400 with 40001 for empty reason, got status %d, code %v", resp.StatusCode, body["code"])
	}

	// invalid category
	alien := "外星人"
	resp, body = createLogHelper(t, env, access, csrf, "堵车", 5, &alien, nil)
	if resp.StatusCode != http.StatusBadRequest || int(body["code"].(float64)) != 40001 {
		t.Fatalf("expected 400 with 40001 for invalid category, got status %d, code %v", resp.StatusCode, body["code"])
	}
}

func TestCreateAndGetLog(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	_, access, _, csrf := loginClient(t, env, "admin", "testpass123")

	cat := "工作"
	resp, body := createLogHelper(t, env, access, csrf, "同事甩锅", 9, &cat, nil)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	data := body["data"].(map[string]interface{})
	id := data["id"].(string)
	if data["trigger_reason"] != "同事甩锅" || int(data["intensity"].(float64)) != 9 || data["category"] != "工作" {
		t.Fatalf("unexpected data: %v", data)
	}
	if data["is_resolved"] != false {
		t.Fatalf("expected is_resolved false")
	}

	// GET /api/v1/logs/{id}
	req := httptest.NewRequest(http.MethodGet, "/api/v1/logs/"+id, nil)
	req.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	w := httptest.NewRecorder()
	env.Handler.ServeHTTP(w, req)
	respGet := w.Result()

	if respGet.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 on get, got %d", respGet.StatusCode)
	}
	bodyGet := parseJSONResponse(t, respGet)
	dataGet := bodyGet["data"].(map[string]interface{})
	if dataGet["id"] != id {
		t.Fatalf("expected id %s, got %v", id, dataGet["id"])
	}
}

func TestGetMissingLogReturns404(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	_, access, _, _ := loginClient(t, env, "admin", "testpass123")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/logs/"+uuid.NewString(), nil)
	req.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	w := httptest.NewRecorder()
	env.Handler.ServeHTTP(w, req)
	resp := w.Result()

	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", resp.StatusCode)
	}
	body := parseJSONResponse(t, resp)
	if int(body["code"].(float64)) != 40401 {
		t.Fatalf("expected code 40401, got %v", body["code"])
	}
}

func TestListPaginationAndFilters(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	_, access, _, csrf := loginClient(t, env, "admin", "testpass123")

	for i := 0; i < 5; i++ {
		cat := "家庭"
		if i%2 != 0 {
			cat = "工作"
		}
		createLogHelper(t, env, access, csrf, fmt.Sprintf("r%d", i), i+1, &cat, nil)
	}

	// page 1, page_size 3
	req := httptest.NewRequest(http.MethodGet, "/api/v1/logs?page=1&page_size=3", nil)
	req.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	w := httptest.NewRecorder()
	env.Handler.ServeHTTP(w, req)
	body := parseJSONResponse(t, w.Result())

	meta := body["meta"].(map[string]interface{})
	data := body["data"].([]interface{})
	if int(meta["total"].(float64)) != 5 || len(data) != 3 || meta["has_next"] != true || int(meta["page_size"].(float64)) != 3 {
		t.Fatalf("unexpected page 1 results: %v, meta: %v", data, meta)
	}

	// page 2, page_size 3
	req2 := httptest.NewRequest(http.MethodGet, "/api/v1/logs?page=2&page_size=3", nil)
	req2.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	w2 := httptest.NewRecorder()
	env.Handler.ServeHTTP(w2, req2)
	body2 := parseJSONResponse(t, w2.Result())
	meta2 := body2["meta"].(map[string]interface{})
	if meta2["has_next"] != false {
		t.Fatalf("expected has_next false on page 2")
	}

	// intensity_min=4&intensity_max=5
	reqFilter := httptest.NewRequest(http.MethodGet, "/api/v1/logs?intensity_min=4&intensity_max=5", nil)
	reqFilter.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	wFilter := httptest.NewRecorder()
	env.Handler.ServeHTTP(wFilter, reqFilter)
	bodyFilter := parseJSONResponse(t, wFilter.Result())
	if int(bodyFilter["meta"].(map[string]interface{})["total"].(float64)) != 2 {
		t.Fatalf("expected total 2, got %v", bodyFilter["meta"])
	}

	// category=工作
	reqCat := httptest.NewRequest(http.MethodGet, "/api/v1/logs?category=工作", nil)
	reqCat.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	wCat := httptest.NewRecorder()
	env.Handler.ServeHTTP(wCat, reqCat)
	bodyCat := parseJSONResponse(t, wCat.Result())
	if int(bodyCat["meta"].(map[string]interface{})["total"].(float64)) != 2 {
		t.Fatalf("expected total 2 for 工作, got %v", bodyCat["meta"])
	}

	// resolved=true
	reqRes := httptest.NewRequest(http.MethodGet, "/api/v1/logs?resolved=true", nil)
	reqRes.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	wRes := httptest.NewRecorder()
	env.Handler.ServeHTTP(wRes, reqRes)
	bodyRes := parseJSONResponse(t, wRes.Result())
	if int(bodyRes["meta"].(map[string]interface{})["total"].(float64)) != 0 {
		t.Fatalf("expected total 0 resolved, got %v", bodyRes["meta"])
	}
}

func TestMarkResolvedSetsResolvedAt(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	_, access, _, csrf := loginClient(t, env, "admin", "testpass123")
	cat := "工作"
	_, createBody := createLogHelper(t, env, access, csrf, "生气", 5, &cat, nil)
	logID := createBody["data"].(map[string]interface{})["id"].(string)

	// Mark resolved
	method := "散步"
	updatePayload, _ := json.Marshal(models.LogUpdate{
		IsResolved:       true,
		ResolutionMethod: &method,
	})
	req := httptest.NewRequest(http.MethodPut, "/api/v1/logs/"+logID, bytes.NewReader(updatePayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-CSRF-Token", csrf)
	req.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	w := httptest.NewRecorder()
	env.Handler.ServeHTTP(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	body := parseJSONResponse(t, resp)
	data := body["data"].(map[string]interface{})
	if data["is_resolved"] != true || data["resolution_method"] != "散步" || data["resolved_at"] == nil {
		t.Fatalf("expected resolved data, got %v", data)
	}

	// Unresolve
	unresolvePayload, _ := json.Marshal(models.LogUpdate{
		IsResolved: false,
	})
	reqUn := httptest.NewRequest(http.MethodPut, "/api/v1/logs/"+logID, bytes.NewReader(unresolvePayload))
	reqUn.Header.Set("Content-Type", "application/json")
	reqUn.Header.Set("X-CSRF-Token", csrf)
	reqUn.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	wUn := httptest.NewRecorder()
	env.Handler.ServeHTTP(wUn, reqUn)

	bodyUn := parseJSONResponse(t, wUn.Result())
	dataUn := bodyUn["data"].(map[string]interface{})
	if dataUn["is_resolved"] != false || dataUn["resolution_method"] != nil || dataUn["resolved_at"] != nil {
		t.Fatalf("expected unresolved reset data, got %v", dataUn)
	}
}

func TestSoftDelete(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	_, access, _, csrf := loginClient(t, env, "admin", "testpass123")
	cat := "工作"
	_, createBody := createLogHelper(t, env, access, csrf, "delete me", 5, &cat, nil)
	logID := createBody["data"].(map[string]interface{})["id"].(string)

	// DELETE /api/v1/logs/{id}
	reqDel := httptest.NewRequest(http.MethodDelete, "/api/v1/logs/"+logID, nil)
	reqDel.Header.Set("X-CSRF-Token", csrf)
	reqDel.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	wDel := httptest.NewRecorder()
	env.Handler.ServeHTTP(wDel, reqDel)

	if wDel.Result().StatusCode != http.StatusOK {
		t.Fatalf("expected 200 on delete, got %d", wDel.Result().StatusCode)
	}

	// GET returns 404
	reqGet := httptest.NewRequest(http.MethodGet, "/api/v1/logs/"+logID, nil)
	reqGet.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	wGet := httptest.NewRecorder()
	env.Handler.ServeHTTP(wGet, reqGet)
	if wGet.Result().StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404 after soft delete, got %d", wGet.Result().StatusCode)
	}

	// List returns total 0
	reqList := httptest.NewRequest(http.MethodGet, "/api/v1/logs", nil)
	reqList.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	wList := httptest.NewRecorder()
	env.Handler.ServeHTTP(wList, reqList)
	bodyList := parseJSONResponse(t, wList.Result())
	if int(bodyList["meta"].(map[string]interface{})["total"].(float64)) != 0 {
		t.Fatalf("expected total 0 in list, got %v", bodyList["meta"])
	}

	// Physical row must still exist with is_deleted = true
	var isDeleted bool
	err := env.Pool.QueryRow(context.Background(), "SELECT is_deleted FROM anger_logs WHERE id = $1", logID).Scan(&isDeleted)
	if err != nil || !isDeleted {
		t.Fatalf("expected row physically present with is_deleted=true, err: %v, val: %v", err, isDeleted)
	}
}

func TestDeleteMissingReturns404(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	_, access, _, csrf := loginClient(t, env, "admin", "testpass123")

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/logs/"+uuid.NewString(), nil)
	req.Header.Set("X-CSRF-Token", csrf)
	req.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	w := httptest.NewRecorder()
	env.Handler.ServeHTTP(w, req)

	if w.Result().StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Result().StatusCode)
	}
}

func TestUpdateMissingReturns404(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	_, access, _, csrf := loginClient(t, env, "admin", "testpass123")

	payload, _ := json.Marshal(models.LogUpdate{IsResolved: true})
	req := httptest.NewRequest(http.MethodPut, "/api/v1/logs/"+uuid.NewString(), bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-CSRF-Token", csrf)
	req.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	w := httptest.NewRecorder()
	env.Handler.ServeHTTP(w, req)

	if w.Result().StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Result().StatusCode)
	}
}

func TestCreateLogWithCustomCreatedAt(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	_, access, _, csrf := loginClient(t, env, "admin", "testpass123")
	when := time.Now().UTC().Add(-48 * time.Hour).Format(time.RFC3339)
	cat := "工作"
	resp, body := createLogHelper(t, env, access, csrf, "昨天的事", 6, &cat, &when)

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	data := body["data"].(map[string]interface{})
	createdStr := data["created_at"].(string)

	parsedCreated, err := time.Parse(time.RFC3339, createdStr)
	if err != nil {
		t.Fatalf("failed to parse created_at: %v", err)
	}
	parsedWhen, _ := time.Parse(time.RFC3339, when)
	if math.Abs(parsedCreated.Sub(parsedWhen).Seconds()) > 5 {
		t.Fatalf("created_at %v not within 5s of when %v", parsedCreated, parsedWhen)
	}
	if data["updated_at"] != createdStr {
		t.Fatalf("expected updated_at == created_at")
	}
}

func TestCreateLogRejectsFutureCreatedAt(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	_, access, _, csrf := loginClient(t, env, "admin", "testpass123")
	future := time.Now().UTC().Add(24 * time.Hour).Format(time.RFC3339)

	resp, body := createLogHelper(t, env, access, csrf, "未来", 5, nil, &future)
	if resp.StatusCode != http.StatusBadRequest || int(body["code"].(float64)) != 40001 {
		t.Fatalf("expected 400 with 40001 for future created_at, got %d, %v", resp.StatusCode, body["code"])
	}
}

func TestCreateLogRejectsNaiveCreatedAt(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	_, access, _, csrf := loginClient(t, env, "admin", "testpass123")
	naive := "2026-01-01T00:00:00"

	resp, body := createLogHelper(t, env, access, csrf, "无时区", 5, nil, &naive)
	if resp.StatusCode != http.StatusBadRequest || int(body["code"].(float64)) != 40001 {
		t.Fatalf("expected 400 with 40001 for naive created_at, got %d, %v", resp.StatusCode, body["code"])
	}
}

func TestResolveWithCustomResolvedAt(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	_, access, _, csrf := loginClient(t, env, "admin", "testpass123")
	cat := "工作"
	_, createBody := createLogHelper(t, env, access, csrf, "散步前", 5, &cat, nil)
	logID := createBody["data"].(map[string]interface{})["id"].(string)

	when := time.Now().UTC().Add(-3 * time.Hour).Format(time.RFC3339)
	method := "散步"
	updatePayload, _ := json.Marshal(models.LogUpdate{
		IsResolved:       true,
		ResolutionMethod: &method,
		ResolvedAt:       &when,
	})

	req := httptest.NewRequest(http.MethodPut, "/api/v1/logs/"+logID, bytes.NewReader(updatePayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-CSRF-Token", csrf)
	req.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	w := httptest.NewRecorder()
	env.Handler.ServeHTTP(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	body := parseJSONResponse(t, resp)
	data := body["data"].(map[string]interface{})
	if data["is_resolved"] != true || data["resolved_at"] == nil {
		t.Fatalf("expected resolved data, got %v", data)
	}
}

func TestResolveRejectsFutureResolvedAt(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	_, access, _, csrf := loginClient(t, env, "admin", "testpass123")
	cat := "工作"
	_, createBody := createLogHelper(t, env, access, csrf, "测试", 5, &cat, nil)
	logID := createBody["data"].(map[string]interface{})["id"].(string)

	future := time.Now().UTC().Add(24 * time.Hour).Format(time.RFC3339)
	method := "散步"
	updatePayload, _ := json.Marshal(models.LogUpdate{
		IsResolved:       true,
		ResolutionMethod: &method,
		ResolvedAt:       &future,
	})

	req := httptest.NewRequest(http.MethodPut, "/api/v1/logs/"+logID, bytes.NewReader(updatePayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-CSRF-Token", csrf)
	req.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	w := httptest.NewRecorder()
	env.Handler.ServeHTTP(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400 for future resolved_at, got %d", resp.StatusCode)
	}
}

func TestResolveAcceptsSmallClockSkew(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Pool.Close()

	_, access, _, csrf := loginClient(t, env, "admin", "testpass123")
	cat := "工作"
	_, createBody := createLogHelper(t, env, access, csrf, "测试", 5, &cat, nil)
	logID := createBody["data"].(map[string]interface{})["id"].(string)

	skew := time.Now().UTC().Add(5 * time.Second).Format(time.RFC3339)
	method := "散步"
	updatePayload, _ := json.Marshal(models.LogUpdate{
		IsResolved:       true,
		ResolutionMethod: &method,
		ResolvedAt:       &skew,
	})

	req := httptest.NewRequest(http.MethodPut, "/api/v1/logs/"+logID, bytes.NewReader(updatePayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-CSRF-Token", csrf)
	req.AddCookie(&http.Cookie{Name: service.AccessCookie, Value: access})
	w := httptest.NewRecorder()
	env.Handler.ServeHTTP(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for 5s clock skew, got %d", resp.StatusCode)
	}
}
