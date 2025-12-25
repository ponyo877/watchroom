import {
  SkyWayContext,
  SkyWayRoom,
  P2PRoom,
  LocalP2PRoomMember,
  LocalDataStream,
  RemoteDataStream,
} from '@skyway-sdk/room';
import type { RoomMetadata, MemberMetadata } from '@/types/skyway';

export interface SkyWayConfig {
  token: string;
}

export async function createSkyWayContext(token: string): Promise<SkyWayContext> {
  const context = await SkyWayContext.Create(token);
  return context;
}

export async function findOrCreateRoom(
  context: SkyWayContext,
  roomName: string
): Promise<P2PRoom> {
  const room = await SkyWayRoom.FindOrCreate(context, {
    type: 'p2p',
    name: roomName,
  });
  return room as P2PRoom;
}

export async function joinRoom(
  room: P2PRoom,
  memberMetadata: MemberMetadata
): Promise<LocalP2PRoomMember> {
  const member = await room.join({
    metadata: JSON.stringify(memberMetadata),
  });
  return member;
}

export async function createDataStream(): Promise<LocalDataStream> {
  const dataStream = await SkyWayContext.prototype.createDataStream?.();
  return dataStream!;
}

export function parseRoomMetadata(metadata: string | undefined): RoomMetadata | null {
  if (!metadata) return null;
  try {
    return JSON.parse(metadata) as RoomMetadata;
  } catch {
    return null;
  }
}

export function parseMemberMetadata(metadata: string | undefined): MemberMetadata | null {
  if (!metadata) return null;
  try {
    return JSON.parse(metadata) as MemberMetadata;
  } catch {
    return null;
  }
}

export function subscribeToDataStream(
  stream: RemoteDataStream,
  onData: (data: string) => void
): void {
  stream.onData.add((data) => {
    if (typeof data === 'string') {
      onData(data);
    }
  });
}
