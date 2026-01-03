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
      return 'p-1 hover:bg-accent/50 rounded-full transition-colors';
    }
    if (compact) {
      return 'flex flex-col items-center gap-1 p-2';
    }
    return 'p-2 hover:bg-accent rounded-md';
  };

  const IconComponent = inline ? Heart : Smile;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={getButtonClass()}
        aria-label="リアクションを追加"
      >
        <IconComponent className={`${inline ? 'h-5 w-5' : 'h-5 w-5'} text-muted-foreground`} />
        {compact && <span className="text-xs">リアクション</span>}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            className={`absolute ${
              inline ? 'bottom-full right-0' : compact ? 'bottom-full right-0' : 'bottom-full left-0'
            } mb-2 w-72 bg-card border border-border rounded-lg shadow-lg z-50`}
          >
            <div className="flex items-center justify-between p-2 border-b border-border">
              <span className="text-sm font-medium">リアクション</span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-accent rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex border-b border-border overflow-x-auto">
              {Object.keys(EMOJI_CATEGORIES).map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-3 py-2 text-xs whitespace-nowrap ${
                    activeCategory === category
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="p-2 grid grid-cols-8 gap-1">
              {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].map(
                (emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSelect(emoji)}
                    className="p-2 text-xl hover:bg-accent rounded-md transition-colors"
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
