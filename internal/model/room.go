package model

import "time"

type Room struct {
	ID                    int
	RoomID                string
	Name                  string
	CreatorID             string
	CreatorName           string
	IsActive              bool
	IsPermanent           bool
	CurrentVideoID        *string
	CurrentVideoTitle     *string
	CurrentVideoThumbnail *string
	MemberCount           int
	MaxMembers            int
	CreatedAt             time.Time
	UpdatedAt             time.Time
}

type RoomPassword struct {
	ID           int
	RoomID       string
	PasswordHash string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}
