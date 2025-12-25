package adapter

import (
	"context"
	"database/sql"

	"github.com/ponyo877/youtube-friend-watch/internal/config"
	"github.com/ponyo877/youtube-friend-watch/internal/repository"
	"github.com/ponyo877/youtube-friend-watch/internal/service"
	"github.com/ponyo877/youtube-friend-watch/internal/usecase"
)

type Handler struct {
	cfg            *config.Config
	db             *sql.DB
	authUsecase    *usecase.AuthUsecase
	roomUsecase    *usecase.RoomUsecase
	roomRepo       *repository.RoomRepository
	shortURLRepo   *repository.ShortURLRepository
	reportRepo     *repository.ReportRepository
	banRepo        *repository.BanRepository
	youtubeService *service.YouTubeService
}

func NewHandler(cfg *config.Config, db *sql.DB) *Handler {
	roomRepo := repository.NewRoomRepository(db)
	shortURLRepo := repository.NewShortURLRepository(db)
	reportRepo := repository.NewReportRepository(db)
	banRepo := repository.NewBanRepository(db)

	skyWayService := service.NewSkyWayService(cfg.SkyWay.AppID, cfg.SkyWay.SecretKey)
	youtubeService, _ := service.NewYouTubeService(cfg.YouTube.APIKey)
	authUsecase := usecase.NewAuthUsecase(skyWayService)
	roomUsecase := usecase.NewRoomUsecase(roomRepo, shortURLRepo)

	return &Handler{
		cfg:            cfg,
		db:             db,
		authUsecase:    authUsecase,
		roomUsecase:    roomUsecase,
		roomRepo:       roomRepo,
		shortURLRepo:   shortURLRepo,
		reportRepo:     reportRepo,
		banRepo:        banRepo,
		youtubeService: youtubeService,
	}
}

// NewError creates an error response
func (h *Handler) NewError(ctx context.Context, err error) error {
	return err
}
