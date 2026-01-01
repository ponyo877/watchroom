package repository

import (
	"context"
	"database/sql"

	"github.com/ponyo877/youtube-friend-watch/internal/model"
)

type ChatRepository struct {
	db *sql.DB
}

func NewChatRepository(db *sql.DB) *ChatRepository {
	return &ChatRepository{db: db}
}

func (r *ChatRepository) Create(ctx context.Context, msg *model.ChatMessage) error {
	_, err := r.db.ExecContext(ctx,
		"INSERT INTO chat_messages (message_id, room_id, sender_id, sender_name, sender_icon_url, text) VALUES (?, ?, ?, ?, ?, ?)",
		msg.MessageID, msg.RoomID, msg.SenderID, msg.SenderName, msg.SenderIconUrl, msg.Text)
	return err
}

func (r *ChatRepository) GetRecentByRoomID(ctx context.Context, roomID string, limit int) ([]*model.ChatMessage, error) {
	rows, err := r.db.QueryContext(ctx,
		"SELECT id, message_id, room_id, sender_id, sender_name, sender_icon_url, text, created_at FROM chat_messages WHERE room_id = ? ORDER BY id DESC LIMIT ?",
		roomID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []*model.ChatMessage
	for rows.Next() {
		msg := &model.ChatMessage{}
		if err := rows.Scan(&msg.ID, &msg.MessageID, &msg.RoomID, &msg.SenderID, &msg.SenderName, &msg.SenderIconUrl, &msg.Text, &msg.CreatedAt); err != nil {
			return nil, err
		}
		messages = append(messages, msg)
	}

	// Reverse to get chronological order (oldest first)
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	return messages, rows.Err()
}
