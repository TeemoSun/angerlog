package models

type SummaryOut struct {
	TotalCount     int64            `json:"total_count"`
	AvgIntensity   *float64         `json:"avg_intensity"`
	MaxIntensity   *int             `json:"max_intensity"`
	MinIntensity   *int             `json:"min_intensity"`
	ResolvedCount  int64            `json:"resolved_count"`
	ResolveRate    *float64         `json:"resolve_rate"`
	CategoryCounts map[string]int64 `json:"category_counts"`
}

type TrendPoint struct {
	Period       string   `json:"period"`
	Count        int64    `json:"count"`
	AvgIntensity *float64 `json:"avg_intensity"`
}

type HeatmapCell struct {
	DayOfWeek int   `json:"day_of_week"`
	HourOfDay int   `json:"hour_of_day"`
	Count     int64 `json:"count"`
}

