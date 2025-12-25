import { useState, useRef, useEffect, useCallback } from 'react';
import { Send } from 'lucide-react';
import ChatMessage from './ChatMessage';
import ReportDialog from './ReportDialog';
import { useReport } from '@/hooks/useReport';
import type { ChatMessageItem } from '@/types/room';

interface ChatPanelProps {
  messages: ChatMessageItem[];
  onSendMessage: (text: string) => void;
  roomId: string;
}

export default function ChatPanel({ messages, onSendMessage, roomId }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [reportTarget, setReportTarget] = useState<ChatMessageItem | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { submitReport } = useReport({ roomId });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
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
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold">Chat</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm">
            メッセージはまだありません
          </p>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onReport={handleReport}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="メッセージを入力..."
            className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-sm"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>

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
