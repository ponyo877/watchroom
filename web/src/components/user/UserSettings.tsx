import { useState } from 'react';
import { Settings, X } from 'lucide-react';
import { useUserStore } from '@/stores/userStore';
import IconUploader from './IconUploader';
import ThemeToggle from '@/components/common/ThemeToggle';

interface UserSettingsProps {
  open: boolean;
  onClose: () => void;
}

export default function UserSettings({ open, onClose }: UserSettingsProps) {
  const userStore = useUserStore();
  const [name, setName] = useState(userStore.name);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      userStore.setName(name);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleIconUpload = (url: string) => {
    userStore.setIconUrl(url);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <h2 className="font-semibold">ユーザー設定</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded-md">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Profile Icon */}
          <div>
            <label className="block text-sm font-medium mb-3">
              プロフィールアイコン
            </label>
            <IconUploader
              currentIconUrl={userStore.iconUrl}
              onUploadComplete={handleIconUpload}
              size="lg"
            />
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium mb-1">表示名</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="表示名を入力"
                className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-sm"
                maxLength={20}
              />
              <button
                onClick={handleSave}
                disabled={isSaving || name === userStore.name}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
              >
                {saved ? '保存しました' : '保存'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              他のユーザーに表示される名前です（20文字以内）
            </p>
          </div>

          {/* Theme */}
          <ThemeToggle showLabel />

          {/* User ID */}
          <div>
            <label className="block text-sm font-medium mb-1">ユーザーID</label>
            <div className="px-3 py-2 bg-muted rounded-md text-sm font-mono text-muted-foreground">
              {userStore.id}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              このIDは変更できません
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-border">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-border rounded-md hover:bg-accent"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
