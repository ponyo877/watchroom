import { ReactNode } from 'react';
import { MessageCircle } from 'lucide-react';
import { t } from '@lingui/macro';
import { useMobileLayout } from '@/hooks/useMobileLayout';

interface MobileRoomLayoutProps {
  /** ヘッダーコンテンツ（縦持ち時のみ表示） */
  header?: ReactNode;
  /** プレイヤーエリア（動画 + コントロール） */
  player: ReactNode;
  /** チャットエリア */
  chat: ReactNode;
  /** 横持ち時のアクションバー（コントロール表示時） */
  landscapeActionBar?: ReactNode;
  /** 横持ちコントロール表示状態 */
  showLandscapeControls?: boolean;
  /** コントロールエリアのクリックハンドラ */
  onControlAreaClick?: () => void;
}

/**
 * モバイル向けYouTube風レイアウトコンポーネント
 *
 * CSS-First設計:
 * - data属性でレイアウト状態を管理
 * - globals.cssの.mobile-*クラスでスタイリング
 * - useMobileLayoutフックで状態を統合管理
 */
export default function MobileRoomLayout({
  header,
  player,
  chat,
  landscapeActionBar,
  showLandscapeControls = false,
  onControlAreaClick,
}: MobileRoomLayoutProps) {
  const {
    orientation,
    isKeyboardVisible,
    showChat,
    toggleChat,
    isLandscapeFullscreen,
  } = useMobileLayout();

  return (
    <div
      className="mobile-container"
      data-orientation={orientation}
      data-keyboard={isKeyboardVisible}
      data-chat={showChat}
    >
      {/* ヘッダー（縦持ち時のみ表示、CSSで制御） */}
      {header && (
        <header className="mobile-header">
          {header}
        </header>
      )}

      {/* プレイヤーエリア */}
      <div
        className="mobile-player"
        onClick={onControlAreaClick}
      >
        {player}
      </div>

      {/* チャットエリア */}
      <div className="mobile-chat">
        {chat}
      </div>

      {/* 横持ちオーバーレイ（チャット非表示時のトグルボタン） */}
      {isLandscapeFullscreen && !showChat && (
        <div className="mobile-landscape-overlay">
          <button
            className="mobile-landscape-overlay-btn"
            onClick={toggleChat}
            title={t`Open chat`}
          >
            <MessageCircle className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* 横持ちアクションバー（コントロール表示時） */}
      {isLandscapeFullscreen && showLandscapeControls && !showChat && landscapeActionBar}
    </div>
  );
}

export { MobileRoomLayout };
