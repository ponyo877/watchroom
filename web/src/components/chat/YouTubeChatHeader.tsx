import { Users, X } from 'lucide-react';

interface YouTubeChatHeaderProps {
  memberCount: number;
  onClose?: () => void;
  showCloseButton?: boolean;
}

/**
 * YouTube風のチャットヘッダーコンポーネント
 * - 左側: 「チャット」タイトル + 参加者数
 * - 右側: 閉じるボタン（横持ち時のみ）
 */
export default function YouTubeChatHeader({
  memberCount,
  onClose,
  showCloseButton = false,
}: YouTubeChatHeaderProps) {
  return (
    <div className="yt-chat-header">
      <div className="flex items-center gap-3">
        <span className="font-semibold text-sm">チャット</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          {memberCount}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {showCloseButton && onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-md active:bg-accent transition-colors"
            title="閉じる"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
