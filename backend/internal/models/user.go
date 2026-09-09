package models

import (
	"time"

	"github.com/google/uuid"
)

var BottleStyles = map[string]bool{
	"A":       true,
	"B":       true,
	"C":       true,
	"D":       true,
	"E":       true,
	"F":       true,
	"G":       true,
	"H":       true,
	"classic": true,
}

func IsValidBottleStyle(style string) bool {
	return BottleStyles[style]
}

type User struct {
	ID           uuid.UUID `json:"id"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"-"`
	Timezone     string    `json:"timezone"`
	BottleStyle  string    `json:"bottle_style"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	CSRFToken   string `json:"csrf_token"`
	Username    string `json:"username"`
	Timezone    string `json:"timezone"`
	BottleStyle string `json:"bottle_style"`
}

type RefreshResponse struct {
	CSRFToken   string `json:"csrf_token"`
	Timezone    string `json:"timezone"`
	BottleStyle string `json:"bottle_style"`
}

type MeResponse struct {
	Username    string `json:"username"`
	Timezone    string `json:"timezone"`
	BottleStyle string `json:"bottle_style"`
}

type BottleStyleUpdate struct {
	BottleStyle string `json:"bottle_style"`
}

type BottleStyleResponse struct {
	BottleStyle string `json:"bottle_style"`
}

