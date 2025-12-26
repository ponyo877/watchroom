import { useEffect, useRef, useState } from 'react';
import type { ReactionItem } from '@/types/room';

interface ReactionOverlayProps {
  reactions: ReactionItem[];
}

interface FloatingReaction extends ReactionItem {
  x: number;
  y: number;
}

export default function ReactionOverlay({ reactions }: ReactionOverlayProps) {
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

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {floatingReactions.map((reaction) => (
        <div
          key={reaction.id}
          className="absolute text-4xl animate-float-down"
          style={{
            left: `${reaction.x}%`,
            animationDuration: '3s',
          }}
        >
          {reaction.emoji}
        </div>
      ))}

      <style>{`
        @keyframes float-down {
          0% {
            transform: translateY(-20px);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh);
            opacity: 0;
          }
        }
        .animate-float-down {
          animation: float-down 3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
