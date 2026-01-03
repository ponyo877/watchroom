import { History, Play, Trash2 } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import type { VideoHistoryItem } from '@/types/skyway';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';

interface PlayHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: VideoHistoryItem[];
  onSelectVideo: (video: VideoHistoryItem) => void;
  onRemoveVideo: (videoId: string) => void;
  onClearHistory: () => void;
  hasControlPermission: boolean;
}

export default function PlayHistory({
  open,
  onOpenChange,
  history,
  onSelectVideo,
  onRemoveVideo,
  onClearHistory,
  hasControlPermission,
}: PlayHistoryProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between">
          <DialogHeader icon={<History className="h-5 w-5 text-muted-foreground" />}>
            <DialogTitle className="flex items-center gap-2">
              再生履歴
              <span className="text-sm font-normal text-muted-foreground">
                ({history.length})
              </span>
            </DialogTitle>
          </DialogHeader>
          {history.length > 0 && (
            <button
              onClick={onClearHistory}
              className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors mr-8"
              title="履歴をクリア"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {history.length === 0 ? (
            <div className="py-12 text-center">
              <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">再生履歴がありません</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((video) => (
                <div
                  key={video.videoId}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 group transition-all duration-200"
                >
                  <div className="relative w-24 h-16 flex-shrink-0">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    {hasControlPermission && (
                      <button
                        onClick={() => {
                          onSelectVideo(video);
                          onOpenChange(false);
                        }}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
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
                    className="p-2 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 rounded-lg transition-all duration-200"
                    title="履歴から削除"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
