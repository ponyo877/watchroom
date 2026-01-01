import { useState } from 'react';
import { Share2, Link, Check, Copy, MessageCircle } from 'lucide-react';

interface ShareButtonProps {
  roomId: string;
  shortId?: string;
  roomName: string;
}

export default function ShareButton({ roomId, shortId, roomName }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = shortId
    ? `${window.location.origin}/r/${shortId}`
    : `${window.location.origin}/room/${roomId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = async (platform?: 'twitter' | 'line') => {
    const text = `${roomName} - WatchRoomで一緒に動画を見よう！`;
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(shareUrl);

    if (platform === 'twitter') {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
        '_blank'
      );
    } else if (platform === 'line') {
      window.open(
        `https://social-plugins.line.me/lineit/share?url=${encodedUrl}`,
        '_blank'
      );
    } else if (navigator.share) {
      try {
        await navigator.share({
          title: roomName,
          text: text,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
      >
        <Share2 className="h-4 w-4" />
        <span className="text-sm">シェア</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-lg shadow-lg z-50 p-4">
            <h3 className="font-medium mb-3">部屋をシェア</h3>

            {/* URL Copy */}
            <div className="mb-4">
              <label className="block text-xs text-muted-foreground mb-1">
                シェアURL
              </label>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center px-3 py-2 bg-muted rounded-md overflow-hidden">
                  <Link className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm truncate">{shareUrl}</span>
                </div>
                <button
                  onClick={handleCopy}
                  className="p-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              {copied && (
                <p className="text-xs text-green-600 mt-1">
                  コピーしました！
                </p>
              )}
            </div>

            {/* Share Buttons */}
            <div className="space-y-2">
              <button
                onClick={() => handleShare('twitter')}
                className="w-full flex items-center gap-3 px-4 py-2 bg-black text-white rounded-md hover:opacity-90"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span className="text-sm">Xでシェア</span>
              </button>

              <button
                onClick={() => handleShare('line')}
                className="w-full flex items-center gap-3 px-4 py-2 bg-[#00B900] text-white rounded-md hover:opacity-90"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm">LINEでシェア</span>
              </button>

              {'share' in navigator && (
                <button
                  onClick={() => handleShare()}
                  className="w-full flex items-center gap-3 px-4 py-2 bg-muted rounded-md hover:bg-accent"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="text-sm">その他</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
