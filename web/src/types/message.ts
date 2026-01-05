// ============================================================
// WatchRoom P2P Video Sync Protocol v2.0
// Based on: Lamport (1978), NTP RFC 5905, Primary-Backup Replication
// ============================================================

// Vector clock type for concurrent operation detection
export type VectorClock = Record<string, number>;

// Base message fields shared by all message types
export interface BaseMessageFields {
  senderId: string;
  timestamp: number;           // Physical timestamp (ms)
  logicalClock: number;        // Lamport timestamp for ordering
  vectorClock: VectorClock;    // For concurrent operation detection
  sequenceNumber: number;      // For loss rate detection and ordering
  viewNumber: number;          // Current view/epoch for authority tracking
  fencingToken?: string;       // For split-brain prevention
}

export interface SyncMessage extends BaseMessageFields {
  type: 'sync';
  action: 'play' | 'pause' | 'seek' | 'rate' | 'video';
  payload: {
    currentTime?: number;
    playbackRate?: number;
    videoId?: string;
    title?: string;
    thumbnail?: string;
    wallClockAtTime?: number;  // Wall clock when currentTime was read
  };
}

export interface ChatMessage extends BaseMessageFields {
  type: 'chat';
  payload: {
    messageId: string;
    text: string;
    senderName: string;
    senderIconUrl: string;
  };
}

export interface ReactionMessage extends BaseMessageFields {
  type: 'reaction';
  payload: {
    emoji: string;
  };
}

export interface PermissionMessage extends BaseMessageFields {
  type: 'permission';
  payload: {
    mode: 'creator' | 'specific' | 'all';
    allowedUserIds?: string[];
    targetUserId?: string;
    granted?: boolean;
  };
}

export interface ModerationMessage extends BaseMessageFields {
  type: 'moderation';
  payload: {
    action: 'kick' | 'ban';
    targetUserId: string;
    reason?: string;
  };
}

// State Request Protocol - for late joiners to request current playback state
// Uses NTP-style timestamps (t1, t2, t3, t4) for accurate RTT measurement
export interface StateRequestMessage extends BaseMessageFields {
  type: 'state_request';
  payload: {
    requestId: string;
    t1: number;                  // Client send time (for NTP-style RTT)
    requesterState: {
      hasVideo: boolean;
      videoId?: string;
      lastKnownEpoch: number;
    };
  };
}

export interface StateResponseMessage extends BaseMessageFields {
  type: 'state_response';
  payload: {
    requestId: string;
    t1: number;                  // Original request time (echo back)
    t2: number;                  // Server receive time
    t3: number;                  // Server send time
    videoId: string | null;
    title?: string;
    thumbnail?: string;
    currentTime: number;
    isPlaying: boolean;
    playbackRate: number;
    wallClockAtTime: number;     // Wall clock when currentTime was read
    responderId: string;
    responderTime: number;       // Timestamp when this response was created
    isController: boolean;       // Whether responder has control permission
    epoch: number;               // Current state epoch
  };
}

// Heartbeat - periodic state broadcast from controller
export interface HeartbeatMessage extends BaseMessageFields {
  type: 'heartbeat';
  payload: {
    videoId: string | null;
    currentTime: number;
    isPlaying: boolean;
    playbackRate: number;
    wallClockAtTime: number;     // Wall clock when currentTime was read
    epoch: number;               // Current state epoch
    memberCount: number;         // For quorum detection
    heartbeatSequence: number;   // For loss rate detection
  };
}

// View Change Protocol - for authority handoff (Primary-Backup replication)
export interface ViewChangeMessage extends BaseMessageFields {
  type: 'view_change';
  payload: {
    newViewNumber: number;
    newAuthorityId: string;
    previousAuthorityId: string | null;
    reason: 'AUTHORITY_LEFT' | 'AUTHORITY_TIMEOUT' | 'MANUAL_TRANSFER';
    state: {
      videoId: string | null;
      currentTime: number;
      isPlaying: boolean;
      playbackRate: number;
      epoch: number;
    };
  };
}

export interface ViewChangeAckMessage extends BaseMessageFields {
  type: 'view_change_ack';
  payload: {
    newViewNumber: number;
    newAuthorityId: string;
    accepted: boolean;
    acceptedState?: {
      epoch: number;
      currentTime: number;
    };
  };
}

// Anti-Entropy Protocol - for eventual consistency (Saito & Shapiro 2005)
export interface AntiEntropyMessage extends BaseMessageFields {
  type: 'anti_entropy';
  payload: {
    stateDigest: string;         // Hash of current state for comparison
    epoch: number;
    vectorClock: VectorClock;
  };
}

export interface AntiEntropyResponseMessage extends BaseMessageFields {
  type: 'anti_entropy_response';
  payload: {
    stateDigest: string;
    epoch: number;
    vectorClock: VectorClock;
    missingOperations?: Operation[];
  };
}

// Operation type for operation log (Read-Your-Writes guarantee)
export interface Operation {
  id: string;
  type: 'play' | 'pause' | 'seek' | 'rate' | 'video';
  payload: {
    currentTime?: number;
    playbackRate?: number;
    videoId?: string;
  };
  logicalClock: number;
  vectorClock: VectorClock;
  senderId: string;
  timestamp: number;
}

export type DataStreamMessage =
  | SyncMessage
  | ChatMessage
  | ReactionMessage
  | PermissionMessage
  | ModerationMessage
  | StateRequestMessage
  | StateResponseMessage
  | HeartbeatMessage
  | ViewChangeMessage
  | ViewChangeAckMessage
  | AntiEntropyMessage
  | AntiEntropyResponseMessage;

// ============================================================
// Utility Classes for Distributed Systems Algorithms
// ============================================================

/**
 * Lamport Clock implementation (Lamport 1978)
 * Provides logical time ordering without physical clock synchronization
 */
export class LamportClock {
  private value: number = 0;

  increment(): number {
    return ++this.value;
  }

  update(receivedValue: number): number {
    this.value = Math.max(this.value, receivedValue) + 1;
    return this.value;
  }

  getValue(): number {
    return this.value;
  }

  reset(): void {
    this.value = 0;
  }
}

/**
 * Vector Clock implementation (for concurrent operation detection)
 * Based on Saito & Shapiro (2005) Optimistic Replication
 */
export class VectorClockManager {
  private clock: Map<string, number> = new Map();

  constructor(private localId: string) {
    this.clock.set(localId, 0);
  }

  increment(): VectorClock {
    const current = this.clock.get(this.localId) || 0;
    this.clock.set(this.localId, current + 1);
    return this.toJSON();
  }

  merge(other: VectorClock): VectorClock {
    for (const [id, value] of Object.entries(other)) {
      const current = this.clock.get(id) || 0;
      this.clock.set(id, Math.max(current, value));
    }
    // Increment local after merge
    const local = this.clock.get(this.localId) || 0;
    this.clock.set(this.localId, local + 1);
    return this.toJSON();
  }

  /**
   * Compare two vector clocks
   * Returns: -1 (before), 0 (concurrent), 1 (after)
   */
  compare(other: VectorClock): number {
    let dominated = true;
    let dominates = true;

    const allKeys = new Set([...this.clock.keys(), ...Object.keys(other)]);

    for (const key of allKeys) {
      const local = this.clock.get(key) || 0;
      const remote = other[key] || 0;

      if (local < remote) dominates = false;
      if (local > remote) dominated = false;
    }

    if (dominates && !dominated) return 1;   // this happened after
    if (dominated && !dominates) return -1;  // this happened before
    return 0;                                 // concurrent
  }

  toJSON(): VectorClock {
    return Object.fromEntries(this.clock);
  }

  reset(): void {
    this.clock.clear();
    this.clock.set(this.localId, 0);
  }
}

/**
 * RTT Estimator using NTP-style measurements (RFC 5905)
 * Provides accurate network latency estimation
 */
export class RTTEstimator {
  private samples: number[] = [];
  private readonly MAX_SAMPLES = 8;
  private readonly OUTLIER_THRESHOLD = 2; // Standard deviations

  addSample(t1: number, t2: number, t3: number, t4: number): void {
    // RTT = (t4 - t1) - (t3 - t2)
    // This removes server processing time
    const rtt = (t4 - t1) - (t3 - t2);

    if (rtt > 0 && rtt < 10000) { // Sanity check: max 10 seconds
      this.samples.push(rtt);
      if (this.samples.length > this.MAX_SAMPLES) {
        this.samples.shift();
      }
    }
  }

  getEstimatedRTT(): number {
    if (this.samples.length === 0) return 100; // Default 100ms

    // Filter outliers
    const filtered = this.filterOutliers(this.samples);
    if (filtered.length === 0) return 100;

    // Return median for robustness
    return this.median(filtered);
  }

  getOneWayDelay(): number {
    return this.getEstimatedRTT() / 2;
  }

  calculateClockOffset(t1: number, t2: number, t3: number, t4: number): number {
    // offset = ((t2 - t1) + (t3 - t4)) / 2
    return ((t2 - t1) + (t3 - t4)) / 2;
  }

  private filterOutliers(values: number[]): number[] {
    if (values.length < 3) return values;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    );

    if (stdDev === 0) return values;

    return values.filter(v =>
      Math.abs(v - mean) <= this.OUTLIER_THRESHOLD * stdDev
    );
  }

  private median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  reset(): void {
    this.samples = [];
  }
}

/**
 * Calculate adjusted playback time considering network latency
 * Based on NTP clock offset algorithm
 */
export function calculateAdjustedTime(
  receivedTime: number,
  wallClockAtTime: number,
  receivedAt: number,
  isPlaying: boolean,
  playbackRate: number,
  clockOffset: number = 0
): number {
  // Time elapsed since state was captured
  const elapsedMs = (receivedAt - wallClockAtTime) - clockOffset;
  const elapsedSeconds = Math.max(0, elapsedMs / 1000);

  if (isPlaying) {
    // Video was playing, add elapsed time adjusted for rate
    return receivedTime + (elapsedSeconds * playbackRate);
  }

  // Video was paused, no time elapsed
  return receivedTime;
}

/**
 * Create default base message fields
 */
export function createBaseMessageFields(
  senderId: string,
  lamportClock: LamportClock,
  vectorClock: VectorClockManager,
  sequenceNumber: number,
  viewNumber: number,
  fencingToken?: string
): BaseMessageFields {
  return {
    senderId,
    timestamp: Date.now(),
    logicalClock: lamportClock.increment(),
    vectorClock: vectorClock.increment(),
    sequenceNumber,
    viewNumber,
    fencingToken,
  };
}

