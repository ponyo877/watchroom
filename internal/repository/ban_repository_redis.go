package repository

import (
	"context"
	"encoding/json"
	"sort"
	"time"

	"github.com/ponyo877/youtube-friend-watch/internal/model"
	"github.com/redis/go-redis/v9"
)

const (
	banPrefix  = "ban:"
	bansAllKey = "bans:all"
)

// BanRepositoryRedis is the Redis implementation of BanRepository
type BanRepositoryRedis struct {
	client *redis.Client
}

// NewBanRepositoryRedis creates a new Redis-based BanRepository
func NewBanRepositoryRedis(client *redis.Client) *BanRepositoryRedis {
	return &BanRepositoryRedis{client: client}
}

// banDataRedis is the structure stored in Redis
type banDataRedis struct {
	UserID    string `json:"user_id"`
	Reason    string `json:"reason"`
	BannedAt  int64  `json:"banned_at"`
	ExpiresAt *int64 `json:"expires_at,omitempty"`
	CreatedAt int64  `json:"created_at"`
}

func (r *BanRepositoryRedis) Create(ctx context.Context, ban *model.GlobalBan) error {
	now := time.Now()
	data := banDataRedis{
		UserID:    ban.UserID,
		Reason:    ban.Reason,
		BannedAt:  now.Unix(),
		CreatedAt: now.Unix(),
	}

	var ttl time.Duration
	if ban.ExpiresAt != nil {
		expiresUnix := ban.ExpiresAt.Unix()
		data.ExpiresAt = &expiresUnix
		ttl = time.Until(*ban.ExpiresAt)
		if ttl <= 0 {
			return nil // Already expired, don't create
		}
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return err
	}

	key := banPrefix + ban.UserID

	pipe := r.client.Pipeline()
	if ttl > 0 {
		pipe.Set(ctx, key, jsonData, ttl)
	} else {
		pipe.Set(ctx, key, jsonData, 0) // No TTL = permanent ban
	}
	pipe.SAdd(ctx, bansAllKey, ban.UserID)
	_, err = pipe.Exec(ctx)
	return err
}

func (r *BanRepositoryRedis) GetByUserID(ctx context.Context, userID string) (*model.GlobalBan, error) {
	data, err := r.client.Get(ctx, banPrefix+userID).Result()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	var banData banDataRedis
	if err := json.Unmarshal([]byte(data), &banData); err != nil {
		return nil, err
	}

	ban := &model.GlobalBan{
		UserID:    banData.UserID,
		Reason:    banData.Reason,
		BannedAt:  time.Unix(banData.BannedAt, 0),
		CreatedAt: time.Unix(banData.CreatedAt, 0),
	}
	if banData.ExpiresAt != nil {
		expiresAt := time.Unix(*banData.ExpiresAt, 0)
		ban.ExpiresAt = &expiresAt
	}

	return ban, nil
}

func (r *BanRepositoryRedis) List(ctx context.Context) ([]*model.GlobalBan, error) {
	// Get all user IDs from the set
	userIDs, err := r.client.SMembers(ctx, bansAllKey).Result()
	if err != nil {
		return nil, err
	}

	var bans []*model.GlobalBan
	for _, userID := range userIDs {
		ban, err := r.GetByUserID(ctx, userID)
		if err != nil {
			continue // Skip errors
		}
		if ban != nil {
			bans = append(bans, ban)
		} else {
			// Ban expired (TTL), remove from set
			r.client.SRem(ctx, bansAllKey, userID)
		}
	}

	// Sort by BannedAt DESC (same as MySQL)
	sort.Slice(bans, func(i, j int) bool {
		return bans[i].BannedAt.After(bans[j].BannedAt)
	})

	return bans, nil
}

func (r *BanRepositoryRedis) IsUserBanned(ctx context.Context, userID string) (bool, error) {
	exists, err := r.client.Exists(ctx, banPrefix+userID).Result()
	if err != nil {
		return false, err
	}
	return exists > 0, nil
}

func (r *BanRepositoryRedis) Delete(ctx context.Context, userID string) error {
	pipe := r.client.Pipeline()
	pipe.Del(ctx, banPrefix+userID)
	pipe.SRem(ctx, bansAllKey, userID)
	_, err := pipe.Exec(ctx)
	return err
}

func (r *BanRepositoryRedis) DeleteExpired(ctx context.Context) error {
	// Redis TTL handles expiration automatically
	// Just clean up the bans:all set by checking which keys still exist
	userIDs, err := r.client.SMembers(ctx, bansAllKey).Result()
	if err != nil {
		return err
	}

	for _, userID := range userIDs {
		exists, err := r.client.Exists(ctx, banPrefix+userID).Result()
		if err != nil {
			continue
		}
		if exists == 0 {
			r.client.SRem(ctx, bansAllKey, userID)
		}
	}

	return nil
}
