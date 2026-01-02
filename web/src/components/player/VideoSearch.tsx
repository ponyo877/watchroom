import { useState } from 'react';
import { Search, X, Link } from 'lucide-react';
import axiosInstance from '@/lib/api';
import { formatDuration } from '@/lib/youtube';
import { getFromCache, saveToCache } from '@/lib/searchCache';
import type { YouTubeVideo } from '@/types/youtube';

interface VideoSearchProps {
  onSelectVideo: (video: YouTubeVideo) => void;
  onClose: () => void;
}

interface APIVideoResponse {
  video_id: string;
  title: string;
  description: string;
  thumbnail: string;
  channel_title: string;
  published_at: string;
  duration: string;
}

interface APISearchResponse {
  items: APIVideoResponse[];
  next_page_token?: string;
}

interface OEmbedResponse {
  title: string;
  author_name: string;
  thumbnail_url: string;
}

// YouTube URL/IDからvideoIdを抽出
const extractVideoId = (input: string): string | null => {
  const trimmed = input.trim();

  // URLパターン
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/  // 11文字のID直接
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  return null;
};

// oEmbedでタイトル・サムネイル取得（クオータ消費なし）
const fetchOEmbed = async (videoId: string): Promise<YouTubeVideo | null> => {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data: OEmbedResponse = await res.json();
    return {
      videoId,
      title: data.title,
      description: '',
      thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      channelTitle: data.author_name,
      publishedAt: '',
      duration: '', // oEmbedではdurationは取得不可
    };
  } catch {
    return null;
  }
};

export default function VideoSearch({ onSelectVideo, onClose }: VideoSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<YouTubeVideo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // URL/動画ID直接入力の検出
    const videoId = extractVideoId(query);
    if (videoId) {
      setIsSearching(true);
      setError(null);

      const video = await fetchOEmbed(videoId);
      if (video) {
        onSelectVideo(video);
        onClose();
        return;
      } else {
        setError('動画が見つかりませんでした');
        setIsSearching(false);
        return;
      }
    }

    // 最小3文字の制限
    if (query.trim().length < 3) {
      setError('3文字以上入力してください');
      return;
    }

    setIsSearching(true);
    setError(null);

    // クライアントサイドキャッシュをチェック
    const cached = getFromCache(query.trim());
    if (cached) {
      setResults(cached);
      setIsSearching(false);
      return;
    }

    try {
      const response = await axiosInstance.get<APISearchResponse>('/api/youtube/search', {
        params: { q: query, max_results: 10 },
      });

      const videos: YouTubeVideo[] = response.data.items.map((item) => ({
        videoId: item.video_id,
        title: item.title,
        description: item.description,
        thumbnail: item.thumbnail,
        channelTitle: item.channel_title,
        publishedAt: item.published_at,
        duration: item.duration,
      }));

      // キャッシュに保存
      saveToCache(query.trim(), videos);
      setResults(videos);
    } catch (err) {
      console.error('Failed to search videos:', err);
      setError('動画の検索に失敗しました');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">動画を検索</h2>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded-md">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSearch} className="p-4 border-b border-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="キーワードで検索 または YouTubeのURLを貼り付け"
              className="flex-1 px-3 py-2 border border-input rounded-md bg-background"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Link className="h-3 w-3" />
            YouTube URLを貼り付けると直接動画を追加できます
          </p>
        </form>

        <div className="flex-1 overflow-y-auto p-4">
          {error ? (
            <p className="text-center text-destructive">{error}</p>
          ) : results.length === 0 ? (
            <p className="text-center text-muted-foreground">
              検索キーワードを入力してください
            </p>
          ) : (
            <div className="space-y-3">
              {results.map((video) => (
                <button
                  key={video.videoId}
                  onClick={() => onSelectVideo(video)}
                  className="w-full flex gap-3 p-2 rounded-lg hover:bg-accent text-left"
                >
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-32 h-20 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{video.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {video.channelTitle}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {video.duration ? formatDuration(video.duration) : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
