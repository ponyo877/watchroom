package service

import (
	"context"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

type UploadService struct {
	client     *s3.Client
	bucketName string
	publicURL  string
}

type PresignedURLResult struct {
	UploadURL string
	Key       string
	PublicURL string
}

func NewUploadService(accountID, accessKeyID, secretAccessKey, bucketName, publicURL string) (*UploadService, error) {
	if accountID == "" || accessKeyID == "" || secretAccessKey == "" {
		// Return a mock service if R2 is not configured
		return &UploadService{
			client:     nil,
			bucketName: bucketName,
			publicURL:  publicURL,
		}, nil
	}

	r2Endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID)

	cfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			accessKeyID,
			secretAccessKey,
			"",
		)),
		config.WithRegion("auto"),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(r2Endpoint)
	})

	return &UploadService{
		client:     client,
		bucketName: bucketName,
		publicURL:  publicURL,
	}, nil
}

func (s *UploadService) GeneratePresignedURL(ctx context.Context, filename, contentType string) (*PresignedURLResult, error) {
	// Generate a unique key for the file
	key := fmt.Sprintf("uploads/%s/%s", uuid.New().String(), filename)

	if s.client == nil {
		// Return mock URLs if R2 is not configured
		return &PresignedURLResult{
			UploadURL: fmt.Sprintf("https://mock-upload.example.com/%s", key),
			Key:       key,
			PublicURL: fmt.Sprintf("https://mock-public.example.com/%s", key),
		}, nil
	}

	presignClient := s3.NewPresignClient(s.client)

	presignedReq, err := presignClient.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucketName),
		Key:         aws.String(key),
		ContentType: aws.String(contentType),
	}, s3.WithPresignExpires(15*time.Minute))
	if err != nil {
		return nil, fmt.Errorf("failed to generate presigned URL: %w", err)
	}

	publicURL := s.publicURL
	if publicURL == "" {
		publicURL = fmt.Sprintf("https://%s.r2.dev", s.bucketName)
	}

	return &PresignedURLResult{
		UploadURL: presignedReq.URL,
		Key:       key,
		PublicURL: fmt.Sprintf("%s/%s", publicURL, key),
	}, nil
}
