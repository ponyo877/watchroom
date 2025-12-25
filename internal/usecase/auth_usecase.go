package usecase

import (
	"github.com/ponyo877/youtube-friend-watch/internal/service"
)

type AuthUsecase struct {
	skyWayService *service.SkyWayService
}

func NewAuthUsecase(skyWayService *service.SkyWayService) *AuthUsecase {
	return &AuthUsecase{
		skyWayService: skyWayService,
	}
}

func (u *AuthUsecase) CreateToken(userID string, roomName *string) (string, int64, error) {
	return u.skyWayService.GenerateToken(userID, roomName)
}
