import { useState } from 'react';
import { Settings, Trash2, AlertTriangle } from 'lucide-react';
import { Trans, t } from '@lingui/macro';
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
          <DialogTitle><Trans>User Settings</Trans></DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
          <div className="space-y-6">
          {/* Profile Icon */}
          <div>
            <label className="block text-sm font-medium mb-3">
              <Trans>Profile Icon</Trans>
            </label>
            <IconUploader
              currentIconUrl={userStore.iconUrl}
              onUploadComplete={handleIconUpload}
              size="lg"
            />
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium mb-2"><Trans>Display Name</Trans></label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t`Enter display name`}
                maxLength={20}
              />
              <Button
                onClick={handleSave}
                disabled={isSaving || name === userStore.name}
                size="default"
              >
                {saved ? <Trans>Saved</Trans> : <Trans>Save</Trans>}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <Trans>This name is visible to other users (max 20 characters)</Trans>
            </p>
          </div>

          {/* Theme */}
          <ThemeToggle showLabel />

          {/* User ID */}
          <div>
            <label className="block text-sm font-medium mb-2"><Trans>User ID</Trans></label>
            <div className="px-4 py-2.5 bg-muted/50 backdrop-blur-sm rounded-xl text-sm font-mono text-muted-foreground">
              {userStore.id}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <Trans>This ID cannot be changed</Trans>
            </p>
          </div>

          {/* Data Management */}
          <div className="border-t border-border pt-6">
            <label className="block text-sm font-medium mb-2 flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <Trans>Data Management</Trans>
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              <Trans>Delete all locally stored data (user ID, display name, icon, theme settings, search cache). This action cannot be undone.</Trans>
            </p>
            {!showDeleteConfirm ? (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                <Trans>Delete All Data</Trans>
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-destructive font-medium">
                  <Trans>Are you sure you want to delete?</Trans>
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={handleDeleteData}
                    className="flex-1"
                  >
                    <Trans>Delete</Trans>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1"
                  >
                    <Trans>Cancel</Trans>
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
              <Trans>Close</Trans>
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
