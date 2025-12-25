package model

import "time"

type GlobalBan struct {
	ID        int
	UserID    string
	Reason    string
	BannedAt  time.Time
	ExpiresAt *time.Time // nil = permanent ban
	CreatedAt time.Time
}

func (b *GlobalBan) IsActive() bool {
	if b.ExpiresAt == nil {
		return true
	}
	return time.Now().Before(*b.ExpiresAt)
}
