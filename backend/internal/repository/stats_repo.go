package repository

import (
	"context"
	"database/sql"
	"fmt"
	"math"
	"strings"
	"time"

	"angerlog/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type StatsRepository struct {
	pool *pgxpool.Pool
}

func NewStatsRepository(pool *pgxpool.Pool) *StatsRepository {
	return &StatsRepository{pool: pool}
}

func parseDateBounds(tz string, startDate, endDate *string) (*time.Time, *time.Time, error) {
	loc, err := time.LoadLocation(tz)
	if err != nil {
		loc = time.UTC
	}

	var startTime, endTime *time.Time

	if startDate != nil && *startDate != "" {
		t, err := time.ParseInLocation("2006-01-02", *startDate, loc)
		if err != nil {
			return nil, nil, err
		}
		utcStart := t.UTC()
		startTime = &utcStart
	}

	if endDate != nil && *endDate != "" {
		t, err := time.ParseInLocation("2006-01-02", *endDate, loc)
		if err != nil {
			return nil, nil, err
		}
		utcEnd := time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 999999999, loc).UTC()
		endTime = &utcEnd
	}

	return startTime, endTime, nil
}

func buildRangeFilters(userID uuid.UUID, startTime, endTime *time.Time) ([]string, []interface{}) {
	whereClauses := []string{"user_id = $1", "is_deleted = FALSE"}
	args := []interface{}{userID}
	argIdx := 2

	if startTime != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("created_at >= $%d", argIdx))
		args = append(args, *startTime)
		argIdx++
	}

	if endTime != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("created_at <= $%d", argIdx))
		args = append(args, *endTime)
		argIdx++
	}

	return whereClauses, args
}

func (r *StatsRepository) GetSummary(ctx context.Context, userID uuid.UUID, tz string, startDate, endDate *string) (*models.SummaryOut, error) {
	startTime, endTime, err := parseDateBounds(tz, startDate, endDate)
	if err != nil {
		return nil, err
	}

	whereClauses, args := buildRangeFilters(userID, startTime, endTime)
	whereSQL := strings.Join(whereClauses, " AND ")

	summaryQuery := fmt.Sprintf(
		`SELECT
			COUNT(*) as total,
			AVG(intensity) as avg,
			MAX(intensity) as max_intensity,
			MIN(intensity) as min_intensity,
			COUNT(*) FILTER (WHERE is_resolved = TRUE) as resolved
		 FROM anger_logs
		 WHERE %s`,
		whereSQL,
	)

	var total int64
	var rawAvg sql.NullFloat64
	var rawMax, rawMin sql.NullInt32
	var resolved int64

	err = r.pool.QueryRow(ctx, summaryQuery, args...).Scan(&total, &rawAvg, &rawMax, &rawMin, &resolved)
	if err != nil {
		return nil, err
	}

	var avgIntensity *float64
	var maxIntensity, minIntensity *int
	var resolveRate *float64

	if total > 0 {
		if rawAvg.Valid {
			rounded := math.Round(rawAvg.Float64*100) / 100
			avgIntensity = &rounded
		}
		if rawMax.Valid {
			v := int(rawMax.Int32)
			maxIntensity = &v
		}
		if rawMin.Valid {
			v := int(rawMin.Int32)
			minIntensity = &v
		}
		rate := math.Round((float64(resolved)/float64(total))*10000) / 10000
		resolveRate = &rate
	}

	categoryCounts := make(map[string]int64)
	catQuery := fmt.Sprintf(
		`SELECT category, COUNT(*)
		 FROM anger_logs
		 WHERE %s AND category IS NOT NULL
		 GROUP BY category`,
		whereSQL,
	)

	catRows, err := r.pool.Query(ctx, catQuery, args...)
	if err != nil {
		return nil, err
	}
	defer catRows.Close()

	for catRows.Next() {
		var cat string
		var count int64
		if err := catRows.Scan(&cat, &count); err != nil {
			return nil, err
		}
		categoryCounts[cat] = count
	}

	return &models.SummaryOut{
		TotalCount:     total,
		AvgIntensity:   avgIntensity,
		MaxIntensity:   maxIntensity,
		MinIntensity:   minIntensity,
		ResolvedCount:  resolved,
		ResolveRate:    resolveRate,
		CategoryCounts: categoryCounts,
	}, nil
}

func (r *StatsRepository) GetTrend(ctx context.Context, userID uuid.UUID, tz, granularity string, startDate, endDate *string) ([]models.TrendPoint, error) {
	startTime, endTime, err := parseDateBounds(tz, startDate, endDate)
	if err != nil {
		return nil, err
	}

	whereClauses, args := buildRangeFilters(userID, startTime, endTime)
	tzArgIdx := len(args) + 1
	args = append(args, tz)

	var periodExpr string
	if granularity == "month" {
		periodExpr = fmt.Sprintf("TO_CHAR(DATE_TRUNC('month', timezone($%d, created_at)), 'YYYY-MM')", tzArgIdx)
	} else if granularity == "week" {
		periodExpr = fmt.Sprintf("TO_CHAR(DATE_TRUNC('week', timezone($%d, created_at)), 'YYYY-MM-DD')", tzArgIdx)
	} else {
		periodExpr = fmt.Sprintf("TO_CHAR(DATE_TRUNC('day', timezone($%d, created_at)), 'YYYY-MM-DD')", tzArgIdx)
	}

	whereSQL := strings.Join(whereClauses, " AND ")
	query := fmt.Sprintf(
		`SELECT
			%s AS period,
			COUNT(*) AS count,
			AVG(intensity) AS avg_intensity
		 FROM anger_logs
		 WHERE %s
		 GROUP BY period
		 ORDER BY period`,
		periodExpr, whereSQL,
	)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	points := make([]models.TrendPoint, 0)
	for rows.Next() {
		var period string
		var count int64
		var rawAvg sql.NullFloat64
		if err := rows.Scan(&period, &count, &rawAvg); err != nil {
			return nil, err
		}

		var avg *float64
		if rawAvg.Valid {
			rounded := math.Round(rawAvg.Float64*100) / 100
			avg = &rounded
		}

		points = append(points, models.TrendPoint{
			Period:       period,
			Count:        count,
			AvgIntensity: avg,
		})
	}

	return points, nil
}

func (r *StatsRepository) GetHeatmap(ctx context.Context, userID uuid.UUID, tz string, startDate, endDate *string) ([]models.HeatmapCell, error) {
	startTime, endTime, err := parseDateBounds(tz, startDate, endDate)
	if err != nil {
		return nil, err
	}

	whereClauses, args := buildRangeFilters(userID, startTime, endTime)
	tzArgIdx := len(args) + 1
	args = append(args, tz)

	whereSQL := strings.Join(whereClauses, " AND ")
	query := fmt.Sprintf(
		`SELECT
			CAST(EXTRACT(ISODOW FROM timezone($%d, created_at)) AS INTEGER) AS day_of_week,
			CAST(EXTRACT(HOUR FROM timezone($%d, created_at)) AS INTEGER) AS hour_of_day,
			COUNT(*) AS count
		 FROM anger_logs
		 WHERE %s
		 GROUP BY day_of_week, hour_of_day
		 ORDER BY day_of_week, hour_of_day`,
		tzArgIdx, tzArgIdx, whereSQL,
	)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	cells := make([]models.HeatmapCell, 0)
	for rows.Next() {
		var dow, hod int
		var count int64
		if err := rows.Scan(&dow, &hod, &count); err != nil {
			return nil, err
		}
		cells = append(cells, models.HeatmapCell{
			DayOfWeek: dow,
			HourOfDay: hod,
			Count:     count,
		})
	}

	return cells, nil
}

