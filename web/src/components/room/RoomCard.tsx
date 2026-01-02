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
      className="block group"
    >
      <div className="aspect-video bg-muted rounded-xl mb-3 overflow-hidden relative">
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

      <div className="space-y-1 px-1">
        <div className="flex items-start gap-2">
          <h3 className="font-medium text-foreground text-sm leading-snug line-clamp-2 flex-1 group-hover:text-primary transition-colors">
            {room.name}
          </h3>
          {room.hasPassword && <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
        </div>

        {room.currentVideo && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {room.currentVideo.title}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{room.creatorName}</span>
          <span>•</span>
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span>
              {room.memberCount}/{room.maxMembers}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
