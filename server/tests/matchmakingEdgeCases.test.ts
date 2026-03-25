import assert from "node:assert/strict";
import { test } from "node:test";
import type { PlayerIdentity } from "../../shared/src";
import { GameService, GameServiceError } from "../game/gameService";
import { InMemoryGameRoomStore } from "../game/gameStore";

function createPlayer(
  playerId: string,
  options: Partial<PlayerIdentity> = {}
): PlayerIdentity {
  return {
    playerId,
    displayName: options.displayName ?? playerId,
    kind: options.kind ?? "account",
    email: options.email,
    profilePicture: options.profilePicture,
  };
}

function isGameServiceError(
  error: unknown,
  code: string
): error is GameServiceError {
  return error instanceof GameServiceError && error.code === code;
}

test("entering matchmaking twice returns searching status", async () => {
  const store = new InMemoryGameRoomStore();
  const service = new GameService(store, () => 0);
  const alice = createPlayer("alice");

  const first = await service.enterMatchmaking(alice);
  assert.equal(first.status, "searching");

  const second = await service.enterMatchmaking(alice);
  assert.equal(second.status, "searching");
});

test("leave matchmaking removes player from queue", async () => {
  const store = new InMemoryGameRoomStore();
  const service = new GameService(store, () => 0);
  const alice = createPlayer("alice");

  await service.enterMatchmaking(alice);
  await service.leaveMatchmaking(alice);

  const state = await service.getMatchmakingState(alice);
  assert.equal(state.status, "idle");
});

test("leave matchmaking clears matched state", async () => {
  const store = new InMemoryGameRoomStore();
  const service = new GameService(store, () => 0);
  const alice = createPlayer("alice");
  const bob = createPlayer("bob");

  await service.enterMatchmaking(alice);
  const matched = await service.enterMatchmaking(bob);
  assert.equal(matched.status, "matched");

  // Alice was matched - leave matchmaking should clear state
  await service.leaveMatchmaking(alice);
  const state = await service.getMatchmakingState(alice);
  assert.equal(state.status, "idle");
});

test("guest player with active game cannot enter matchmaking", async () => {
  const store = new InMemoryGameRoomStore();
  const service = new GameService(store, () => 0);
  const guest = createPlayer("guest-mm", { kind: "guest" });
  const host = createPlayer("host");

  // Create an active game for the guest
  const game = await service.createGame(guest);
  await service.joinGame(game.gameId, host);

  // Guest should not be able to enter matchmaking
  await assert.rejects(
    () => service.enterMatchmaking(guest),
    (error) => isGameServiceError(error, "GUEST_ACTIVE_GAME_LIMIT")
  );
});

test("matchmaking creates room with matchmaking type", async () => {
  const store = new InMemoryGameRoomStore();
  const service = new GameService(store, () => 0);
  const alice = createPlayer("alice");
  const bob = createPlayer("bob");

  await service.enterMatchmaking(alice);
  const result = await service.enterMatchmaking(bob);

  assert.equal(result.status, "matched");
  if (result.status === "matched") {
    assert.equal(result.snapshot.roomType, "matchmaking");
    assert.equal(result.snapshot.status, "active");
    assert.equal(result.snapshot.players.length, 2);
  }
});

test("matchmaking state for unqueued player is idle", async () => {
  const store = new InMemoryGameRoomStore();
  const service = new GameService(store, () => 0);
  const alice = createPlayer("alice");

  const state = await service.getMatchmakingState(alice);
  assert.equal(state.status, "idle");
});

test("three players matchmaking pairs first two", async () => {
  const store = new InMemoryGameRoomStore();
  const service = new GameService(store, () => 0);
  const alice = createPlayer("alice");
  const bob = createPlayer("bob");
  const carol = createPlayer("carol");

  const first = await service.enterMatchmaking(alice);
  assert.equal(first.status, "searching");

  const second = await service.enterMatchmaking(bob);
  assert.equal(second.status, "matched");

  // Carol enters after Alice and Bob are matched
  const third = await service.enterMatchmaking(carol);
  assert.equal(third.status, "searching");
});

test("leave matchmaking when not in queue is a no-op", async () => {
  const store = new InMemoryGameRoomStore();
  const service = new GameService(store, () => 0);
  const alice = createPlayer("alice");

  // Should not throw
  await service.leaveMatchmaking(alice);
  const state = await service.getMatchmakingState(alice);
  assert.equal(state.status, "idle");
});
