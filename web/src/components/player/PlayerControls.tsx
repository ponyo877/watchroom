import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Settings } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import { useIsTouchDevice } from '@/hooks/useLandscape';

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
  const [showSettings, setShowSettings] = useState(false);
  const volumeContainerRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // タッチデバイス検出
  const isTouchDevice = useIsTouchDevice();

  // Close popups when clicking/touching outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (volumeContainerRef.current && !volumeContainerRef.current.contains(e.target as Node)) {
        setShowVolumeSlider(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };

    if (showVolumeSlider || showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showVolumeSlider, showSettings]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = (parseFloat(e.target.value) / 100) * duration;
    onSeek(time);
  };

  const skip = (seconds: number) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    onSeek(newTime);
  };

  // 音量ボタンのハンドラ（タッチとマウスの両対応）
  const handleVolumeButtonClick = () => {
    if (isTouchDevice) {
      // タッチデバイスではタップでスライダー表示/非表示
      setShowVolumeSlider(!showVolumeSlider);
    } else {
      // デスクトップではクリックでミュート切替
      onMuteToggle();
    }
  };

  // ボタン共通クラス
  const buttonClass = `
    p-2 rounded-full disabled:opacity-50 transition-all duration-200
    active:scale-95 touch-feedback
    md:hover:bg-accent md:hover:scale-110
  `;

  return (
    <div className="h-full flex items-center gap-2 md:gap-4 px-2 md:px-4 bg-gradient-to-t to-transparent">
      {/* Play/Pause - 常に表示 */}
      <button
        onClick={isPlaying ? onPause : onPlay}
        disabled={!hasControlPermission}
        className={buttonClass}
      >
        {isPlaying ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5" />
        )}
      </button>

      {/* Skip buttons - デスクトップのみ表示 */}
      <div className="hidden md:flex items-center gap-1">
        <button
          onClick={() => skip(-10)}
          disabled={!hasControlPermission}
          className={buttonClass}
        >
          <SkipBack className="h-4 w-4" />
        </button>
        <button
          onClick={() => skip(10)}
          disabled={!hasControlPermission}
          className={buttonClass}
        >
          <SkipForward className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar - モバイルでは時間表示を小さく */}
      <div className="flex-1 flex items-center gap-1.5 md:gap-3 min-w-0">
        <span className="text-xs md:text-sm text-muted-foreground w-10 md:w-12 text-right tabular-nums flex-shrink-0">
          {formatDuration(currentTime)}
        </span>
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={handleSeek}
          disabled={!hasControlPermission}
          className="flex-1 h-1.5 md:h-1 bg-muted rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed min-w-[60px]"
        />
        <span className="text-xs md:text-sm text-muted-foreground w-10 md:w-12 tabular-nums flex-shrink-0">
          {formatDuration(duration)}
        </span>
      </div>

      {/* Volume - モバイルではタップでスライダー表示 */}
      <div ref={volumeContainerRef} className="relative flex items-center">
        <button
          onClick={handleVolumeButtonClick}
          onMouseEnter={() => !isTouchDevice && setShowVolumeSlider(true)}
          className={buttonClass}
          title="音量（自分のみ）"
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </button>

        {/* Volume slider popup */}
        {showVolumeSlider && (
          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-card/95 backdrop-blur-lg border border-border/50 rounded-xl shadow-xl animate-fade-in-up z-50"
            onMouseLeave={() => !isTouchDevice && setShowVolumeSlider(false)}
          >
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">自分のみ</span>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange(parseInt(e.target.value))}
                className="w-24 h-1.5 bg-muted rounded-full appearance-none cursor-pointer"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={onMuteToggle}
                  className="text-xs px-2 py-1 rounded bg-muted active:scale-95 md:hover:bg-accent transition-all"
                >
                  {isMuted ? 'オン' : 'オフ'}
                </button>
                <span className="text-xs tabular-nums w-8 text-center">{isMuted ? 0 : volume}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Playback rate - モバイルでは設定アイコンに統合 */}
      <div ref={settingsRef} className="relative md:hidden">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={buttonClass}
          title="再生速度"
        >
          <Settings className="h-4 w-4" />
        </button>

        {showSettings && (
          <div className="absolute bottom-full right-0 mb-2 p-2 bg-card/95 backdrop-blur-lg border border-border/50 rounded-xl shadow-xl animate-fade-in-up z-50 min-w-[130px]">
            <div className="text-xs text-muted-foreground mb-2 px-1">再生速度</div>
            <div className="grid grid-cols-3 gap-1">
              {PLAYBACK_RATES.map((rate) => (
                <button
                  key={rate}
                  onClick={() => {
                    onPlaybackRateChange(rate);
                    setShowSettings(false);
                  }}
                  disabled={!hasControlPermission}
                  className={`px-2 py-1.5 text-xs rounded-lg transition-colors touch-feedback ${
                    playbackRate === rate
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted active:bg-accent md:hover:bg-accent'
                  } disabled:opacity-50`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Playback rate dropdown - デスクトップのみ */}
      <select
        value={playbackRate}
        onChange={(e) => onPlaybackRateChange(parseFloat(e.target.value))}
        disabled={!hasControlPermission}
        className="hidden md:block px-2 py-1 text-sm bg-background/50 backdrop-blur-sm border border-border rounded-lg disabled:opacity-50 hover:border-primary/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
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
