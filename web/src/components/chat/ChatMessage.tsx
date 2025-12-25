import { useState } from 'react';
import { Flag, MoreVertical } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { useUserStore } from '@/stores/userStore';
import type { ChatMessageItem } from '@/types/room';

interface ChatMessageProps {
  message: ChatMessageItem;
  onReport?: (message: ChatMessageItem) => void;
}

export default function ChatMessage({ message, onReport }: ChatMessageProps) {
  const userId = useUserStore((state) => state.id);
  const isOwnMessage = message.senderId === userId;
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className={`flex gap-2 group ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
      <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0 flex items-center justify-center overflow-hidden">
        {message.senderIconUrl ? (
          <img
            src={message.senderIconUrl}
            alt={message.senderName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-xs font-medium text-muted-foreground">
            {message.senderName.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className={`flex flex-col max-w-[70%] ${isOwnMessage ? 'items-end' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground">
            {message.senderName}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(new Date(message.timestamp))}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <div
            className={`px-3 py-2 rounded-lg text-sm ${
              isOwnMessage
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
            }`}
          >
            {message.text}
          </div>

          {!isOwnMessage && onReport && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-accent transition-opacity"
              >
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute left-0 top-full mt-1 bg-card border border-border rounded-md shadow-lg z-50 py-1 min-w-32">
                    <button
                      onClick={() => {
                        onReport(message);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent"
                    >
                      <Flag className="h-4 w-4" />
                      通報する
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
