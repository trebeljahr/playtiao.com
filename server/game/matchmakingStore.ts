import type Redis from "ioredis";
import type { PlayerIdentity, TimeControl } from "../../shared/src";

export type MatchmakingQueueEntry = {
  player: PlayerIdentity;
  queuedAt: number;
  timeControl: TimeControl;
};

export interface MatchmakingStore {
  findEntry(playerId: string): Promise<MatchmakingQueueEntry | null>;
  findAndRemoveOpponent(
    playerId: string,
    timeControl: TimeControl
  ): Promise<MatchmakingQueueEntry | null>;
  addToQueue(entry: MatchmakingQueueEntry): Promise<void>;
  removeFromQueue(playerId: string): Promise<void>;
  setMatch(playerId: string, gameId: string): Promise<void>;
  getMatch(playerId: string): Promise<string | null>;
  deleteMatch(playerId: string): Promise<void>;
}

function timeControlsMatch(a: TimeControl, b: TimeControl): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.initialMs === b.initialMs && a.incrementMs === b.incrementMs;
}

/**
 * In-memory matchmaking for single-instance deployments.
 */
export class InMemoryMatchmakingStore implements MatchmakingStore {
  private readonly queue: MatchmakingQueueEntry[] = [];
  private readonly matches = new Map<string, string>();

  async findEntry(playerId: string): Promise<MatchmakingQueueEntry | null> {
    return (
      this.queue.find((e) => e.player.playerId === playerId) ?? null
    );
  }

  async findAndRemoveOpponent(
    playerId: string,
    timeControl: TimeControl
  ): Promise<MatchmakingQueueEntry | null> {
    const index = this.queue.findIndex(
      (e) =>
        e.player.playerId !== playerId &&
        timeControlsMatch(e.timeControl, timeControl)
    );

    if (index < 0) return null;
    return this.queue.splice(index, 1)[0];
  }

  async addToQueue(entry: MatchmakingQueueEntry): Promise<void> {
    this.queue.push(entry);
  }

  async removeFromQueue(playerId: string): Promise<void> {
    const index = this.queue.findIndex(
      (e) => e.player.playerId === playerId
    );
    if (index >= 0) this.queue.splice(index, 1);
  }

  async setMatch(playerId: string, gameId: string): Promise<void> {
    this.matches.set(playerId, gameId);
  }

  async getMatch(playerId: string): Promise<string | null> {
    return this.matches.get(playerId) ?? null;
  }

  async deleteMatch(playerId: string): Promise<void> {
    this.matches.delete(playerId);
  }
}

const QUEUE_KEY = "tiao:matchmaking:queue";
const MATCH_PREFIX = "tiao:matchmaking:match:";
const MATCH_TTL_SECONDS = 300;

/**
 * Redis-backed matchmaking for multi-instance deployments.
 * Queue uses a Sorted Set (score = queuedAt). Matches use String + TTL.
 */
export class RedisMatchmakingStore implements MatchmakingStore {
  constructor(private readonly redis: Redis) {}

  async findEntry(playerId: string): Promise<MatchmakingQueueEntry | null> {
    const members = await this.redis.zrange(QUEUE_KEY, 0, -1);
    for (const raw of members) {
      const entry = JSON.parse(raw) as MatchmakingQueueEntry;
      if (entry.player.playerId === playerId) return entry;
    }
    return null;
  }

  async findAndRemoveOpponent(
    playerId: string,
    timeControl: TimeControl
  ): Promise<MatchmakingQueueEntry | null> {
    // Scan oldest-first for a matching opponent
    const members = await this.redis.zrange(QUEUE_KEY, 0, -1);
    for (const raw of members) {
      const entry = JSON.parse(raw) as MatchmakingQueueEntry;
      if (
        entry.player.playerId !== playerId &&
        timeControlsMatch(entry.timeControl, timeControl)
      ) {
        const removed = await this.redis.zrem(QUEUE_KEY, raw);
        if (removed > 0) return entry;
      }
    }
    return null;
  }

  async addToQueue(entry: MatchmakingQueueEntry): Promise<void> {
    await this.redis.zadd(QUEUE_KEY, entry.queuedAt, JSON.stringify(entry));
  }

  async removeFromQueue(playerId: string): Promise<void> {
    const members = await this.redis.zrange(QUEUE_KEY, 0, -1);
    for (const raw of members) {
      const entry = JSON.parse(raw) as MatchmakingQueueEntry;
      if (entry.player.playerId === playerId) {
        await this.redis.zrem(QUEUE_KEY, raw);
        return;
      }
    }
  }

  async setMatch(playerId: string, gameId: string): Promise<void> {
    await this.redis.set(
      `${MATCH_PREFIX}${playerId}`,
      gameId,
      "EX",
      MATCH_TTL_SECONDS
    );
  }

  async getMatch(playerId: string): Promise<string | null> {
    return this.redis.get(`${MATCH_PREFIX}${playerId}`);
  }

  async deleteMatch(playerId: string): Promise<void> {
    await this.redis.del(`${MATCH_PREFIX}${playerId}`);
  }
}
