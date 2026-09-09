package v1

import (
	"net/http"

	"angerlog/internal/models"
	"angerlog/internal/service"
)

type StatsHandler struct {
	statsService *service.StatsService
}

func NewStatsHandler(statsService *service.StatsService) *StatsHandler {
	return &StatsHandler{statsService: statsService}
}

func (h *StatsHandler) GetSummary(w http.ResponseWriter, r *http.Request) {
	user := GetUserFromContext(r.Context())
	if user == nil {
		models.WriteError(w, models.ErrAccessExpired)
		return
	}

	q := r.URL.Query()
	var startDate, endDate *string
	if s := q.Get("start_date"); s != "" {
		startDate = &s
	}
	if e := q.Get("end_date"); e != "" {
		endDate = &e
	}

	summary, appErr := h.statsService.GetSummary(r.Context(), user.ID, user.Timezone, startDate, endDate)
	if appErr != nil {
		models.WriteError(w, appErr)
		return
	}

	models.WriteOK(w, summary, nil)
}

func (h *StatsHandler) GetTrend(w http.ResponseWriter, r *http.Request) {
	user := GetUserFromContext(r.Context())
	if user == nil {
		models.WriteError(w, models.ErrAccessExpired)
		return
	}

	q := r.URL.Query()
	granularity := q.Get("granularity")
	if granularity == "" {
		granularity = "day"
	}

	var startDate, endDate *string
	if s := q.Get("start_date"); s != "" {
		startDate = &s
	}
	if e := q.Get("end_date"); e != "" {
		endDate = &e
	}

	trend, appErr := h.statsService.GetTrend(r.Context(), user.ID, user.Timezone, granularity, startDate, endDate)
	if appErr != nil {
		models.WriteError(w, appErr)
		return
	}

	models.WriteOK(w, trend, nil)
}

func (h *StatsHandler) GetHeatmap(w http.ResponseWriter, r *http.Request) {
	user := GetUserFromContext(r.Context())
	if user == nil {
		models.WriteError(w, models.ErrAccessExpired)
		return
	}

	q := r.URL.Query()
	var startDate, endDate *string
	if s := q.Get("start_date"); s != "" {
		startDate = &s
	}
	if e := q.Get("end_date"); e != "" {
		endDate = &e
	}

	heatmap, appErr := h.statsService.GetHeatmap(r.Context(), user.ID, user.Timezone, startDate, endDate)
	if appErr != nil {
		models.WriteError(w, appErr)
		return
	}

	models.WriteOK(w, heatmap, nil)
}

