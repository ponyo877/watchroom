import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useRoomStore } from '@/stores/roomStore';

export default function RoomPage() {
  const { roomId, shortId } = useParams();
  const reset = useRoomStore((state) => state.reset);

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <main className="flex-1 flex flex-col">
          <div className="flex-1 flex items-center justify-center bg-black">
            <div className="text-white text-center">
              <p className="text-xl">Room: {roomId || shortId}</p>
              <p className="text-muted-foreground mt-2">
                YouTube Player will be here
              </p>
            </div>
          </div>
          <div className="h-16 border-t border-border bg-card">
            <div className="h-full flex items-center justify-center">
              <p className="text-muted-foreground">Player Controls</p>
            </div>
          </div>
        </main>
        <aside className="w-80 border-l border-border bg-card">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold">Chat</h2>
            </div>
            <div className="flex-1 p-4">
              <p className="text-muted-foreground text-center">
                Chat messages will appear here
              </p>
            </div>
            <div className="p-4 border-t border-border">
              <input
                type="text"
                placeholder="メッセージを入力..."
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
