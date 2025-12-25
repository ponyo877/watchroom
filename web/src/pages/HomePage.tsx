import { useState } from 'react';
import Header from '@/components/common/Header';
import RoomList from '@/components/room/RoomList';
import CreateRoomDialog from '@/components/room/CreateRoomDialog';

export default function HomePage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header onCreateRoom={() => setIsCreateDialogOpen(true)} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">部屋一覧</h1>
          <p className="mt-2 text-muted-foreground">
            YouTubeを友達と一緒に楽しもう
          </p>
        </div>
        <RoomList />
      </main>
      <CreateRoomDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
