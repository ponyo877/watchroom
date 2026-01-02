import { useEffect, useState, useMemo } from 'react';
import RoomCard from './RoomCard';
import Loading from '@/components/common/Loading';
import axiosInstance from '@/lib/api';
import type { Room } from '@/types/room';

interface APIVideoInfo {
  video_id: string;
  title: string;
  thumbnail: string;
}

interface APIRoomItem {
  room_id: string;
  name: string;
  creator_id: string;
  creator_name: string;
  has_password: boolean;
  short_id: string;
  current_video?: APIVideoInfo;
  member_count: number;
  max_members: number;
}

interface APIRoomListResponse {
  rooms: APIRoomItem[];
}

interface RoomListProps {
  searchQuery?: string;
}

export default function RoomList({ searchQuery = '' }: RoomListProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredRooms = useMemo(() => {
    if (!searchQuery.trim()) {
      return rooms;
    }
    const query = searchQuery.toLowerCase().trim();
    return rooms.filter((room) => {
      const nameMatch = room.name.toLowerCase().includes(query);
      const creatorMatch = room.creatorName.toLowerCase().includes(query);
      const videoMatch = room.currentVideo?.title?.toLowerCase().includes(query);
      return nameMatch || creatorMatch || videoMatch;
    });
  }, [rooms, searchQuery]);

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
          memberCount: r.member_count,
          maxMembers: r.max_members,
          currentVideo: r.current_video
            ? {
                videoId: r.current_video.video_id,
                title: r.current_video.title,
                thumbnail: r.current_video.thumbnail,
              }
            : undefined,
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
    <div className="space-y-6">
      {/* Room Grid */}
      {filteredRooms.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-muted-foreground">
            「{searchQuery}」に一致する部屋が見つかりませんでした
          </p>
        </div>
      ) : (
        <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRooms.map((room, index) => (
            <div
              key={room.roomId}
              className="animate-fade-in-up opacity-0"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
            >
              <RoomCard room={room} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
