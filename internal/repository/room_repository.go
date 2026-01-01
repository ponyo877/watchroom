package repository

import (
	"context"
	"database/sql"

	"github.com/ponyo877/youtube-friend-watch/internal/model"
)

type RoomRepository struct {
	db *sql.DB
}

func NewRoomRepository(db *sql.DB) *RoomRepository {
	return &RoomRepository{db: db}
}

func (r *RoomRepository) Create(ctx context.Context, room *model.Room) error {
	_, err := r.db.ExecContext(ctx,
		"INSERT INTO rooms (room_id, name, creator_id, creator_name, is_active) VALUES (?, ?, ?, ?, ?)",
		room.RoomID, room.Name, room.CreatorID, room.CreatorName, true)
	return err
}

func (r *RoomRepository) List(ctx context.Context) ([]*model.Room, error) {
	rows, err := r.db.QueryContext(ctx,
		"SELECT id, room_id, name, creator_id, creator_name, is_active, current_video_id, current_video_title, current_video_thumbnail, member_count, max_members, created_at, updated_at FROM rooms WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 50")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rooms []*model.Room
	for rows.Next() {
		room := &model.Room{}
		if err := rows.Scan(&room.ID, &room.RoomID, &room.Name, &room.CreatorID, &room.CreatorName, &room.IsActive, &room.CurrentVideoID, &room.CurrentVideoTitle, &room.CurrentVideoThumbnail, &room.MemberCount, &room.MaxMembers, &room.CreatedAt, &room.UpdatedAt); err != nil {
			return nil, err
		}
		rooms = append(rooms, room)
	}
	return rooms, rows.Err()
}

func (r *RoomRepository) GetByRoomID(ctx context.Context, roomID string) (*model.Room, error) {
	room := &model.Room{}
	err := r.db.QueryRowContext(ctx,
		"SELECT id, room_id, name, creator_id, creator_name, is_active, current_video_id, current_video_title, current_video_thumbnail, member_count, max_members, created_at, updated_at FROM rooms WHERE room_id = ?",
		roomID).Scan(&room.ID, &room.RoomID, &room.Name, &room.CreatorID, &room.CreatorName, &room.IsActive, &room.CurrentVideoID, &room.CurrentVideoTitle, &room.CurrentVideoThumbnail, &room.MemberCount, &room.MaxMembers, &room.CreatedAt, &room.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return room, err
}

func (r *RoomRepository) UpdateCurrentVideo(ctx context.Context, roomID, videoID, title, thumbnail string) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE rooms SET current_video_id = ?, current_video_title = ?, current_video_thumbnail = ?, updated_at = CURRENT_TIMESTAMP WHERE room_id = ?",
		videoID, title, thumbnail, roomID)
	return err
}

func (r *RoomRepository) IncrementMemberCount(ctx context.Context, roomID string) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE rooms SET member_count = member_count + 1, updated_at = CURRENT_TIMESTAMP WHERE room_id = ?",
		roomID)
	return err
}

func (r *RoomRepository) DecrementMemberCount(ctx context.Context, roomID string) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE rooms SET member_count = GREATEST(member_count - 1, 0), updated_at = CURRENT_TIMESTAMP WHERE room_id = ?",
		roomID)
	return err
}

func (r *RoomRepository) GetMemberInfo(ctx context.Context, roomID string) (memberCount int, maxMembers int, err error) {
	err = r.db.QueryRowContext(ctx,
		"SELECT member_count, max_members FROM rooms WHERE room_id = ?",
		roomID).Scan(&memberCount, &maxMembers)
	if err == sql.ErrNoRows {
		return 0, 10, nil
	}
	return memberCount, maxMembers, err
}

func (r *RoomRepository) Deactivate(ctx context.Context, roomID string) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE rooms SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE room_id = ?",
		roomID)
	return err
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
