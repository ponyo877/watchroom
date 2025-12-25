import { useState } from 'react';
import { Send, Smile } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onSendReaction?: (emoji: string) => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '👏', '🎉'];

export default function ChatInput({ onSendMessage, onSendReaction }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [showReactions, setShowReactions] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleReaction = (emoji: string) => {
    onSendReaction?.(emoji);
    setShowReactions(false);
  };

  return (
    <div className="relative">
      {showReactions && (
        <div className="absolute bottom-full left-0 mb-2 p-2 bg-card border border-border rounded-lg shadow-lg flex gap-1">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className="p-2 hover:bg-accent rounded text-xl"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        {onSendReaction && (
          <button
            type="button"
            onClick={() => setShowReactions(!showReactions)}
            className="p-2 hover:bg-accent rounded-md"
          >
            <Smile className="h-5 w-5 text-muted-foreground" />
          </button>
        )}

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
      </form>
    </div>
  );
}
