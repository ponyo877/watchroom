import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { formatDuration } from '@/lib/utils';

interface PlayerControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  hasControlPermission: boolean;
  volume: number;
  isMuted: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onPlaybackRateChange: (rate: number) => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function PlayerControls({
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  hasControlPermission,
  volume,
  isMuted,
  onPlay,
  onPause,
  onSeek,
  onPlaybackRateChange,
  onVolumeChange,
  onMuteToggle,
}: PlayerControlsProps) {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const volumeContainerRef = useRef<HTMLDivElement>(null);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Close volume slider when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (volumeContainerRef.current && !volumeContainerRef.current.contains(e.target as Node)) {
        setShowVolumeSlider(false);
      }
    };
    if (showVolumeSlider) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showVolumeSlider]);

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

      {/* Volume (local only) */}
      <div ref={volumeContainerRef} className="relative flex items-center">
        <button
          onClick={onMuteToggle}
          onMouseEnter={() => setShowVolumeSlider(true)}
          className="p-2 hover:bg-accent rounded-full"
          title="音量（自分のみ）"
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </button>
        {showVolumeSlider && (
          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-card border border-border rounded-lg shadow-lg"
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">自分のみ</span>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange(parseInt(e.target.value))}
                className="w-20 h-1 bg-muted rounded-full appearance-none cursor-pointer"
                style={{ writingMode: 'horizontal-tb' }}
              />
              <span className="text-xs">{isMuted ? 0 : volume}%</span>
            </div>
          </div>
        )}
      </div>

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
    </div>
  );
}
