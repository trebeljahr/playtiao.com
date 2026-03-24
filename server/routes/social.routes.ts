import express, { Request, Response } from "express";
import mongoose from "mongoose";
import {
  GameInvitationSummary,
  SocialOverview,
  SocialPlayerSummary,
  SocialSearchRelationship,
  SocialSearchResult,
} from "../../shared/src";
import { GameServiceError, gameService } from "../game/gameService";
import { getPlayerFromRequest } from "../game/playerTokens";
import GameAccount, { IGameAccount } from "../models/GameAccount";
import GameInvitation from "../models/GameInvitation";

const router = express.Router();

function isDatabaseReady(): boolean {
  return mongoose.connection.readyState === 1;
}

function containsAccountId(
  accountIds: ReadonlyArray<{ toString(): string }>,
  targetId: string
): boolean {
  return accountIds.some((accountId) => accountId.toString() === targetId);
}

function removeAccountId<T extends { toString(): string }>(
  accountIds: ReadonlyArray<T>,
  targetId: string
) {
  return accountIds.filter((accountId) => accountId.toString() !== targetId);
}

function toSocialPlayerSummary(
  account: {
    id?: string;
    _id?: unknown;
    displayName: string;
    profilePicture?: string;
    email?: string;
  },
  options: {
    includeEmail?: boolean;
  } = {}
): SocialPlayerSummary {
  return {
    playerId: account.id ?? (account._id ? String(account._id) : ""),
    displayName: account.displayName,
    profilePicture: account.profilePicture,
    ...(options.includeEmail ? { email: account.email } : {}),
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function expireStaleInvitations() {
  await GameInvitation.updateMany(
    {
      status: "pending",
      expiresAt: {
        $lte: new Date(),
      },
    },
    {
      $set: {
        status: "expired",
      },
    }
  );
}

async function requireAccount(req: Request, res: Response) {
  if (!isDatabaseReady()) {
    res.status(503).json({
      message:
        "Account social features are unavailable right now. You can still play as a guest.",
    });
    return null;
  }

  const player = getPlayerFromRequest(req);
  if (!player) {
    res.status(401).json({
      message: "Not authenticated.",
    });
    return null;
  }

  if (player.kind !== "account") {
    res.status(403).json({
      message: "Sign in with an account to use friends and invitations.",
    });
    return null;
  }

  const account = await GameAccount.findById(player.playerId);
  if (!account) {
    res.status(404).json({
      message: "That account could not be found.",
    });
    return null;
  }

  return account;
}

function getSearchRelationship(
  account: IGameAccount,
  targetId: string
): SocialSearchRelationship {
  if (containsAccountId(account.friends, targetId)) {
    return "friend";
  }

  if (containsAccountId(account.receivedFriendRequests, targetId)) {
    return "incoming-request";
  }

  if (containsAccountId(account.sentFriendRequests, targetId)) {
    return "outgoing-request";
  }

  return "none";
}

async function loadAccountsById(accountIds: ReadonlyArray<{ toString(): string }>) {
  const normalizedIds = accountIds.map((accountId) => accountId.toString());
  if (normalizedIds.length === 0) {
    return [];
  }

  const accounts = await GameAccount.find({
    _id: {
      $in: normalizedIds,
    },
  })
    .sort({ displayName: 1 })
    .lean<IGameAccount[]>()
    .exec();

  return accounts.map((account) => toSocialPlayerSummary(account));
}

async function loadInvitationSummaries(
  filter: Record<string, unknown>
): Promise<GameInvitationSummary[]> {
  const invitations = await GameInvitation.find(filter)
    .populate("senderId", "displayName profilePicture email")
    .populate("recipientId", "displayName profilePicture email")
    .sort({ createdAt: -1 })
    .exec();

  return invitations.map((invitation) => {
    const sender = invitation.senderId as unknown as IGameAccount;
    const recipient = invitation.recipientId as unknown as IGameAccount;

    return {
      id: invitation.id,
      gameId: invitation.gameId,
      roomType: invitation.roomType,
      createdAt: invitation.createdAt.toISOString(),
      expiresAt: invitation.expiresAt.toISOString(),
      sender: toSocialPlayerSummary(sender),
      recipient: toSocialPlayerSummary(recipient),
    };
  });
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

router.get("/player/social/overview", async (req: Request, res: Response) => {
  const account = await requireAccount(req, res);
  if (!account) {
    return;
  }

  await expireStaleInvitations();

  const [friends, incomingFriendRequests, outgoingFriendRequests] =
    await Promise.all([
      loadAccountsById(account.friends),
      loadAccountsById(account.receivedFriendRequests),
      loadAccountsById(account.sentFriendRequests),
    ]);

  const [incomingInvitations, outgoingInvitations] = await Promise.all([
    loadInvitationSummaries({
      recipientId: account._id,
      status: "pending",
      expiresAt: {
        $gt: new Date(),
      },
    }),
    loadInvitationSummaries({
      senderId: account._id,
      status: "pending",
      expiresAt: {
        $gt: new Date(),
      },
    }),
  ]);

  const overview: SocialOverview = {
    friends,
    incomingFriendRequests,
    outgoingFriendRequests,
    incomingInvitations,
    outgoingInvitations,
  };

  return res.status(200).json({ overview });
});

router.get("/player/social/search", async (req: Request, res: Response) => {
  const account = await requireAccount(req, res);
  if (!account) {
    return;
  }

  const query = String(req.query.q ?? "").trim();
  if (query.length < 2) {
    return res.status(400).json({
      message: "Search with at least 2 characters.",
    });
  }

  const normalizedQuery = query.toLowerCase();
  const matcher = query.includes("@")
    ? {
        email: normalizedQuery,
      }
    : {
        displayName: {
          $regex: escapeRegExp(query),
          $options: "i",
        },
      };

  const accounts = await GameAccount.find({
    _id: {
      $ne: account._id,
    },
    ...matcher,
  })
    .sort({ displayName: 1 })
    .limit(8)
    .lean<IGameAccount[]>()
    .exec();

  const results: SocialSearchResult[] = accounts.map((result) => ({
    player: toSocialPlayerSummary(result, { includeEmail: true }),
    relationship: getSearchRelationship(account, String(result._id)),
  }));

  return res.status(200).json({ results });
});

router.post("/player/social/friend-requests", async (req: Request, res: Response) => {
  const account = await requireAccount(req, res);
  if (!account) {
    return;
  }

  const { accountId } = req.body as {
    accountId?: string;
  };

  if (!accountId) {
    return res.status(400).json({
      message: "Choose a player to add.",
    });
  }

  if (account.id === accountId) {
    return res.status(400).json({
      message: "You cannot add yourself as a friend.",
    });
  }

  const targetAccount = await GameAccount.findById(accountId);
  if (!targetAccount) {
    return res.status(404).json({
      message: "That player could not be found.",
    });
  }

  if (
    containsAccountId(account.friends, targetAccount.id) ||
    containsAccountId(targetAccount.friends, account.id)
  ) {
    return res.status(409).json({
      message: "You are already friends.",
    });
  }

  if (
    containsAccountId(account.sentFriendRequests, targetAccount.id) ||
    containsAccountId(account.receivedFriendRequests, targetAccount.id)
  ) {
    return res.status(409).json({
      message: "There is already a pending request between you.",
    });
  }

  account.sentFriendRequests.push(targetAccount._id);
  targetAccount.receivedFriendRequests.push(account._id);

  await Promise.all([account.save(), targetAccount.save()]);

  return res.status(200).json({
    message: "Friend request sent.",
  });
});

router.post(
  "/player/social/friend-requests/:accountId/accept",
  async (req: Request, res: Response) => {
    const account = await requireAccount(req, res);
    if (!account) {
      return;
    }

    const requesterId = req.params.accountId;
    const requester = await GameAccount.findById(requesterId);

    if (!requester) {
      return res.status(404).json({
        message: "That player could not be found.",
      });
    }

    if (!containsAccountId(account.receivedFriendRequests, requester.id)) {
      return res.status(400).json({
        message: "No pending friend request from that player.",
      });
    }

    account.receivedFriendRequests = removeAccountId(
      account.receivedFriendRequests,
      requester.id
    ) as mongoose.Types.ObjectId[];
    requester.sentFriendRequests = removeAccountId(
      requester.sentFriendRequests,
      account.id
    ) as mongoose.Types.ObjectId[];

    if (!containsAccountId(account.friends, requester.id)) {
      account.friends.push(requester._id);
    }

    if (!containsAccountId(requester.friends, account.id)) {
      requester.friends.push(account._id);
    }

    await Promise.all([account.save(), requester.save()]);

    return res.status(200).json({
      message: "Friend request accepted.",
    });
  }
);

router.post(
  "/player/social/friend-requests/:accountId/decline",
  async (req: Request, res: Response) => {
    const account = await requireAccount(req, res);
    if (!account) {
      return;
    }

    const requesterId = req.params.accountId;
    const requester = await GameAccount.findById(requesterId);

    if (!requester) {
      return res.status(404).json({
        message: "That player could not be found.",
      });
    }

    if (!containsAccountId(account.receivedFriendRequests, requester.id)) {
      return res.status(400).json({
        message: "No pending friend request from that player.",
      });
    }

    account.receivedFriendRequests = removeAccountId(
      account.receivedFriendRequests,
      requester.id
    ) as mongoose.Types.ObjectId[];
    requester.sentFriendRequests = removeAccountId(
      requester.sentFriendRequests,
      account.id
    ) as mongoose.Types.ObjectId[];

    await Promise.all([account.save(), requester.save()]);

    return res.status(200).json({
      message: "Friend request declined.",
    });
  }
);

router.post(
  "/player/social/friend-requests/:accountId/cancel",
  async (req: Request, res: Response) => {
    const account = await requireAccount(req, res);
    if (!account) {
      return;
    }

    const targetId = req.params.accountId;
    const targetAccount = await GameAccount.findById(targetId);

    if (!targetAccount) {
      return res.status(404).json({
        message: "That player could not be found.",
      });
    }

    if (!containsAccountId(account.sentFriendRequests, targetAccount.id)) {
      return res.status(400).json({
        message: "No outgoing request to that player.",
      });
    }

    account.sentFriendRequests = removeAccountId(
      account.sentFriendRequests,
      targetAccount.id
    ) as mongoose.Types.ObjectId[];
    targetAccount.receivedFriendRequests = removeAccountId(
      targetAccount.receivedFriendRequests,
      account.id
    ) as mongoose.Types.ObjectId[];

    await Promise.all([account.save(), targetAccount.save()]);

    return res.status(200).json({
      message: "Friend request cancelled.",
    });
  }
);

router.post("/player/social/game-invitations", async (req: Request, res: Response) => {
  const account = await requireAccount(req, res);
  if (!account) {
    return;
  }

  const {
    gameId,
    recipientId,
    expiresInMinutes,
  } = req.body as {
    gameId?: string;
    recipientId?: string;
    expiresInMinutes?: number;
  };

  if (!gameId || !recipientId) {
    return res.status(400).json({
      message: "Choose a game and friend to invite.",
    });
  }

  if (!expiresInMinutes || expiresInMinutes < 5 || expiresInMinutes > 10080) {
    return res.status(400).json({
      message: "Pick an invitation duration between 5 minutes and 7 days.",
    });
  }

  const recipient = await GameAccount.findById(recipientId);
  if (!recipient) {
    return res.status(404).json({
      message: "That friend could not be found.",
    });
  }

  if (!containsAccountId(account.friends, recipient.id)) {
    return res.status(403).json({
      message: "You can only invite people from your friends list.",
    });
  }

  try {
    const snapshot = await gameService.getSnapshot(gameId);
    const isPlayerInRoom = snapshot.players.some(
      (slot) => slot.player.playerId === account.id
    );

    if (!isPlayerInRoom) {
      return res.status(403).json({
        message: "Join the room before inviting a friend.",
      });
    }

    if (snapshot.status === "finished") {
      return res.status(409).json({
        message: "Finished games cannot receive new invitations.",
      });
    }

    if (
      snapshot.players.some((slot) => slot.player.playerId === recipient.id)
    ) {
      return res.status(409).json({
        message: "That friend is already in the room.",
      });
    }

    await expireStaleInvitations();

    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    const existingInvitation = await GameInvitation.findOne({
      gameId: snapshot.gameId,
      senderId: account._id,
      recipientId: recipient._id,
      status: "pending",
      expiresAt: {
        $gt: new Date(),
      },
    });

    if (existingInvitation) {
      existingInvitation.expiresAt = expiresAt;
      existingInvitation.roomType = snapshot.roomType;
      await existingInvitation.save();

      return res.status(200).json({
        message: "Invitation updated.",
      });
    }

    await GameInvitation.create({
      gameId: snapshot.gameId,
      roomType: snapshot.roomType,
      senderId: account._id,
      recipientId: recipient._id,
      expiresAt,
      status: "pending",
    });

    return res.status(201).json({
      message: "Invitation sent.",
    });
  } catch (error) {
    return respondWithGameServiceError(
      res,
      error,
      "Unable to create that invitation right now."
    );
  }
});

router.post(
  "/player/social/game-invitations/:invitationId/revoke",
  async (req: Request, res: Response) => {
    const account = await requireAccount(req, res);
    if (!account) {
      return;
    }

    const invitation = await GameInvitation.findOne({
      _id: req.params.invitationId,
      senderId: account._id,
      status: "pending",
      expiresAt: {
        $gt: new Date(),
      },
    });

    if (!invitation) {
      return res.status(404).json({
        message: "That invitation is no longer active.",
      });
    }

    invitation.status = "revoked";
    await invitation.save();

    return res.status(200).json({
      message: "Invitation revoked.",
    });
  }
);

export default router;
