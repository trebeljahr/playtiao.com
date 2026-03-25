import express, { Request, Response } from "express";
import mongoose from "mongoose";
import { gameService, GameServiceError } from "../game/gameService";
import { getPlayerFromRequest } from "../game/playerTokens";
import GameInvitation from "../models/GameInvitation";

const router = express.Router();

async function getAuthenticatedPlayer(req: Request, res: Response) {
  const player = await getPlayerFromRequest(req);
  if (!player) {
    res.status(401).json({
      message: "Authenticate as a guest or account before using multiplayer.",
    });
    return null;
  }

  return player;
}

function respondWithGameServiceError(
  res: Response,
  error: unknown,
  fallbackMessage: string
) {
  if (error instanceof GameServiceError) {
    return res.status(error.status).json({
      code: error.code,
      message: error.message,
    });
  }

  return res.status(500).json({
    message: fallbackMessage,
  });
}

async function acceptPendingInvitationsForPlayer(
  gameId: string,
  playerId: string
) {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  await GameInvitation.updateMany(
    {
      gameId: gameId.trim().toUpperCase(),
      recipientId: playerId,
      status: "pending",
      expiresAt: {
        $gt: new Date(),
      },
    },
    {
      $set: {
        status: "accepted",
      },
    }
  );
}

router.get("/games", async (req: Request, res: Response) => {
  const player = await getAuthenticatedPlayer(req, res);
  if (!player) {
    return;
  }

  try {
    const games = await gameService.listGames(player);
    return res.status(200).json({ games });
  } catch (error) {
    return respondWithGameServiceError(
      res,
      error,
      "Unable to load your multiplayer games right now."
    );
  }
});

router.post("/games", async (req: Request, res: Response) => {
  const player = await getAuthenticatedPlayer(req, res);
  if (!player) {
    return;
  }

  try {
    const snapshot = await gameService.createGame(player);
    return res.status(201).json({ snapshot });
  } catch (error) {
    return respondWithGameServiceError(
      res,
      error,
      "Unable to create a multiplayer game right now."
    );
  }
});

router.post("/games/:gameId/join", async (req: Request, res: Response) => {
  const player = await getAuthenticatedPlayer(req, res);
  if (!player) {
    return;
  }

  try {
    const snapshot = await gameService.joinGame(req.params.gameId, player);
    return res.status(200).json({ snapshot });
  } catch (error) {
    return respondWithGameServiceError(
      res,
      error,
      "Unable to join that game right now."
    );
  }
});

router.post("/games/:gameId/access", async (req: Request, res: Response) => {
  const player = await getAuthenticatedPlayer(req, res);
  if (!player) {
    return;
  }

  try {
    const snapshot = await gameService.accessGame(req.params.gameId, player);

    if (player.kind === "account") {
      await acceptPendingInvitationsForPlayer(snapshot.gameId, player.playerId);
    }

    return res.status(200).json({ snapshot });
  } catch (error) {
    return respondWithGameServiceError(
      res,
      error,
      "Unable to open that game right now."
    );
  }
});

router.get("/games/:gameId", async (req: Request, res: Response) => {
  const player = await getAuthenticatedPlayer(req, res);
  if (!player) {
    return;
  }

  try {
    const snapshot = await gameService.getSnapshot(req.params.gameId);
    return res.status(200).json({ snapshot });
  } catch (error) {
    return respondWithGameServiceError(
      res,
      error,
      "Unable to load that game right now."
    );
  }
});

router.post("/matchmaking", async (req: Request, res: Response) => {
  const player = await getAuthenticatedPlayer(req, res);
  if (!player) {
    return;
  }

  try {
    const matchmaking = await gameService.enterMatchmaking(player);
    return res.status(200).json({ matchmaking });
  } catch (error) {
    return respondWithGameServiceError(
      res,
      error,
      "Unable to enter matchmaking right now."
    );
  }
});

router.get("/matchmaking", async (req: Request, res: Response) => {
  const player = await getAuthenticatedPlayer(req, res);
  if (!player) {
    return;
  }

  try {
    const matchmaking = await gameService.getMatchmakingState(player);
    return res.status(200).json({ matchmaking });
  } catch (error) {
    return respondWithGameServiceError(
      res,
      error,
      "Unable to load matchmaking right now."
    );
  }
});

router.delete("/matchmaking", async (req: Request, res: Response) => {
  const player = await getAuthenticatedPlayer(req, res);
  if (!player) {
    return;
  }

  try {
    await gameService.leaveMatchmaking(player);
    return res.status(204).send();
  } catch (error) {
    return respondWithGameServiceError(
      res,
      error,
      "Unable to leave matchmaking right now."
    );
  }
});

router.post("/:gameId/test-finish", async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ message: "Not allowed in production." });
  }

  const { gameId } = req.params;
  const { winner } = req.body as { winner: "white" | "black" };

  try {
    await gameService.testForceFinishGame(gameId, winner);
    res.status(200).json({ message: "Game finished." });
  } catch (error) {
    res.status(500).json({ message: "Failed to finish game." });
  }
});

export default router;
