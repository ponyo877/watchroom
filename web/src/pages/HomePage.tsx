import { useState } from 'react';
import Header from '@/components/common/Header';
import RoomList from '@/components/room/RoomList';
import CreateRoomDialog from '@/components/room/CreateRoomDialog';

export default function HomePage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-background">
      <Header
        onCreateRoom={() => setIsCreateDialogOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <main className="container mx-auto px-4 py-8">
        <RoomList searchQuery={searchQuery} />
      </main>
      <CreateRoomDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
