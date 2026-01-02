package repository

import (
	"context"
	"database/sql"

	"github.com/ponyo877/youtube-friend-watch/internal/model"
)

// RoomRepositoryMySQL is the MySQL implementation of RoomRepository
type RoomRepositoryMySQL struct {
	db *sql.DB
}

// NewRoomRepositoryMySQL creates a new MySQL-based RoomRepository
func NewRoomRepositoryMySQL(db *sql.DB) *RoomRepositoryMySQL {
	return &RoomRepositoryMySQL{db: db}
}

func (r *RoomRepositoryMySQL) Create(ctx context.Context, room *model.Room) error {
	_, err := r.db.ExecContext(ctx,
		"INSERT INTO rooms (room_id, name, creator_id, creator_name, is_active) VALUES (?, ?, ?, ?, ?)",
		room.RoomID, room.Name, room.CreatorID, room.CreatorName, true)
	return err
}

func (r *RoomRepositoryMySQL) List(ctx context.Context) ([]*model.Room, error) {
	rows, err := r.db.QueryContext(ctx,
		"SELECT id, room_id, name, creator_id, creator_name, is_active, is_permanent, current_video_id, current_video_title, current_video_thumbnail, member_count, max_members, created_at, updated_at FROM rooms WHERE is_active = TRUE ORDER BY is_permanent DESC, created_at DESC LIMIT 50")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rooms []*model.Room
	for rows.Next() {
		room := &model.Room{}
		if err := rows.Scan(&room.ID, &room.RoomID, &room.Name, &room.CreatorID, &room.CreatorName, &room.IsActive, &room.IsPermanent, &room.CurrentVideoID, &room.CurrentVideoTitle, &room.CurrentVideoThumbnail, &room.MemberCount, &room.MaxMembers, &room.CreatedAt, &room.UpdatedAt); err != nil {
			return nil, err
		}
		rooms = append(rooms, room)
	}
	return rooms, rows.Err()
}

func (r *RoomRepositoryMySQL) GetByRoomID(ctx context.Context, roomID string) (*model.Room, error) {
	room := &model.Room{}
	err := r.db.QueryRowContext(ctx,
		"SELECT id, room_id, name, creator_id, creator_name, is_active, is_permanent, current_video_id, current_video_title, current_video_thumbnail, member_count, max_members, created_at, updated_at FROM rooms WHERE room_id = ?",
		roomID).Scan(&room.ID, &room.RoomID, &room.Name, &room.CreatorID, &room.CreatorName, &room.IsActive, &room.IsPermanent, &room.CurrentVideoID, &room.CurrentVideoTitle, &room.CurrentVideoThumbnail, &room.MemberCount, &room.MaxMembers, &room.CreatedAt, &room.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return room, err
}

func (r *RoomRepositoryMySQL) UpdateCurrentVideo(ctx context.Context, roomID, videoID, title, thumbnail string) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE rooms SET current_video_id = ?, current_video_title = ?, current_video_thumbnail = ?, updated_at = CURRENT_TIMESTAMP WHERE room_id = ?",
		videoID, title, thumbnail, roomID)
	return err
}

func (r *RoomRepositoryMySQL) IncrementMemberCount(ctx context.Context, roomID string) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE rooms SET member_count = member_count + 1, updated_at = CURRENT_TIMESTAMP WHERE room_id = ?",
		roomID)
	return err
}

func (r *RoomRepositoryMySQL) DecrementMemberCount(ctx context.Context, roomID string) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE rooms SET member_count = GREATEST(member_count - 1, 0), updated_at = CURRENT_TIMESTAMP WHERE room_id = ?",
		roomID)
	return err
}

func (r *RoomRepositoryMySQL) GetMemberInfo(ctx context.Context, roomID string) (memberCount int, maxMembers int, err error) {
	err = r.db.QueryRowContext(ctx,
		"SELECT member_count, max_members FROM rooms WHERE room_id = ?",
		roomID).Scan(&memberCount, &maxMembers)
	if err == sql.ErrNoRows {
		return 0, 10, nil
	}
	return memberCount, maxMembers, err
}

func (r *RoomRepositoryMySQL) Deactivate(ctx context.Context, roomID string) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE rooms SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE room_id = ?",
		roomID)
	return err
}

func (r *RoomRepositoryMySQL) CreatePassword(ctx context.Context, roomID, passwordHash string) error {
	_, err := r.db.ExecContext(ctx,
		"INSERT INTO room_passwords (room_id, password_hash) VALUES (?, ?)",
		roomID, passwordHash)
	return err
}

func (r *RoomRepositoryMySQL) GetPasswordHash(ctx context.Context, roomID string) (string, error) {
	var hash string
	err := r.db.QueryRowContext(ctx,
		"SELECT password_hash FROM room_passwords WHERE room_id = ?",
		roomID).Scan(&hash)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return hash, err
}

func (r *RoomRepositoryMySQL) UpdatePassword(ctx context.Context, roomID, passwordHash string) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE room_passwords SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE room_id = ?",
		passwordHash, roomID)
	return err
}

func (r *RoomRepositoryMySQL) DeletePassword(ctx context.Context, roomID string) error {
	_, err := r.db.ExecContext(ctx,
		"DELETE FROM room_passwords WHERE room_id = ?",
		roomID)
	return err
}

func (r *RoomRepositoryMySQL) HasPassword(ctx context.Context, roomID string) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx,
		"SELECT EXISTS(SELECT 1 FROM room_passwords WHERE room_id = ?)",
		roomID).Scan(&exists)
	return exists, err
}

// DecrementAndDeleteIfEmpty decrements member count and deletes the room if it becomes empty (non-permanent rooms only)
func (r *RoomRepositoryMySQL) DecrementAndDeleteIfEmpty(ctx context.Context, roomID string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Decrement member count
	_, err = tx.ExecContext(ctx,
		"UPDATE rooms SET member_count = GREATEST(member_count - 1, 0), updated_at = CURRENT_TIMESTAMP WHERE room_id = ?",
		roomID)
	if err != nil {
		return err
	}

	// 2. Check current state
	var memberCount int
	var isPermanent bool
	err = tx.QueryRowContext(ctx,
		"SELECT member_count, is_permanent FROM rooms WHERE room_id = ?",
		roomID).Scan(&memberCount, &isPermanent)
	if err != nil {
		if err == sql.ErrNoRows {
			// Room doesn't exist, just commit
			return tx.Commit()
		}
		return err
	}

	// 3. Delete room if empty and not permanent
	if memberCount == 0 && !isPermanent {
		// Delete related data first
		_, _ = tx.ExecContext(ctx, "DELETE FROM room_passwords WHERE room_id = ?", roomID)
		_, _ = tx.ExecContext(ctx, "DELETE FROM short_urls WHERE room_id = ?", roomID)
		_, _ = tx.ExecContext(ctx, "DELETE FROM chat_messages WHERE room_id = ?", roomID)
		// Delete the room
		_, err = tx.ExecContext(ctx, "DELETE FROM rooms WHERE room_id = ?", roomID)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// DeleteEmptyNonPermanentRooms deletes non-permanent rooms that are:
// 1. Empty (member_count == 0), OR
// 2. Stale (not updated in the last hour) - handles cases where member count wasn't properly decremented
func (r *RoomRepositoryMySQL) DeleteEmptyNonPermanentRooms(ctx context.Context) error {
	// Get rooms to delete
	rows, err := r.db.QueryContext(ctx,
		`SELECT room_id FROM rooms
		WHERE is_permanent = FALSE
		AND (member_count <= 0 OR updated_at < DATE_SUB(NOW(), INTERVAL 1 HOUR))`)
	if err != nil {
		return err
	}
	defer rows.Close()

	var roomIDs []string
	for rows.Next() {
		var roomID string
		if err := rows.Scan(&roomID); err != nil {
			return err
		}
		roomIDs = append(roomIDs, roomID)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	// Delete each room and its related data
	for _, roomID := range roomIDs {
		// Delete related data first
		r.db.ExecContext(ctx, "DELETE FROM room_passwords WHERE room_id = ?", roomID)
		r.db.ExecContext(ctx, "DELETE FROM short_urls WHERE room_id = ?", roomID)
		r.db.ExecContext(ctx, "DELETE FROM chat_messages WHERE room_id = ?", roomID)
		// Delete the room
		r.db.ExecContext(ctx, "DELETE FROM rooms WHERE room_id = ?", roomID)
	}

	return nil
}
