package job

import (
	"context"
	"log"
	"time"

	"github.com/ponyo877/youtube-friend-watch/internal/repository"
)

// RoomCleanupJob handles periodic cleanup of empty non-permanent rooms
type RoomCleanupJob struct {
	roomRepo repository.RoomRepository
	interval time.Duration
	stopCh   chan struct{}
}

// NewRoomCleanupJob creates a new cleanup job
func NewRoomCleanupJob(roomRepo repository.RoomRepository, interval time.Duration) *RoomCleanupJob {
	return &RoomCleanupJob{
		roomRepo: roomRepo,
		interval: interval,
		stopCh:   make(chan struct{}),
	}
}

// Start begins the cleanup job in a goroutine
func (j *RoomCleanupJob) Start(ctx context.Context) {
	go j.run(ctx)
	log.Printf("[RoomCleanupJob] Started with interval %v", j.interval)
}

// Stop stops the cleanup job
func (j *RoomCleanupJob) Stop() {
	close(j.stopCh)
	log.Println("[RoomCleanupJob] Stopped")
}

func (j *RoomCleanupJob) run(ctx context.Context) {
	ticker := time.NewTicker(j.interval)
	defer ticker.Stop()

	// Run immediately on start
	j.cleanup(ctx)

	for {
		select {
		case <-ctx.Done():
			return
		case <-j.stopCh:
			return
		case <-ticker.C:
			j.cleanup(ctx)
		}
	}
}

func (j *RoomCleanupJob) cleanup(ctx context.Context) {
	if err := j.roomRepo.DeleteEmptyNonPermanentRooms(ctx); err != nil {
		log.Printf("[RoomCleanupJob] Error cleaning up empty rooms: %v", err)
	} else {
		log.Println("[RoomCleanupJob] Cleanup completed successfully")
	}
}

// BanCleanupJob handles periodic cleanup of expired bans
type BanCleanupJob struct {
	banRepo  repository.BanRepository
	interval time.Duration
	stopCh   chan struct{}
}

// NewBanCleanupJob creates a new ban cleanup job
func NewBanCleanupJob(banRepo repository.BanRepository, interval time.Duration) *BanCleanupJob {
	return &BanCleanupJob{
		banRepo:  banRepo,
		interval: interval,
		stopCh:   make(chan struct{}),
	}
}

// Start begins the ban cleanup job in a goroutine
func (j *BanCleanupJob) Start(ctx context.Context) {
	go j.run(ctx)
	log.Printf("[BanCleanupJob] Started with interval %v", j.interval)
}

// Stop stops the ban cleanup job
func (j *BanCleanupJob) Stop() {
	close(j.stopCh)
	log.Println("[BanCleanupJob] Stopped")
}

func (j *BanCleanupJob) run(ctx context.Context) {
	ticker := time.NewTicker(j.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-j.stopCh:
			return
		case <-ticker.C:
			j.cleanup(ctx)
		}
	}
}

func (j *BanCleanupJob) cleanup(ctx context.Context) {
	if err := j.banRepo.DeleteExpired(ctx); err != nil {
		log.Printf("[BanCleanupJob] Error cleaning up expired bans: %v", err)
	}
}
