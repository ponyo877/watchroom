package config

import (
	"fmt"
	"os"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	SkyWay   SkyWayConfig
	YouTube  YouTubeConfig
	R2       R2Config
	Admin    AdminConfig
}

type ServerConfig struct {
	Port string
}

type DatabaseConfig struct {
	Host     string
	Port     string
	Database string
	User     string
	Password string
}

type SkyWayConfig struct {
	AppID     string
	SecretKey string
}

type YouTubeConfig struct {
	APIKey string
}

type R2Config struct {
	AccountID       string
	AccessKeyID     string
	SecretAccessKey string
	BucketName      string
	PublicURL       string
}

type AdminConfig struct {
	Username string
	Password string
}

func Load() (*Config, error) {
	cfg := &Config{
		Server: ServerConfig{
			Port: getEnv("PORT", "8080"),
		},
		Database: DatabaseConfig{
			Host:     getEnv("MYSQL_HOST", "localhost"),
			Port:     getEnv("MYSQL_PORT", "3306"),
			Database: getEnv("MYSQL_DATABASE", "watchroom"),
			User:     getEnv("MYSQL_USER", "watchroom"),
			Password: getEnv("MYSQL_PASSWORD", "watchroom"),
		},
		SkyWay: SkyWayConfig{
			AppID:     os.Getenv("SKYWAY_APP_ID"),
			SecretKey: os.Getenv("SKYWAY_SECRET_KEY"),
		},
		YouTube: YouTubeConfig{
			APIKey: os.Getenv("YOUTUBE_API_KEY"),
		},
		R2: R2Config{
			AccountID:       os.Getenv("R2_ACCOUNT_ID"),
			AccessKeyID:     os.Getenv("R2_ACCESS_KEY_ID"),
			SecretAccessKey: os.Getenv("R2_SECRET_ACCESS_KEY"),
			BucketName:      os.Getenv("R2_BUCKET_NAME"),
			PublicURL:       os.Getenv("R2_PUBLIC_URL"),
		},
		Admin: AdminConfig{
			Username: getEnv("ADMIN_USERNAME", "admin"),
			Password: getEnv("ADMIN_PASSWORD", "admin123"),
		},
	}

	return cfg, nil
}

func (c *DatabaseConfig) DSN() string {
	return fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&charset=utf8mb4&collation=utf8mb4_unicode_ci",
		c.User, c.Password, c.Host, c.Port, c.Database)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
