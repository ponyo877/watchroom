package repository

import (
	"context"
	"time"

	"github.com/ponyo877/youtube-friend-watch/internal/model"
	"github.com/redis/go-redis/v9"
)

const (
	shortURLPrefix     = "shorturl:"
	shortURLRoomPrefix = "shorturl:room:"
)

// ShortURLRepositoryRedis is the Redis implementation of ShortURLRepository
type ShortURLRepositoryRedis struct {
	client *redis.Client
}

// NewShortURLRepositoryRedis creates a new Redis-based ShortURLRepository
func NewShortURLRepositoryRedis(client *redis.Client) *ShortURLRepositoryRedis {
	return &ShortURLRepositoryRedis{client: client}
}

func (r *ShortURLRepositoryRedis) Create(ctx context.Context, shortID, roomID string) error {
	pipe := r.client.Pipeline()
	pipe.Set(ctx, shortURLPrefix+shortID, roomID, 0)
	pipe.Set(ctx, shortURLRoomPrefix+roomID, shortID, 0)
	_, err := pipe.Exec(ctx)
	return err
}

func (r *ShortURLRepositoryRedis) GetByShortID(ctx context.Context, shortID string) (*model.ShortURL, error) {
	roomID, err := r.client.Get(ctx, shortURLPrefix+shortID).Result()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &model.ShortURL{
		ShortID:   shortID,
		RoomID:    roomID,
		CreatedAt: time.Now(), // Redis doesn't store creation time, use current
	}, nil
}

func (r *ShortURLRepositoryRedis) GetByRoomID(ctx context.Context, roomID string) (*model.ShortURL, error) {
	shortID, err := r.client.Get(ctx, shortURLRoomPrefix+roomID).Result()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &model.ShortURL{
		ShortID:   shortID,
		RoomID:    roomID,
		CreatedAt: time.Now(),
	}, nil
}

func (r *ShortURLRepositoryRedis) DeleteByRoomID(ctx context.Context, roomID string) error {
	// Get shortID first to delete both keys
	shortID, err := r.client.Get(ctx, shortURLRoomPrefix+roomID).Result()
	if err == redis.Nil {
		return nil // Nothing to delete
	}
	if err != nil {
		return err
	}

	pipe := r.client.Pipeline()
	pipe.Del(ctx, shortURLPrefix+shortID)
	pipe.Del(ctx, shortURLRoomPrefix+roomID)
	_, err = pipe.Exec(ctx)
	return err
}
