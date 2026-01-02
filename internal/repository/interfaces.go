package repository

import (
	"context"
	"time"

	"github.com/ponyo877/youtube-friend-watch/internal/model"
)

// RoomRepository defines the interface for room data access
type RoomRepository interface {
	Create(ctx context.Context, room *model.Room) error
	List(ctx context.Context) ([]*model.Room, error)
	GetByRoomID(ctx context.Context, roomID string) (*model.Room, error)
	UpdateCurrentVideo(ctx context.Context, roomID, videoID, title, thumbnail string) error
	IncrementMemberCount(ctx context.Context, roomID string) error
	DecrementMemberCount(ctx context.Context, roomID string) error
	GetMemberInfo(ctx context.Context, roomID string) (memberCount int, maxMembers int, err error)
	Deactivate(ctx context.Context, roomID string) error
	// Password related
	CreatePassword(ctx context.Context, roomID, passwordHash string) error
	GetPasswordHash(ctx context.Context, roomID string) (string, error)
	UpdatePassword(ctx context.Context, roomID, passwordHash string) error
	DeletePassword(ctx context.Context, roomID string) error
	HasPassword(ctx context.Context, roomID string) (bool, error)
	// Member management with cleanup
	DecrementAndDeleteIfEmpty(ctx context.Context, roomID string) error
	// Sync member count with actual SkyWay room members
	SyncMemberCount(ctx context.Context, roomID string, actualCount int) error
	// Reset member count for stale rooms (not updated for a while)
	ResetStaleMemberCounts(ctx context.Context, staleDuration time.Duration) error
	// Cleanup (for Redis implementation)
	DeleteEmptyNonPermanentRooms(ctx context.Context) error
}

// ShortURLRepository defines the interface for short URL data access
type ShortURLRepository interface {
	Create(ctx context.Context, shortID, roomID string) error
	GetByShortID(ctx context.Context, shortID string) (*model.ShortURL, error)
	GetByRoomID(ctx context.Context, roomID string) (*model.ShortURL, error)
	DeleteByRoomID(ctx context.Context, roomID string) error
}

// ChatRepository defines the interface for chat message data access
type ChatRepository interface {
	Create(ctx context.Context, msg *model.ChatMessage) error
	GetRecentByRoomID(ctx context.Context, roomID string, limit int) ([]*model.ChatMessage, error)
	DeleteByRoomID(ctx context.Context, roomID string) error
}

// BanRepository defines the interface for global ban data access
type BanRepository interface {
	Create(ctx context.Context, ban *model.GlobalBan) error
	GetByUserID(ctx context.Context, userID string) (*model.GlobalBan, error)
	List(ctx context.Context) ([]*model.GlobalBan, error)
	IsUserBanned(ctx context.Context, userID string) (bool, error)
	Delete(ctx context.Context, userID string) error
	DeleteExpired(ctx context.Context) error
}

// ReportRepository defines the interface for report data access
type ReportRepository interface {
	Create(ctx context.Context, report *model.Report) (string, error) // Returns UUID
	GetByID(ctx context.Context, id string) (*model.Report, error)
	ListPending(ctx context.Context) ([]*model.Report, error)
	UpdateStatus(ctx context.Context, id string, status model.ReportStatus) error
}
