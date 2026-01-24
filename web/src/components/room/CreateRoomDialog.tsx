import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Trans, t } from '@lingui/macro';
import { generateId } from '@/lib/utils';
import axiosInstance from '@/lib/api';
import { useUserStore } from '@/stores/userStore';
import { useLanguage } from '@/i18n/useLanguage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog';

interface CreateRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CreateRoomResponse {
  short_id: string;
}

export default function CreateRoomDialog({
  open,
  onOpenChange,
}: CreateRoomDialogProps) {
  const navigate = useNavigate();
  const userId = useUserStore((state) => state.id);
  const userName = useUserStore((state) => state.name);
  const { currentLocale } = useLanguage();
  const [roomName, setRoomName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const roomId = generateId();

      const response = await axiosInstance.post<CreateRoomResponse>('/api/rooms', {
        room_id: roomId,
        name: roomName,
        creator_id: userId,
        creator_name: userName,
        password: password || undefined,
      });

      // Navigate to the room using the short ID
      const prefix = currentLocale === 'en' ? '/en' : '';
      navigate(`${prefix}/r/${response.data.short_id}`);
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to create room:', err);
      setError(t`Failed to create room`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader icon={<Plus className="h-5 w-5 text-primary" />}>
          <DialogTitle><Trans>Create Room</Trans></DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="roomName"
              className="block text-sm font-medium mb-1"
            >
              <Trans>Room Name</Trans>
            </label>
            <input
              id="roomName"
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder={t`e.g. Music Night`}
              className="w-full px-4 py-2.5 border border-input rounded-xl bg-background/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 hover:border-primary/30 transition-all duration-200"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1"
            >
              <Trans>Password (optional)</Trans>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t`Set password (leave empty for public)`}
              className="w-full px-4 py-2.5 border border-input rounded-xl bg-background/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 hover:border-primary/30 transition-all duration-200"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              <Trans>Password will be required when joining</Trans>
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 px-4 py-2.5 border border-border rounded-xl hover:bg-accent/50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Trans>Cancel</Trans>
            </button>
            <button
              type="submit"
              disabled={isLoading || !roomName.trim()}
              className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:shadow-none disabled:scale-100 transition-all duration-200"
            >
              {isLoading ? <Trans>Creating...</Trans> : <Trans>Create</Trans>}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
