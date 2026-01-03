import { History, Play, Trash2, X } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import type { VideoHistoryItem } from '@/types/skyway';

interface PlayHistoryProps {
  open: boolean;
  onClose: () => void;
  history: VideoHistoryItem[];
  onSelectVideo: (video: VideoHistoryItem) => void;
  onRemoveVideo: (videoId: string) => void;
  onClearHistory: () => void;
  hasControlPermission: boolean;
}

export default function PlayHistory({
  open,
  onClose,
  history,
  onSelectVideo,
  onRemoveVideo,
  onClearHistory,
  hasControlPermission,
}: PlayHistoryProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg w-full max-w-lg mx-4 max-h-[80vh] flex flex-col animate-scale-in">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" />
            <h2 className="font-semibold">再生履歴</h2>
            <span className="text-sm text-muted-foreground">
              ({history.length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={onClearHistory}
                className="p-2 text-sm text-destructive hover:bg-destructive/10 rounded-md"
                title="履歴をクリア"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button onClick={onClose} className="p-1 hover:bg-accent rounded-md">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {history.length === 0 ? (
            <div className="p-8 text-center">
              <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">再生履歴がありません</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {history.map((video) => (
                <div
                  key={video.videoId}
                  className="flex items-center gap-3 p-3 hover:bg-accent group"
                >
                  <div className="relative w-24 h-16 flex-shrink-0">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover rounded"
                    />
                    {hasControlPermission && (
                      <button
                        onClick={() => onSelectVideo(video)}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded"
                      >
                        <Play className="h-8 w-8 text-white" />
                      </button>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{video.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(new Date(video.playedAt))}
                    </p>
                  </div>

                  <button
                    onClick={() => onRemoveVideo(video.videoId)}
                    className="p-2 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 rounded-md transition-opacity"
                    title="履歴から削除"
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
