package model

import "time"

type ShortURL struct {
	ID        int
	ShortID   string
	RoomID    string
	CreatedAt time.Time
}
