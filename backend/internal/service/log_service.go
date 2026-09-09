package service

import (
	"context"
	"strings"
	"time"

	"angerlog/internal/models"
	"angerlog/internal/repository"

	"github.com/google/uuid"
)

type LogService struct {
	repo *repository.LogRepository
}

func NewLogService(repo *repository.LogRepository) *LogService {
	return &LogService{repo: repo}
}

func parseRFC3339Timestamp(tsStr *string) (*time.Time, *models.AppError) {
	if tsStr == nil || *tsStr == "" {
		return nil, nil
	}

	raw := strings.TrimSpace(*tsStr)
	// Must strictly parse with RFC3339 (rejects timezone-naive strings like "2026-01-01T00:00:00")
	t, err := time.Parse(time.RFC3339, raw)
	if err != nil {
		t, err = time.Parse(time.RFC3339Nano, raw)
		if err != nil {
			return nil, models.ErrParam
		}
	}

	utc := t.UTC()
	// Disallow future timestamps with 10s clock skew tolerance
	if utc.After(time.Now().UTC().Add(10 * time.Second)) {
		return nil, models.ErrParam
	}

	return &utc, nil
}

func (s *LogService) CreateLog(ctx context.Context, userID uuid.UUID, data models.LogCreate) (*models.AngerLog, *models.AppError) {
	reason := strings.TrimSpace(data.TriggerReason)
	if reason == "" || len([]rune(reason)) > 500 {
		return nil, models.ErrParam
	}

	if data.Intensity < 1 || data.Intensity > 10 {
		return nil, models.ErrParam
	}

	var category *string
	if data.Category != nil {
		c := strings.TrimSpace(*data.Category)
		if !models.IsValidCategory(c) {
			return nil, models.ErrParam
		}
		category = &c
	}

	customCreatedAt, appErr := parseRFC3339Timestamp(data.CreatedAt)
	if appErr != nil {
		return nil, appErr
	}

	log, err := s.repo.CreateLog(ctx, userID, reason, data.Intensity, category, customCreatedAt)
	if err != nil {
		return nil, models.ErrInternal
	}

	return log, nil
}

func (s *LogService) GetLog(ctx context.Context, logID, userID uuid.UUID) (*models.AngerLog, *models.AppError) {
	log, err := s.repo.GetLog(ctx, logID, userID)
	if err != nil {
		return nil, models.ErrInternal
	}
	if log == nil {
		return nil, models.ErrNotFound
	}
	return log, nil
}

func (s *LogService) ListLogs(ctx context.Context, userID uuid.UUID, params models.LogListParams) ([]models.AngerLog, int64, *models.AppError) {
	if params.Page < 1 {
		params.Page = 1
	}
	if params.PageSize < 1 || params.PageSize > 100 {
		return nil, 0, models.ErrParam
	}
	if params.IntensityMin != nil && (*params.IntensityMin < 1 || *params.IntensityMin > 10) {
		return nil, 0, models.ErrParam
	}
	if params.IntensityMax != nil && (*params.IntensityMax < 1 || *params.IntensityMax > 10) {
		return nil, 0, models.ErrParam
	}

	items, total, err := s.repo.ListLogs(ctx, userID, params)
	if err != nil {
		return nil, 0, models.ErrInternal
	}

	return items, total, nil
}

func (s *LogService) UpdateLog(ctx context.Context, logID, userID uuid.UUID, data models.LogUpdate) (*models.AngerLog, *models.AppError) {
	existing, err := s.repo.GetLog(ctx, logID, userID)
	if err != nil {
		return nil, models.ErrInternal
	}
	if existing == nil {
		return nil, models.ErrNotFound
	}

	var method *string
	if data.ResolutionMethod != nil {
		m := strings.TrimSpace(*data.ResolutionMethod)
		if m != "" {
			if len([]rune(m)) > 500 {
				return nil, models.ErrParam
			}
			method = &m
		}
	}

	customResolvedAt, appErr := parseRFC3339Timestamp(data.ResolvedAt)
	if appErr != nil {
		return nil, appErr
	}

	updated, err := s.repo.UpdateLog(ctx, existing, data.IsResolved, method, customResolvedAt)
	if err != nil {
		return nil, models.ErrInternal
	}

	return updated, nil
}

func (s *LogService) SoftDeleteLog(ctx context.Context, logID, userID uuid.UUID) *models.AppError {
	deleted, err := s.repo.SoftDeleteLog(ctx, logID, userID)
	if err != nil {
		return models.ErrInternal
	}
	if !deleted {
		return models.ErrNotFound
	}
	return nil
}

