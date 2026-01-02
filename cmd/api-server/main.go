package main

//go:generate go run github.com/ogen-go/ogen/cmd/ogen@latest --target ./openapi --package openapi --clean ../../typespec/tsp-output/@typespec/openapi3/openapi.yaml

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/ponyo877/youtube-friend-watch/internal/adapter"
	"github.com/ponyo877/youtube-friend-watch/internal/config"
	"github.com/ponyo877/youtube-friend-watch/internal/job"
	"github.com/ponyo877/youtube-friend-watch/internal/middleware"
	"github.com/ponyo877/youtube-friend-watch/internal/repository"
	"github.com/redis/go-redis/v9"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	var handler *adapter.Handler
	ctx := context.Background()

	if cfg.UseRedis {
		// Initialize Redis client
		redisClient := redis.NewClient(&redis.Options{
			Addr:     cfg.Redis.Addr(),
			Password: cfg.Redis.Password,
			DB:       cfg.Redis.DB,
		})

		if err := redisClient.Ping(ctx).Err(); err != nil {
			log.Fatalf("Failed to connect to Redis: %v", err)
		}
		log.Println("Connected to Redis")

		handler = adapter.NewHandlerWithRedis(cfg, nil, redisClient)

		// Seed permanent rooms (idempotent - skips if already exist)
		if err := repository.SeedPermanentRooms(ctx, handler.GetRoomRepo(), handler.GetShortURLRepo()); err != nil {
			log.Printf("Warning: Failed to seed permanent rooms: %v", err)
		}

		// Start cleanup jobs
		roomCleanupJob := job.NewRoomCleanupJob(handler.GetRoomRepo(), time.Minute)
		roomCleanupJob.Start(ctx)
		defer roomCleanupJob.Stop()

		banCleanupJob := job.NewBanCleanupJob(handler.GetBanRepo(), time.Hour)
		banCleanupJob.Start(ctx)
		defer banCleanupJob.Stop()
	} else {
		// MySQL mode
		db, err := sql.Open("mysql", cfg.Database.DSN())
		if err != nil {
			log.Fatalf("Failed to connect to database: %v", err)
		}
		defer db.Close()

		if err := db.Ping(); err != nil {
			log.Fatalf("Failed to ping database: %v", err)
		}
		log.Println("Connected to database")

		handler = adapter.NewHandler(cfg, db)
	}

	mux := http.NewServeMux()

	// Auth routes
	mux.HandleFunc("/api/auth/token", handler.HandleAuthToken)

	// Room routes
	mux.HandleFunc("/api/rooms", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handler.HandleListRooms(w, r)
		} else if r.Method == http.MethodPost {
			handler.HandleCreateRoom(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	mux.HandleFunc("/api/rooms/", func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/api/rooms/")
		parts := strings.Split(path, "/")

		if len(parts) == 1 {
			// DELETE /api/rooms/{room_id}
			handler.HandleDeleteRoom(w, r, parts[0])
			return
		}

		if len(parts) == 2 {
			roomID := parts[0]
			action := parts[1]

			switch action {
			case "verify-password":
				handler.HandleVerifyPassword(w, r, roomID)
			case "password":
				if r.Method == http.MethodPut {
					handler.HandleChangePassword(w, r, roomID)
				} else if r.Method == http.MethodDelete {
					handler.HandleDeletePassword(w, r, roomID)
				}
			case "current-video":
				handler.HandleUpdateCurrentVideo(w, r, roomID)
			case "member-info":
				handler.HandleGetMemberInfo(w, r, roomID)
			case "messages":
				if r.Method == http.MethodGet {
					handler.HandleGetMessages(w, r, roomID)
				} else if r.Method == http.MethodPost {
					handler.HandleCreateMessage(w, r, roomID)
				} else {
					http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
				}
			default:
				http.Error(w, "Not found", http.StatusNotFound)
			}
			return
		}

		if len(parts) == 3 && parts[1] == "member-count" {
			roomID := parts[0]
			action := parts[2]

			switch action {
			case "increment":
				handler.HandleIncrementMemberCount(w, r, roomID)
			case "decrement":
				handler.HandleDecrementMemberCount(w, r, roomID)
			default:
				http.Error(w, "Not found", http.StatusNotFound)
			}
			return
		}

		http.Error(w, "Not found", http.StatusNotFound)
	})

	// Short URL routes
	mux.HandleFunc("/api/r/", func(w http.ResponseWriter, r *http.Request) {
		shortID := strings.TrimPrefix(r.URL.Path, "/api/r/")
		handler.HandleResolveShortURL(w, r, shortID)
	})

	// YouTube routes
	mux.HandleFunc("/api/youtube/search", handler.HandleYouTubeSearch)
	mux.HandleFunc("/api/youtube/videos/", func(w http.ResponseWriter, r *http.Request) {
		videoID := strings.TrimPrefix(r.URL.Path, "/api/youtube/videos/")
		handler.HandleGetVideo(w, r, videoID)
	})

	// Upload routes
	mux.HandleFunc("/api/uploads/presign", handler.HandlePresignUpload)

	// Report routes
	mux.HandleFunc("/api/reports", handler.HandleCreateReport)

	// Ban check route
	mux.HandleFunc("/api/bans/check/", func(w http.ResponseWriter, r *http.Request) {
		userID := strings.TrimPrefix(r.URL.Path, "/api/bans/check/")
		handler.HandleCheckBanStatus(w, r, userID)
	})

	// Admin routes (with Basic Auth)
	adminAuth := middleware.BasicAuth(middleware.BasicAuthConfig{
		Username: cfg.Admin.Username,
		Password: cfg.Admin.Password,
		Realm:    "WatchRoom Admin",
	})

	adminMux := http.NewServeMux()
	adminMux.HandleFunc("/api/admin/reports", handler.HandleListReports)
	adminMux.HandleFunc("/api/admin/reports/", func(w http.ResponseWriter, r *http.Request) {
		reportID := strings.TrimPrefix(r.URL.Path, "/api/admin/reports/")
		handler.HandleUpdateReportStatus(w, r, reportID)
	})
	adminMux.HandleFunc("/api/admin/bans", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handler.HandleListBans(w, r)
		} else if r.Method == http.MethodPost {
			handler.HandleCreateBan(w, r)
		}
	})
	adminMux.HandleFunc("/api/admin/bans/", func(w http.ResponseWriter, r *http.Request) {
		userID := strings.TrimPrefix(r.URL.Path, "/api/admin/bans/")
		handler.HandleDeleteBan(w, r, userID)
	})

	mux.Handle("/api/admin/", adminAuth(adminMux))

	// Apply middleware
	corsConfig := middleware.DefaultCORSConfig()
	corsMiddleware := middleware.CORS(corsConfig)
	loggingMiddleware := middleware.Logging()

	server := loggingMiddleware(corsMiddleware(mux))

	port := cfg.Server.Port
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, server); err != nil {
		log.Fatalf("Failed to start server: %v", err)
		os.Exit(1)
	}
}
