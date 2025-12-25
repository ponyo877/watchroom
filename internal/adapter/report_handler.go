package adapter

import (
	"encoding/json"
	"net/http"

	"github.com/ponyo877/youtube-friend-watch/internal/model"
)

type CreateReportRequest struct {
	RoomID      string `json:"room_id"`
	TargetID    string `json:"target_id"`
	MessageText string `json:"message_text"`
	Reason      string `json:"reason"`
}

type CreateReportResponse struct {
	ID int64 `json:"id"`
}

func (h *Handler) HandleCreateReport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	reporterID := r.Header.Get("X-User-Id")
	if reporterID == "" {
		http.Error(w, "X-User-Id header is required", http.StatusBadRequest)
		return
	}

	var req CreateReportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	report := &model.Report{
		RoomID:      req.RoomID,
		ReporterID:  reporterID,
		TargetID:    req.TargetID,
		MessageText: req.MessageText,
		Reason:      req.Reason,
	}

	id, err := h.reportRepo.Create(r.Context(), report)
	if err != nil {
		http.Error(w, "Failed to create report", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(CreateReportResponse{ID: id})
}
