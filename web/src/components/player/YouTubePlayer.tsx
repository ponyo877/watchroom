import { useEffect, useRef } from 'react';
import { t } from '@lingui/macro';

interface YouTubePlayerProps {
  videoId?: string;
  onReady?: () => void;
  onStateChange?: (state: number) => void;
  className?: string;
}

export default function YouTubePlayer({
  videoId,
  onReady: _onReady,
  onStateChange: _onStateChange,
  className,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerIdRef = useRef(`youtube-player-${Date.now()}`);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    container.id = playerIdRef.current;

    // The actual player initialization will be done by useVideoSync hook
    // This component just provides the container

    return () => {
      container.innerHTML = '';
    };
  }, []);

  return (
    <div className={className}>
      <div
        ref={containerRef}
        id={playerIdRef.current}
        className="w-full h-full bg-black flex items-center justify-center"
      >
        {!videoId && (
          <p className="text-white/50 text-center">
            {t`No video selected`}
          </p>
        )}
      </div>
    </div>
  );
}
