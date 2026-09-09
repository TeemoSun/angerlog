package v1

import (
	"encoding/json"
	"net/http"
	"strconv"

	"angerlog/internal/models"
	"angerlog/internal/service"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type LogHandler struct {
	logService *service.LogService
}

func NewLogHandler(logService *service.LogService) *LogHandler {
	return &LogHandler{logService: logService}
}

func (h *LogHandler) CreateLog(w http.ResponseWriter, r *http.Request) {
	user := GetUserFromContext(r.Context())
	if user == nil {
		models.WriteError(w, models.ErrAccessExpired)
		return
	}

	var req models.LogCreate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		models.WriteError(w, models.ErrParam)
		return
	}

	log, appErr := h.logService.CreateLog(r.Context(), user.ID, req)
	if appErr != nil {
		models.WriteError(w, appErr)
		return
	}

	models.WriteOK(w, log, nil)
}

func (h *LogHandler) ListLogs(w http.ResponseWriter, r *http.Request) {
	user := GetUserFromContext(r.Context())
	if user == nil {
		models.WriteError(w, models.ErrAccessExpired)
		return
	}

	q := r.URL.Query()
	page := 1
	if p := q.Get("page"); p != "" {
		v, err := strconv.Atoi(p)
		if err != nil || v < 1 {
			models.WriteError(w, models.ErrParam)
			return
		}
		page = v
	}

	pageSize := 20
	if ps := q.Get("page_size"); ps != "" {
		v, err := strconv.Atoi(ps)
		if err != nil || v < 1 || v > 100 {
			models.WriteError(w, models.ErrParam)
			return
		}
		pageSize = v
	}

	var intensityMin *int
	if imin := q.Get("intensity_min"); imin != "" {
		v, err := strconv.Atoi(imin)
		if err != nil || v < 1 || v > 10 {
			models.WriteError(w, models.ErrParam)
			return
		}
		intensityMin = &v
	}

	var intensityMax *int
	if imax := q.Get("intensity_max"); imax != "" {
		v, err := strconv.Atoi(imax)
		if err != nil || v < 1 || v > 10 {
			models.WriteError(w, models.ErrParam)
			return
		}
		intensityMax = &v
	}

	var category *string
	if cat := q.Get("category"); cat != "" {
		category = &cat
	}

	var resolved *bool
	if res := q.Get("resolved"); res != "" {
		b, err := strconv.ParseBool(res)
		if err != nil {
			models.WriteError(w, models.ErrParam)
			return
		}
		resolved = &b
	}

	params := models.LogListParams{
		Page:         page,
		PageSize:     pageSize,
		IntensityMin: intensityMin,
		IntensityMax: intensityMax,
		Category:     category,
		Resolved:     resolved,
	}

	items, total, appErr := h.logService.ListLogs(r.Context(), user.ID, params)
	if appErr != nil {
		models.WriteError(w, appErr)
		return
	}

	meta := models.PageMeta{
		Total:    total,
		Page:     page,
		PageSize: pageSize,
		HasNext:  int64(page*pageSize) < total,
	}

	models.WriteOK(w, items, &meta)
}

func (h *LogHandler) GetLog(w http.ResponseWriter, r *http.Request) {
	user := GetUserFromContext(r.Context())
	if user == nil {
		models.WriteError(w, models.ErrAccessExpired)
		return
	}

	idStr := chi.URLParam(r, "id")
	logID, err := uuid.Parse(idStr)
	if err != nil {
		models.WriteError(w, models.ErrNotFound)
		return
	}

	log, appErr := h.logService.GetLog(r.Context(), logID, user.ID)
	if appErr != nil {
		models.WriteError(w, appErr)
		return
	}

	models.WriteOK(w, log, nil)
}

func (h *LogHandler) UpdateLog(w http.ResponseWriter, r *http.Request) {
	user := GetUserFromContext(r.Context())
	if user == nil {
		models.WriteError(w, models.ErrAccessExpired)
		return
	}

	idStr := chi.URLParam(r, "id")
	logID, err := uuid.Parse(idStr)
	if err != nil {
		models.WriteError(w, models.ErrNotFound)
		return
	}

	var req models.LogUpdate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		models.WriteError(w, models.ErrParam)
		return
	}

	updated, appErr := h.logService.UpdateLog(r.Context(), logID, user.ID, req)
	if appErr != nil {
		models.WriteError(w, appErr)
		return
	}

	models.WriteOK(w, updated, nil)
}

func (h *LogHandler) DeleteLog(w http.ResponseWriter, r *http.Request) {
	user := GetUserFromContext(r.Context())
	if user == nil {
		models.WriteError(w, models.ErrAccessExpired)
		return
	}

	idStr := chi.URLParam(r, "id")
	logID, err := uuid.Parse(idStr)
	if err != nil {
		models.WriteError(w, models.ErrNotFound)
		return
	}

	if appErr := h.logService.SoftDeleteLog(r.Context(), logID, user.ID); appErr != nil {
		models.WriteError(w, appErr)
		return
	}

	models.WriteOK[any](w, nil, nil)
}

