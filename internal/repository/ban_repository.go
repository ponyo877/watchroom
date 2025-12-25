package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/ponyo877/youtube-friend-watch/internal/model"
)

type BanRepository struct {
	db *sql.DB
}

func NewBanRepository(db *sql.DB) *BanRepository {
	return &BanRepository{db: db}
}

func (r *BanRepository) Create(ctx context.Context, ban *model.GlobalBan) error {
	_, err := r.db.ExecContext(ctx,
		"INSERT INTO global_bans (user_id, reason, expires_at) VALUES (?, ?, ?)",
		ban.UserID, ban.Reason, ban.ExpiresAt)
	return err
}

func (r *BanRepository) GetByUserID(ctx context.Context, userID string) (*model.GlobalBan, error) {
	var ban model.GlobalBan
	var expiresAt sql.NullTime
	err := r.db.QueryRowContext(ctx,
		"SELECT id, user_id, reason, banned_at, expires_at, created_at FROM global_bans WHERE user_id = ?",
		userID).Scan(&ban.ID, &ban.UserID, &ban.Reason, &ban.BannedAt, &expiresAt, &ban.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if expiresAt.Valid {
		ban.ExpiresAt = &expiresAt.Time
	}
	return &ban, nil
}

func (r *BanRepository) List(ctx context.Context) ([]*model.GlobalBan, error) {
	rows, err := r.db.QueryContext(ctx,
		"SELECT id, user_id, reason, banned_at, expires_at, created_at FROM global_bans ORDER BY banned_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bans []*model.GlobalBan
	for rows.Next() {
		var ban model.GlobalBan
		var expiresAt sql.NullTime
		if err := rows.Scan(&ban.ID, &ban.UserID, &ban.Reason, &ban.BannedAt, &expiresAt, &ban.CreatedAt); err != nil {
			return nil, err
		}
		if expiresAt.Valid {
			ban.ExpiresAt = &expiresAt.Time
		}
		bans = append(bans, &ban)
	}
	return bans, rows.Err()
}

func (r *BanRepository) IsUserBanned(ctx context.Context, userID string) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx,
		`SELECT EXISTS(
			SELECT 1 FROM global_bans
			WHERE user_id = ? AND (expires_at IS NULL OR expires_at > ?)
		)`,
		userID, time.Now()).Scan(&exists)
	return exists, err
}

func (r *BanRepository) Delete(ctx context.Context, userID string) error {
	_, err := r.db.ExecContext(ctx,
		"DELETE FROM global_bans WHERE user_id = ?",
		userID)
	return err
}

func (r *BanRepository) DeleteExpired(ctx context.Context) error {
	_, err := r.db.ExecContext(ctx,
		"DELETE FROM global_bans WHERE expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP")
	return err
}
