import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface LandscapeSidePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function LandscapeSidePanel({
  open,
  onClose,
  title,
  children,
}: LandscapeSidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const startX = useRef(0);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setDragOffset(0);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // スワイプで閉じる処理（右方向）
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;

    // 右方向へのスワイプのみ許可
    if (diff > 0) {
      setDragOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    // 80px以上スワイプしたら閉じる
    if (dragOffset > 80) {
      onClose();
    }

    setDragOffset(0);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop - 半透明で動画を見えるように */}
      <div
        className="absolute inset-0 bg-black/30 animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="absolute top-0 bottom-0 right-0 w-[min(320px,50vw)] bg-card/95 backdrop-blur-xl border-l border-border flex flex-col animate-slide-in-from-right pr-safe"
        style={{
          transform: dragOffset > 0 ? `translateX(${dragOffset}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {/* Header with drag handle */}
        <div
          className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/80 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <h2 className="font-semibold text-sm">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md active:bg-accent md:hover:bg-accent touch-feedback"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
