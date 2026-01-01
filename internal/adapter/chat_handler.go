package adapter

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/ponyo877/youtube-friend-watch/internal/model"
)

type CreateMessageRequest struct {
	MessageID     string  `json:"message_id"`
	SenderID      string  `json:"sender_id"`
	SenderName    string  `json:"sender_name"`
	SenderIconUrl *string `json:"sender_icon_url,omitempty"`
	Text          string  `json:"text"`
}

type MessageResponse struct {
	ID            string  `json:"id"`
	MessageID     string  `json:"message_id"`
	SenderID      string  `json:"sender_id"`
	SenderName    string  `json:"sender_name"`
	SenderIconUrl *string `json:"sender_icon_url,omitempty"`
	Text          string  `json:"text"`
	Timestamp     int64   `json:"timestamp"`
}

type MessagesListResponse struct {
	Messages []MessageResponse `json:"messages"`
}

func (h *Handler) HandleCreateMessage(w http.ResponseWriter, r *http.Request, roomID string) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req CreateMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	msg := &model.ChatMessage{
		MessageID:     req.MessageID,
		RoomID:        roomID,
		SenderID:      req.SenderID,
		SenderName:    req.SenderName,
		SenderIconUrl: req.SenderIconUrl,
		Text:          req.Text,
	}

	if err := h.chatRepo.Create(r.Context(), msg); err != nil {
		http.Error(w, "Failed to save message", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SuccessResponse{Success: true})
}

func (h *Handler) HandleGetMessages(w http.ResponseWriter, r *http.Request, roomID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	limitStr := r.URL.Query().Get("limit")
	limit := 50
	if limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	messages, err := h.chatRepo.GetRecentByRoomID(r.Context(), roomID, limit)
	if err != nil {
		http.Error(w, "Failed to get messages", http.StatusInternalServerError)
		return
	}

	response := MessagesListResponse{
		Messages: make([]MessageResponse, 0, len(messages)),
	}

	for _, msg := range messages {
		response.Messages = append(response.Messages, MessageResponse{
			MessageID:     msg.MessageID,
			SenderID:      msg.SenderID,
			SenderName:    msg.SenderName,
			SenderIconUrl: msg.SenderIconUrl,
			Text:          msg.Text,
			Timestamp:     msg.CreatedAt.UnixMilli(),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
