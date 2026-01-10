import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SkyWayContext,
  SkyWayStreamFactory,
  P2PRoom,
  LocalP2PRoomMember,
  LocalDataStream,
  RemoteDataStream,
  RoomPublication,
} from '@skyway-sdk/room';
import { useUserStore } from '@/stores/userStore';
import { useRoomStore } from '@/stores/roomStore';
import type { RoomMetadata, MemberMetadata } from '@/types/skyway';
import type { DataStreamMessage } from '@/types/message';
import {
  createSkyWayContext,
  findOrCreateRoom,
  parseMemberMetadata,
  parseRoomMetadata,
} from '@/lib/skyway';
import axiosInstance from '@/lib/api';

interface UseSkyWayOptions {
  roomName: string;
  token: string;
  onMessage?: (message: DataStreamMessage) => void;
}

export function useSkyWay({ roomName, token, onMessage }: UseSkyWayOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isDataStreamReady, setIsDataStreamReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const contextRef = useRef<SkyWayContext | null>(null);
  const roomRef = useRef<P2PRoom | null>(null);
  const memberRef = useRef<LocalP2PRoomMember | null>(null);
  const dataStreamRef = useRef<LocalDataStream | null>(null);
  const dataStreamPublicationIdRef = useRef<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataStreamPublicationRef = useRef<any>(null);
  const isConnectingRef = useRef(false);
  const subscribedPublicationsRef = useRef<Set<string>>(new Set());
  // Flag to prevent double-decrement of member count
  const hasDecrementedRef = useRef(false);
  // Store origin for sendBeacon (needs absolute URL when navigating away)
  const apiOriginRef = useRef(window.location.origin);
  // Flag to indicate disconnect is in progress (prevents recreation attempts during teardown)
  const isDisconnectingRef = useRef(false);

  const user = useUserStore();
  // Get store actions without subscribing to state changes
  const roomStoreActions = useRef(useRoomStore.getState()).current;
  // Flag to prevent concurrent DataStream recreation
  const isRecreatingDataStreamRef = useRef(false);
  // Ref to hold the latest recreateDataStream function (to avoid stale closure in event handlers)
  const recreateDataStreamRef = useRef<() => Promise<boolean>>(() => Promise.resolve(false));

  // Set up connection state monitoring for a publication
  const setupConnectionStateMonitoring = useCallback((publication: RoomPublication) => {
    // Monitor connection state changes to detect DataChannel failures
    publication.onConnectionStateChanged.add(({ state, remoteMember }) => {
      const stateStr = state as string;
      console.log(`[SkyWay] Publication connection state changed: ${stateStr}`, remoteMember?.id);

      // Skip recreation if we're intentionally disconnecting
      if (isDisconnectingRef.current) {
        console.log('[SkyWay] Skipping recreation - disconnect in progress');
        return;
      }

      // Only recreate on "failed" state - "disconnected" might be intentional (e.g., user leaving)
      // This prevents unnecessary recreation attempts during normal teardown
      if (stateStr === 'failed') {
        console.warn(`[SkyWay] DataChannel connection ${stateStr}, triggering recreation...`);
        // Use ref to get the latest version of recreateDataStream
        recreateDataStreamRef.current();
      }
    });
  }, []);

  // Recreate DataStream when it fails (as recommended by SkyWay SDK error message)
  const recreateDataStream = useCallback(async (): Promise<boolean> => {
    // Skip recreation if we're disconnecting
    if (isDisconnectingRef.current) {
      console.log('[SkyWay] Skipping DataStream recreation - disconnect in progress');
      return false;
    }

    if (!memberRef.current || !roomRef.current) {
      console.warn('[SkyWay] Cannot recreate DataStream: no member/room');
      return false;
    }

    // Prevent concurrent recreation attempts
    if (isRecreatingDataStreamRef.current) {
      console.log('[SkyWay] DataStream recreation already in progress');
      return false;
    }
    isRecreatingDataStreamRef.current = true;

    console.log('[SkyWay] Recreating DataStream...');

    try {
      // Unpublish old stream if exists (use publication ID, not stream ID)
      if (dataStreamPublicationIdRef.current) {
        try {
          await memberRef.current.unpublish(dataStreamPublicationIdRef.current);
        } catch (e) {
          console.warn('[SkyWay] Failed to unpublish old DataStream:', e);
        }
        dataStreamPublicationIdRef.current = null;
        dataStreamPublicationRef.current = null;
      }
      dataStreamRef.current = null;

      // Create and publish new DataStream
      const newDataStream = await SkyWayStreamFactory.createDataStream();
      const publication = await memberRef.current.publish(newDataStream);
      dataStreamRef.current = newDataStream;
      dataStreamPublicationIdRef.current = publication.id;
      dataStreamPublicationRef.current = publication;

      // Set up monitoring for the new publication
      setupConnectionStateMonitoring(publication);

      console.log('[SkyWay] DataStream recreated successfully');
      return true;
    } catch (error) {
      console.error('[SkyWay] Failed to recreate DataStream:', error);
      return false;
    } finally {
      isRecreatingDataStreamRef.current = false;
    }
  }, [setupConnectionStateMonitoring]);

  // Keep the ref updated with the latest recreateDataStream function
  useEffect(() => {
    recreateDataStreamRef.current = recreateDataStream;
  }, [recreateDataStream]);

  const sendMessage = useCallback(async (message: DataStreamMessage): Promise<boolean> => {
    if (!dataStreamRef.current) {
      console.warn('[SkyWay] DataStream not available');
      return false;
    }

    try {
      dataStreamRef.current.write(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('[SkyWay] DataStream write failed:', error);

      // Attempt to recreate DataStream as recommended by SkyWay SDK
      const recreated = await recreateDataStream();
      if (!recreated || !dataStreamRef.current) {
        console.error('[SkyWay] Failed to recover DataStream');
        return false;
      }

      // Retry after recreation
      try {
        dataStreamRef.current.write(JSON.stringify(message));
        console.log('[SkyWay] Message sent successfully after DataStream recreation');
        return true;
      } catch (retryError) {
        console.error('[SkyWay] DataStream write retry failed:', retryError);
        return false;
      }
    }
  }, [recreateDataStream]);

  const updateRoomMetadata = useCallback(
    async (metadata: Partial<RoomMetadata>) => {
      if (!roomRef.current) return;
      const current = parseRoomMetadata(roomRef.current.metadata) || {};
      await roomRef.current.updateMetadata(
        JSON.stringify({ ...current, ...metadata })
      );
    },
    []
  );

  const updateMemberMetadata = useCallback(
    async (metadata: Partial<MemberMetadata>) => {
      if (!memberRef.current) return;
      const current = parseMemberMetadata(memberRef.current.metadata) || {};
      await memberRef.current.updateMetadata(
        JSON.stringify({ ...current, ...metadata })
      );
    },
    []
  );

  const handleDataStreamMessage = useCallback(
    (data: string) => {
      try {
        const message = JSON.parse(data) as DataStreamMessage;
        console.log('[useSkyWay] Received message:', message.type, message.senderId);
        onMessage?.(message);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    },
    [onMessage]
  );

  const subscribeToMember = useCallback(
    async (publication: RoomPublication) => {
      console.log('[useSkyWay] subscribeToMember called:', {
        contentType: publication.contentType,
        publisherId: publication.publisher.id,
        myMemberId: memberRef.current?.id,
        alreadySubscribed: subscribedPublicationsRef.current.has(publication.id),
      });

      // Skip non-data streams
      if (publication.contentType !== 'data') return;
      // Skip own publications
      if (publication.publisher.id === memberRef.current?.id) return;
      // Skip already subscribed publications
      if (subscribedPublicationsRef.current.has(publication.id)) return;

      try {
        subscribedPublicationsRef.current.add(publication.id);
        const subscription = await memberRef.current?.subscribe(publication.id);
        if (!subscription) {
          console.log('[useSkyWay] subscribeToMember: subscription failed (null)');
          return;
        }

        console.log('[useSkyWay] subscribeToMember: subscribed successfully to', publication.publisher.id);
        const stream = subscription.stream as RemoteDataStream;
        stream.onData.add((data) => {
          if (typeof data === 'string') {
            handleDataStreamMessage(data);
          }
        });
      } catch (e) {
        console.warn('Failed to subscribe to publication:', e);
        // Remove from set if subscription failed
        subscribedPublicationsRef.current.delete(publication.id);
      }
    },
    [handleDataStreamMessage]
  );

  const connect = useCallback(async () => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current || contextRef.current) {
      return;
    }
    isConnectingRef.current = true;
    // Reset decrement flag for new connection
    hasDecrementedRef.current = false;

    try {
      setError(null);

      const context = await createSkyWayContext(token);
      contextRef.current = context;

      const room = await findOrCreateRoom(context, roomName);
      roomRef.current = room;

      // Check if creator BEFORE joining (members array doesn't include us yet)
      const isCreator = room.members.length === 0;
      console.log('[useSkyWay] Room join:', {
        roomMembersCount: room.members.length,
        isCreator,
        userId: user.id,
      });

      const memberMetadata: MemberMetadata = {
        id: user.id,
        name: user.name,
        iconUrl: user.iconUrl,
        isCreator,
      };

      const member = await room.join({
        metadata: JSON.stringify(memberMetadata),
      });
      memberRef.current = member;

      // Create and publish data stream
      const dataStream = await SkyWayStreamFactory.createDataStream();
      dataStreamRef.current = dataStream;
      const publication = await member.publish(dataStream);
      dataStreamPublicationIdRef.current = publication.id;
      dataStreamPublicationRef.current = publication;

      // Signal that DataStream is ready for E2E test observability
      setIsDataStreamReady(true);

      // Set up connection state monitoring for auto-recovery
      setupConnectionStateMonitoring(publication);

      // Subscribe to existing members' data streams
      for (const pub of room.publications) {
        await subscribeToMember(pub);
      }

      // Listen for new publications
      room.onStreamPublished.add(async (e) => {
        await subscribeToMember(e.publication);
      });

      // Listen for member events
      room.onMemberJoined.add((e) => {
        const metadata = parseMemberMetadata(e.member.metadata);
        if (metadata) {
          roomStoreActions.addMember(metadata);
          // 入室通知をチャットに追加
          roomStoreActions.addChatMessage({
            id: `system-join-${metadata.id}-${Date.now()}`,
            type: 'join',
            text: `${metadata.name}が入室しました`,
            senderId: 'system',
            senderName: 'System',
            senderIconUrl: '',
            timestamp: Date.now(),
          });
        }
      });

      room.onMemberLeft.add(async (e) => {
        const leavingMemberMetadata = parseMemberMetadata(e.member.metadata);

        // 1. Remove member from local store (use user.id from metadata, not SkyWay member.id)
        if (leavingMemberMetadata) {
          // 退室通知をチャットに追加
          roomStoreActions.addChatMessage({
            id: `system-leave-${leavingMemberMetadata.id}-${Date.now()}`,
            type: 'leave',
            text: `${leavingMemberMetadata.name}が退室しました`,
            senderId: 'system',
            senderName: 'System',
            senderIconUrl: '',
            timestamp: Date.now(),
          });
          roomStoreActions.removeMember(leavingMemberMetadata.id);
        }

        // Note: Member count decrement is NOT done here.
        // Each member is responsible for decrementing their own count
        // via disconnect() or beforeunload to prevent double-decrement.

        // 2. Check if leaving member was the creator
        if (leavingMemberMetadata?.isCreator) {
          const currentRoomMetadata = parseRoomMetadata(room.metadata);
          const currentPermissionMode = currentRoomMetadata?.permissionMode || 'creator';

          // If permission mode is 'creator', switch to 'all' so remaining members can control
          if (currentPermissionMode === 'creator') {
            // Immediately update local state for responsive UX
            roomStoreActions.setPermissionMode('all');
            roomStoreActions.setHasControlPermission(true);

            // Race condition prevention: only the member with smallest ID updates room metadata
            const remainingMembers = room.members;
            if (remainingMembers.length > 0 && memberRef.current) {
              const sortedMembers = [...remainingMembers].sort((a, b) =>
                a.id.localeCompare(b.id)
              );
              const designatedUpdaterId = sortedMembers[0].id;

              if (memberRef.current.id === designatedUpdaterId) {
                try {
                  const updatedMetadata = {
                    ...currentRoomMetadata,
                    permissionMode: 'all' as const,
                  };
                  await room.updateMetadata(JSON.stringify(updatedMetadata));
                } catch (err) {
                  console.error('Failed to update room metadata after creator left:', err);
                }
              }
            }
          }
        }
      });

      // Update initial members
      const members = room.members
        .map((m) => parseMemberMetadata(m.metadata))
        .filter((m): m is MemberMetadata => m !== null);
      roomStoreActions.setMembers(members);

      // Set creator status
      roomStoreActions.setIsCreator(isCreator);

      // Calculate control permission based on room settings
      const calculatePermission = (roomMetadata: RoomMetadata | null): boolean => {
        if (!roomMetadata) {
          // Default: only creator has permission
          return isCreator;
        }
        const permissionMode = roomMetadata.permissionMode || 'creator';
        switch (permissionMode) {
          case 'all':
            return true;
          case 'specific':
            return isCreator || (roomMetadata.allowedUserIds || []).includes(user.id);
          case 'creator':
          default:
            return isCreator;
        }
      };

      // Listen for metadata changes
      room.onMetadataUpdated.add(() => {
        const metadata = parseRoomMetadata(room.metadata);
        if (metadata) {
          roomStoreActions.setCurrentVideo(metadata.currentVideo);
          roomStoreActions.setPlaybackState(metadata.playbackState);
          // Sync permission settings to store
          if (metadata.permissionMode) {
            roomStoreActions.setPermissionMode(metadata.permissionMode);
          }
          if (metadata.allowedUserIds) {
            roomStoreActions.setAllowedUserIds(metadata.allowedUserIds);
          }
          // Sync play history to store
          if (metadata.playHistory) {
            roomStoreActions.setPlayHistory(metadata.playHistory);
          }
          // Update permission when room settings change
          roomStoreActions.setHasControlPermission(calculatePermission(metadata));
        }
      });

      const initialRoomMeta = parseRoomMetadata(room.metadata);
      roomStoreActions.setHasControlPermission(calculatePermission(initialRoomMeta));

      // Read initial room metadata for late joiners
      const initialRoomMetadata = parseRoomMetadata(room.metadata);
      if (initialRoomMetadata) {
        if (initialRoomMetadata.currentVideo) {
          roomStoreActions.setCurrentVideo(initialRoomMetadata.currentVideo);
        }
        if (initialRoomMetadata.playbackState) {
          const savedState = initialRoomMetadata.playbackState;
          // Calculate actual current time based on elapsed time since last update
          let adjustedCurrentTime = savedState.currentTime;
          if (savedState.isPlaying && savedState.lastUpdated > 0) {
            const elapsedSeconds = (Date.now() - savedState.lastUpdated) / 1000;
            adjustedCurrentTime = savedState.currentTime + elapsedSeconds * savedState.playbackRate;
          }
          roomStoreActions.setPlaybackState({
            ...savedState,
            currentTime: adjustedCurrentTime,
            // Set a new lastUpdated to trigger sync in useVideoSync
            lastUpdated: Date.now(),
          });
        }
        // Sync initial permission settings
        if (initialRoomMetadata.permissionMode) {
          roomStoreActions.setPermissionMode(initialRoomMetadata.permissionMode);
        }
        if (initialRoomMetadata.allowedUserIds) {
          roomStoreActions.setAllowedUserIds(initialRoomMetadata.allowedUserIds);
        }
        // Sync initial play history
        if (initialRoomMetadata.playHistory) {
          roomStoreActions.setPlayHistory(initialRoomMetadata.playHistory);
        }
      }

      // Increment member count in DB
      // Note: Member count accuracy is maintained by periodic cleanup job
      // that resets stale room counts
      try {
        await axiosInstance.post(`/api/rooms/${roomName}/member-count/increment`);
      } catch (e) {
        console.error('Failed to increment member count:', e);
      }

      setIsConnected(true);
      roomStoreActions.setIsConnected(true);
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Failed to connect');
      setError(error);
      console.error('SkyWay connection error:', e);
    } finally {
      isConnectingRef.current = false;
    }
  }, [token, roomName, user.id, user.name, user.iconUrl, subscribeToMember, roomStoreActions, setupConnectionStateMonitoring]);

  const disconnect = useCallback(async () => {
    // Set disconnecting flag FIRST to prevent any recreation attempts during teardown
    isDisconnectingRef.current = true;

    // Note: Member count decrement is handled by useEffect cleanup
    // using synchronous sendBeacon for reliable delivery

    try {
      // Skip explicit unpublish - member.leave() will handle cleanup
      // Trying to unpublish during disconnect causes "publicationNotExist" errors
      // because the publication may already be removed from the channel
      if (memberRef.current) {
        await memberRef.current.leave();
      }
      if (contextRef.current) {
        await contextRef.current.dispose();
      }
    } catch (e) {
      console.error('Disconnect error:', e);
    } finally {
      contextRef.current = null;
      roomRef.current = null;
      memberRef.current = null;
      dataStreamRef.current = null;
      dataStreamPublicationIdRef.current = null;
      dataStreamPublicationRef.current = null;
      isConnectingRef.current = false;
      isRecreatingDataStreamRef.current = false;
      isDisconnectingRef.current = false;
      subscribedPublicationsRef.current.clear();
      setIsConnected(false);
      setIsDataStreamReady(false);
      roomStoreActions.setIsConnected(false);
    }
  }, [roomStoreActions]);

  useEffect(() => {
    if (token && roomName) {
      connect();
    }

    return () => {
      // Synchronous sendBeacon ensures decrement even when context closes abruptly
      // (e.g., Playwright context.close() which doesn't wait for async operations)
      if (roomRef.current && !hasDecrementedRef.current) {
        hasDecrementedRef.current = true;
        navigator.sendBeacon(`${apiOriginRef.current}/api/rooms/${roomName}/member-count/decrement`);
      }
      disconnect();
    };
  }, [token, roomName, connect, disconnect]);

  // Cleanup on tab close / browser close
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable request delivery even when tab is closing
      // Check flag to prevent double-decrement (if disconnect was already called)
      if (roomRef.current && !hasDecrementedRef.current) {
        hasDecrementedRef.current = true;
        navigator.sendBeacon(`${apiOriginRef.current}/api/rooms/${roomName}/member-count/decrement`);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [roomName]);

  return {
    isConnected,
    isDataStreamReady,
    error,
    sendMessage,
    updateRoomMetadata,
    updateMemberMetadata,
    connect,
    disconnect,
  };
}
