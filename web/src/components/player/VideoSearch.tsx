import { useState } from 'react';
import { Search, X } from 'lucide-react';
import type { YouTubeVideo } from '@/types/youtube';

interface VideoSearchProps {
  onSelectVideo: (video: YouTubeVideo) => void;
  onClose: () => void;
}

// Mock search results for now
const mockResults: YouTubeVideo[] = [
  {
    videoId: 'dQw4w9WgXcQ',
    title: 'Rick Astley - Never Gonna Give You Up',
    description: 'The official music video',
    thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
    channelTitle: 'Rick Astley',
    publishedAt: '2009-10-25',
    duration: 'PT3M33S',
  },
  {
    videoId: 'jNQXAC9IVRw',
    title: 'Me at the zoo',
    description: 'The first video on YouTube',
    thumbnail: 'https://i.ytimg.com/vi/jNQXAC9IVRw/mqdefault.jpg',
    channelTitle: 'jawed',
    publishedAt: '2005-04-23',
    duration: 'PT0M18S',
  },
];

export default function VideoSearch({ onSelectVideo, onClose }: VideoSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<YouTubeVideo[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    // TODO: Replace with actual API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    setResults(mockResults);
    setIsSearching(false);
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
              placeholder="YouTubeで検索..."
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
        </form>

        <div className="flex-1 overflow-y-auto p-4">
          {results.length === 0 ? (
            <p className="text-center text-muted-foreground">
              検索結果がありません
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
                      {video.duration}
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
