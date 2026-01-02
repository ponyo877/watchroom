package repository

import (
	"context"
	"log"

	"github.com/ponyo877/youtube-friend-watch/internal/model"
)

// SeedPermanentRooms creates 8 permanent rooms if they don't exist
func SeedPermanentRooms(ctx context.Context, roomRepo RoomRepository, shortURLRepo ShortURLRepository) error {
	permanentRooms := []struct {
		RoomID  string
		Name    string
		ShortID string
	}{
		{"permanent-1", "常設1", "p1"},
		{"permanent-2", "常設2", "p2"},
		{"permanent-3", "常設3", "p3"},
		{"permanent-4", "常設4", "p4"},
		{"permanent-5", "常設5", "p5"},
		{"permanent-6", "常設6", "p6"},
		{"permanent-7", "常設7", "p7"},
		{"permanent-8", "常設8", "p8"},
	}

	for _, pr := range permanentRooms {
		existing, _ := roomRepo.GetByRoomID(ctx, pr.RoomID)
		if existing != nil {
			continue // Already exists, skip
		}

		room := &model.Room{
			RoomID:      pr.RoomID,
			Name:        pr.Name,
			CreatorID:   "system",
			CreatorName: "System",
			IsPermanent: true,
		}
		if err := roomRepo.Create(ctx, room); err != nil {
			log.Printf("[Seed] Failed to create room %s: %v", pr.RoomID, err)
			continue
		}

		if err := shortURLRepo.Create(ctx, pr.ShortID, pr.RoomID); err != nil {
			log.Printf("[Seed] Failed to create short URL %s: %v", pr.ShortID, err)
		}

		log.Printf("[Seed] Created permanent room: %s (%s)", pr.Name, pr.ShortID)
	}

	return nil
}
