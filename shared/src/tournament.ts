import type { FinishReason, TimeControl } from "./protocol";
import type { PlayerColor } from "./tiao";

// ── Format & Status ──

export type TournamentFormat = "round-robin" | "single-elimination" | "groups-knockout";

export type TournamentStatus = "draft" | "registration" | "active" | "finished" | "cancelled";

export type SchedulingMode = "simultaneous" | "time-window";

export type NoShowPolicy = { type: "auto-forfeit"; timeoutMs: number } | { type: "admin-decides" };

export type TournamentVisibility = "public" | "private";

// ── Settings ──

export type TournamentSettings = {
  format: TournamentFormat;
  timeControl: TimeControl;
  scheduling: SchedulingMode;
  noShow: NoShowPolicy;
  visibility: TournamentVisibility;
  minPlayers: number;
  maxPlayers: number;
  /** Group size for groups-knockout format (3 or 4) */
  groupSize?: number;
  /** How many advance per group (default: top half) */
  advancePerGroup?: number;
  /** Required to join a private tournament */
  inviteCode?: string;
};

// ── Participant ──

export type TournamentParticipantStatus = "registered" | "eliminated" | "active" | "winner";

export type TournamentParticipant = {
  playerId: string;
  /** Resolved dynamically from identity cache — optional in DB. */
  displayName?: string;
  profilePicture?: string;
  activeBadges?: string[];
  rating?: number;
  seed: number;
  status: TournamentParticipantStatus;
};

// ── Match ──

export type TournamentMatchStatus = "pending" | "active" | "finished" | "forfeit" | "bye";

export type TournamentMatchPlayer = {
  playerId: string;
  /** Resolved dynamically from identity cache — optional in DB. */
  displayName?: string;
  profilePicture?: string;
  activeBadges?: string[];
  rating?: number;
  seed: number;
};

export type TournamentMatch = {
  matchId: string;
  roundIndex: number;
  matchIndex: number;
  groupId?: string;
  players: [TournamentMatchPlayer | null, TournamentMatchPlayer | null];
  roomId: string | null;
  winner: string | null;
  score: [number, number];
  status: TournamentMatchStatus;
  finishReason?: FinishReason | null;
  historyLength?: number;
  /** Color each player slot was assigned: [player0Color, player1Color] */
  playerColors?: [PlayerColor | null, PlayerColor | null];
  scheduledAt?: string;
  deadline?: string;
};

// ── Round ──

export type TournamentRoundStatus = "pending" | "active" | "finished";

export type TournamentRound = {
  roundIndex: number;
  label: string;
  matches: TournamentMatch[];
  status: TournamentRoundStatus;
};

// ── Group ──

export type TournamentGroupStanding = {
  playerId: string;
  /** Resolved dynamically from identity cache — optional in DB. */
  displayName?: string;
  profilePicture?: string;
  activeBadges?: string[];
  rating?: number;
  seed: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  scoreDiff: number;
};

export type TournamentGroup = {
  groupId: string;
  label: string;
  participantIds: string[];
  rounds: TournamentRound[];
  standings: TournamentGroupStanding[];
};

// ── Snapshot (full tournament state for clients) ──

/** Player identity data resolved from the server's identity cache. */
export type TournamentPlayerIdentity = {
  displayName: string;
  profilePicture?: string;
  rating?: number;
  activeBadges?: string[];
};

export type TournamentSnapshot = {
  tournamentId: string;
  name: string;
  description?: string;
  creatorId: string;
  status: TournamentStatus;
  settings: TournamentSettings;
  participants: TournamentParticipant[];
  /** Elimination bracket rounds (or all rounds for round-robin) */
  rounds: TournamentRound[];
  /** Groups (only for groups-knockout format) */
  groups: TournamentGroup[];
  /** Knockout rounds after group stage (only for groups-knockout) */
  knockoutRounds: TournamentRound[];
  featuredMatchId: string | null;
  /** Pinned by a site admin; surfaces at the top of the lobby tournament list. */
  isFeatured: boolean;
  /** Identity map: playerId → resolved identity. Use this for display names/pictures. */
  playerIdentities: Record<string, TournamentPlayerIdentity>;
  createdAt: string;
  updatedAt: string;
};

// ── List item (summary for browse views) ──

export type TournamentListItem = {
  tournamentId: string;
  name: string;
  creatorId: string;
  creatorDisplayName: string;
  status: TournamentStatus;
  format: TournamentFormat;
  visibility: TournamentVisibility;
  playerCount: number;
  maxPlayers: number;
  timeControl: TimeControl;
  isFeatured: boolean;
  createdAt: string;
};

// ── Lobby WebSocket messages ──

export type TournamentLobbyMessage =
  | {
      type: "tournament-update";
      tournamentId: string;
    }
  | {
      type: "tournament-match-ready";
      tournamentId: string;
      matchId: string;
      roomId: string;
    }
  | {
      type: "tournament-round-complete";
      tournamentId: string;
      roundIndex: number;
    }
  | {
      type: "tournament-list-update";
    };

// ── "My next match" response ──

/**
 * Server's decision about what should happen when a player clicks "next match"
 * after a tournament game ends (or navigates back to the tournament).
 *
 * - `ready` — their next match exists and has a room. Go straight into it.
 * - `waiting` — their next match is blocked waiting for other results. If
 *   `watchRoomId` is set, we can drop them into that match as a spectator
 *   so they have something to watch while they wait. If not, they should
 *   land on the tournament page with a "waiting" banner.
 * - `done` — the tournament is over for this player (they won, were
 *   eliminated, or all their games are finished).
 * - `not-participant` — the caller isn't registered in this tournament.
 */
export type MyNextMatchResult =
  | { state: "ready"; roomId: string; matchId: string }
  | {
      state: "waiting";
      /** A match to spectate while waiting, if one exists. */
      watchRoomId: string | null;
      watchMatchId: string | null;
      /** Short label describing what we're waiting on (e.g. "Round 2 match 3"). */
      waitingOnLabel: string;
    }
  | { state: "done"; outcome: "winner" | "eliminated" | "finished" }
  | { state: "not-participant" };

// ── Pending tournament match (for sticky notifications) ──

/**
 * A tournament match that is currently live for the player but which they
 * haven't joined yet. Used by the sticky notification system to re-surface
 * a "your match is ready" toast on every page until they actually enter the
 * game.
 */
export type PendingTournamentMatch = {
  tournamentId: string;
  tournamentName: string;
  matchId: string;
  roomId: string;
  opponentPlayerId: string | null;
  opponentDisplayName: string | null;
};
