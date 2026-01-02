package repository

import (
	"context"
	"sort"
	"strconv"
	"time"

	"github.com/ponyo877/youtube-friend-watch/internal/model"
	"github.com/redis/go-redis/v9"
)

const (
	roomPrefix         = "room:"
	roomsActiveKey     = "rooms:active"
	roomPasswordPrefix = "room:password:"
)

// Room hash field names
const (
	fieldRoomID                = "room_id"
	fieldName                  = "name"
	fieldCreatorID             = "creator_id"
	fieldCreatorName           = "creator_name"
	fieldIsActive              = "is_active"
	fieldIsPermanent           = "is_permanent"
	fieldCurrentVideoID        = "current_video_id"
	fieldCurrentVideoTitle     = "current_video_title"
	fieldCurrentVideoThumbnail = "current_video_thumbnail"
	fieldMemberCount           = "member_count"
	fieldMaxMembers            = "max_members"
	fieldCreatedAt             = "created_at"
	fieldUpdatedAt             = "updated_at"
)

// RoomRepositoryRedis is the Redis implementation of RoomRepository
type RoomRepositoryRedis struct {
	client       *redis.Client
	shortURLRepo ShortURLRepository
	chatRepo     ChatRepository
}

// NewRoomRepositoryRedis creates a new Redis-based RoomRepository
func NewRoomRepositoryRedis(client *redis.Client, shortURLRepo ShortURLRepository, chatRepo ChatRepository) *RoomRepositoryRedis {
	return &RoomRepositoryRedis{
		client:       client,
		shortURLRepo: shortURLRepo,
		chatRepo:     chatRepo,
	}
}

// Helper functions for type conversion
func boolToStr(b bool) string {
	if b {
		return "1"
	}
	return "0"
}

func strToBool(s string) bool {
	return s == "1"
}

func strToInt(s string) int {
	i, _ := strconv.Atoi(s)
	return i
}

func strToInt64(s string) int64 {
	i, _ := strconv.ParseInt(s, 10, 64)
	return i
}

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// calculateScore creates a score for sorted set ordering
// is_permanent rooms have higher scores (10^15 added), then sorted by created_at DESC
func (r *RoomRepositoryRedis) calculateScore(isPermanent bool, createdAt time.Time) float64 {
	score := float64(createdAt.Unix())
	if isPermanent {
		score += 1e15
	}
	return score
}

func (r *RoomRepositoryRedis) Create(ctx context.Context, room *model.Room) error {
	now := time.Now()
	room.IsActive = true
	room.CreatedAt = now
	room.UpdatedAt = now
	if room.MaxMembers == 0 {
		room.MaxMembers = 10 // default
	}

	key := roomPrefix + room.RoomID
	fields := map[string]interface{}{
		fieldRoomID:      room.RoomID,
		fieldName:        room.Name,
		fieldCreatorID:   room.CreatorID,
		fieldCreatorName: room.CreatorName,
		fieldIsActive:    boolToStr(room.IsActive),
		fieldIsPermanent: boolToStr(room.IsPermanent),
		fieldMemberCount: 0,
		fieldMaxMembers:  room.MaxMembers,
		fieldCreatedAt:   now.Unix(),
		fieldUpdatedAt:   now.Unix(),
	}

	pipe := r.client.Pipeline()
	pipe.HSet(ctx, key, fields)
	pipe.ZAdd(ctx, roomsActiveKey, redis.Z{
		Score:  r.calculateScore(room.IsPermanent, now),
		Member: room.RoomID,
	})
	_, err := pipe.Exec(ctx)
	return err
}

func (r *RoomRepositoryRedis) List(ctx context.Context) ([]*model.Room, error) {
	// Get room IDs from sorted set (sorted by is_permanent DESC, created_at DESC)
	roomIDs, err := r.client.ZRevRange(ctx, roomsActiveKey, 0, 49).Result()
	if err != nil {
		return nil, err
	}

	var rooms []*model.Room
	for _, roomID := range roomIDs {
		room, err := r.GetByRoomID(ctx, roomID)
		if err != nil {
			continue
		}
		if room != nil && room.IsActive {
			rooms = append(rooms, room)
		}
	}

	// Sort by is_permanent DESC, created_at DESC
	sort.Slice(rooms, func(i, j int) bool {
		if rooms[i].IsPermanent != rooms[j].IsPermanent {
			return rooms[i].IsPermanent
		}
		return rooms[i].CreatedAt.After(rooms[j].CreatedAt)
	})

	return rooms, nil
}

func (r *RoomRepositoryRedis) GetByRoomID(ctx context.Context, roomID string) (*model.Room, error) {
	key := roomPrefix + roomID
	data, err := r.client.HGetAll(ctx, key).Result()
	if err != nil {
		return nil, err
	}
	if len(data) == 0 {
		return nil, nil
	}

	return r.hashToModel(data), nil
}

func (r *RoomRepositoryRedis) hashToModel(data map[string]string) *model.Room {
	return &model.Room{
		RoomID:                data[fieldRoomID],
		Name:                  data[fieldName],
		CreatorID:             data[fieldCreatorID],
		CreatorName:           data[fieldCreatorName],
		IsActive:              strToBool(data[fieldIsActive]),
		IsPermanent:           strToBool(data[fieldIsPermanent]),
		CurrentVideoID:        strPtr(data[fieldCurrentVideoID]),
		CurrentVideoTitle:     strPtr(data[fieldCurrentVideoTitle]),
		CurrentVideoThumbnail: strPtr(data[fieldCurrentVideoThumbnail]),
		MemberCount:           strToInt(data[fieldMemberCount]),
		MaxMembers:            strToInt(data[fieldMaxMembers]),
		CreatedAt:             time.Unix(strToInt64(data[fieldCreatedAt]), 0),
		UpdatedAt:             time.Unix(strToInt64(data[fieldUpdatedAt]), 0),
	}
}

func (r *RoomRepositoryRedis) UpdateCurrentVideo(ctx context.Context, roomID, videoID, title, thumbnail string) error {
	key := roomPrefix + roomID
	exists, err := r.client.Exists(ctx, key).Result()
	if err != nil {
		return err
	}
	if exists == 0 {
		return nil
	}

	return r.client.HSet(ctx, key,
		fieldCurrentVideoID, videoID,
		fieldCurrentVideoTitle, title,
		fieldCurrentVideoThumbnail, thumbnail,
		fieldUpdatedAt, time.Now().Unix(),
	).Err()
}

// IncrementMemberCount uses HINCRBY for atomic increment
func (r *RoomRepositoryRedis) IncrementMemberCount(ctx context.Context, roomID string) error {
	key := roomPrefix + roomID
	exists, err := r.client.Exists(ctx, key).Result()
	if err != nil {
		return err
	}
	if exists == 0 {
		return nil
	}

	pipe := r.client.Pipeline()
	pipe.HIncrBy(ctx, key, fieldMemberCount, 1)
	pipe.HSet(ctx, key, fieldUpdatedAt, time.Now().Unix())
	_, err = pipe.Exec(ctx)
	return err
}

// DecrementMemberCount uses HINCRBY for atomic decrement, with minimum of 0
func (r *RoomRepositoryRedis) DecrementMemberCount(ctx context.Context, roomID string) error {
	key := roomPrefix + roomID

	// Use Lua script to decrement but not go below 0
	script := redis.NewScript(`
		local key = KEYS[1]
		local count = redis.call('HGET', key, 'member_count')
		if count and tonumber(count) > 0 then
			redis.call('HINCRBY', key, 'member_count', -1)
			redis.call('HSET', key, 'updated_at', ARGV[1])
		end
		return redis.call('HGET', key, 'member_count')
	`)

	_, err := script.Run(ctx, r.client, []string{key}, time.Now().Unix()).Result()
	return err
}

func (r *RoomRepositoryRedis) GetMemberInfo(ctx context.Context, roomID string) (memberCount int, maxMembers int, err error) {
	key := roomPrefix + roomID
	data, err := r.client.HMGet(ctx, key, fieldMemberCount, fieldMaxMembers).Result()
	if err != nil {
		return 0, 10, err
	}

	// If key doesn't exist, return defaults
	if data[0] == nil {
		return 0, 10, nil
	}

	memberCount = 0
	maxMembers = 10

	if data[0] != nil {
		memberCount, _ = strconv.Atoi(data[0].(string))
	}
	if data[1] != nil {
		maxMembers, _ = strconv.Atoi(data[1].(string))
	}

	return memberCount, maxMembers, nil
}

func (r *RoomRepositoryRedis) Deactivate(ctx context.Context, roomID string) error {
	key := roomPrefix + roomID

	pipe := r.client.Pipeline()
	pipe.HSet(ctx, key, fieldIsActive, "0", fieldUpdatedAt, time.Now().Unix())
	pipe.ZRem(ctx, roomsActiveKey, roomID)
	_, err := pipe.Exec(ctx)
	return err
}

func (r *RoomRepositoryRedis) CreatePassword(ctx context.Context, roomID, passwordHash string) error {
	return r.client.Set(ctx, roomPasswordPrefix+roomID, passwordHash, 0).Err()
}

func (r *RoomRepositoryRedis) GetPasswordHash(ctx context.Context, roomID string) (string, error) {
	hash, err := r.client.Get(ctx, roomPasswordPrefix+roomID).Result()
	if err == redis.Nil {
		return "", nil
	}
	return hash, err
}

func (r *RoomRepositoryRedis) UpdatePassword(ctx context.Context, roomID, passwordHash string) error {
	return r.client.Set(ctx, roomPasswordPrefix+roomID, passwordHash, 0).Err()
}

func (r *RoomRepositoryRedis) DeletePassword(ctx context.Context, roomID string) error {
	return r.client.Del(ctx, roomPasswordPrefix+roomID).Err()
}

func (r *RoomRepositoryRedis) HasPassword(ctx context.Context, roomID string) (bool, error) {
	exists, err := r.client.Exists(ctx, roomPasswordPrefix+roomID).Result()
	if err != nil {
		return false, err
	}
	return exists > 0, nil
}

// DeleteEmptyNonPermanentRooms deletes non-permanent rooms that are:
// 1. Empty (member_count == 0), OR
// 2. Stale (not updated in the last hour) - handles cases where member count wasn't properly decremented
func (r *RoomRepositoryRedis) DeleteEmptyNonPermanentRooms(ctx context.Context) error {
	roomIDs, err := r.client.ZRange(ctx, roomsActiveKey, 0, -1).Result()
	if err != nil {
		return err
	}

	staleThreshold := time.Now().Add(-1 * time.Hour)

	for _, roomID := range roomIDs {
		room, err := r.GetByRoomID(ctx, roomID)
		if err != nil || room == nil {
			continue
		}

		// Skip permanent rooms
		if room.IsPermanent {
			continue
		}

		// Delete if empty OR stale (not updated in the last hour)
		shouldDelete := room.MemberCount <= 0 || room.UpdatedAt.Before(staleThreshold)
		if shouldDelete {
			if err := r.deleteRoomWithRelatedData(ctx, roomID); err != nil {
				continue
			}
		}
	}

	return nil
}

func (r *RoomRepositoryRedis) deleteRoomWithRelatedData(ctx context.Context, roomID string) error {
	pipe := r.client.Pipeline()
	pipe.Del(ctx, roomPrefix+roomID)
	pipe.ZRem(ctx, roomsActiveKey, roomID)
	pipe.Del(ctx, roomPasswordPrefix+roomID)
	_, err := pipe.Exec(ctx)
	if err != nil {
		return err
	}

	if r.shortURLRepo != nil {
		_ = r.shortURLRepo.DeleteByRoomID(ctx, roomID)
	}
	if r.chatRepo != nil {
		_ = r.chatRepo.DeleteByRoomID(ctx, roomID)
	}

	return nil
}

// DecrementAndDeleteIfEmpty is provided for interface compatibility
func (r *RoomRepositoryRedis) DecrementAndDeleteIfEmpty(ctx context.Context, roomID string) error {
	return r.DecrementMemberCount(ctx, roomID)
}
