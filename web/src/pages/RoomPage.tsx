import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Settings,
  Users,
  History,
  LogOut,
  Film,
  MessageCircle,
} from 'lucide-react';
import { useRoomStore } from '@/stores/roomStore';
import { useUserStore } from '@/stores/userStore';
import { useShortUrl } from '@/hooks/useShortUrl';
import { useModeration } from '@/hooks/useModeration';
import { useVideoSync } from '@/hooks/useVideoSync';
import { useRoom } from '@/hooks/useRoom';
import axiosInstance from '@/lib/api';
import ChatPanel from '@/components/chat/ChatPanel';
import ReactionPicker from '@/components/chat/ReactionPicker';
import ReactionOverlay from '@/components/player/ReactionOverlay';
import PlayerControls from '@/components/player/PlayerControls';
import VideoSearch from '@/components/player/VideoSearch';
import PlayHistory from '@/components/player/PlayHistory';
import MemberList from '@/components/room/MemberList';
import MemberListCompact from '@/components/room/MemberListCompact';
import RoomSettings from '@/components/room/RoomSettings';
import PasswordDialog from '@/components/room/PasswordDialog';
import PasswordSettingsDialog from '@/components/room/PasswordSettingsDialog';
import ShareButton from '@/components/room/ShareButton';
import BottomSheet from '@/components/common/BottomSheet';
import Loading from '@/components/common/Loading';
import type { YouTubeVideo } from '@/types/youtube';
import type {
  SyncMessage,
  StateRequestMessage,
  StateResponseMessage,
  HeartbeatMessage,
} from '@/types/message';

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
  const [showPasswordSettings, setShowPasswordSettings] = useState(false);
  const [showMemberList, setShowMemberList] = useState(false);
  const [showVideoSearch, setShowVideoSearch] = useState(false);
  const [showPlayHistory, setShowPlayHistory] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showMobileMembers, setShowMobileMembers] = useState(false);

  // Derive password dialog visibility during rendering (not via Effect)
  const showPasswordDialog = roomInfo?.hasPassword === true && !isPasswordVerified;

  // Permission states from room store (synced via SkyWay metadata)
  const permissionMode = roomStore.permissionMode;
  const allowedUserIds = roomStore.allowedUserIds;
  // Play history from room store (synced via SkyWay metadata)
  const playHistory = roomStore.playHistory;
  // Local password state for optimistic updates after password changes
  const [localHasPassword, setLocalHasPassword] = useState<boolean | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);

  // Player element ID
  const playerElementId = useRef(`youtube-player-${Date.now()}`);

  // Refs for video sync handlers (to avoid circular dependency)
  const stateRequestHandlerRef = useRef<(message: StateRequestMessage) => void>(() => { });
  const stateResponseHandlerRef = useRef<(message: StateResponseMessage) => void>(() => { });
  const heartbeatHandlerRef = useRef<(message: HeartbeatMessage) => void>(() => { });

  // Stable callbacks that delegate to refs
  const handleIncomingStateRequest = useCallback((message: StateRequestMessage) => {
    stateRequestHandlerRef.current(message);
  }, []);

  const handleIncomingStateResponse = useCallback((message: StateResponseMessage) => {
    stateResponseHandlerRef.current(message);
  }, []);

  const handleIncomingHeartbeat = useCallback((message: HeartbeatMessage) => {
    heartbeatHandlerRef.current(message);
  }, []);

  // SkyWay room connection
  const {
    isConnected,
    isLoading: isRoomLoading,
    error: roomError,
    sendChatMessage: skySendChat,
    sendReaction: skySendReaction,
    sendMessage: skySendMessage,
    updateRoomMetadata,
  } = useRoom({
    roomId: actualRoomId || '',
    onStateRequest: handleIncomingStateRequest,
    onStateResponse: handleIncomingStateResponse,
    onHeartbeat: handleIncomingHeartbeat,
  });

  // Video sync hook
  const handleSendSync = useCallback((message: SyncMessage) => {
    if (isConnected) {
      skySendMessage(message);
    }
  }, [isConnected, skySendMessage]);

  const handleSendStateRequest = useCallback((message: StateRequestMessage) => {
    if (isConnected) {
      skySendMessage(message);
    }
  }, [isConnected, skySendMessage]);

  const handleSendStateResponse = useCallback((message: StateResponseMessage) => {
    if (isConnected) {
      skySendMessage(message);
    }
  }, [isConnected, skySendMessage]);

  const handleSendHeartbeat = useCallback((message: HeartbeatMessage) => {
    if (isConnected) {
      skySendMessage(message);
    }
  }, [isConnected, skySendMessage]);

  const {
    player,
    isReady: isPlayerReady,
    play,
    pause,
    seek,
    setPlaybackRate,
    handleStateRequest,
    handleStateResponse,
    handleHeartbeat,
  } = useVideoSync({
    elementId: playerElementId.current,
    onSendSync: handleSendSync,
    onSendStateRequest: handleSendStateRequest,
    onSendStateResponse: handleSendStateResponse,
    onSendHeartbeat: handleSendHeartbeat,
  });

  // Wire up video sync handlers to refs
  useEffect(() => {
    stateRequestHandlerRef.current = handleStateRequest;
    stateResponseHandlerRef.current = handleStateResponse;
    heartbeatHandlerRef.current = handleHeartbeat;
  }, [handleStateRequest, handleStateResponse, handleHeartbeat]);

  // Update current time from player
  useEffect(() => {
    if (!player || !isPlayerReady) return;

    const interval = setInterval(() => {
      const time = player.getCurrentTime();
      const dur = player.getDuration();
      setCurrentTime(time);
      if (dur > 0) setDuration(dur);
    }, 500);

    return () => clearInterval(interval);
  }, [player, isPlayerReady]);

  // Derive isPlaying from playback state
  const isPlaying = roomStore.playbackState.isPlaying;

  // Derive hasPassword: use local state if modified, otherwise from roomInfo
  const hasPassword = localHasPassword ?? roomInfo?.hasPassword ?? false;

  // Track if connection was ever established (to avoid resetting permissions on disconnect)
  const wasConnectedRef = useRef(false);
  if (isConnected) {
    wasConnectedRef.current = true;
  }

  // Set control permission for local testing when SkyWay is not connected
  // Note: When connected, useSkyWay.ts sets the correct permissions
  useEffect(() => {
    // Only set fallback permissions if never connected (testing mode)
    if (!isConnected && !wasConnectedRef.current) {
      roomStore.setHasControlPermission(true);
      roomStore.setIsCreator(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      roomStore.reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        // showPasswordDialog is derived: roomInfo?.hasPassword && !isPasswordVerified
        // So it automatically becomes false when isPasswordVerified is true
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
        setLocalHasPassword(true);
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
        setLocalHasPassword(false);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleSelectVideo = useCallback((video: YouTubeVideo) => {
    const videoInfo = {
      videoId: video.videoId,
      title: video.title,
      thumbnail: video.thumbnail,
    };

    // Add to play history
    const historyItem = {
      ...videoInfo,
      playedAt: Date.now(),
    };
    roomStore.addToPlayHistory(historyItem);

    // Update local store
    roomStore.setCurrentVideo(videoInfo);

    // Send sync message to other users
    if (isConnected && roomStore.hasControlPermission) {
      const syncMessage: SyncMessage = {
        type: 'sync',
        action: 'video',
        payload: {
          videoId: video.videoId,
          title: video.title,
          thumbnail: video.thumbnail,
        },
        senderId: userId,
        timestamp: Date.now(),
      };
      skySendMessage(syncMessage);

      // Update room metadata for late joiners (including play history)
      const newPlayHistory = [
        historyItem,
        ...playHistory.filter((v) => v.videoId !== video.videoId),
      ].slice(0, 50);

      // Initialize playback state for the new video (loadVideoById auto-plays at position 0)
      const initialPlaybackState = {
        isPlaying: true,
        currentTime: 0,
        playbackRate: roomStore.playbackState.playbackRate,
        lastUpdated: Date.now(),
      };
      roomStore.setPlaybackState(initialPlaybackState);

      updateRoomMetadata({
        currentVideo: videoInfo,
        playHistory: newPlayHistory,
        playbackState: initialPlaybackState,
      });

      // Update current video in database for room list display
      if (actualRoomId) {
        axiosInstance.put(`/api/rooms/${actualRoomId}/current-video`, {
          video_id: video.videoId,
          title: video.title,
          thumbnail: video.thumbnail,
        }).catch((err) => {
          console.error('Failed to update current video in DB:', err);
        });
      }
    }

    setShowVideoSearch(false);
  }, [roomStore, isConnected, userId, skySendMessage, updateRoomMetadata, playHistory, actualRoomId]);

  const handleSendChatMessage = useCallback((text: string) => {
    if (isConnected) {
      skySendChat(text);
    }
  }, [isConnected, skySendChat]);

  const handleSendReaction = useCallback((emoji: string) => {
    // useReaction hook handles adding to local state
    skySendReaction(emoji);
  }, [skySendReaction]);

  const handleLeaveRoom = useCallback(() => {
    roomStore.reset();
    navigate('/');
  }, [roomStore, navigate]);

  const { kickUser, banUser } = useModeration({
    roomId: actualRoomId || '',
    onKickSuccess: (userId) => {
      roomStore.removeMember(userId);
    },
    onBanSuccess: (userId) => {
      roomStore.removeMember(userId);
    },
  });

  const handleKickUser = useCallback(
    (userId: string) => {
      kickUser(userId);
    },
    [kickUser]
  );

  const handleBanUser = useCallback(
    (userId: string, reason: string) => {
      banUser(userId, reason);
    },
    [banUser]
  );

  // Loading state
  if (isResolvingShortUrl || isRoomLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loading size="lg" text={isResolvingShortUrl ? "部屋を読み込み中..." : "接続中..."} />
      </div>
    );
  }

  // Error state
  if (shortUrlError || roomError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-foreground mb-4">{shortUrlError || roomError}</p>
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
          <header className="h-14 border-b border-border bg-card flex items-center justify-between px-2 md:px-4 relative z-10">
            <div className="flex items-center gap-2 md:gap-4 min-w-0">
              <button
                onClick={handleLeaveRoom}
                className="p-2 hover:bg-accent rounded-md flex-shrink-0"
                title="部屋を出る"
              >
                <LogOut className="h-5 w-5" />
              </button>
              <h1 className="font-semibold truncate text-sm md:text-base">
                {roomStore.room?.name || `Room: ${actualRoomId?.slice(0, 8)}...`}
              </h1>
            </div>

            <div className="flex items-center gap-1 md:gap-2">
              <button
                onClick={() => setShowVideoSearch(true)}
                className="flex items-center gap-2 px-3 py-2 bg-[#4A7C59] text-white rounded-md shadow-lg shadow-[#4A7C59]/25 hover:shadow-xl hover:shadow-[#4A7C59]/30 hover:scale-105 active:scale-95 transition-all duration-200"
                title="AddVideo"
              >
                <Film className="h-4 w-4" />
                <span className="hidden md:inline">AddVideo</span>
              </button>
              <button
                onClick={() => setShowPlayHistory(true)}
                className="p-2 hover:bg-accent rounded-md hidden md:flex"
                title="再生履歴"
              >
                <History className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowMemberList(!showMemberList)}
                className="p-2 hover:bg-accent rounded-md hidden md:flex"
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
          <div className="flex-1 relative bg-black overflow-hidden">
            {/* YouTube Player Container */}
            <div
              id={playerElementId.current}
              className="w-full h-full"
              style={{ display: roomStore.currentVideo ? 'block' : 'none' }}
            />

            {/* Transparent overlay to block iframe clicks */}
            {roomStore.currentVideo && (
              <div
                className="absolute inset-0 z-10"
                data-testid="iframe-click-blocker"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                style={{ pointerEvents: 'auto' }}
              />
            )}

            {/* No video selected message */}
            {!roomStore.currentVideo && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center px-4">
                  <p className="text-white/50 mb-4">動画が選択されていません</p>
                  <button
                    onClick={() => setShowVideoSearch(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#4A7C59] text-white rounded-md shadow-lg shadow-[#4A7C59]/25 hover:shadow-xl hover:shadow-[#4A7C59]/30 hover:scale-105 active:scale-95 transition-all duration-200"
                    title="AddVideo"
                  >
                    <Film className="h-4 w-4" />
                    <span>AddVideo</span>
                  </button>
                </div>
              </div>
            )}

            {/* Reaction overlay - z-index higher than blocker */}
            <ReactionOverlay reactions={roomStore.reactions} className="z-20" />
          </div>

          {/* Player controls */}
          <div className="h-16 border-t border-border bg-card relative z-10">
            <PlayerControls
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              playbackRate={roomStore.playbackState.playbackRate}
              hasControlPermission={roomStore.hasControlPermission}
              volume={volume}
              isMuted={isMuted}
              onPlay={() => {
                play();
                const newState = { isPlaying: true, currentTime, lastUpdated: Date.now() };
                roomStore.setPlaybackState(newState);
                if (isConnected) {
                  updateRoomMetadata({ playbackState: { ...roomStore.playbackState, ...newState } });
                }
              }}
              onPause={() => {
                pause();
                const newState = { isPlaying: false, currentTime, lastUpdated: Date.now() };
                roomStore.setPlaybackState(newState);
                if (isConnected) {
                  updateRoomMetadata({ playbackState: { ...roomStore.playbackState, ...newState } });
                }
              }}
              onSeek={(time) => {
                seek(time);
                setCurrentTime(time);
                const newState = { currentTime: time, lastUpdated: Date.now() };
                roomStore.setPlaybackState(newState);
                if (isConnected) {
                  updateRoomMetadata({ playbackState: { ...roomStore.playbackState, ...newState } });
                }
              }}
              onPlaybackRateChange={(rate) => {
                setPlaybackRate(rate);
                const newState = { playbackRate: rate, lastUpdated: Date.now() };
                roomStore.setPlaybackState(newState);
                if (isConnected) {
                  updateRoomMetadata({ playbackState: { ...roomStore.playbackState, ...newState } });
                }
              }}
              onVolumeChange={(newVolume) => {
                setVolume(newVolume);
                setIsMuted(false);
                if (player) {
                  player.setVolume(newVolume);
                  player.unMute();
                }
              }}
              onMuteToggle={() => {
                const newMuted = !isMuted;
                setIsMuted(newMuted);
                if (player) {
                  if (newMuted) {
                    player.mute();
                  } else {
                    player.unMute();
                  }
                }
              }}
            />
          </div>

          {/* Mobile bottom navigation */}
          <div className="h-14 border-t border-border bg-card flex items-center justify-around md:hidden relative z-10">
            <button
              onClick={() => setShowMobileChat(true)}
              className="flex flex-col items-center gap-1 p-2"
            >
              <MessageCircle className="h-5 w-5" />
              <span className="text-xs">チャット</span>
            </button>
            <button
              onClick={() => setShowMobileMembers(true)}
              className="flex flex-col items-center gap-1 p-2"
            >
              <Users className="h-5 w-5" />
              <span className="text-xs">メンバー</span>
            </button>
            <button
              onClick={() => setShowPlayHistory(true)}
              className="flex flex-col items-center gap-1 p-2"
            >
              <History className="h-5 w-5" />
              <span className="text-xs">履歴</span>
            </button>
            <ReactionPicker onSelectReaction={handleSendReaction} compact />
          </div>
        </main>

        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-80 border-l border-border bg-card flex-col">
          {/* Compact member list - always visible */}
          <MemberListCompact
            members={roomStore.members}
            currentUserId={userId}
          />
          {/* Chat or full member list */}
          {showMemberList ? (
            <MemberList
              members={roomStore.members}
              currentUserId={userId}
              isCreator={roomStore.isCreator}
              onKick={handleKickUser}
              onBan={handleBanUser}
              onGrantPermission={(id) => {
                roomStore.addAllowedUserId(id);
                if (isConnected) {
                  const newAllowedUserIds = [...allowedUserIds.filter((i) => i !== id), id];
                  updateRoomMetadata({ allowedUserIds: newAllowedUserIds });
                }
              }}
              onRevokePermission={(id) => {
                roomStore.removeAllowedUserId(id);
                if (isConnected) {
                  const newAllowedUserIds = allowedUserIds.filter((i) => i !== id);
                  updateRoomMetadata({ allowedUserIds: newAllowedUserIds });
                }
              }}
              allowedUserIds={allowedUserIds}
            />
          ) : (
            <ChatPanel
              messages={roomStore.chatMessages}
              onSendMessage={handleSendChatMessage}
              onSelectReaction={handleSendReaction}
              roomId={actualRoomId || ''}
            />
          )}
        </aside>
      </div>

      {/* Mobile Chat Bottom Sheet */}
      <BottomSheet
        open={showMobileChat}
        onClose={() => setShowMobileChat(false)}
        title="チャット"
      >
        <div className="h-[60vh]">
          <ChatPanel
            messages={roomStore.chatMessages}
            onSendMessage={handleSendChatMessage}
            roomId={actualRoomId || ''}
          />
        </div>
      </BottomSheet>

      {/* Mobile Members Bottom Sheet */}
      <BottomSheet
        open={showMobileMembers}
        onClose={() => setShowMobileMembers(false)}
        title="メンバー"
      >
        <MemberList
          members={roomStore.members}
          currentUserId={userId}
          isCreator={roomStore.isCreator}
          onKick={handleKickUser}
          onBan={handleBanUser}
          onGrantPermission={(id) => {
            roomStore.addAllowedUserId(id);
            if (isConnected) {
              const newAllowedUserIds = [...allowedUserIds.filter((i) => i !== id), id];
              updateRoomMetadata({ allowedUserIds: newAllowedUserIds });
            }
          }}
          onRevokePermission={(id) => {
            roomStore.removeAllowedUserId(id);
            if (isConnected) {
              const newAllowedUserIds = allowedUserIds.filter((i) => i !== id);
              updateRoomMetadata({ allowedUserIds: newAllowedUserIds });
            }
          }}
          allowedUserIds={allowedUserIds}
        />
      </BottomSheet>

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
        onPermissionModeChange={(mode) => {
          roomStore.setPermissionMode(mode);
          if (isConnected) {
            updateRoomMetadata({ permissionMode: mode });
          }
        }}
        onGrantPermission={(id) => {
          roomStore.addAllowedUserId(id);
          if (isConnected) {
            const newAllowedUserIds = [...allowedUserIds.filter((i) => i !== id), id];
            updateRoomMetadata({ allowedUserIds: newAllowedUserIds });
          }
        }}
        onRevokePermission={(id) => {
          roomStore.removeAllowedUserId(id);
          if (isConnected) {
            const newAllowedUserIds = allowedUserIds.filter((i) => i !== id);
            updateRoomMetadata({ allowedUserIds: newAllowedUserIds });
          }
        }}
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
          if (isConnected && roomStore.hasControlPermission) {
            // Initialize playback state for the selected video (loadVideoById auto-plays at position 0)
            const initialPlaybackState = {
              isPlaying: true,
              currentTime: 0,
              playbackRate: roomStore.playbackState.playbackRate,
              lastUpdated: Date.now(),
            };
            roomStore.setPlaybackState(initialPlaybackState);
            updateRoomMetadata({ currentVideo: video, playbackState: initialPlaybackState });
          }
          setShowPlayHistory(false);
        }}
        onRemoveVideo={(videoId) => {
          roomStore.removeFromPlayHistory(videoId);
          if (isConnected && roomStore.hasControlPermission) {
            const newPlayHistory = playHistory.filter((v) => v.videoId !== videoId);
            updateRoomMetadata({ playHistory: newPlayHistory });
          }
        }}
        onClearHistory={() => {
          roomStore.clearPlayHistory();
          if (isConnected && roomStore.hasControlPermission) {
            updateRoomMetadata({ playHistory: [] });
          }
        }}
        hasControlPermission={roomStore.hasControlPermission}
      />
    </div>
  );
}
