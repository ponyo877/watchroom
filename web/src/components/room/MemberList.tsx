import { Crown, User } from 'lucide-react';
import type { MemberMetadata } from '@/types/skyway';

interface MemberListProps {
  members: MemberMetadata[];
  currentUserId: string;
}

export default function MemberList({ members, currentUserId }: MemberListProps) {
  return (
    <div className="p-4">
      <h3 className="font-semibold mb-3">メンバー ({members.length})</h3>
      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent"
          >
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {member.iconUrl ? (
                <img
                  src={member.iconUrl}
                  alt={member.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <span className="flex-1 truncate text-sm">
              {member.name}
              {member.id === currentUserId && (
                <span className="text-xs text-muted-foreground ml-1">(あなた)</span>
              )}
            </span>
            {member.isCreator && (
              <Crown className="h-4 w-4 text-yellow-500" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
