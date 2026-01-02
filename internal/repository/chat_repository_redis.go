package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/ponyo877/youtube-friend-watch/internal/model"
	"github.com/redis/go-redis/v9"
)

const (
	chatPrefix = "chat:"
)

// ChatRepositoryRedis is the Redis implementation of ChatRepository
type ChatRepositoryRedis struct {
	client *redis.Client
}

// NewChatRepositoryRedis creates a new Redis-based ChatRepository
func NewChatRepositoryRedis(client *redis.Client) *ChatRepositoryRedis {
	return &ChatRepositoryRedis{client: client}
}

// chatMessageRedis is the structure stored in Redis
type chatMessageRedis struct {
	MessageID     string  `json:"message_id"`
	RoomID        string  `json:"room_id"`
	SenderID      string  `json:"sender_id"`
	SenderName    string  `json:"sender_name"`
	SenderIconUrl *string `json:"sender_icon_url,omitempty"`
	Text          string  `json:"text"`
	CreatedAt     int64   `json:"created_at"`
}

func (r *ChatRepositoryRedis) Create(ctx context.Context, msg *model.ChatMessage) error {
	now := time.Now()
	data := chatMessageRedis{
		MessageID:     msg.MessageID,
		RoomID:        msg.RoomID,
		SenderID:      msg.SenderID,
		SenderName:    msg.SenderName,
		SenderIconUrl: msg.SenderIconUrl,
		Text:          msg.Text,
		CreatedAt:     now.UnixMilli(),
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return err
	}

	return r.client.ZAdd(ctx, chatPrefix+msg.RoomID, redis.Z{
		Score:  float64(now.UnixMilli()),
		Member: string(jsonData),
	}).Err()
}

func (r *ChatRepositoryRedis) GetRecentByRoomID(ctx context.Context, roomID string, limit int) ([]*model.ChatMessage, error) {
	// Get most recent messages (highest scores = newest)
	results, err := r.client.ZRevRange(ctx, chatPrefix+roomID, 0, int64(limit-1)).Result()
	if err != nil {
		return nil, err
	}

	messages := make([]*model.ChatMessage, 0, len(results))
	for _, jsonStr := range results {
		var data chatMessageRedis
		if err := json.Unmarshal([]byte(jsonStr), &data); err != nil {
			continue // Skip malformed entries
		}
		messages = append(messages, &model.ChatMessage{
			MessageID:     data.MessageID,
			RoomID:        data.RoomID,
			SenderID:      data.SenderID,
			SenderName:    data.SenderName,
			SenderIconUrl: data.SenderIconUrl,
			Text:          data.Text,
			CreatedAt:     time.UnixMilli(data.CreatedAt),
		})
	}

	// Reverse to get chronological order (oldest first, same as MySQL impl)
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	return messages, nil
}

func (r *ChatRepositoryRedis) DeleteByRoomID(ctx context.Context, roomID string) error {
	return r.client.Del(ctx, chatPrefix+roomID).Err()
}
