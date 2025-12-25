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

  const user = useUserStore();
  const roomStore = useRoomStore();

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
      if (publication.contentType !== 'data') return;

      const subscription = await memberRef.current?.subscribe(publication.id);
      if (!subscription) return;

      const stream = subscription.stream as RemoteDataStream;
      stream.onData.add((data) => {
        if (typeof data === 'string') {
          handleDataStreamMessage(data);
        }
      });
    },
    [handleDataStreamMessage]
  );

  const connect = useCallback(async () => {
    try {
      setError(null);

      const context = await createSkyWayContext(token);
      contextRef.current = context;

      const room = await findOrCreateRoom(context, roomName);
      roomRef.current = room;

      const memberMetadata: MemberMetadata = {
        id: user.id,
        name: user.name,
        iconUrl: user.iconUrl,
        isCreator: room.members.length === 0,
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
          roomStore.addMember(metadata);
        }
      });

      room.onMemberLeft.add((e) => {
        roomStore.removeMember(e.member.id);
      });

      // Listen for metadata changes
      room.onMetadataUpdated.add(() => {
        const metadata = parseRoomMetadata(room.metadata);
        if (metadata) {
          roomStore.setCurrentVideo(metadata.currentVideo);
          roomStore.setPlaybackState(metadata.playbackState);
        }
      });

      // Update initial members
      const members = room.members
        .map((m) => parseMemberMetadata(m.metadata))
        .filter((m): m is MemberMetadata => m !== null);
      roomStore.setMembers(members);

      // Set creator status
      roomStore.setIsCreator(memberMetadata.isCreator);
      roomStore.setHasControlPermission(memberMetadata.isCreator);

      setIsConnected(true);
      roomStore.setIsConnected(true);
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Failed to connect');
      setError(error);
      console.error('SkyWay connection error:', e);
    }
  }, [token, roomName, user, roomStore, subscribeToMember]);

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
      setIsConnected(false);
      roomStore.setIsConnected(false);
    }
  }, [roomStore]);

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
