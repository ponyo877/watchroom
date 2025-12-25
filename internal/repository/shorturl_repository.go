package repository

import (
	"context"
	"database/sql"

	"github.com/ponyo877/youtube-friend-watch/internal/model"
)

type ShortURLRepository struct {
	db *sql.DB
}

func NewShortURLRepository(db *sql.DB) *ShortURLRepository {
	return &ShortURLRepository{db: db}
}

func (r *ShortURLRepository) Create(ctx context.Context, shortID, roomID string) error {
	_, err := r.db.ExecContext(ctx,
		"INSERT INTO short_urls (short_id, room_id) VALUES (?, ?)",
		shortID, roomID)
	return err
}

func (r *ShortURLRepository) GetByShortID(ctx context.Context, shortID string) (*model.ShortURL, error) {
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

func (r *ShortURLRepository) GetByRoomID(ctx context.Context, roomID string) (*model.ShortURL, error) {
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

func (r *ShortURLRepository) DeleteByRoomID(ctx context.Context, roomID string) error {
	_, err := r.db.ExecContext(ctx,
		"DELETE FROM short_urls WHERE room_id = ?",
		roomID)
	return err
}
