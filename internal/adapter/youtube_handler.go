package adapter

import (
	"encoding/json"
	"net/http"
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

	// TODO: Implement YouTube Data API call
	// For now, return mock data
	resp := YouTubeSearchResponse{
		Items: []YouTubeVideo{
			{
				VideoID:      "dQw4w9WgXcQ",
				Title:        "Rick Astley - Never Gonna Give You Up",
				Description:  "The official music video",
				Thumbnail:    "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
				ChannelTitle: "Rick Astley",
				PublishedAt:  "2009-10-25T00:00:00Z",
				Duration:     "PT3M33S",
			},
		},
		NextPageToken: "",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *Handler) HandleGetVideo(w http.ResponseWriter, r *http.Request, videoID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// TODO: Implement YouTube Data API call
	video := YouTubeVideo{
		VideoID:      videoID,
		Title:        "Video Title",
		Description:  "Video Description",
		Thumbnail:    "https://i.ytimg.com/vi/" + videoID + "/mqdefault.jpg",
		ChannelTitle: "Channel",
		PublishedAt:  "2024-01-01T00:00:00Z",
		Duration:     "PT5M00S",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(video)
}
