import RoomCard from './RoomCard';
import Loading from '@/components/common/Loading';
import type { Room } from '@/types/room';

// TODO: Replace with actual API call
const mockRooms: Room[] = [
  {
    roomId: 'room-1',
    name: 'Music Lounge',
    creatorId: 'user-1',
    creatorName: 'Alice',
    hasPassword: false,
    memberCount: 2,
    maxMembers: 4,
    currentVideo: {
      videoId: 'dQw4w9WgXcQ',
      title: 'Rick Astley - Never Gonna Give You Up',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg',
    },
    shortId: 'abc123',
  },
  {
    roomId: 'room-2',
    name: 'Anime Night',
    creatorId: 'user-2',
    creatorName: 'Bob',
    hasPassword: true,
    memberCount: 4,
    maxMembers: 4,
    shortId: 'def456',
  },
];

export default function RoomList() {
  const isLoading = false;
  const rooms = mockRooms;

  if (isLoading) {
    return (
      <div className="py-12">
        <Loading size="lg" text="部屋を読み込み中..." />
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">
          まだ部屋がありません。最初の部屋を作成してみましょう！
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {rooms.map((room) => (
        <RoomCard key={room.roomId} room={room} />
      ))}
    </div>
  );
}
