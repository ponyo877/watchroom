package adapter

import (
	"context"
	"encoding/json"
	"net/http"
)

type CreateRoomRequest struct {
	RoomID   string  `json:"room_id"`
	Password *string `json:"password,omitempty"`
}

type CreateRoomResponse struct {
	ShortID string `json:"short_id"`
}

type VerifyPasswordRequest struct {
	Password string `json:"password"`
}

type VerifyPasswordResponse struct {
	Valid bool `json:"valid"`
}

type ChangePasswordRequest struct {
	OldPassword *string `json:"old_password,omitempty"`
	NewPassword string  `json:"new_password"`
}

type SuccessResponse struct {
	Success bool `json:"success"`
}

func (h *Handler) HandleCreateRoom(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req CreateRoomRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	shortID, err := h.roomUsecase.CreateRoom(r.Context(), req.RoomID, req.Password)
	if err != nil {
		http.Error(w, "Failed to create room", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(CreateRoomResponse{ShortID: shortID})
}

func (h *Handler) HandleVerifyPassword(w http.ResponseWriter, r *http.Request, roomID string) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req VerifyPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	valid, err := h.roomUsecase.VerifyPassword(r.Context(), roomID, req.Password)
	if err != nil {
		http.Error(w, "Failed to verify password", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(VerifyPasswordResponse{Valid: valid})
}

func (h *Handler) HandleChangePassword(w http.ResponseWriter, r *http.Request, roomID string) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	err := h.roomUsecase.ChangePassword(r.Context(), roomID, req.OldPassword, req.NewPassword)
	if err != nil {
		http.Error(w, "Failed to change password", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SuccessResponse{Success: true})
}

func (h *Handler) HandleDeletePassword(w http.ResponseWriter, r *http.Request, roomID string) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req VerifyPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	err := h.roomUsecase.DeletePassword(r.Context(), roomID, req.Password)
	if err != nil {
		http.Error(w, "Failed to delete password", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SuccessResponse{Success: true})
}

func (h *Handler) HandleDeleteRoom(w http.ResponseWriter, r *http.Request, roomID string) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	err := h.roomUsecase.DeleteRoom(r.Context(), roomID)
	if err != nil {
		http.Error(w, "Failed to delete room", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SuccessResponse{Success: true})
}

func (h *Handler) HandleResolveShortURL(w http.ResponseWriter, r *http.Request, shortID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	shortURL, err := h.shortURLRepo.GetByShortID(r.Context(), shortID)
	if err != nil {
		http.Error(w, "Failed to resolve short URL", http.StatusInternalServerError)
		return
	}
	if shortURL == nil {
		http.Error(w, "Short URL not found", http.StatusNotFound)
		return
	}

	hasPassword, err := h.roomUsecase.HasPassword(r.Context(), shortURL.RoomID)
	if err != nil {
		http.Error(w, "Failed to check password", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"room_id":      shortURL.RoomID,
		"has_password": hasPassword,
	})
}

// Ogen interface implementations
func (h *Handler) RoomsCreate(ctx context.Context, req *CreateRoomRequest) (*CreateRoomResponse, error) {
	shortID, err := h.roomUsecase.CreateRoom(ctx, req.RoomID, req.Password)
	if err != nil {
		return nil, err
	}
	return &CreateRoomResponse{ShortID: shortID}, nil
}

func (h *Handler) RoomsVerifyPassword(ctx context.Context, roomID string, req *VerifyPasswordRequest) (*VerifyPasswordResponse, error) {
	valid, err := h.roomUsecase.VerifyPassword(ctx, roomID, req.Password)
	if err != nil {
		return nil, err
	}
	return &VerifyPasswordResponse{Valid: valid}, nil
}
