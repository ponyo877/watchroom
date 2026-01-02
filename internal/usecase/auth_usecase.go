package usecase

import (
	"context"
	"errors"

	"github.com/ponyo877/youtube-friend-watch/internal/repository"
	"github.com/ponyo877/youtube-friend-watch/internal/service"
)

var ErrRoomFull = errors.New("room is full")

type AuthUsecase struct {
	skyWayService *service.SkyWayService
	roomRepo      repository.RoomRepository
}

func NewAuthUsecase(skyWayService *service.SkyWayService, roomRepo repository.RoomRepository) *AuthUsecase {
	return &AuthUsecase{
		skyWayService: skyWayService,
		roomRepo:      roomRepo,
	}
}

func (u *AuthUsecase) CreateToken(ctx context.Context, userID string, roomName *string) (string, int64, error) {
	// Check member count if room is specified
	if roomName != nil && *roomName != "" {
		memberCount, maxMembers, err := u.roomRepo.GetMemberInfo(ctx, *roomName)
		if err != nil {
			// If room doesn't exist yet, allow creation
			if memberCount == 0 && maxMembers == 10 {
				// Default values returned for non-existent room
			}
		} else if memberCount >= maxMembers {
			return "", 0, ErrRoomFull
		}
	}

	return u.skyWayService.GenerateToken(userID, roomName)
}
