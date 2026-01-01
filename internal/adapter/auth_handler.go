package adapter

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/ponyo877/youtube-friend-watch/internal/usecase"
)

type AuthTokenRequest struct {
	UserID   string  `json:"user_id"`
	RoomName *string `json:"room_name,omitempty"`
}

type AuthTokenResponse struct {
	Token     string `json:"token"`
	ExpiresAt int64  `json:"expires_at"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

func (h *Handler) HandleAuthToken(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req AuthTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.UserID == "" {
		http.Error(w, "user_id is required", http.StatusBadRequest)
		return
	}

	token, expiresAt, err := h.authUsecase.CreateToken(r.Context(), req.UserID, req.RoomName)
	if err != nil {
		if errors.Is(err, usecase.ErrRoomFull) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(ErrorResponse{
				Error:   "room_full",
				Message: "ルームが満員です",
			})
			return
		}
		http.Error(w, "Failed to create token", http.StatusInternalServerError)
		return
	}

	resp := AuthTokenResponse{
		Token:     token,
		ExpiresAt: expiresAt,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// CreateToken implements the ogen-generated interface
func (h *Handler) AuthCreateToken(ctx context.Context, req *AuthTokenRequest) (*AuthTokenResponse, error) {
	token, expiresAt, err := h.authUsecase.CreateToken(ctx, req.UserID, req.RoomName)
	if err != nil {
		return nil, err
	}

	return &AuthTokenResponse{
		Token:     token,
		ExpiresAt: expiresAt,
	}, nil
}
