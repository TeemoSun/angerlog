package database

import (
	"context"
	"fmt"
	"time"

	"angerlog/internal/security"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func Migrate(ctx context.Context, pool *pgxpool.Pool) error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id UUID PRIMARY KEY,
			username VARCHAR(50) UNIQUE NOT NULL,
			password_hash VARCHAR(255) NOT NULL,
			timezone VARCHAR(50) NOT NULL,
			bottle_style VARCHAR(20) NOT NULL DEFAULT 'C',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS bottle_style VARCHAR(20) NOT NULL DEFAULT 'C';`,
		`DO $$
		BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_users_bottle_style') THEN
				ALTER TABLE users ADD CONSTRAINT ck_users_bottle_style CHECK (bottle_style IN ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'classic'));
			END IF;
		END $$;`,
		`CREATE TABLE IF NOT EXISTS refresh_tokens (
			id UUID PRIMARY KEY,
			user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			token_hash VARCHAR(255) NOT NULL,
			expires_at TIMESTAMPTZ NOT NULL,
			revoked BOOLEAN NOT NULL DEFAULT FALSE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,
		`CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens (user_id);`,
		`CREATE INDEX IF NOT EXISTS idx_refresh_expires ON refresh_tokens (expires_at);`,
		`CREATE TABLE IF NOT EXISTS anger_logs (
			id UUID PRIMARY KEY,
			user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			trigger_reason TEXT NOT NULL,
			intensity INTEGER NOT NULL,
			category VARCHAR(20),
			is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
			resolution_method TEXT,
			is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			resolved_at TIMESTAMPTZ
		);`,
		`DO $$
		BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_anger_logs_intensity') THEN
				ALTER TABLE anger_logs ADD CONSTRAINT ck_anger_logs_intensity CHECK (intensity BETWEEN 1 AND 10);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_anger_logs_category') THEN
				ALTER TABLE anger_logs ADD CONSTRAINT ck_anger_logs_category CHECK (category IN ('工作', '家庭', '交通', '社交', '其他') OR category IS NULL);
			END IF;
		END $$;`,
		`CREATE INDEX IF NOT EXISTS idx_logs_user_created ON anger_logs (user_id, created_at) WHERE is_deleted = FALSE;`,
		`CREATE INDEX IF NOT EXISTS idx_logs_intensity ON anger_logs (intensity) WHERE is_deleted = FALSE;`,
		`CREATE INDEX IF NOT EXISTS idx_logs_resolved ON anger_logs (is_resolved) WHERE is_deleted = FALSE;`,
		`CREATE INDEX IF NOT EXISTS idx_logs_category ON anger_logs (category) WHERE is_deleted = FALSE;`,
	}

	for _, q := range queries {
		if _, err := pool.Exec(ctx, q); err != nil {
			return fmt.Errorf("migration query failed: %s: %w", q, err)
		}
	}

	return nil
}

func UpsertDefaultUser(ctx context.Context, pool *pgxpool.Pool, username, plaintextPassword, timezone string) error {
	var id uuid.UUID
	var currentHash string
	var currentTz string

	err := pool.QueryRow(ctx, "SELECT id, password_hash, timezone FROM users WHERE username = $1", username).Scan(&id, &currentHash, &currentTz)
	if err != nil {
		if err == pgx.ErrNoRows {
			// User does not exist, create
			hash, err := security.HashPassword(plaintextPassword)
			if err != nil {
				return fmt.Errorf("failed to hash password: %w", err)
			}
			newID := uuid.New()
			now := time.Now().UTC()
			_, err = pool.Exec(ctx,
				`INSERT INTO users (id, username, password_hash, timezone, bottle_style, created_at, updated_at)
				 VALUES ($1, $2, $3, $4, 'C', $5, $5)`,
				newID, username, hash, timezone, now,
			)
			if err != nil {
				return fmt.Errorf("failed to insert default user: %w", err)
			}
			return nil
		}
		return fmt.Errorf("failed to query default user: %w", err)
	}

	// User exists, check if password or timezone changed
	passwordMatches := security.VerifyPassword(plaintextPassword, currentHash)
	if !passwordMatches || currentTz != timezone {
		newHash := currentHash
		if !passwordMatches {
			var err error
			newHash, err = security.HashPassword(plaintextPassword)
			if err != nil {
				return fmt.Errorf("failed to hash new password: %w", err)
			}
		}
		now := time.Now().UTC()
		_, err := pool.Exec(ctx,
			"UPDATE users SET password_hash = $1, timezone = $2, updated_at = $3 WHERE id = $4",
			newHash, timezone, now, id,
		)
		if err != nil {
			return fmt.Errorf("failed to update default user: %w", err)
		}
	}

	return nil
}

