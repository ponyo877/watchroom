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
      className="block group transition-all duration-300 ease-out hover:scale-[1.02] hover:-translate-y-1"
    >
      <div className="aspect-video bg-gradient-to-br from-muted/80 to-muted/40 rounded-xl mb-3 overflow-hidden relative shadow-lg hover:shadow-xl hover:shadow-primary/10 transition-shadow duration-300">
        {room.currentVideo ? (
          <>
            <img
              src={room.currentVideo.thumbnail}
              alt={room.currentVideo.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300 shadow-lg">
                <Play className="h-8 w-8 text-primary ml-1" fill="currentColor" />
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center backdrop-blur-sm">
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
