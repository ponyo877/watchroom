import { useState } from 'react';
import { Lock, X, Eye, EyeOff } from 'lucide-react';

interface PasswordDialogProps {
  roomName?: string;
  open: boolean;
  onSubmit: (password: string) => Promise<boolean>;
  onCancel: () => void;
  error?: string;
}

export default function PasswordDialog({
  roomName,
  open,
  onSubmit,
  onCancel,
  error: externalError,
}: PasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('パスワードを入力してください');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const isValid = await onSubmit(password);
      if (!isValid) {
        setError('パスワードが正しくありません');
        setPassword('');
      }
    } catch (err) {
      setError('エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-card border border-border rounded-lg p-6 w-full max-w-sm mx-4">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 rounded-md hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-muted rounded-full">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="font-semibold">パスワードが必要です</h2>
            {roomName && (
              <p className="text-sm text-muted-foreground">{roomName}</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              パスワード
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワードを入力"
                className="w-full px-3 py-2 pr-10 border border-input rounded-md bg-background"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {(error || externalError) && (
            <p className="text-sm text-destructive">{error || externalError}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-accent"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? '確認中...' : '入室'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
