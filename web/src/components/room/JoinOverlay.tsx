/**
 * 視聴開始オーバーレイ
 *
 * 【目的】
 * ブラウザの自動再生ポリシーを回避するため、Late Joinerに対して
 * 「視聴開始」ボタンをクリックさせる。このクリックがユーザー操作として
 * 認識され、音声付き動画の再生が許可される。
 *
 * 【設計根拠】
 * - Zoom, Google Meet, Microsoft Teamsの「Pre-join Lobby」パターンを採用
 * - ユーザークリック → 即座に再生開始（同期的）
 * - 非同期処理を挟まないことで、ユーザーアクティベーションを維持
 *
 * 【表示条件】
 * - 動画が選択されている
 * - プレイヤーが準備完了している
 * - まだ視聴を開始していない（ユーザーがクリックしていない）
 */

import { Play, Volume2 } from 'lucide-react';

interface JoinOverlayProps {
  /** 動画タイトル */
  videoTitle?: string;
  /** 動画サムネイル */
  videoThumbnail?: string;
  /** 視聴開始ボタンクリック時のコールバック */
  onJoin: () => void;
}

export default function JoinOverlay({
  videoTitle,
  videoThumbnail,
  onJoin,
}: JoinOverlayProps) {
  return (
    <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-fade-in">
      {/* サムネイル（ある場合） */}
      {videoThumbnail && (
        <div className="mb-6 relative">
          <img
            src={videoThumbnail}
            alt={videoTitle || '動画'}
            className="w-64 md:w-80 rounded-lg shadow-2xl opacity-80"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Play className="h-8 w-8 text-white ml-1" fill="currentColor" />
            </div>
          </div>
        </div>
      )}

      {/* タイトル */}
      {videoTitle && (
        <h2 className="text-white text-lg md:text-xl font-semibold text-center mb-2 max-w-md line-clamp-2">
          {videoTitle}
        </h2>
      )}

      {/* 説明文 */}
      <p className="text-white/70 text-sm md:text-base text-center mb-6 max-w-sm">
        みんなと一緒に視聴を開始します
      </p>

      {/* 視聴開始ボタン */}
      <button
        onClick={onJoin}
        className="flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-xl text-lg font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 active:scale-95 transition-all duration-200"
      >
        <Volume2 className="h-6 w-6" />
        <span>視聴開始</span>
      </button>

      {/* 補足説明 */}
      <p className="text-white/50 text-xs mt-4 text-center">
        クリックすると音声付きで再生が始まります
      </p>
    </div>
  );
}
