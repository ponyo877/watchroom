import { useEffect, useState, useMemo, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { Trans, t, plural } from '@lingui/macro';
import RoomCard from './RoomCard';
import Loading from '@/components/common/Loading';
import PullToRefresh from '@/components/common/PullToRefresh';
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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

  const fetchRooms = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    }
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
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
      setError(t`Failed to load rooms`);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Keyboard shortcut for desktop (R key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if not in an input field
      if (
        e.key.toLowerCase() === 'r' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        fetchRooms(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fetchRooms]);

  const handleRefresh = useCallback(async () => {
    await fetchRooms(true);
  }, [fetchRooms]);

  // Format relative time
  const getRelativeTime = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return t`Just now`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60)
      return plural(minutes, {
        one: '# minute ago',
        other: '# minutes ago',
      });
    const hours = Math.floor(minutes / 60);
    if (hours < 24)
      return plural(hours, {
        one: '# hour ago',
        other: '# hours ago',
      });
    const days = Math.floor(hours / 24);
    return plural(days, {
      one: '# day ago',
      other: '# days ago',
    });
  };

  // Desktop refresh button component
  const RefreshButton = () => (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-all duration-200 group"
      title={t`Refresh (R)`}
    >
      <RefreshCw
        className={`h-4 w-4 transition-transform duration-500 ${
          isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'
        }`}
      />
      <span className="text-xs">
        {isRefreshing ? t`Refreshing...` : lastUpdated ? getRelativeTime(lastUpdated) : t`Refresh`}
      </span>
      <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
        R
      </kbd>
    </button>
  );

  if (isLoading) {
    return (
      <div className="py-12">
        <Loading size="lg" text={t`Loading rooms...`} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-destructive">{error}</p>
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          <Trans>Retry</Trans>
        </button>
      </div>
    );
  }

  const content = (
    <div className="space-y-4">
      {/* Refresh indicator for desktop */}
      <div className="flex justify-end">
        <RefreshButton />
      </div>

      {rooms.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            <Trans>No rooms yet. Create the first one!</Trans>
          </p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-muted-foreground">
            <Trans>No rooms found matching "{searchQuery}"</Trans>
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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

  // Wrap with PullToRefresh for mobile
  return (
    <PullToRefresh onRefresh={handleRefresh} disabled={isRefreshing}>
      {content}
    </PullToRefresh>
  );
}
