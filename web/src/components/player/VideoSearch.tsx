import { useState } from 'react';
import { Search, Link } from 'lucide-react';
import axiosInstance from '@/lib/api';
import { formatDuration } from '@/lib/youtube';
import { getFromCache, saveToCache } from '@/lib/searchCache';
import type { YouTubeVideo } from '@/types/youtube';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';

interface VideoSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectVideo: (video: YouTubeVideo) => void;
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

export default function VideoSearch({ open, onOpenChange, onSelectVideo }: VideoSearchProps) {
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
        onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader icon={<Search className="h-5 w-5 text-muted-foreground" />}>
          <DialogTitle>動画を検索</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="キーワードで検索 または YouTubeのURLを貼り付け"
              className="flex-1 px-4 py-2.5 border border-input rounded-xl bg-background/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 hover:border-primary/30 transition-all duration-200"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:shadow-none disabled:scale-100 transition-all duration-200"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Link className="h-3 w-3" />
            YouTube URLを貼り付けると直接動画を追加できます
          </p>
        </form>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 mt-4">
          {error ? (
            <p className="text-center text-destructive py-8">{error}</p>
          ) : results.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              検索キーワードを入力してください
            </p>
          ) : (
            <div className="space-y-2">
              {results.map((video) => (
                <button
                  key={video.videoId}
                  onClick={() => {
                    onSelectVideo(video);
                    onOpenChange(false);
                  }}
                  className="w-full flex gap-3 p-3 rounded-xl hover:bg-accent/50 text-left transition-all duration-200 hover:scale-[1.01]"
                >
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-32 h-20 object-cover rounded-lg"
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
      </DialogContent>
    </Dialog>
  );
}
