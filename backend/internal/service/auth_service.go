package service

import (
	"context"
	"time"

	"angerlog/internal/config"
	"angerlog/internal/models"
	"angerlog/internal/repository"
	"angerlog/internal/security"

	"github.com/google/uuid"
)

const (
	AccessCookie  = "access_token"
	RefreshCookie = "refresh_token"
)

type AuthService struct {
	repo *repository.AuthRepository
	cfg  *config.Config
}

func NewAuthService(repo *repository.AuthRepository, cfg *config.Config) *AuthService {
	return &AuthService{
		repo: repo,
		cfg:  cfg,
	}
}

func (s *AuthService) Authenticate(ctx context.Context, username, password string) (*models.User, *models.AppError) {
	if username == "" || password == "" {
		return nil, models.ErrParam
	}

	user, err := s.repo.GetUserByUsername(ctx, username)
	if err != nil {
		return nil, models.ErrInternal
	}
	if user == nil || !security.VerifyPassword(password, user.PasswordHash) {
		return nil, models.ErrUnauthorized
	}

	return user, nil
}

func (s *AuthService) IssueRefreshToken(ctx context.Context, userID uuid.UUID) (string, *models.AppError) {
	raw := security.GenerateRefreshToken()
	tokenHash := security.HashRefreshToken(raw)
	expiresAt := time.Now().UTC().Add(time.Duration(s.cfg.RefreshTokenExpireDays) * 24 * time.Hour)

	_, err := s.repo.CreateRefreshToken(ctx, userID, tokenHash, expiresAt)
	if err != nil {
		return "", models.ErrInternal
	}

	return raw, nil
}

func (s *AuthService) RotateRefreshToken(ctx context.Context, oldRaw string, userID uuid.UUID) (string, *models.AppError) {
	tokenHash := security.HashRefreshToken(oldRaw)
	stored, err := s.repo.GetRefreshToken(ctx, tokenHash)
	if err != nil {
		return "", models.ErrInternal
	}
	if stored == nil || stored.Revoked || stored.ExpiresAt.Before(time.Now().UTC()) || stored.UserID != userID {
		return "", models.ErrRefreshExpired
	}

	if err := s.repo.RevokeRefreshToken(ctx, tokenHash); err != nil {
		return "", models.ErrInternal
	}

	return s.IssueRefreshToken(ctx, userID)
}

func (s *AuthService) Logout(ctx context.Context, rawToken string) *models.AppError {
	if rawToken != "" {
		tokenHash := security.HashRefreshToken(rawToken)
		_ = s.repo.RevokeRefreshToken(ctx, tokenHash)
	}
	return nil
}

func (s *AuthService) UpdateBottleStyle(ctx context.Context, userID uuid.UUID, style string) (*models.User, *models.AppError) {
	if !models.IsValidBottleStyle(style) {
		return nil, models.ErrParam
	}

	updated, err := s.repo.UpdateBottleStyle(ctx, userID, style)
	if err != nil {
		return nil, models.ErrInternal
	}
	if updated == nil {
		return nil, models.ErrUnauthorized
	}

	return updated, nil
}

func (s *AuthService) GetUserByID(ctx context.Context, id uuid.UUID) (*models.User, *models.AppError) {
	user, err := s.repo.GetUserByID(ctx, id)
	if err != nil {
		return nil, models.ErrInternal
	}
	if user == nil {
		return nil, models.ErrNotFound
	}
	return user, nil
}

func (s *AuthService) GetRefreshToken(ctx context.Context, rawToken string) (*models.RefreshToken, *models.AppError) {
	tokenHash := security.HashRefreshToken(rawToken)
	stored, err := s.repo.GetRefreshToken(ctx, tokenHash)
	if err != nil {
		return nil, models.ErrInternal
	}
	if stored == nil {
		return nil, models.ErrRefreshExpired
	}
	return stored, nil
}

