package repository

import (
	"context"
	"database/sql"

	"github.com/ponyo877/youtube-friend-watch/internal/model"
)

// ShortURLRepositoryMySQL is the MySQL implementation of ShortURLRepository
type ShortURLRepositoryMySQL struct {
	db *sql.DB
}

// NewShortURLRepositoryMySQL creates a new MySQL-based ShortURLRepository
func NewShortURLRepositoryMySQL(db *sql.DB) *ShortURLRepositoryMySQL {
	return &ShortURLRepositoryMySQL{db: db}
}

func (r *ShortURLRepositoryMySQL) Create(ctx context.Context, shortID, roomID string) error {
	_, err := r.db.ExecContext(ctx,
		"INSERT INTO short_urls (short_id, room_id) VALUES (?, ?)",
		shortID, roomID)
	return err
}

func (r *ShortURLRepositoryMySQL) GetByShortID(ctx context.Context, shortID string) (*model.ShortURL, error) {
	var su model.ShortURL
	err := r.db.QueryRowContext(ctx,
		"SELECT id, short_id, room_id, created_at FROM short_urls WHERE short_id = ?",
		shortID).Scan(&su.ID, &su.ShortID, &su.RoomID, &su.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &su, nil
}

func (r *ShortURLRepositoryMySQL) GetByRoomID(ctx context.Context, roomID string) (*model.ShortURL, error) {
	var su model.ShortURL
	err := r.db.QueryRowContext(ctx,
		"SELECT id, short_id, room_id, created_at FROM short_urls WHERE room_id = ?",
		roomID).Scan(&su.ID, &su.ShortID, &su.RoomID, &su.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &su, nil
}

func (r *ShortURLRepositoryMySQL) DeleteByRoomID(ctx context.Context, roomID string) error {
	_, err := r.db.ExecContext(ctx,
		"DELETE FROM short_urls WHERE room_id = ?",
		roomID)
	return err
}
