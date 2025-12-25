import { Play, Pause, SkipBack, SkipForward, Volume2, Settings } from 'lucide-react';
import { formatDuration } from '@/lib/utils';

interface PlayerControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  hasControlPermission: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onPlaybackRateChange: (rate: number) => void;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function PlayerControls({
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  hasControlPermission,
  onPlay,
  onPause,
  onSeek,
  onPlaybackRateChange,
}: PlayerControlsProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = (parseFloat(e.target.value) / 100) * duration;
    onSeek(time);
  };

  const skip = (seconds: number) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    onSeek(newTime);
  };

  return (
    <div className="h-full flex items-center gap-4 px-4">
      {/* Play/Pause */}
      <button
        onClick={isPlaying ? onPause : onPlay}
        disabled={!hasControlPermission}
        className="p-2 hover:bg-accent rounded-full disabled:opacity-50"
      >
        {isPlaying ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5" />
        )}
      </button>

      {/* Skip buttons */}
      <button
        onClick={() => skip(-10)}
        disabled={!hasControlPermission}
        className="p-2 hover:bg-accent rounded-full disabled:opacity-50"
      >
        <SkipBack className="h-4 w-4" />
      </button>
      <button
        onClick={() => skip(10)}
        disabled={!hasControlPermission}
        className="p-2 hover:bg-accent rounded-full disabled:opacity-50"
      >
        <SkipForward className="h-4 w-4" />
      </button>

      {/* Progress bar */}
      <div className="flex-1 flex items-center gap-3">
        <span className="text-sm text-muted-foreground w-12">
          {formatDuration(currentTime)}
        </span>
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={handleSeek}
          disabled={!hasControlPermission}
          className="flex-1 h-1 bg-muted rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed"
        />
        <span className="text-sm text-muted-foreground w-12">
          {formatDuration(duration)}
        </span>
      </div>

      {/* Volume */}
      <button className="p-2 hover:bg-accent rounded-full">
        <Volume2 className="h-4 w-4" />
      </button>

      {/* Playback rate */}
      <select
        value={playbackRate}
        onChange={(e) => onPlaybackRateChange(parseFloat(e.target.value))}
        disabled={!hasControlPermission}
        className="px-2 py-1 text-sm bg-transparent border border-border rounded disabled:opacity-50"
      >
        {PLAYBACK_RATES.map((rate) => (
          <option key={rate} value={rate}>
            {rate}x
          </option>
        ))}
      </select>

      {/* Settings */}
      <button className="p-2 hover:bg-accent rounded-full">
        <Settings className="h-4 w-4" />
      </button>
    </div>
  );
}
