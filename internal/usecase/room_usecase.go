package usecase

import (
	"context"
	"crypto/rand"
	"encoding/base64"

	"github.com/ponyo877/youtube-friend-watch/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

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

func (u *RoomUsecase) CreateRoom(ctx context.Context, roomID string, password *string) (string, error) {
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
