package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/ponyo877/youtube-friend-watch/internal/model"
	"github.com/redis/go-redis/v9"
)

const (
	reportPrefix   = "report:"
	reportsAllKey  = "reports:all"
)

// ReportRepositoryRedis is the Redis implementation of ReportRepository
type ReportRepositoryRedis struct {
	client *redis.Client
}

// NewReportRepositoryRedis creates a new Redis-based ReportRepository
func NewReportRepositoryRedis(client *redis.Client) *ReportRepositoryRedis {
	return &ReportRepositoryRedis{client: client}
}

// reportDataRedis is the structure stored in Redis
type reportDataRedis struct {
	ID          string `json:"id"`
	RoomID      string `json:"room_id"`
	ReporterID  string `json:"reporter_id"`
	TargetID    string `json:"target_id"`
	MessageText string `json:"message_text"`
	Reason      string `json:"reason"`
	Status      string `json:"status"`
	CreatedAt   int64  `json:"created_at"`
	UpdatedAt   int64  `json:"updated_at"`
}

func (r *ReportRepositoryRedis) Create(ctx context.Context, report *model.Report) (string, error) {
	id := uuid.New().String()
	now := time.Now()

	data := reportDataRedis{
		ID:          id,
		RoomID:      report.RoomID,
		ReporterID:  report.ReporterID,
		TargetID:    report.TargetID,
		MessageText: report.MessageText,
		Reason:      report.Reason,
		Status:      string(model.ReportStatusPending),
		CreatedAt:   now.Unix(),
		UpdatedAt:   now.Unix(),
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return "", err
	}

	pipe := r.client.Pipeline()
	pipe.Set(ctx, reportPrefix+id, jsonData, 0)
	pipe.ZAdd(ctx, reportsAllKey, redis.Z{
		Score:  float64(now.Unix()),
		Member: id,
	})
	_, err = pipe.Exec(ctx)
	if err != nil {
		return "", err
	}

	return id, nil
}

func (r *ReportRepositoryRedis) GetByID(ctx context.Context, id string) (*model.Report, error) {
	data, err := r.client.Get(ctx, reportPrefix+id).Result()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	var reportData reportDataRedis
	if err := json.Unmarshal([]byte(data), &reportData); err != nil {
		return nil, err
	}

	return &model.Report{
		ID:          reportData.ID,
		RoomID:      reportData.RoomID,
		ReporterID:  reportData.ReporterID,
		TargetID:    reportData.TargetID,
		MessageText: reportData.MessageText,
		Reason:      reportData.Reason,
		Status:      model.ReportStatus(reportData.Status),
		CreatedAt:   time.Unix(reportData.CreatedAt, 0),
		UpdatedAt:   time.Unix(reportData.UpdatedAt, 0),
	}, nil
}

func (r *ReportRepositoryRedis) ListPending(ctx context.Context) ([]*model.Report, error) {
	// Get all report IDs sorted by created_at DESC
	ids, err := r.client.ZRevRange(ctx, reportsAllKey, 0, -1).Result()
	if err != nil {
		return nil, err
	}

	var pending []*model.Report
	for _, id := range ids {
		report, err := r.GetByID(ctx, id)
		if err != nil {
			continue
		}
		if report != nil && report.Status == model.ReportStatusPending {
			pending = append(pending, report)
		}
	}

	return pending, nil
}

func (r *ReportRepositoryRedis) UpdateStatus(ctx context.Context, id string, status model.ReportStatus) error {
	// Get current report
	data, err := r.client.Get(ctx, reportPrefix+id).Result()
	if err != nil {
		return err
	}

	var reportData reportDataRedis
	if err := json.Unmarshal([]byte(data), &reportData); err != nil {
		return err
	}

	// Update status and updated_at
	reportData.Status = string(status)
	reportData.UpdatedAt = time.Now().Unix()

	jsonData, err := json.Marshal(reportData)
	if err != nil {
		return err
	}

	return r.client.Set(ctx, reportPrefix+id, jsonData, 0).Err()
}
