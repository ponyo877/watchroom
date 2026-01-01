package usecase

import (
	"context"
	"crypto/rand"
	"encoding/base64"

	"github.com/ponyo877/youtube-friend-watch/internal/model"
	"github.com/ponyo877/youtube-friend-watch/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

type RoomWithDetails struct {
	RoomID      string
	Name        string
	CreatorID   string
	CreatorName string
	HasPassword bool
	ShortID     string
}

type RoomUsecase struct {
	roomRepo     *repository.RoomRepository
	shortURLRepo *repository.ShortURLRepository
}

func NewRoomUsecase(roomRepo *repository.RoomRepository, shortURLRepo *repository.ShortURLRepository) *RoomUsecase {
	return &RoomUsecase{
		roomRepo:     roomRepo,
		shortURLRepo: shortURLRepo,
	}
}

func (u *RoomUsecase) CreateRoom(ctx context.Context, roomID, name, creatorID, creatorName string, password *string) (string, error) {
	room := &model.Room{
		RoomID:      roomID,
		Name:        name,
		CreatorID:   creatorID,
		CreatorName: creatorName,
	}
	if err := u.roomRepo.Create(ctx, room); err != nil {
		return "", err
	}

	if password != nil && *password != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(*password), bcrypt.DefaultCost)
		if err != nil {
			return "", err
		}
		if err := u.roomRepo.CreatePassword(ctx, roomID, string(hash)); err != nil {
			return "", err
		}
	}

	shortID, err := generateShortID()
	if err != nil {
		return "", err
	}

	if err := u.shortURLRepo.Create(ctx, shortID, roomID); err != nil {
		return "", err
	}

	return shortID, nil
}

func (u *RoomUsecase) ListRooms(ctx context.Context) ([]*RoomWithDetails, error) {
	rooms, err := u.roomRepo.List(ctx)
	if err != nil {
		return nil, err
	}

	result := make([]*RoomWithDetails, 0, len(rooms))
	for _, room := range rooms {
		hasPassword, _ := u.roomRepo.HasPassword(ctx, room.RoomID)

		shortURL, _ := u.shortURLRepo.GetByRoomID(ctx, room.RoomID)
		shortID := ""
		if shortURL != nil {
			shortID = shortURL.ShortID
		}

		result = append(result, &RoomWithDetails{
			RoomID:      room.RoomID,
			Name:        room.Name,
			CreatorID:   room.CreatorID,
			CreatorName: room.CreatorName,
			HasPassword: hasPassword,
			ShortID:     shortID,
		})
	}
	return result, nil
}

func (u *RoomUsecase) VerifyPassword(ctx context.Context, roomID, password string) (bool, error) {
	hash, err := u.roomRepo.GetPasswordHash(ctx, roomID)
	if err != nil {
		return false, err
	}
	if hash == "" {
		return true, nil
	}
	err = bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil, nil
}

func (u *RoomUsecase) ChangePassword(ctx context.Context, roomID string, oldPassword *string, newPassword string) error {
	existingHash, err := u.roomRepo.GetPasswordHash(ctx, roomID)
	if err != nil {
		return err
	}

	if existingHash != "" && oldPassword != nil {
		if err := bcrypt.CompareHashAndPassword([]byte(existingHash), []byte(*oldPassword)); err != nil {
			return err
		}
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	if existingHash == "" {
		return u.roomRepo.CreatePassword(ctx, roomID, string(newHash))
	}
	return u.roomRepo.UpdatePassword(ctx, roomID, string(newHash))
}

func (u *RoomUsecase) DeletePassword(ctx context.Context, roomID, password string) error {
	valid, err := u.VerifyPassword(ctx, roomID, password)
	if err != nil {
		return err
	}
	if !valid {
		return bcrypt.ErrMismatchedHashAndPassword
	}
	return u.roomRepo.DeletePassword(ctx, roomID)
}

func (u *RoomUsecase) HasPassword(ctx context.Context, roomID string) (bool, error) {
	return u.roomRepo.HasPassword(ctx, roomID)
}

func (u *RoomUsecase) DeleteRoom(ctx context.Context, roomID string) error {
	_ = u.roomRepo.DeletePassword(ctx, roomID)
	return u.shortURLRepo.DeleteByRoomID(ctx, roomID)
}

func generateShortID() (string, error) {
	b := make([]byte, 6)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b)[:8], nil
}
