package models

import (
	"encoding/json"
	"net/http"
)

type PageMeta struct {
	Total    int64 `json:"total"`
	Page     int   `json:"page"`
	PageSize int   `json:"page_size"`
	HasNext  bool  `json:"has_next"`
}

type Envelope[T any] struct {
	Code    int       `json:"code"`
	Message string    `json:"message"`
	Data    T         `json:"data"`
	Meta    *PageMeta `json:"meta,omitempty"`
}

type ErrorEnvelope struct {
	Code    int     `json:"code"`
	Message string  `json:"message"`
	Data    *string `json:"data"`
}

func OK[T any](data T, meta *PageMeta) Envelope[T] {
	return Envelope[T]{
		Code:    0,
		Message: "success",
		Data:    data,
		Meta:    meta,
	}
}

func WriteOK[T any](w http.ResponseWriter, data T, meta *PageMeta) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(OK(data, meta))
}

func WriteError(w http.ResponseWriter, err *AppError) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(err.StatusCode)
	_ = json.NewEncoder(w).Encode(ErrorEnvelope{
		Code:    err.Code,
		Message: err.Message,
		Data:    nil,
	})
}

