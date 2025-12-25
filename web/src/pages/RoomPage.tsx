import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import {
  Settings,
  Users,
  History,
  LogOut,
  Search,
} from 'lucide-react';
import { useRoomStore } from '@/stores/roomStore';
import { useUserStore } from '@/stores/userStore';
import { useShortUrl } from '@/hooks/useShortUrl';
import ChatPanel from '@/components/chat/ChatPanel';
import ReactionPicker from '@/components/chat/ReactionPicker';
import ReactionOverlay from '@/components/player/ReactionOverlay';
import PlayerControls from '@/components/player/PlayerControls';
import VideoSearch from '@/components/player/VideoSearch';
import PlayHistory from '@/components/player/PlayHistory';
import MemberList from '@/components/room/MemberList';
import RoomSettings from '@/components/room/RoomSettings';
import PasswordDialog from '@/components/room/PasswordDialog';
import PasswordSettingsDialog from '@/components/room/PasswordSettingsDialog';
import ShareButton from '@/components/room/ShareButton';
import Loading from '@/components/common/Loading';
import type { YouTubeVideo } from '@/types/youtube';

export default function RoomPage() {
  const { roomId, shortId } = useParams();
  const navigate = useNavigate();

  const userId = useUserStore((state) => state.id);
  const roomStore = useRoomStore();

  // Short URL resolution
  const { isLoading: isResolvingShortUrl, error: shortUrlError, roomInfo } = useShortUrl(shortId);

  // Get actual room ID (from params or resolved short URL)
  const actualRoomId = roomId || roomInfo?.roomId;

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showPasswordSettings, setShowPasswordSettings] = useState(false);
  const [showMemberList, setShowMemberList] = useState(false);
  const [showVideoSearch, setShowVideoSearch] = useState(false);
  const [showPlayHistory, setShowPlayHistory] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);

  // Mock states (will be replaced with actual hooks)
  const [permissionMode, setPermissionMode] = useState<'creator' | 'specific' | 'all'>('creator');
  const [allowedUserIds, setAllowedUserIds] = useState<string[]>([]);
  const [hasPassword, setHasPassword] = useState(false);
  const [playHistory, setPlayHistory] = useState<any[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Check if room requires password
  useEffect(() => {
    if (roomInfo?.hasPassword && !isPasswordVerified) {
      setShowPasswordDialog(true);
      setHasPassword(true);
    }
  }, [roomInfo, isPasswordVerified]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      roomStore.reset();
    };
  }, [roomStore]);

  const handleVerifyPassword = async (password: string): Promise<boolean> => {
    if (!actualRoomId) return false;

    try {
      const response = await fetch(`/api/rooms/${actualRoomId}/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();

      if (data.valid) {
        setIsPasswordVerified(true);
        setShowPasswordDialog(false);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleSetPassword = async (
    oldPassword: string | null,
    newPassword: string
  ): Promise<boolean> => {
    if (!actualRoomId) return false;

    try {
      const response = await fetch(`/api/rooms/${actualRoomId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setHasPassword(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleRemovePassword = async (password: string): Promise<boolean> => {
    if (!actualRoomId) return false;

    try {
      const response = await fetch(`/api/rooms/${actualRoomId}/password`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (data.success) {
        setHasPassword(false);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleSelectVideo = useCallback((video: YouTubeVideo) => {
    roomStore.setCurrentVideo({
      videoId: video.videoId,
      title: video.title,
      thumbnail: video.thumbnail,
    });
    setShowVideoSearch(false);
  }, [roomStore]);

  const handleSendChatMessage = useCallback((text: string) => {
    // TODO: Implement with SkyWay
    console.log('Send chat message:', text);
  }, []);

  const handleSendReaction = useCallback((emoji: string) => {
    // TODO: Implement with SkyWay
    console.log('Send reaction:', emoji);
  }, []);

  const handleLeaveRoom = useCallback(() => {
    roomStore.reset();
    navigate('/');
  }, [roomStore, navigate]);

  // Loading state
  if (isResolvingShortUrl) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loading size="lg" text="部屋を読み込み中..." />
      </div>
    );
  }

  // Error state
  if (shortUrlError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-foreground mb-4">{shortUrlError}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  // Password required
  if (showPasswordDialog) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <PasswordDialog
          open={showPasswordDialog}
          onSubmit={handleVerifyPassword}
          onCancel={() => navigate('/')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Main content */}
        <main className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleLeaveRoom}
                className="p-2 hover:bg-accent rounded-md"
                title="部屋を出る"
              >
                <LogOut className="h-5 w-5" />
              </button>
              <h1 className="font-semibold truncate">
                {roomStore.room?.name || `Room: ${actualRoomId?.slice(0, 8)}...`}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowVideoSearch(true)}
                className="p-2 hover:bg-accent rounded-md"
                title="動画を検索"
              >
                <Search className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowPlayHistory(true)}
                className="p-2 hover:bg-accent rounded-md"
                title="再生履歴"
              >
                <History className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowMemberList(!showMemberList)}
                className="p-2 hover:bg-accent rounded-md"
                title="メンバー"
              >
                <Users className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 hover:bg-accent rounded-md"
                title="設定"
              >
                <Settings className="h-5 w-5" />
              </button>
              <ShareButton
                roomId={actualRoomId || ''}
                shortId={shortId}
                roomName={roomStore.room?.name || 'WatchRoom'}
              />
            </div>
          </header>

          {/* Video player */}
          <div className="flex-1 relative bg-black">
            {roomStore.currentVideo ? (
              <div className="w-full h-full flex items-center justify-center">
                <img
                  src={roomStore.currentVideo.thumbnail}
                  alt={roomStore.currentVideo.title}
                  className="max-w-full max-h-full object-contain"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <p className="text-white text-center">
                    {roomStore.currentVideo.title}
                    <br />
                    <span className="text-sm text-white/70">
                      (YouTube Player placeholder)
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-white/50 mb-4">動画が選択されていません</p>
                  <button
                    onClick={() => setShowVideoSearch(true)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
                  >
                    動画を検索
                  </button>
                </div>
              </div>
            )}

            {/* Reaction overlay */}
            <ReactionOverlay reactions={roomStore.reactions} />
          </div>

          {/* Player controls */}
          <div className="h-16 border-t border-border bg-card">
            <PlayerControls
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              playbackRate={roomStore.playbackState.playbackRate}
              hasControlPermission={roomStore.hasControlPermission}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onSeek={(time) => setCurrentTime(time)}
              onPlaybackRateChange={(rate) =>
                roomStore.setPlaybackState({ playbackRate: rate })
              }
            />
          </div>
        </main>

        {/* Sidebar */}
        <aside className="w-80 border-l border-border bg-card flex flex-col">
          {showMemberList ? (
            <MemberList members={roomStore.members} currentUserId={userId} />
          ) : (
            <>
              <ChatPanel
                messages={roomStore.chatMessages}
                onSendMessage={handleSendChatMessage}
              />
              <div className="p-2 border-t border-border flex items-center gap-2">
                <ReactionPicker onSelectReaction={handleSendReaction} />
              </div>
            </>
          )}
        </aside>
      </div>

      {/* Modals */}
      <RoomSettings
        open={showSettings}
        onClose={() => setShowSettings(false)}
        isCreator={roomStore.isCreator}
        hasPassword={hasPassword}
        permissionMode={permissionMode}
        allowedUserIds={allowedUserIds}
        members={roomStore.members}
        currentUserId={userId}
        onPermissionModeChange={setPermissionMode}
        onGrantPermission={(id) => setAllowedUserIds((prev) => [...prev, id])}
        onRevokePermission={(id) =>
          setAllowedUserIds((prev) => prev.filter((i) => i !== id))
        }
        onOpenPasswordSettings={() => {
          setShowSettings(false);
          setShowPasswordSettings(true);
        }}
      />

      <PasswordSettingsDialog
        open={showPasswordSettings}
        hasPassword={hasPassword}
        onClose={() => setShowPasswordSettings(false)}
        onSetPassword={handleSetPassword}
        onRemovePassword={handleRemovePassword}
      />

      {showVideoSearch && (
        <VideoSearch
          onSelectVideo={handleSelectVideo}
          onClose={() => setShowVideoSearch(false)}
        />
      )}

      <PlayHistory
        open={showPlayHistory}
        onClose={() => setShowPlayHistory(false)}
        history={playHistory}
        onSelectVideo={(video) => {
          roomStore.setCurrentVideo(video);
          setShowPlayHistory(false);
        }}
        onRemoveVideo={(videoId) =>
          setPlayHistory((prev) => prev.filter((v) => v.videoId !== videoId))
        }
        onClearHistory={() => setPlayHistory([])}
        hasControlPermission={roomStore.hasControlPermission}
      />
    </div>
  );
}
