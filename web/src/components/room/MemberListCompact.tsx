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
    <div className="h-14 px-3 flex flex-col justify-center border-b border-border/50">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-xs font-medium text-muted-foreground">
          Members ({members.length})
        </span>
      </div>
      <div className="flex items-center gap-1.5 overflow-x-auto pl-0.5 scrollbar-thin">
        {members.map((member) => {
          const isCurrentUser = member.id === currentUserId;
          return (
            <div
              key={member.id}
              className="relative flex-shrink-0 group"
              title={`${member.name}${isCurrentUser ? ' (you)' : ''}${member.isCreator ? ' - Creator' : ''}`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-muted flex items-center justify-center overflow-hidden ring-1 ${member.isCreator ? 'ring-yellow-500/50' : 'ring-border/50'
                  } transition-all duration-200 group-hover:ring-primary/50`}
              >
                {member.iconUrl ? (
                  <img
                    src={member.iconUrl}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
              {/* Creator crown */}
              {member.isCreator && (
                <Crown className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 text-yellow-500" />
              )}
              {/* Online indicator */}
              <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-success rounded-full border border-background" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
