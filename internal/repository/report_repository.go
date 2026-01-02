package repository

import (
	"context"
	"database/sql"
	"strconv"

	"github.com/ponyo877/youtube-friend-watch/internal/model"
)

// ReportRepositoryMySQL is the MySQL implementation of ReportRepository
type ReportRepositoryMySQL struct {
	db *sql.DB
}

// NewReportRepositoryMySQL creates a new MySQL-based ReportRepository
func NewReportRepositoryMySQL(db *sql.DB) *ReportRepositoryMySQL {
	return &ReportRepositoryMySQL{db: db}
}

func (r *ReportRepositoryMySQL) Create(ctx context.Context, report *model.Report) (string, error) {
	result, err := r.db.ExecContext(ctx,
		`INSERT INTO reports (room_id, reporter_id, target_id, message_text, reason, status)
		VALUES (?, ?, ?, ?, ?, 'pending')`,
		report.RoomID, report.ReporterID, report.TargetID, report.MessageText, report.Reason)
	if err != nil {
		return "", err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return "", err
	}
	return strconv.FormatInt(id, 10), nil
}

func (r *ReportRepositoryMySQL) GetByID(ctx context.Context, id string) (*model.Report, error) {
	var report model.Report
	var dbID int
	var status string
	err := r.db.QueryRowContext(ctx,
		`SELECT id, room_id, reporter_id, target_id, message_text, reason, status, created_at, updated_at
		FROM reports WHERE id = ?`,
		id).Scan(&dbID, &report.RoomID, &report.ReporterID, &report.TargetID,
		&report.MessageText, &report.Reason, &status, &report.CreatedAt, &report.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	report.ID = strconv.Itoa(dbID)
	report.Status = model.ReportStatus(status)
	return &report, nil
}

func (r *ReportRepositoryMySQL) ListPending(ctx context.Context) ([]*model.Report, error) {
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
		var dbID int
		var status string
		if err := rows.Scan(&dbID, &report.RoomID, &report.ReporterID, &report.TargetID,
			&report.MessageText, &report.Reason, &status, &report.CreatedAt, &report.UpdatedAt); err != nil {
			return nil, err
		}
		report.ID = strconv.Itoa(dbID)
		report.Status = model.ReportStatus(status)
		reports = append(reports, &report)
	}
	return reports, rows.Err()
}

func (r *ReportRepositoryMySQL) UpdateStatus(ctx context.Context, id string, status model.ReportStatus) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE reports SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
		string(status), id)
	return err
}
