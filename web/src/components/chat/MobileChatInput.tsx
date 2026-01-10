import { useState, useRef, useCallback } from 'react';
import { Send } from 'lucide-react';
import { useKeyboardState } from '@/hooks/useKeyboardState';

interface MobileChatInputProps {
  onSendMessage: (text: string) => void;
  onKeyboardStateChange?: (isOpen: boolean) => void;
  chatInputClass?: string;
  isLandscapeFullscreen?: boolean;
}

/**
 * モバイル専用チャット入力コンポーネント
 * YouTube風レイアウトに対応
 */
export default function MobileChatInput({
  onSendMessage,
  onKeyboardStateChange,
  chatInputClass = 'yt-chat-input yt-chat-input--portrait',
  isLandscapeFullscreen = false,
}: MobileChatInputProps) {
  const [input, setInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isKeyboardOpen } = useKeyboardState();

  // キーボード状態を親コンポーネントに通知
  const notifyKeyboardState = useCallback((isOpen: boolean) => {
    onKeyboardStateChange?.(isOpen);
  }, [onKeyboardStateChange]);

  // フォーカス状態とキーボード状態を監視
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    // キーボードが開くまで少し待つ
    setTimeout(() => {
      notifyKeyboardState(true);
    }, 100);
  }, [notifyKeyboardState]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // キーボードが閉じるまで少し待つ
    setTimeout(() => {
      notifyKeyboardState(false);
    }, 100);
  }, [notifyKeyboardState]);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
      // 送信後もフォーカスを維持
      inputRef.current?.focus();
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

  // 横持ち・キーボード表示時のみfixed配置
  const shouldBeFixed = isLandscapeFullscreen && isKeyboardOpen && isFocused;

  // クラス名の決定
  const containerClass = shouldBeFixed
    ? 'yt-chat-input yt-chat-input--landscape-kb'
    : chatInputClass;

  return (
    <>
      {/* 固定位置時にレイアウトを維持するためのプレースホルダー */}
      {shouldBeFixed && <div className="h-14 flex-shrink-0" />}

      {/* チャット入力 */}
      <div className={containerClass}>
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
