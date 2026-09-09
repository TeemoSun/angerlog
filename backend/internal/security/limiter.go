package security

import (
	"sync"
	"time"
)

type LoginRateLimiter struct {
	mu            sync.Mutex
	limit         int
	windowSeconds float64
	attempts      map[string][]float64
}

func NewLoginRateLimiter(limit int, windowSeconds int) *LoginRateLimiter {
	return &LoginRateLimiter{
		limit:         limit,
		windowSeconds: float64(windowSeconds),
		attempts:      make(map[string][]float64),
	}
}

func (l *LoginRateLimiter) Check(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := float64(time.Now().UnixNano()) / 1e9

	// Purge stale keys
	for k, timestamps := range l.attempts {
		if len(timestamps) == 0 || (now-timestamps[len(timestamps)-1] > l.windowSeconds) {
			delete(l.attempts, k)
		}
	}

	timestamps := l.attempts[key]
	// Remove entries outside the sliding window
	validIdx := 0
	for i, ts := range timestamps {
		if now-ts <= l.windowSeconds {
			validIdx = i
			break
		}
		if i == len(timestamps)-1 {
			validIdx = len(timestamps)
		}
	}
	timestamps = timestamps[validIdx:]

	if len(timestamps) >= l.limit {
		l.attempts[key] = timestamps
		return false
	}

	timestamps = append(timestamps, now)
	l.attempts[key] = timestamps
	return true
}

func (l *LoginRateLimiter) Reset(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.attempts, key)
}

func (l *LoginRateLimiter) Clear() {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.attempts = make(map[string][]float64)
}

