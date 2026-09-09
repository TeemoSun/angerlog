package service

import (
	"context"

	"angerlog/internal/models"
	"angerlog/internal/repository"

	"github.com/google/uuid"
)

type StatsService struct {
	repo *repository.StatsRepository
}

func NewStatsService(repo *repository.StatsRepository) *StatsService {
	return &StatsService{repo: repo}
}

func (s *StatsService) GetSummary(ctx context.Context, userID uuid.UUID, tz string, startDate, endDate *string) (*models.SummaryOut, *models.AppError) {
	summary, err := s.repo.GetSummary(ctx, userID, tz, startDate, endDate)
	if err != nil {
		return nil, models.ErrInternal
	}
	return summary, nil
}

func (s *StatsService) GetTrend(ctx context.Context, userID uuid.UUID, tz, granularity string, startDate, endDate *string) ([]models.TrendPoint, *models.AppError) {
	if granularity != "day" && granularity != "week" && granularity != "month" {
		return nil, models.ErrParam
	}

	trend, err := s.repo.GetTrend(ctx, userID, tz, granularity, startDate, endDate)
	if err != nil {
		return nil, models.ErrInternal
	}
	return trend, nil
}

func (s *StatsService) GetHeatmap(ctx context.Context, userID uuid.UUID, tz string, startDate, endDate *string) ([]models.HeatmapCell, *models.AppError) {
	heatmap, err := s.repo.GetHeatmap(ctx, userID, tz, startDate, endDate)
	if err != nil {
		return nil, models.ErrInternal
	}
	return heatmap, nil
}

