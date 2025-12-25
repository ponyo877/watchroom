import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { generateId } from '@/lib/utils';

interface CreateRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateRoomDialog({
  open,
  onOpenChange,
}: CreateRoomDialogProps) {
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const roomId = generateId();
      // TODO: Call API to create room
      console.log('Creating room:', { roomId, roomName, password });
      navigate(`/room/${roomId}`);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create room:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 p-1 rounded-md hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="text-xl font-semibold mb-4">部屋を作成</h2>

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
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
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
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
            />
            <p className="text-xs text-muted-foreground mt-1">
              パスワードを設定すると、入室時に必要になります
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-accent"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isLoading || !roomName.trim()}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? '作成中...' : '作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
