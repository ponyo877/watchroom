import { Crown, User } from 'lucide-react';
import type { MemberMetadata } from '@/types/skyway';

interface MemberListCompactProps {
  members: MemberMetadata[];
  currentUserId: string;
}

export default function MemberListCompact({
  members,
  currentUserId,
}: MemberListCompactProps) {
  return (
    <div className="p-3 border-b border-border/50">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-muted-foreground">
          Members ({members.length})
        </span>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {members.map((member) => {
          const isCurrentUser = member.id === currentUserId;
          return (
            <div
              key={member.id}
              className="relative flex-shrink-0 group"
              title={`${member.name}${isCurrentUser ? ' (you)' : ''}${member.isCreator ? ' - Creator' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden ring-2 ${
                  member.isCreator ? 'ring-yellow-500/50' : 'ring-border/50'
                } transition-all duration-200 group-hover:ring-primary/50`}
              >
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
              {/* Creator crown */}
              {member.isCreator && (
                <Crown className="absolute -top-1 -right-1 h-3 w-3 text-yellow-500" />
              )}
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-success rounded-full border border-background" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
