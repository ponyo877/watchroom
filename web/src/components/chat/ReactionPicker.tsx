import { useState } from 'react';
import { Smile, Heart, X } from 'lucide-react';

interface ReactionPickerProps {
  onSelectReaction: (emoji: string) => void;
  compact?: boolean;
  inline?: boolean;
}

const EMOJI_CATEGORIES = {
  'よく使う': ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🎉'],
  '顔': ['😀', '😊', '🥰', '😎', '🤔', '😴', '🤯', '🥳'],
  'ジェスチャー': ['👋', '✌️', '🤞', '🙏', '💪', '🙌', '👀', '💯'],
  'シンボル': ['❤️', '💔', '⭐', '🔥', '💡', '✅', '❌', '⚡'],
};

export default function ReactionPicker({
  onSelectReaction,
  compact = false,
  inline = false,
}: ReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('よく使う');

  const handleSelect = (emoji: string) => {
    onSelectReaction(emoji);
    // Keep picker open for consecutive reactions - user can close by clicking outside
  };

  // Determine button styling and icon based on mode
  const getButtonClass = () => {
    if (inline) {
      return 'p-1 rounded-full transition-colors touch-feedback active:scale-95 md:hover:bg-accent/50';
    }
    if (compact) {
      return 'flex flex-col items-center gap-1 p-2 touch-feedback';
    }
    return 'p-2 rounded-md touch-feedback active:scale-95 md:hover:bg-accent';
  };

  const IconComponent = inline ? Heart : Smile;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={getButtonClass()}
        aria-label="リアクションを追加"
      >
        <IconComponent className="h-5 w-5 text-muted-foreground" />
        {compact && <span className="text-xs">リアクション</span>}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Picker - モバイルでは画面幅に合わせる */}
          <div
            className={`absolute z-50 animate-fade-in-up
              ${inline ? 'bottom-full right-0' : compact ? 'bottom-full right-0' : 'bottom-full left-0'}
              mb-2 bg-card border border-border rounded-xl shadow-xl
              w-[calc(100vw-2rem)] max-w-[288px] md:w-72
            `}
            style={{
              animationDuration: '200ms',
              // モバイルで右端に配置された時に画面外にはみ出さないよう調整
              right: compact || inline ? 0 : 'auto',
              left: compact || inline ? 'auto' : 0,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-2 border-b border-border">
              <span className="text-sm font-medium">リアクション</span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md touch-feedback active:scale-95 md:hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Category tabs - スクロール可能 */}
            <div className="flex border-b border-border overflow-x-auto scrollbar-none">
              {Object.keys(EMOJI_CATEGORIES).map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-3 py-2 text-xs whitespace-nowrap flex-shrink-0 transition-colors ${
                    activeCategory === category
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground active:text-foreground md:hover:text-foreground'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Emoji grid */}
            <div className="p-2 grid grid-cols-8 gap-0.5 md:gap-1">
              {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].map(
                (emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSelect(emoji)}
                    className="p-1.5 md:p-2 text-lg md:text-xl rounded-md transition-colors touch-feedback active:bg-accent md:hover:bg-accent"
                  >
                    {emoji}
                  </button>
                )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
