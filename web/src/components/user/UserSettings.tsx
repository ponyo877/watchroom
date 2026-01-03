import { useState } from 'react';
import { Settings, Trash2, AlertTriangle } from 'lucide-react';
import { useUserStore } from '@/stores/userStore';
import { clearAllUserData } from '@/lib/storage';
import IconUploader from './IconUploader';
import ThemeToggle from '@/components/common/ThemeToggle';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface UserSettingsProps {
  open: boolean;
  onClose: () => void;
}

export default function UserSettings({ open, onClose }: UserSettingsProps) {
  const userStore = useUserStore();
  const [name, setName] = useState(userStore.name);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const handleDeleteData = () => {
    clearAllUserData();
    window.location.reload();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader icon={<Settings className="h-5 w-5" />}>
          <DialogTitle>ユーザー設定</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
          <div className="space-y-6">
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
            <label className="block text-sm font-medium mb-2">表示名</label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="表示名を入力"
                maxLength={20}
              />
              <Button
                onClick={handleSave}
                disabled={isSaving || name === userStore.name}
                size="default"
              >
                {saved ? '保存しました' : '保存'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              他のユーザーに表示される名前です（20文字以内）
            </p>
          </div>

          {/* Theme */}
          <ThemeToggle showLabel />

          {/* User ID */}
          <div>
            <label className="block text-sm font-medium mb-2">ユーザーID</label>
            <div className="px-4 py-2.5 bg-muted/50 backdrop-blur-sm rounded-xl text-sm font-mono text-muted-foreground">
              {userStore.id}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              このIDは変更できません
            </p>
          </div>

          {/* Data Management */}
          <div className="border-t border-border pt-6">
            <label className="block text-sm font-medium mb-2 flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              データ管理
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              ローカルに保存されているすべてのデータ（ユーザーID、表示名、アイコン、テーマ設定、検索キャッシュ）を削除します。この操作は取り消せません。
            </p>
            {!showDeleteConfirm ? (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                すべてのデータを削除
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-destructive font-medium">
                  本当に削除しますか？
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={handleDeleteData}
                    className="flex-1"
                  >
                    削除する
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1"
                  >
                    キャンセル
                  </Button>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>

        <DialogFooter className="mt-6 border-t border-border pt-4 flex-shrink-0">
          <DialogClose asChild>
            <Button variant="outline" className="w-full">
              閉じる
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
