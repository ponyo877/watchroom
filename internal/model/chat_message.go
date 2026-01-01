package model

import "time"

type ChatMessage struct {
	ID            int
	MessageID     string
	RoomID        string
	SenderID      string
	SenderName    string
	SenderIconUrl *string
	Text          string
	CreatedAt     time.Time
}
