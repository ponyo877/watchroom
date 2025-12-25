package adapter

import (
	"encoding/json"
	"net/http"
	"strconv"
)

type YouTubeVideo struct {
	VideoID      string `json:"video_id"`
	Title        string `json:"title"`
	Description  string `json:"description,omitempty"`
	Thumbnail    string `json:"thumbnail"`
	ChannelTitle string `json:"channel_title"`
	PublishedAt  string `json:"published_at"`
	Duration     string `json:"duration,omitempty"`
}

type YouTubeSearchResponse struct {
	Items         []YouTubeVideo `json:"items"`
	NextPageToken string         `json:"next_page_token,omitempty"`
}

func (h *Handler) HandleYouTubeSearch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "query parameter 'q' is required", http.StatusBadRequest)
		return
	}

	maxResults := int64(10)
	if maxStr := r.URL.Query().Get("max_results"); maxStr != "" {
		if n, err := strconv.ParseInt(maxStr, 10, 64); err == nil && n > 0 && n <= 50 {
			maxResults = n
		}
	}

	pageToken := r.URL.Query().Get("page_token")

	result, err := h.youtubeService.Search(r.Context(), query, maxResults, pageToken)
	if err != nil {
		http.Error(w, "Failed to search videos: "+err.Error(), http.StatusInternalServerError)
		return
	}

	items := make([]YouTubeVideo, 0, len(result.Items))
	for _, v := range result.Items {
		items = append(items, YouTubeVideo{
			VideoID:      v.VideoID,
			Title:        v.Title,
			Description:  v.Description,
			Thumbnail:    v.Thumbnail,
			ChannelTitle: v.ChannelTitle,
			PublishedAt:  v.PublishedAt,
			Duration:     v.Duration,
		})
	}

	resp := YouTubeSearchResponse{
		Items:         items,
		NextPageToken: result.NextPageToken,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *Handler) HandleGetVideo(w http.ResponseWriter, r *http.Request, videoID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	video, err := h.youtubeService.GetVideo(r.Context(), videoID)
	if err != nil {
		http.Error(w, "Failed to get video: "+err.Error(), http.StatusInternalServerError)
		return
	}

	resp := YouTubeVideo{
		VideoID:      video.VideoID,
		Title:        video.Title,
		Description:  video.Description,
		Thumbnail:    video.Thumbnail,
		ChannelTitle: video.ChannelTitle,
		PublishedAt:  video.PublishedAt,
		Duration:     video.Duration,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
