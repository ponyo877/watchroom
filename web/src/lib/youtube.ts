import type { YouTubePlayer, YouTubePlayerEvent } from '@/types/youtube';

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        config: YouTubePlayerConfig
      ) => YouTubePlayer;
      PlayerState: {
        UNSTARTED: -1;
        ENDED: 0;
        PLAYING: 1;
        PAUSED: 2;
        BUFFERING: 3;
        CUED: 5;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerConfig {
  height?: string | number;
  width?: string | number;
  videoId?: string;
  playerVars?: {
    autoplay?: 0 | 1;
    controls?: 0 | 1;
    disablekb?: 0 | 1;
    enablejsapi?: 0 | 1;
    modestbranding?: 0 | 1;
    origin?: string;
    playsinline?: 0 | 1;
    rel?: 0 | 1;
  };
  events?: {
    onReady?: (event: YouTubePlayerEvent) => void;
    onStateChange?: (event: YouTubePlayerEvent) => void;
    onError?: (event: YouTubePlayerEvent) => void;
  };
}

let isAPILoaded = false;
let apiLoadPromise: Promise<void> | null = null;

export function loadYouTubeAPI(): Promise<void> {
  if (isAPILoaded) {
    return Promise.resolve();
  }

  if (apiLoadPromise) {
    return apiLoadPromise;
  }

  apiLoadPromise = new Promise((resolve) => {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      isAPILoaded = true;
      resolve();
    };
  });

  return apiLoadPromise;
}

export async function createPlayer(
  elementId: string,
  config: YouTubePlayerConfig
): Promise<YouTubePlayer> {
  await loadYouTubeAPI();
  return new window.YT.Player(elementId, config);
}

export function getPlayerState(player: YouTubePlayer): number {
  return player.getPlayerState();
}

export function isPlaying(player: YouTubePlayer): boolean {
  return player.getPlayerState() === window.YT.PlayerState.PLAYING;
}

export function isPaused(player: YouTubePlayer): boolean {
  return player.getPlayerState() === window.YT.PlayerState.PAUSED;
}

export function formatDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';

  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}
