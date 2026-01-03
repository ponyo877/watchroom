import { useState, useRef, useEffect, useCallback } from 'react';
import ChatMessage from './ChatMessage';
import ReportDialog from './ReportDialog';
import ReactionPicker from './ReactionPicker';
import { useReport } from '@/hooks/useReport';
import type { ChatMessageItem } from '@/types/room';

interface ChatPanelProps {
  messages: ChatMessageItem[];
  onSendMessage: (text: string) => void;
  onSelectReaction?: (emoji: string) => void;
  roomId: string;
}

export default function ChatPanel({ messages, onSendMessage, onSelectReaction, roomId }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [reportTarget, setReportTarget] = useState<ChatMessageItem | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { submitReport } = useReport({ roomId });

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
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
    <div className="h-full flex flex-col bg-card/50 backdrop-blur-sm">

      <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
        {/* Top fade gradient */}
        <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-card/50 to-transparent pointer-events-none z-10" />
        {messages.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">
            メッセージはまだありません
          </p>
        ) : (
          messages.map((message, index) => (
            <div
              key={message.id}
              className="animate-fade-in opacity-0"
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

      {/* Footer - h-16 to match Player controls */}
      <div className="h-16 border-t border-border/50 flex flex-col justify-center px-4">
        <div className="flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-primary/20 transition-shadow duration-200">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="チャット..."
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
          {onSelectReaction && (
            <ReactionPicker onSelectReaction={onSelectReaction} inline />
          )}
        </div>
      </div>

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
