import { useState } from 'react';
import { Lock, Eye, EyeOff, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';

interface PasswordSettingsDialogProps {
  open: boolean;
  hasPassword: boolean;
  onOpenChange: (open: boolean) => void;
  onSetPassword: (oldPassword: string | null, newPassword: string) => Promise<boolean>;
  onRemovePassword: (password: string) => Promise<boolean>;
}

export default function PasswordSettingsDialog({
  open,
  hasPassword,
  onOpenChange,
  onSetPassword,
  onRemovePassword,
}: PasswordSettingsDialogProps) {
  const [mode, setMode] = useState<'set' | 'remove'>('set');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newPassword.trim()) {
      setError('新しいパスワードを入力してください');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    if (newPassword.length < 4) {
      setError('パスワードは4文字以上にしてください');
      return;
    }

    setIsLoading(true);
    try {
      const success = await onSetPassword(
        hasPassword ? oldPassword : null,
        newPassword
      );
      if (success) {
        resetForm();
        onOpenChange(false);
      } else {
        setError('パスワードの設定に失敗しました');
      }
    } catch {
      setError('エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!oldPassword.trim()) {
      setError('現在のパスワードを入力してください');
      return;
    }

    setIsLoading(true);
    try {
      const success = await onRemovePassword(oldPassword);
      if (success) {
        resetForm();
        onOpenChange(false);
      } else {
        setError('パスワードが正しくありません');
      }
    } catch {
      setError('エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClassName = "w-full px-4 py-2.5 pr-10 border border-input rounded-xl bg-background/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 hover:border-primary/30 transition-all duration-200";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader icon={<Lock className="h-5 w-5 text-muted-foreground" />}>
          <DialogTitle>パスワード設定</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
          {hasPassword && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => { setMode('set'); resetForm(); }}
              className={`flex-1 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                mode === 'set'
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              変更
            </button>
            <button
              onClick={() => { setMode('remove'); resetForm(); }}
              className={`flex-1 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                mode === 'remove'
                  ? 'bg-destructive text-white shadow-lg shadow-destructive/25'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              削除
            </button>
          </div>
        )}

        {mode === 'set' ? (
          <form onSubmit={handleSetPassword} className="space-y-4">
            {hasPassword && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  現在のパスワード
                </label>
                <div className="relative">
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className={inputClassName}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">
                新しいパスワード
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClassName.replace('pr-10', '')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                パスワード確認
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClassName.replace('pr-10', '')}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:shadow-none disabled:scale-100 transition-all duration-200"
            >
              {isLoading ? '設定中...' : 'パスワードを設定'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRemovePassword} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              パスワードを削除すると、誰でも部屋に入室できるようになります。
            </p>

            <div>
              <label className="block text-sm font-medium mb-1">
                現在のパスワード
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className={inputClassName.replace('pr-10', '')}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-destructive text-white rounded-xl shadow-lg shadow-destructive/25 hover:shadow-xl hover:shadow-destructive/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:shadow-none disabled:scale-100 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isLoading ? '削除中...' : 'パスワードを削除'}
            </button>
          </form>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
