package repository

import (
	"context"
	"database/sql"
)

type RoomRepository struct {
	db *sql.DB
}

func NewRoomRepository(db *sql.DB) *RoomRepository {
	return &RoomRepository{db: db}
}

func (r *RoomRepository) CreatePassword(ctx context.Context, roomID, passwordHash string) error {
	_, err := r.db.ExecContext(ctx,
		"INSERT INTO room_passwords (room_id, password_hash) VALUES (?, ?)",
		roomID, passwordHash)
	return err
}

func (r *RoomRepository) GetPasswordHash(ctx context.Context, roomID string) (string, error) {
	var hash string
	err := r.db.QueryRowContext(ctx,
		"SELECT password_hash FROM room_passwords WHERE room_id = ?",
		roomID).Scan(&hash)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return hash, err
}

func (r *RoomRepository) UpdatePassword(ctx context.Context, roomID, passwordHash string) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE room_passwords SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE room_id = ?",
		passwordHash, roomID)
	return err
}

func (r *RoomRepository) DeletePassword(ctx context.Context, roomID string) error {
	_, err := r.db.ExecContext(ctx,
		"DELETE FROM room_passwords WHERE room_id = ?",
		roomID)
	return err
}

func (r *RoomRepository) HasPassword(ctx context.Context, roomID string) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx,
		"SELECT EXISTS(SELECT 1 FROM room_passwords WHERE room_id = ?)",
		roomID).Scan(&exists)
	return exists, err
}
