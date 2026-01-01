package service

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type SkyWayService struct {
	appID     string
	secretKey string
}

func NewSkyWayService(appID, secretKey string) *SkyWayService {
	return &SkyWayService{
		appID:     appID,
		secretKey: secretKey,
	}
}

func (s *SkyWayService) GenerateToken(userID string, roomName *string) (string, int64, error) {
	now := time.Now()
	expiresAt := now.Add(24 * time.Hour)

	channelConfig := map[string]interface{}{
		"id":   "*",
		"name": "*",
		"actions": []string{"write"},
		"members": []map[string]interface{}{
			{
				"id":   "*",
				"name": "*",
				"actions": []string{"write"},
				"publication": map[string]interface{}{
					"actions": []string{"write"},
				},
				"subscription": map[string]interface{}{
					"actions": []string{"write"},
				},
			},
		},
	}

	if roomName != nil && *roomName != "" {
		channelConfig["name"] = *roomName
	}

	claims := jwt.MapClaims{
		"jti": uuid.New().String(),
		"iat": now.Unix(),
		"exp": expiresAt.Unix(),
		"scope": map[string]interface{}{
			"app": map[string]interface{}{
				"id":       s.appID,
				"turn":     true,
				"actions":  []string{"read"},
				"channels": []map[string]interface{}{channelConfig},
			},
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString([]byte(s.secretKey))
	if err != nil {
		return "", 0, err
	}

	return signedToken, expiresAt.Unix(), nil
}
