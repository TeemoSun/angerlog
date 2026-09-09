package security

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
)

func IssueCSRFToken(accessToken, csrfSecret string) string {
	mac := hmac.New(sha256.New, []byte(csrfSecret))
	mac.Write([]byte("csrf:" + accessToken))
	return hex.EncodeToString(mac.Sum(nil))
}

func VerifyCSRFToken(accessToken, provided, csrfSecret string) bool {
	if provided == "" || accessToken == "" {
		return false
	}
	expected := IssueCSRFToken(accessToken, csrfSecret)
	return hmac.Equal([]byte(expected), []byte(provided))
}

