import { useState, useRef, useEffect, useCallback } from 'react';
import { Trans } from '@lingui/macro';
import ChatMessage from './ChatMessage';
import ReportDialog from './ReportDialog';
import ReactionPicker from './ReactionPicker';
import MobileChatInput from './MobileChatInput';
import YouTubeChatHeader from './YouTubeChatHeader';
import { useReport } from '@/hooks/useReport';
import { useIsMobile } from '@/hooks/useLandscape';
import type { ChatMessageItem } from '@/types/room';

interface ChatPanelProps {
  messages: ChatMessageItem[];
  onSendMessage: (text: string) => void;
  onSelectReaction?: (emoji: string) => void;
  roomId: string;
  onKeyboardStateChange?: (isOpen: boolean) => void;
  // YouTube風レイアウト用のプロパティ
  memberCount?: number;
  onClose?: () => void;
  showCloseButton?: boolean;
  chatInputClass?: string;
  isLandscapeFullscreen?: boolean;
}

export default function ChatPanel({
  messages,
  onSendMessage,
  onSelectReaction,
  roomId,
  onKeyboardStateChange,
  memberCount = 0,
  onClose,
  showCloseButton = false,
  chatInputClass = '',
  isLandscapeFullscreen = false,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [reportTarget, setReportTarget] = useState<ChatMessageItem | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { submitReport } = useReport({ roomId });
  const isMobile = useIsMobile();

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Skip if IME is composing (e.g., Japanese input conversion)
    if (isComposing) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  const handleReport = useCallback((message: ChatMessageItem) => {
    setReportTarget(message);
  }, []);

  const handleSubmitReport = useCallback(
    async (reason: string): Promise<boolean> => {
      if (!reportTarget) return false;
      return submitReport(reportTarget, reason);
    },
    [reportTarget, submitReport]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* YouTube風チャットヘッダー */}
      <YouTubeChatHeader
        memberCount={memberCount}
        onClose={onClose}
        showCloseButton={showCloseButton}
      />

      {/* メッセージエリア */}
      <div className="yt-chat-messages relative">
        {messages.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">
            <Trans>No messages yet</Trans>
          </p>
        ) : (
          messages.map((message, index) => (
            <div
              key={message.id}
              className="animate-fade-in opacity-0 mb-3"
              style={{ animationDelay: `${Math.min(index * 30, 300)}ms`, animationFillMode: 'forwards' }}
            >
              <ChatMessage
                message={message}
                onReport={handleReport}
              />
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      {isMobile ? (
        <MobileChatInput
          onSendMessage={onSendMessage}
          onKeyboardStateChange={onKeyboardStateChange}
          chatInputClass={chatInputClass}
          isLandscapeFullscreen={isLandscapeFullscreen}
        />
      ) : (
        <div className="h-14 border-t border-border flex items-center px-4">
          <div className="flex-1 flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-primary/20 transition-shadow duration-200">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              placeholder="Chat..."
              className="flex-1 bg-transparent text-sm focus:outline-none"
            />
            {onSelectReaction && (
              <ReactionPicker onSelectReaction={onSelectReaction} inline />
            )}
          </div>
        </div>
      )}

      <ReportDialog
        open={!!reportTarget}
        onClose={() => setReportTarget(null)}
        message={reportTarget}
        roomId={roomId}
        onSubmit={handleSubmitReport}
      />
    </div>
  );
}
