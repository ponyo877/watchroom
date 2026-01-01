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

interface UseSkyWayOptions {
  roomName: string;
  token: string;
  onMessage?: (message: DataStreamMessage) => void;
}

export function useSkyWay({ roomName, token, onMessage }: UseSkyWayOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const contextRef = useRef<SkyWayContext | null>(null);
  const roomRef = useRef<P2PRoom | null>(null);
  const memberRef = useRef<LocalP2PRoomMember | null>(null);
  const dataStreamRef = useRef<LocalDataStream | null>(null);
  const isConnectingRef = useRef(false);
  const subscribedPublicationsRef = useRef<Set<string>>(new Set());

  const user = useUserStore();
  // Get store actions without subscribing to state changes
  const roomStoreActions = useRef(useRoomStore.getState()).current;

  const sendMessage = useCallback((message: DataStreamMessage) => {
    if (dataStreamRef.current) {
      dataStreamRef.current.write(JSON.stringify(message));
    }
  }, []);

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
        onMessage?.(message);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    },
    [onMessage]
  );

  const subscribeToMember = useCallback(
    async (publication: RoomPublication) => {
      // Skip non-data streams
      if (publication.contentType !== 'data') return;
      // Skip own publications
      if (publication.publisher.id === memberRef.current?.id) return;
      // Skip already subscribed publications
      if (subscribedPublicationsRef.current.has(publication.id)) return;

      try {
        subscribedPublicationsRef.current.add(publication.id);
        const subscription = await memberRef.current?.subscribe(publication.id);
        if (!subscription) return;

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

    try {
      setError(null);

      const context = await createSkyWayContext(token);
      contextRef.current = context;

      const room = await findOrCreateRoom(context, roomName);
      roomRef.current = room;

      // Check if creator BEFORE joining (members array doesn't include us yet)
      const isCreator = room.members.length === 0;

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
      await member.publish(dataStream);

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
        }
      });

      room.onMemberLeft.add((e) => {
        roomStoreActions.removeMember(e.member.id);
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
  }, [token, roomName, user.id, user.name, user.iconUrl, subscribeToMember, roomStoreActions]);

  const disconnect = useCallback(async () => {
    try {
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
      isConnectingRef.current = false;
      subscribedPublicationsRef.current.clear();
      setIsConnected(false);
      roomStoreActions.setIsConnected(false);
    }
  }, [roomStoreActions]);

  useEffect(() => {
    if (token && roomName) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [token, roomName, connect, disconnect]);

  return {
    isConnected,
    error,
    sendMessage,
    updateRoomMetadata,
    updateMemberMetadata,
    connect,
    disconnect,
  };
}
