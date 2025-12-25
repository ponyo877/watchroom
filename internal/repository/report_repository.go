package repository

import (
	"context"
	"database/sql"

	"github.com/ponyo877/youtube-friend-watch/internal/model"
)

type ReportRepository struct {
	db *sql.DB
}

func NewReportRepository(db *sql.DB) *ReportRepository {
	return &ReportRepository{db: db}
}

func (r *ReportRepository) Create(ctx context.Context, report *model.Report) (int64, error) {
	result, err := r.db.ExecContext(ctx,
		`INSERT INTO reports (room_id, reporter_id, target_id, message_text, reason, status)
		VALUES (?, ?, ?, ?, ?, 'pending')`,
		report.RoomID, report.ReporterID, report.TargetID, report.MessageText, report.Reason)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func (r *ReportRepository) GetByID(ctx context.Context, id int) (*model.Report, error) {
	var report model.Report
	var status string
	err := r.db.QueryRowContext(ctx,
		`SELECT id, room_id, reporter_id, target_id, message_text, reason, status, created_at, updated_at
		FROM reports WHERE id = ?`,
		id).Scan(&report.ID, &report.RoomID, &report.ReporterID, &report.TargetID,
		&report.MessageText, &report.Reason, &status, &report.CreatedAt, &report.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	report.Status = model.ReportStatus(status)
	return &report, nil
}

func (r *ReportRepository) ListPending(ctx context.Context) ([]*model.Report, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, room_id, reporter_id, target_id, message_text, reason, status, created_at, updated_at
		FROM reports WHERE status = 'pending' ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reports []*model.Report
	for rows.Next() {
		var report model.Report
		var status string
		if err := rows.Scan(&report.ID, &report.RoomID, &report.ReporterID, &report.TargetID,
			&report.MessageText, &report.Reason, &status, &report.CreatedAt, &report.UpdatedAt); err != nil {
			return nil, err
		}
		report.Status = model.ReportStatus(status)
		reports = append(reports, &report)
	}
	return reports, rows.Err()
}

func (r *ReportRepository) UpdateStatus(ctx context.Context, id int, status model.ReportStatus) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE reports SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
		string(status), id)
	return err
}
