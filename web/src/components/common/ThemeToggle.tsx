import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface ThemeToggleProps {
  showLabel?: boolean;
}

export default function ThemeToggle({ showLabel = false }: ThemeToggleProps) {
  const { theme, setTheme, isDark } = useTheme();

  const options = [
    { value: 'light' as const, icon: Sun, label: 'ライト' },
    { value: 'dark' as const, icon: Moon, label: 'ダーク' },
    { value: 'system' as const, icon: Monitor, label: 'システム' },
  ];

  if (showLabel) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium">テーマ</label>
        <div className="flex gap-2">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-colors ${
                theme === option.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:bg-accent'
              }`}
            >
              <option.icon className="h-4 w-4" />
              <span className="text-sm">{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="p-2 rounded-md hover:bg-accent transition-colors"
      title={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
    >
      {isDark ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
}
