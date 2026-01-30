import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ReactionItem } from '@/types/room';

interface ReactionOverlayProps {
  reactions: ReactionItem[];
  className?: string;
  inline?: boolean;
}

interface FloatingReaction extends ReactionItem {
  x: number;
  y: number;
}

export default function ReactionOverlay({ reactions, className, inline = false }: ReactionOverlayProps) {
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  // Track seen reaction IDs to avoid adding duplicates (prevents infinite loop)
  const seenReactionIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const newReactions = reactions.filter(
      (r) => !seenReactionIdsRef.current.has(r.id)
    );

    if (newReactions.length > 0) {
      // Mark as seen before adding to state
      newReactions.forEach((r) => seenReactionIdsRef.current.add(r.id));

      setFloatingReactions((prev) => [
        ...prev,
        ...newReactions.map((r) => ({
          ...r,
          x: Math.random() * 80 + 10, // 10-90% from left
          y: 0, // Start from top
        })),
      ]);
    }
  }, [reactions]);

  // Remove reactions after animation
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setFloatingReactions((prev) =>
        prev.filter((r) => now - r.timestamp < 3000)
      );
    }, 500);

    return () => clearInterval(timer);
  }, []);

  // Inline mode: display reactions in a horizontal row
  if (inline) {
    return (
      <div className={cn("flex items-center gap-1 h-6 overflow-hidden", className)}>
        {floatingReactions.slice(-5).map((reaction) => (
          <span
            key={reaction.id}
            className="text-lg animate-bounce-in"
          >
            {reaction.emoji}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}>
      {floatingReactions.map((reaction) => (
        <div
          key={reaction.id}
          className="absolute text-4xl animate-reaction-float drop-shadow-lg"
          style={{
            left: `${reaction.x}%`,
            bottom: 0,
          }}
        >
          <span className="inline-block animate-reaction-wobble">
            {reaction.emoji}
          </span>
        </div>
      ))}
    </div>
  );
}
