import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';

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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader icon={<Lock className="h-5 w-5 text-muted-foreground" />}>
          <DialogTitle>パスワードが必要です</DialogTitle>
          {roomName && (
            <DialogDescription>{roomName}</DialogDescription>
          )}
        </DialogHeader>

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
                className="w-full px-4 py-2.5 pr-10 border border-input rounded-xl bg-background/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 hover:border-primary/30 transition-all duration-200"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
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

          <DialogFooter>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 border border-border rounded-xl hover:bg-accent/50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:shadow-none disabled:scale-100 transition-all duration-200"
            >
              {isLoading ? '確認中...' : '入室'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
