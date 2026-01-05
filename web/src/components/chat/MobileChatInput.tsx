import { useState, useRef, useEffect, useCallback } from 'react';
import { Send } from 'lucide-react';
import { useKeyboardState } from '@/hooks/useKeyboardState';

interface MobileChatInputProps {
  onSendMessage: (text: string) => void;
  onKeyboardStateChange?: (isOpen: boolean) => void;
}

/**
 * モバイル専用チャット入力コンポーネント
 * キーボード表示時に固定位置でキーボードの上に配置される
 */
export default function MobileChatInput({
  onSendMessage,
  onKeyboardStateChange,
}: MobileChatInputProps) {
  const [input, setInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isKeyboardOpen } = useKeyboardState();

  // キーボード状態を親コンポーネントに通知
  useEffect(() => {
    onKeyboardStateChange?.(isKeyboardOpen && isFocused);
  }, [isKeyboardOpen, isFocused, onKeyboardStateChange]);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  }, [input, onSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // IME変換中はスキップ
    if (isComposing) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [isComposing, handleSubmit]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  // キーボードが開いているかつフォーカスがある場合は固定位置
  const shouldBeFixed = isKeyboardOpen && isFocused;

  return (
    <>
      {/* 固定位置時にレイアウトを維持するためのプレースホルダー */}
      {shouldBeFixed && <div className="h-14 flex-shrink-0" />}

      {/* チャット入力 */}
      <div
        className={`
          h-14 border-t border-border/50 flex items-center px-4 bg-card
          transition-all duration-200
          ${shouldBeFixed
            ? 'fixed left-0 right-0 bottom-0 z-50 pb-safe'
            : ''
          }
        `}
      >
        <form
          onSubmit={handleSubmit}
          className="flex-1 flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-primary/20 transition-shadow duration-200"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="Chat..."
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="off"
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className={`
              p-1.5 rounded-full transition-all duration-200
              ${input.trim()
                ? 'text-primary hover:bg-primary/10 active:scale-95'
                : 'text-muted-foreground/50'
              }
            `}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </>
  );
}
