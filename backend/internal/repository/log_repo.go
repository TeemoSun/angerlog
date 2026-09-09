package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"angerlog/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type LogRepository struct {
	pool *pgxpool.Pool
}

func NewLogRepository(pool *pgxpool.Pool) *LogRepository {
	return &LogRepository{pool: pool}
}

func (r *LogRepository) CreateLog(ctx context.Context, userID uuid.UUID, reason string, intensity int, category *string, customCreatedAt *time.Time) (*models.AngerLog, error) {
	now := time.Now().UTC()
	createdAt := now
	updatedAt := now
	if customCreatedAt != nil {
		createdAt = *customCreatedAt
		updatedAt = *customCreatedAt
	}

	newID := uuid.New()
	query := `INSERT INTO anger_logs (id, user_id, trigger_reason, intensity, category, is_resolved, is_deleted, created_at, updated_at)
	          VALUES ($1, $2, $3, $4, $5, FALSE, FALSE, $6, $7)
	          RETURNING id, user_id, trigger_reason, intensity, category, is_resolved, resolution_method, is_deleted, created_at, updated_at, resolved_at`

	var log models.AngerLog
	err := r.pool.QueryRow(ctx, query, newID, userID, reason, intensity, category, createdAt, updatedAt).Scan(
		&log.ID, &log.UserID, &log.TriggerReason, &log.Intensity, &log.Category,
		&log.IsResolved, &log.ResolutionMethod, &log.IsDeleted,
		&log.CreatedAt, &log.UpdatedAt, &log.ResolvedAt,
	)
	if err != nil {
		return nil, err
	}
	return &log, nil
}

func (r *LogRepository) GetLog(ctx context.Context, logID, userID uuid.UUID) (*models.AngerLog, error) {
	query := `SELECT id, user_id, trigger_reason, intensity, category, is_resolved, resolution_method, is_deleted, created_at, updated_at, resolved_at
	          FROM anger_logs
	          WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE`

	var log models.AngerLog
	err := r.pool.QueryRow(ctx, query, logID, userID).Scan(
		&log.ID, &log.UserID, &log.TriggerReason, &log.Intensity, &log.Category,
		&log.IsResolved, &log.ResolutionMethod, &log.IsDeleted,
		&log.CreatedAt, &log.UpdatedAt, &log.ResolvedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &log, nil
}

func (r *LogRepository) ListLogs(ctx context.Context, userID uuid.UUID, params models.LogListParams) ([]models.AngerLog, int64, error) {
	whereClauses := []string{"user_id = $1", "is_deleted = FALSE"}
	args := []interface{}{userID}
	argIdx := 2

	if params.IntensityMin != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("intensity >= $%d", argIdx))
		args = append(args, *params.IntensityMin)
		argIdx++
	}
	if params.IntensityMax != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("intensity <= $%d", argIdx))
		args = append(args, *params.IntensityMax)
		argIdx++
	}
	if params.Category != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("category = $%d", argIdx))
		args = append(args, *params.Category)
		argIdx++
	}
	if params.Resolved != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("is_resolved = $%d", argIdx))
		args = append(args, *params.Resolved)
		argIdx++
	}

	whereSQL := strings.Join(whereClauses, " AND ")

	// Total count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM anger_logs WHERE %s", whereSQL)
	var total int64
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	page := params.Page
	if page < 1 {
		page = 1
	}
	pageSize := params.PageSize
	if pageSize < 1 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	selectQuery := fmt.Sprintf(
		`SELECT id, user_id, trigger_reason, intensity, category, is_resolved, resolution_method, is_deleted, created_at, updated_at, resolved_at
		 FROM anger_logs
		 WHERE %s
		 ORDER BY created_at DESC
		 OFFSET $%d LIMIT $%d`,
		whereSQL, argIdx, argIdx+1,
	)
	args = append(args, offset, pageSize)

	rows, err := r.pool.Query(ctx, selectQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]models.AngerLog, 0)
	for rows.Next() {
		var log models.AngerLog
		if err := rows.Scan(
			&log.ID, &log.UserID, &log.TriggerReason, &log.Intensity, &log.Category,
			&log.IsResolved, &log.ResolutionMethod, &log.IsDeleted,
			&log.CreatedAt, &log.UpdatedAt, &log.ResolvedAt,
		); err != nil {
			return nil, 0, err
		}
		items = append(items, log)
	}

	return items, total, nil
}

func (r *LogRepository) UpdateLog(ctx context.Context, log *models.AngerLog, isResolved bool, resolutionMethod *string, resolvedAt *time.Time) (*models.AngerLog, error) {
	now := time.Now().UTC()

	var newResolved bool
	var newResolvedAt *time.Time
	var newResolutionMethod *string

	if isResolved && !log.IsResolved {
		newResolved = true
		if resolvedAt != nil {
			newResolvedAt = resolvedAt
		} else {
			newResolvedAt = &now
		}
		newResolutionMethod = resolutionMethod
	} else if !isResolved {
		newResolved = false
		newResolvedAt = nil
		newResolutionMethod = nil
	} else {
		// Was resolved, still resolved
		newResolved = true
		if resolvedAt != nil {
			newResolvedAt = resolvedAt
		} else {
			newResolvedAt = log.ResolvedAt
		}
		newResolutionMethod = resolutionMethod
	}

	query := `UPDATE anger_logs
	          SET is_resolved = $1, resolution_method = $2, resolved_at = $3, updated_at = $4
	          WHERE id = $5 AND user_id = $6 AND is_deleted = FALSE
	          RETURNING id, user_id, trigger_reason, intensity, category, is_resolved, resolution_method, is_deleted, created_at, updated_at, resolved_at`

	var updated models.AngerLog
	err := r.pool.QueryRow(ctx, query, newResolved, newResolutionMethod, newResolvedAt, now, log.ID, log.UserID).Scan(
		&updated.ID, &updated.UserID, &updated.TriggerReason, &updated.Intensity, &updated.Category,
		&updated.IsResolved, &updated.ResolutionMethod, &updated.IsDeleted,
		&updated.CreatedAt, &updated.UpdatedAt, &updated.ResolvedAt,
	)
	if err != nil {
		return nil, err
	}
	return &updated, nil
}

func (r *LogRepository) SoftDeleteLog(ctx context.Context, logID, userID uuid.UUID) (bool, error) {
	now := time.Now().UTC()
	query := `UPDATE anger_logs
	          SET is_deleted = TRUE, updated_at = $1
	          WHERE id = $2 AND user_id = $3 AND is_deleted = FALSE`
	cmdTag, err := r.pool.Exec(ctx, query, now, logID, userID)
	if err != nil {
		return false, err
	}
	return cmdTag.RowsAffected() > 0, nil
}

