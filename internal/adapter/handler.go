package adapter

import (
	"context"
	"database/sql"

	"github.com/ponyo877/youtube-friend-watch/internal/config"
	"github.com/ponyo877/youtube-friend-watch/internal/repository"
	"github.com/ponyo877/youtube-friend-watch/internal/service"
	"github.com/ponyo877/youtube-friend-watch/internal/usecase"
	"github.com/redis/go-redis/v9"
)

type Handler struct {
	cfg            *config.Config
	db             *sql.DB
	authUsecase    *usecase.AuthUsecase
	roomUsecase    *usecase.RoomUsecase
	roomRepo       repository.RoomRepository
	shortURLRepo   repository.ShortURLRepository
	reportRepo     repository.ReportRepository
	banRepo        repository.BanRepository
	chatRepo       repository.ChatRepository
	youtubeService *service.YouTubeService
	uploadService  *service.UploadService
}

// NewHandler creates a new Handler with MySQL repositories (default)
func NewHandler(cfg *config.Config, db *sql.DB) *Handler {
	roomRepo := repository.NewRoomRepositoryMySQL(db)
	shortURLRepo := repository.NewShortURLRepositoryMySQL(db)
	reportRepo := repository.NewReportRepositoryMySQL(db)
	banRepo := repository.NewBanRepositoryMySQL(db)
	chatRepo := repository.NewChatRepositoryMySQL(db)

	skyWayService := service.NewSkyWayService(cfg.SkyWay.AppID, cfg.SkyWay.SecretKey)
	youtubeService, _ := service.NewYouTubeService(cfg.YouTube.APIKey)
	uploadService, _ := service.NewUploadService(
		cfg.R2.AccountID,
		cfg.R2.AccessKeyID,
		cfg.R2.SecretAccessKey,
		cfg.R2.BucketName,
		cfg.R2.PublicURL,
	)
	authUsecase := usecase.NewAuthUsecase(skyWayService, roomRepo)
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
		chatRepo:       chatRepo,
		youtubeService: youtubeService,
		uploadService:  uploadService,
	}
}

// NewHandlerWithRedis creates a new Handler with Redis repositories
func NewHandlerWithRedis(cfg *config.Config, db *sql.DB, redisClient *redis.Client) *Handler {
	shortURLRepo := repository.NewShortURLRepositoryRedis(redisClient)
	chatRepo := repository.NewChatRepositoryRedis(redisClient)
	roomRepo := repository.NewRoomRepositoryRedis(redisClient, shortURLRepo, chatRepo)
	reportRepo := repository.NewReportRepositoryRedis(redisClient)
	banRepo := repository.NewBanRepositoryRedis(redisClient)

	skyWayService := service.NewSkyWayService(cfg.SkyWay.AppID, cfg.SkyWay.SecretKey)
	youtubeService, _ := service.NewYouTubeService(cfg.YouTube.APIKey)
	uploadService, _ := service.NewUploadService(
		cfg.R2.AccountID,
		cfg.R2.AccessKeyID,
		cfg.R2.SecretAccessKey,
		cfg.R2.BucketName,
		cfg.R2.PublicURL,
	)
	authUsecase := usecase.NewAuthUsecase(skyWayService, roomRepo)
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
		chatRepo:       chatRepo,
		youtubeService: youtubeService,
		uploadService:  uploadService,
	}
}

// GetRoomRepo returns the room repository for cleanup jobs
func (h *Handler) GetRoomRepo() repository.RoomRepository {
	return h.roomRepo
}

// GetBanRepo returns the ban repository for cleanup jobs
func (h *Handler) GetBanRepo() repository.BanRepository {
	return h.banRepo
}

// NewError creates an error response
func (h *Handler) NewError(ctx context.Context, err error) error {
	return err
}
