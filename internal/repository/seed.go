package repository

import (
	"context"
	"log"

	"github.com/ponyo877/youtube-friend-watch/internal/model"
)

// SeedPermanentRooms creates 8 permanent rooms if they don't exist
func SeedPermanentRooms(ctx context.Context, roomRepo RoomRepository, shortURLRepo ShortURLRepository) error {
	permanentRooms := []struct {
		RoomID    string
		Name      string
		ShortID   string
		Thumbnail string
	}{
		{"permanent-1", "常設1", "p1", "/thumbnails/permanent-1.svg"},
		{"permanent-2", "常設2", "p2", "/thumbnails/permanent-2.svg"},
		{"permanent-3", "常設3", "p3", "/thumbnails/permanent-3.svg"},
		{"permanent-4", "常設4", "p4", "/thumbnails/permanent-4.svg"},
		{"permanent-5", "常設5", "p5", "/thumbnails/permanent-5.svg"},
		{"permanent-6", "常設6", "p6", "/thumbnails/permanent-6.svg"},
		{"permanent-7", "常設7", "p7", "/thumbnails/permanent-7.svg"},
		{"permanent-8", "常設8", "p8", "/thumbnails/permanent-8.svg"},
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

		// Set default thumbnail for permanent room
		if err := roomRepo.UpdateCurrentVideo(ctx, pr.RoomID, "permanent", pr.Name, pr.Thumbnail); err != nil {
			log.Printf("[Seed] Failed to set thumbnail for %s: %v", pr.RoomID, err)
		}

		log.Printf("[Seed] Created permanent room: %s (%s)", pr.Name, pr.ShortID)
	}

	return nil
}
