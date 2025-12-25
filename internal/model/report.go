package model

import "time"

type ReportStatus string

const (
	ReportStatusPending  ReportStatus = "pending"
	ReportStatusReviewed ReportStatus = "reviewed"
	ReportStatusResolved ReportStatus = "resolved"
)

type Report struct {
	ID          int
	RoomID      string
	ReporterID  string
	TargetID    string
	MessageText string
	Reason      string
	Status      ReportStatus
	CreatedAt   time.Time
	UpdatedAt   time.Time
}
