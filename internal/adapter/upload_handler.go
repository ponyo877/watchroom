package adapter

import (
	"encoding/json"
	"net/http"
)

type PresignRequest struct {
	Filename    string `json:"filename"`
	ContentType string `json:"content_type"`
}

type PresignResponse struct {
	UploadURL string `json:"upload_url"`
	Key       string `json:"key"`
	PublicURL string `json:"public_url"`
}

func (h *Handler) HandlePresignUpload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req PresignRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Filename == "" || req.ContentType == "" {
		http.Error(w, "filename and content_type are required", http.StatusBadRequest)
		return
	}

	result, err := h.uploadService.GeneratePresignedURL(r.Context(), req.Filename, req.ContentType)
	if err != nil {
		http.Error(w, "Failed to generate presigned URL: "+err.Error(), http.StatusInternalServerError)
		return
	}

	resp := PresignResponse{
		UploadURL: result.UploadURL,
		Key:       result.Key,
		PublicURL: result.PublicURL,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
