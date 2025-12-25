export interface YouTubeVideo {
  videoId: string;
  title: string;
  description?: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  duration?: string;
}

export interface YouTubePlayerState {
  UNSTARTED: -1;
  ENDED: 0;
  PLAYING: 1;
  PAUSED: 2;
  BUFFERING: 3;
  CUED: 5;
}

export interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setPlaybackRate(rate: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  getPlaybackRate(): number;
  loadVideoById(videoId: string): void;
  cueVideoById(videoId: string): void;
  destroy(): void;
}

export interface YouTubePlayerEvent {
  target: YouTubePlayer;
  data: number;
}
