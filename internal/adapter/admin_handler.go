package adapter

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/ponyo877/youtube-friend-watch/internal/model"
)

type ReportResponse struct {
	ID          int    `json:"id"`
	RoomID      string `json:"room_id"`
	ReporterID  string `json:"reporter_id"`
	TargetID    string `json:"target_id"`
	MessageText string `json:"message_text"`
	Reason      string `json:"reason"`
	Status      string `json:"status"`
	CreatedAt   string `json:"created_at"`
}

type ReportListResponse struct {
	Reports []ReportResponse `json:"reports"`
}

type UpdateReportStatusRequest struct {
	Status string `json:"status"`
}

type BanResponse struct {
	ID        int     `json:"id"`
	UserID    string  `json:"user_id"`
	Reason    string  `json:"reason"`
	BannedAt  string  `json:"banned_at"`
	ExpiresAt *string `json:"expires_at,omitempty"`
}

type BanListResponse struct {
	Bans []BanResponse `json:"bans"`
}

type CreateBanRequest struct {
	UserID    string  `json:"user_id"`
	Reason    string  `json:"reason"`
	ExpiresAt *string `json:"expires_at,omitempty"`
}

type BanStatusResponse struct {
	IsBanned  bool    `json:"is_banned"`
	Reason    *string `json:"reason,omitempty"`
	ExpiresAt *string `json:"expires_at,omitempty"`
}

func (h *Handler) HandleListReports(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	reports, err := h.reportRepo.ListPending(r.Context())
	if err != nil {
		http.Error(w, "Failed to list reports", http.StatusInternalServerError)
		return
	}

	resp := ReportListResponse{Reports: make([]ReportResponse, len(reports))}
	for i, report := range reports {
		resp.Reports[i] = ReportResponse{
			ID:          report.ID,
			RoomID:      report.RoomID,
			ReporterID:  report.ReporterID,
			TargetID:    report.TargetID,
			MessageText: report.MessageText,
			Reason:      report.Reason,
			Status:      string(report.Status),
			CreatedAt:   report.CreatedAt.Format(time.RFC3339),
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *Handler) HandleUpdateReportStatus(w http.ResponseWriter, r *http.Request, reportID string) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	id, err := strconv.Atoi(reportID)
	if err != nil {
		http.Error(w, "Invalid report ID", http.StatusBadRequest)
		return
	}

	var req UpdateReportStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	status := model.ReportStatus(req.Status)
	if status != model.ReportStatusPending && status != model.ReportStatusReviewed && status != model.ReportStatusResolved {
		http.Error(w, "Invalid status", http.StatusBadRequest)
		return
	}

	if err := h.reportRepo.UpdateStatus(r.Context(), id, status); err != nil {
		http.Error(w, "Failed to update report", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SuccessResponse{Success: true})
}

func (h *Handler) HandleListBans(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	bans, err := h.banRepo.List(r.Context())
	if err != nil {
		http.Error(w, "Failed to list bans", http.StatusInternalServerError)
		return
	}

	resp := BanListResponse{Bans: make([]BanResponse, len(bans))}
	for i, ban := range bans {
		banResp := BanResponse{
			ID:       ban.ID,
			UserID:   ban.UserID,
			Reason:   ban.Reason,
			BannedAt: ban.BannedAt.Format(time.RFC3339),
		}
		if ban.ExpiresAt != nil {
			expiresAt := ban.ExpiresAt.Format(time.RFC3339)
			banResp.ExpiresAt = &expiresAt
		}
		resp.Bans[i] = banResp
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *Handler) HandleCreateBan(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req CreateBanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	ban := &model.GlobalBan{
		UserID: req.UserID,
		Reason: req.Reason,
	}

	if req.ExpiresAt != nil {
		expiresAt, err := time.Parse(time.RFC3339, *req.ExpiresAt)
		if err != nil {
			http.Error(w, "Invalid expires_at format", http.StatusBadRequest)
			return
		}
		ban.ExpiresAt = &expiresAt
	}

	if err := h.banRepo.Create(r.Context(), ban); err != nil {
		http.Error(w, "Failed to create ban", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SuccessResponse{Success: true})
}

func (h *Handler) HandleDeleteBan(w http.ResponseWriter, r *http.Request, userID string) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := h.banRepo.Delete(r.Context(), userID); err != nil {
		http.Error(w, "Failed to delete ban", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SuccessResponse{Success: true})
}

func (h *Handler) HandleCheckBanStatus(w http.ResponseWriter, r *http.Request, userID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ban, err := h.banRepo.GetByUserID(r.Context(), userID)
	if err != nil {
		http.Error(w, "Failed to check ban status", http.StatusInternalServerError)
		return
	}

	resp := BanStatusResponse{IsBanned: false}
	if ban != nil && ban.IsActive() {
		resp.IsBanned = true
		resp.Reason = &ban.Reason
		if ban.ExpiresAt != nil {
			expiresAt := ban.ExpiresAt.Format(time.RFC3339)
			resp.ExpiresAt = &expiresAt
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
