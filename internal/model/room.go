package model

import "time"

type RoomPassword struct {
	ID           int
	RoomID       string
	PasswordHash string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}
