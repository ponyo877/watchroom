import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { generateId } from '@/lib/utils';
import axiosInstance from '@/lib/api';
import { useUserStore } from '@/stores/userStore';
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
      navigate(`/r/${response.data.short_id}`);
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to create room:', err);
      setError('部屋の作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader icon={<Plus className="h-5 w-5 text-primary" />}>
          <DialogTitle>部屋を作成</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="roomName"
              className="block text-sm font-medium mb-1"
            >
              部屋名
            </label>
            <input
              id="roomName"
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="例: Music Night"
              className="w-full px-4 py-2.5 border border-input rounded-xl bg-background/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 hover:border-primary/30 transition-all duration-200"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1"
            >
              パスワード（オプション）
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを設定（空欄で公開）"
              className="w-full px-4 py-2.5 border border-input rounded-xl bg-background/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 hover:border-primary/30 transition-all duration-200"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              パスワードを設定すると、入室時に必要になります
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
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isLoading || !roomName.trim()}
              className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:shadow-none disabled:scale-100 transition-all duration-200"
            >
              {isLoading ? '作成中...' : '作成'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
