package models

import (
	"time"

	"github.com/google/uuid"
)

var Categories = map[string]bool{
	"工作": true,
	"家庭": true,
	"交通": true,
	"社交": true,
	"其他": true,
}

func IsValidCategory(cat string) bool {
	return Categories[cat]
}

type AngerLog struct {
	ID               uuid.UUID  `json:"id"`
	UserID           uuid.UUID  `json:"user_id"`
	TriggerReason    string     `json:"trigger_reason"`
	Intensity        int        `json:"intensity"`
	Category         *string    `json:"category"`
	IsResolved       bool       `json:"is_resolved"`
	ResolutionMethod *string    `json:"resolution_method"`
	IsDeleted        bool       `json:"is_deleted"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
	ResolvedAt       *time.Time `json:"resolved_at"`
}

type LogCreate struct {
	TriggerReason string  `json:"trigger_reason"`
	Intensity     int     `json:"intensity"`
	Category      *string `json:"category"`
	CreatedAt     *string `json:"created_at"`
}

type LogUpdate struct {
	IsResolved       bool    `json:"is_resolved"`
	ResolutionMethod *string `json:"resolution_method"`
	ResolvedAt       *string `json:"resolved_at"`
}

type LogOut struct {
	ID               uuid.UUID  `json:"id"`
	TriggerReason    string     `json:"trigger_reason"`
	Intensity        int        `json:"intensity"`
	Category         *string    `json:"category"`
	IsResolved       bool       `json:"is_resolved"`
	ResolutionMethod *string    `json:"resolution_method"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
	ResolvedAt       *time.Time `json:"resolved_at"`
}

type LogListParams struct {
	Page         int
	PageSize     int
	IntensityMin *int
	IntensityMax *int
	Category     *string
	Resolved     *bool
}

