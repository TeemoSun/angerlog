package security

import (
	"crypto/sha256"
	"encoding/hex"
	"strings"

	"github.com/google/uuid"
)

func GenerateRefreshToken() string {
	u1 := strings.ReplaceAll(uuid.NewString(), "-", "")
	u2 := strings.ReplaceAll(uuid.NewString(), "-", "")
	return u1 + u2
}

func HashRefreshToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

