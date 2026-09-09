package repository

import (
	"context"
	"time"

	"angerlog/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AuthRepository struct {
	pool *pgxpool.Pool
}

func NewAuthRepository(pool *pgxpool.Pool) *AuthRepository {
	return &AuthRepository{pool: pool}
}

func (r *AuthRepository) GetUserByUsername(ctx context.Context, username string) (*models.User, error) {
	query := `SELECT id, username, password_hash, timezone, bottle_style, created_at, updated_at
	          FROM users WHERE username = $1`
	var u models.User
	err := r.pool.QueryRow(ctx, query, username).Scan(
		&u.ID, &u.Username, &u.PasswordHash, &u.Timezone, &u.BottleStyle, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

func (r *AuthRepository) GetUserByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	query := `SELECT id, username, password_hash, timezone, bottle_style, created_at, updated_at
	          FROM users WHERE id = $1`
	var u models.User
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&u.ID, &u.Username, &u.PasswordHash, &u.Timezone, &u.BottleStyle, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

func (r *AuthRepository) UpdateBottleStyle(ctx context.Context, userID uuid.UUID, bottleStyle string) (*models.User, error) {
	now := time.Now().UTC()
	query := `UPDATE users SET bottle_style = $1, updated_at = $2
	          WHERE id = $3
	          RETURNING id, username, password_hash, timezone, bottle_style, created_at, updated_at`
	var u models.User
	err := r.pool.QueryRow(ctx, query, bottleStyle, now, userID).Scan(
		&u.ID, &u.Username, &u.PasswordHash, &u.Timezone, &u.BottleStyle, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

func (r *AuthRepository) UpsertUser(ctx context.Context, username, passwordHash, timezone, bottleStyle string) (*models.User, error) {
	existing, err := r.GetUserByUsername(ctx, username)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	if existing == nil {
		newID := uuid.New()
		if bottleStyle == "" {
			bottleStyle = "C"
		}
		query := `INSERT INTO users (id, username, password_hash, timezone, bottle_style, created_at, updated_at)
		          VALUES ($1, $2, $3, $4, $5, $6, $6)
		          RETURNING id, username, password_hash, timezone, bottle_style, created_at, updated_at`
		var u models.User
		err := r.pool.QueryRow(ctx, query, newID, username, passwordHash, timezone, bottleStyle, now).Scan(
			&u.ID, &u.Username, &u.PasswordHash, &u.Timezone, &u.BottleStyle, &u.CreatedAt, &u.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		return &u, nil
	}

	if existing.PasswordHash != passwordHash || existing.Timezone != timezone {
		query := `UPDATE users SET password_hash = $1, timezone = $2, updated_at = $3
		          WHERE id = $4
		          RETURNING id, username, password_hash, timezone, bottle_style, created_at, updated_at`
		var u models.User
		err := r.pool.QueryRow(ctx, query, passwordHash, timezone, now, existing.ID).Scan(
			&u.ID, &u.Username, &u.PasswordHash, &u.Timezone, &u.BottleStyle, &u.CreatedAt, &u.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		return &u, nil
	}

	return existing, nil
}

func (r *AuthRepository) GetRefreshToken(ctx context.Context, tokenHash string) (*models.RefreshToken, error) {
	query := `SELECT id, user_id, token_hash, expires_at, revoked, created_at
	          FROM refresh_tokens WHERE token_hash = $1`
	var t models.RefreshToken
	err := r.pool.QueryRow(ctx, query, tokenHash).Scan(
		&t.ID, &t.UserID, &t.TokenHash, &t.ExpiresAt, &t.Revoked, &t.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &t, nil
}

func (r *AuthRepository) CreateRefreshToken(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) (*models.RefreshToken, error) {
	now := time.Now().UTC()
	newID := uuid.New()
	query := `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at)
	          VALUES ($1, $2, $3, $4, FALSE, $5)
	          RETURNING id, user_id, token_hash, expires_at, revoked, created_at`
	var t models.RefreshToken
	err := r.pool.QueryRow(ctx, query, newID, userID, tokenHash, expiresAt, now).Scan(
		&t.ID, &t.UserID, &t.TokenHash, &t.ExpiresAt, &t.Revoked, &t.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *AuthRepository) RevokeRefreshToken(ctx context.Context, tokenHash string) error {
	query := `UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1`
	_, err := r.pool.Exec(ctx, query, tokenHash)
	return err
}

func (r *AuthRepository) RevokeAllForUser(ctx context.Context, userID uuid.UUID) error {
	query := `DELETE FROM refresh_tokens WHERE user_id = $1`
	_, err := r.pool.Exec(ctx, query, userID)
	return err
}

func (r *AuthRepository) PurgeExpiredRefreshTokens(ctx context.Context) error {
	query := `DELETE FROM refresh_tokens WHERE expires_at < NOW()`
	_, err := r.pool.Exec(ctx, query)
	return err
}

func (r *AuthRepository) CountActiveRefreshTokens(ctx context.Context, userID uuid.UUID) (int, error) {
	query := `SELECT COUNT(*) FROM refresh_tokens
	          WHERE user_id = $1 AND revoked = FALSE AND expires_at > NOW()`
	var count int
	err := r.pool.QueryRow(ctx, query, userID).Scan(&count)
	return count, err
}

