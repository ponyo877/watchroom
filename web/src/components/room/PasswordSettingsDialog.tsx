import { useState } from 'react';
import { Lock, X, Eye, EyeOff, Trash2 } from 'lucide-react';

interface PasswordSettingsDialogProps {
  open: boolean;
  hasPassword: boolean;
  onClose: () => void;
  onSetPassword: (oldPassword: string | null, newPassword: string) => Promise<boolean>;
  onRemovePassword: (password: string) => Promise<boolean>;
}

export default function PasswordSettingsDialog({
  open,
  hasPassword,
  onClose,
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
        onClose();
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
        onClose();
      } else {
        setError('パスワードが正しくありません');
      }
    } catch {
      setError('エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-muted rounded-full">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="font-semibold text-lg">パスワード設定</h2>
        </div>

        {hasPassword && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => { setMode('set'); resetForm(); }}
              className={`flex-1 px-3 py-2 rounded-md text-sm ${
                mode === 'set' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}
            >
              変更
            </button>
            <button
              onClick={() => { setMode('remove'); resetForm(); }}
              className={`flex-1 px-3 py-2 rounded-md text-sm ${
                mode === 'remove' ? 'bg-destructive text-white' : 'bg-muted'
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
                    className="w-full px-3 py-2 pr-10 border border-input rounded-md bg-background"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
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
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
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
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
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
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-destructive text-white rounded-md hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isLoading ? '削除中...' : 'パスワードを削除'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
