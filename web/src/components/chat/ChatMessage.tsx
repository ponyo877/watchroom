import { formatRelativeTime } from '@/lib/utils';
import { useUserStore } from '@/stores/userStore';
import type { ChatMessageItem } from '@/types/room';

interface ChatMessageProps {
  message: ChatMessageItem;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const userId = useUserStore((state) => state.id);
  const isOwnMessage = message.senderId === userId;

  return (
    <div className={`flex gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
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

        <div
          className={`px-3 py-2 rounded-lg text-sm ${
            isOwnMessage
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          }`}
        >
          {message.text}
        </div>
      </div>
    </div>
  );
}
