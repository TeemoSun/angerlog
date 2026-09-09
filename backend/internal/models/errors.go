package models

import "fmt"

type AppError struct {
	Code       int    `json:"code"`
	Message    string `json:"message"`
	StatusCode int    `json:"-"`
}

func (e *AppError) Error() string {
	return fmt.Sprintf("[%d] %s", e.Code, e.Message)
}

var (
	ErrParam          = &AppError{Code: 40001, Message: "invalid parameters", StatusCode: 400}
	ErrUnauthorized   = &AppError{Code: 40101, Message: "invalid credentials", StatusCode: 401}
	ErrAccessExpired  = &AppError{Code: 40102, Message: "access token expired", StatusCode: 401}
	ErrRefreshExpired = &AppError{Code: 40103, Message: "refresh token invalid", StatusCode: 401}
	ErrCSRF           = &AppError{Code: 40301, Message: "CSRF validation failed", StatusCode: 403}
	ErrNotFound       = &AppError{Code: 40401, Message: "record not found", StatusCode: 404}
	ErrRateLimit      = &AppError{Code: 42901, Message: "too many login attempts", StatusCode: 429}
	ErrInternal       = &AppError{Code: 50000, Message: "internal server error", StatusCode: 500}
)

