import { useEffect, useState } from 'react';
import RoomCard from './RoomCard';
import Loading from '@/components/common/Loading';
import axiosInstance from '@/lib/api';
import type { Room } from '@/types/room';

interface APIRoomItem {
  room_id: string;
  name: string;
  creator_id: string;
  creator_name: string;
  has_password: boolean;
  short_id: string;
}

interface APIRoomListResponse {
  rooms: APIRoomItem[];
}

export default function RoomList() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await axiosInstance.get<APIRoomListResponse>('/api/rooms');
        const apiRooms = response.data.rooms || [];
        const mappedRooms: Room[] = apiRooms.map((r) => ({
          roomId: r.room_id,
          name: r.name,
          creatorId: r.creator_id,
          creatorName: r.creator_name,
          hasPassword: r.has_password,
          shortId: r.short_id,
          memberCount: 0,
          maxMembers: 10,
        }));
        setRooms(mappedRooms);
      } catch (err) {
        console.error('Failed to fetch rooms:', err);
        setError('部屋の読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };
    fetchRooms();
  }, []);

  if (isLoading) {
    return (
      <div className="py-12">
        <Loading size="lg" text="部屋を読み込み中..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-destructive">{error}</p>
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
