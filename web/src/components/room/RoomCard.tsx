import { Link } from 'react-router-dom';
import { Users, Lock, Play } from 'lucide-react';
import type { Room } from '@/types/room';

interface RoomCardProps {
  room: Room;
}

export default function RoomCard({ room }: RoomCardProps) {
  return (
    <Link
      to={`/r/${room.shortId}`}
      className="block p-4 border border-border rounded-lg bg-card hover:bg-accent transition-colors"
    >
      <div className="aspect-video bg-muted rounded-md mb-3 overflow-hidden relative">
        {room.currentVideo ? (
          <>
            <img
              src={room.currentVideo.thumbnail}
              alt={room.currentVideo.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <Play className="h-12 w-12 text-white" />
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-muted-foreground text-sm">
              動画が選択されていません
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground truncate flex-1">
            {room.name}
          </h3>
          {room.hasPassword && <Lock className="h-4 w-4 text-muted-foreground" />}
        </div>

        {room.currentVideo && (
          <p className="text-sm text-muted-foreground truncate">
            {room.currentVideo.title}
          </p>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{room.creatorName}</span>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>
              {room.memberCount}/{room.maxMembers}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
