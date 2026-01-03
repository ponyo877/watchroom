import { useState } from 'react';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import RoomList from '@/components/room/RoomList';
import CreateRoomDialog from '@/components/room/CreateRoomDialog';

export default function HomePage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-background animate-fade-in flex flex-col">
      <Header
        onCreateRoom={() => setIsCreateDialogOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <main className="container mx-auto px-4 py-8 flex-1">
        <RoomList searchQuery={searchQuery} />
      </main>
      <Footer />
      <CreateRoomDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
