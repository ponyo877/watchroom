package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"google.golang.org/api/option"
	"google.golang.org/api/youtube/v3"
)

const (
	// キャッシュTTL
	SearchCacheTTL = 1 * time.Hour
	VideoCacheTTL  = 24 * time.Hour
)

type YouTubeService struct {
	apiKey  string
	service *youtube.Service
	cache   *MemoryCache
}

type Video struct {
	VideoID      string
	Title        string
	Description  string
	Thumbnail    string
	ChannelTitle string
	PublishedAt  string
	Duration     string
}

type SearchResult struct {
	Items         []Video
	NextPageToken string
}

func NewYouTubeService(apiKey string) (*YouTubeService, error) {
	cache := NewMemoryCache()

	if apiKey == "" {
		return &YouTubeService{apiKey: "", cache: cache}, nil
	}

	ctx := context.Background()
	service, err := youtube.NewService(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, fmt.Errorf("failed to create YouTube service: %w", err)
	}

	return &YouTubeService{
		apiKey:  apiKey,
		service: service,
		cache:   cache,
	}, nil
}

func (s *YouTubeService) Search(ctx context.Context, query string, maxResults int64, pageToken string) (*SearchResult, error) {
	if s.service == nil {
		return s.mockSearch(query), nil
	}

	// キャッシュキーを生成（pageTokenも含める）
	cacheKey := fmt.Sprintf("search:%s:%d:%s", query, maxResults, pageToken)

	// キャッシュをチェック
	if cached, ok := s.cache.Get(cacheKey); ok {
		if result, ok := cached.(*SearchResult); ok {
			return result, nil
		}
	}

	// YouTube APIで検索
	result, err := s.searchFromYouTubeAPI(ctx, query, maxResults, pageToken)
	if err != nil {
		// クオータ超過時は空の結果を返す（500エラーではなく）
		return &SearchResult{Items: []Video{}, NextPageToken: ""}, nil
	}

	// 結果をキャッシュ
	s.cache.Set(cacheKey, result, SearchCacheTTL)
	return result, nil
}

// searchFromYouTubeAPI はYouTube Data APIで検索する
func (s *YouTubeService) searchFromYouTubeAPI(ctx context.Context, query string, maxResults int64, pageToken string) (*SearchResult, error) {
	// タイムアウト付きのcontextを作成（30秒）
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	call := s.service.Search.List([]string{"id", "snippet"}).
		Context(ctx).
		Q(query).
		Type("video").
		MaxResults(maxResults).
		Order("relevance")

	if pageToken != "" {
		call = call.PageToken(pageToken)
	}

	response, err := call.Do()
	if err != nil {
		return nil, fmt.Errorf("failed to search videos: %w", err)
	}

	videoIDs := make([]string, 0, len(response.Items))
	for _, item := range response.Items {
		videoIDs = append(videoIDs, item.Id.VideoId)
	}

	durations := make(map[string]string)
	if len(videoIDs) > 0 {
		videosCall := s.service.Videos.List([]string{"contentDetails"}).
			Id(strings.Join(videoIDs, ","))
		videosResp, err := videosCall.Do()
		if err == nil {
			for _, v := range videosResp.Items {
				durations[v.Id] = v.ContentDetails.Duration
			}
		}
	}

	items := make([]Video, 0, len(response.Items))
	for _, item := range response.Items {
		thumbnail := ""
		if item.Snippet.Thumbnails != nil {
			if item.Snippet.Thumbnails.Medium != nil {
				thumbnail = item.Snippet.Thumbnails.Medium.Url
			} else if item.Snippet.Thumbnails.Default != nil {
				thumbnail = item.Snippet.Thumbnails.Default.Url
			}
		}

		items = append(items, Video{
			VideoID:      item.Id.VideoId,
			Title:        item.Snippet.Title,
			Description:  item.Snippet.Description,
			Thumbnail:    thumbnail,
			ChannelTitle: item.Snippet.ChannelTitle,
			PublishedAt:  item.Snippet.PublishedAt,
			Duration:     durations[item.Id.VideoId],
		})
	}

	return &SearchResult{
		Items:         items,
		NextPageToken: response.NextPageToken,
	}, nil
}

func (s *YouTubeService) GetVideo(ctx context.Context, videoID string) (*Video, error) {
	if s.service == nil {
		return s.mockGetVideo(videoID), nil
	}

	// キャッシュをチェック
	cacheKey := fmt.Sprintf("video:%s", videoID)
	if cached, ok := s.cache.Get(cacheKey); ok {
		if video, ok := cached.(*Video); ok {
			return video, nil
		}
	}

	call := s.service.Videos.List([]string{"snippet", "contentDetails"}).
		Id(videoID)

	response, err := call.Do()
	if err != nil {
		return nil, fmt.Errorf("failed to get video: %w", err)
	}

	if len(response.Items) == 0 {
		return nil, fmt.Errorf("video not found: %s", videoID)
	}

	item := response.Items[0]
	thumbnail := ""
	if item.Snippet.Thumbnails != nil {
		if item.Snippet.Thumbnails.Medium != nil {
			thumbnail = item.Snippet.Thumbnails.Medium.Url
		} else if item.Snippet.Thumbnails.Default != nil {
			thumbnail = item.Snippet.Thumbnails.Default.Url
		}
	}

	video := &Video{
		VideoID:      item.Id,
		Title:        item.Snippet.Title,
		Description:  item.Snippet.Description,
		Thumbnail:    thumbnail,
		ChannelTitle: item.Snippet.ChannelTitle,
		PublishedAt:  item.Snippet.PublishedAt,
		Duration:     item.ContentDetails.Duration,
	}

	// キャッシュに保存（24時間）
	s.cache.Set(cacheKey, video, VideoCacheTTL)

	return video, nil
}

func (s *YouTubeService) mockSearch(query string) *SearchResult {
	return &SearchResult{
		Items: []Video{
			{
				VideoID:      "dQw4w9WgXcQ",
				Title:        "Rick Astley - Never Gonna Give You Up (Video)",
				Description:  "The official music video for 'Never Gonna Give You Up' by Rick Astley",
				Thumbnail:    "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
				ChannelTitle: "Rick Astley",
				PublishedAt:  "2009-10-25T06:57:33Z",
				Duration:     "PT3M33S",
			},
			{
				VideoID:      "jNQXAC9IVRw",
				Title:        "Me at the zoo",
				Description:  "The first video on YouTube",
				Thumbnail:    "https://i.ytimg.com/vi/jNQXAC9IVRw/mqdefault.jpg",
				ChannelTitle: "jawed",
				PublishedAt:  "2005-04-24T03:31:52Z",
				Duration:     "PT0M19S",
			},
		},
		NextPageToken: "",
	}
}

func (s *YouTubeService) mockGetVideo(videoID string) *Video {
	return &Video{
		VideoID:      videoID,
		Title:        "Video Title",
		Description:  "Video Description",
		Thumbnail:    fmt.Sprintf("https://i.ytimg.com/vi/%s/mqdefault.jpg", videoID),
		ChannelTitle: "Channel",
		PublishedAt:  "2024-01-01T00:00:00Z",
		Duration:     "PT5M00S",
	}
}
