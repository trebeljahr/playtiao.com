import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import express, { Request, Response } from "express";
import { Jimp } from "jimp";
import mongoose from "mongoose";
import GameAccount from "../models/GameAccount";
import {
  clearPlayerSession,
  commitPlayerSession,
  createAccountAuth,
  createGuestAuth,
  deriveDisplayNameFromEmail,
  getPlayerFromRequest,
  refreshPlayerSession,
  sanitizeDisplayName,
} from "../game/playerTokens";
import { BUCKET_NAME, CLOUDFRONT_URL } from "../config/envVars";
import { s3Client } from "../config/s3Client";
import { multerUploadMiddleware } from "../middleware/multerUploadMiddleware";

const router = express.Router();
const saltRounds = 10;

function isDatabaseReady(): boolean {
  return mongoose.connection.readyState === 1;
}

function buildAccountAuth(account: {
  id: string;
  email?: string;
  displayName: string;
  profilePicture?: string;
}) {
  return createAccountAuth({
    id: account.id,
    email: account.email,
    displayName: account.displayName,
    profilePicture: account.profilePicture,
  });
}

function serializeAccountProfile(account: {
  displayName: string;
  email?: string;
  profilePicture?: string;
  hasSeenTutorial?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    displayName: account.displayName,
    email: account.email,
    profilePicture: account.profilePicture,
    hasSeenTutorial: account.hasSeenTutorial ?? false,
    createdAt: account.createdAt?.toISOString(),
    updatedAt: account.updatedAt?.toISOString(),
  };
}

async function requireAccount(req: Request, res: Response) {
  if (!isDatabaseReady()) {
    res.status(503).json({
      message:
        "Account features are unavailable right now. You can still keep playing as a guest.",
    });
    return null;
  }

  const player = await getPlayerFromRequest(req);
  if (!player) {
    res.status(401).json({
      message: "Not authenticated.",
    });
    return null;
  }

  if (player.kind !== "account") {
    res.status(403).json({
      message: "Only account players can edit a server profile.",
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

router.post("/guest", async (req: Request, res: Response) => {
  const { displayName } = req.body as {
    displayName?: string;
  };

  const auth = createGuestAuth(displayName);
  await commitPlayerSession(req, res, auth.player);
  res.status(201).json(auth);
});

router.post("/signup", async (req: Request, res: Response) => {
  if (!isDatabaseReady()) {
    return res.status(503).json({
      message:
        "Account signup is unavailable right now. You can still keep playing as a guest.",
    });
  }

  const { email, password, displayName } = req.body as {
    email?: string;
    password?: string;
    displayName?: string;
  };

  const normalizedEmail = email?.trim().toLowerCase();
  const trimmedDisplayName = displayName?.trim();

  if (!password || (!normalizedEmail && !trimmedDisplayName)) {
    return res.status(400).json({
      message: "Provide a username or email address, and a password.",
    });
  }

  if (normalizedEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Provide a valid email address.",
      });
    }

    const existingAccountByEmail = await GameAccount.findOne({
      email: normalizedEmail,
    });

    if (existingAccountByEmail) {
      return res.status(409).json({
        message: "An account with that email already exists.",
      });
    }
  }

  if (trimmedDisplayName) {
    if (trimmedDisplayName.length < 3) {
      return res.status(400).json({
        message: "Usernames must be at least 3 characters long.",
      });
    }

    const existingAccountByDisplayName = await GameAccount.findOne({
      displayName: trimmedDisplayName,
    });

    if (existingAccountByDisplayName) {
      return res.status(409).json({
        message: "That username is already taken.",
      });
    }
  }

  if (password.length < 8) {
    return res.status(400).json({
      message: "Passwords must be at least 8 characters long.",
    });
  }

  const passwordHash = bcrypt.hashSync(password, saltRounds);
  const account = await GameAccount.create({
    email: normalizedEmail || undefined,
    passwordHash,
    displayName: trimmedDisplayName || (normalizedEmail ? deriveDisplayNameFromEmail(normalizedEmail) : `Player-${randomUUID().slice(0, 8)}`),
  });

  const auth = buildAccountAuth(account);
  await commitPlayerSession(req, res, auth.player);
  return res.status(201).json(auth);
});

router.post("/login", async (req: Request, res: Response) => {
  if (!isDatabaseReady()) {
    return res.status(503).json({
      message:
        "Account login is unavailable right now. You can still keep playing as a guest.",
    });
  }

  const { identifier, password } = req.body as {
    identifier?: string;
    password?: string;
  };

  if (!identifier || !password) {
    return res.status(400).json({
      message: "Provide a username or email address, and a password.",
    });
  }

  const trimmedIdentifier = identifier.trim();
  const lowercaseIdentifier = trimmedIdentifier.toLowerCase();

  const account = await GameAccount.findOne({
    $or: [
      { email: lowercaseIdentifier },
      { displayName: trimmedIdentifier },
    ],
  });

  if (!account) {
    return res.status(401).json({
      message: "No account was found with that identifier.",
    });
  }

  const passwordMatches = bcrypt.compareSync(password, account.passwordHash);
  if (!passwordMatches) {
    return res.status(401).json({
      message: "That password was incorrect.",
    });
  }

  const auth = buildAccountAuth(account);
  await commitPlayerSession(req, res, auth.player);
  return res.status(200).json(auth);
});

router.post("/logout", async (req: Request, res: Response) => {
  await clearPlayerSession(req, res);
  return res.status(204).send();
});

router.get("/me", async (req: Request, res: Response) => {
  const player = await getPlayerFromRequest(req);
  if (!player) {
    return res.status(401).json({
      message: "Not authenticated.",
    });
  }

  if (player.kind === "account" && isDatabaseReady()) {
    const account = await GameAccount.findById(player.playerId);
    if (account) {
      const auth = buildAccountAuth(account);
      await refreshPlayerSession(req, res, auth.player);
      return res.status(200).json({
        player: auth.player,
      });
    }

    await clearPlayerSession(req, res);
    return res.status(401).json({
      message: "That account session is no longer valid.",
    });
  }

  await refreshPlayerSession(req, res, player);
  return res.status(200).json({ player });
});

router.get("/profile", async (req: Request, res: Response) => {
  const account = await requireAccount(req, res);
  if (!account) {
    return;
  }

  return res.status(200).json({
    profile: serializeAccountProfile(account),
  });
});

router.put("/profile", async (req: Request, res: Response) => {
  const account = await requireAccount(req, res);
  if (!account) {
    return;
  }

  const { displayName, email, password } = req.body as {
    displayName?: string;
    email?: string;
    password?: string;
  };

  const normalizedEmail = email?.trim().toLowerCase();
  const sanitizedDisplayName = displayName?.trim();

  if (!normalizedEmail && !sanitizedDisplayName && !password) {
    return res.status(400).json({
      message: "Provide a display name, email address, or password to update.",
    });
  }

  if (sanitizedDisplayName !== undefined) {
    if (!sanitizedDisplayName || sanitizedDisplayName.length < 3) {
      return res.status(400).json({
        message: "Display name must be at least 3 characters long.",
      });
    }

    const existingAccountByDisplayName = await GameAccount.findOne({
      displayName: sanitizedDisplayName,
      _id: { $ne: account._id },
    });

    if (existingAccountByDisplayName) {
      return res.status(409).json({
        message: "That username is already taken.",
      });
    }

    account.displayName = sanitizeDisplayName(sanitizedDisplayName);
  }

  if (normalizedEmail !== undefined) {
    if (normalizedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({
          message: "Provide a valid email address.",
        });
      }

      const existingAccount = await GameAccount.findOne({
        email: normalizedEmail,
        _id: { $ne: account._id },
      });

      if (existingAccount) {
        return res.status(409).json({
          message: "An account with that email already exists.",
        });
      }

      account.email = normalizedEmail;
    } else {
      account.email = undefined;
    }
  }

  if (password !== undefined) {
    if (password.length < 8) {
      return res.status(400).json({
        message: "Passwords must be at least 8 characters long.",
      });
    }

    account.passwordHash = bcrypt.hashSync(password, saltRounds);
  }

  await account.save();

  const auth = buildAccountAuth(account);
  await refreshPlayerSession(req, res, auth.player);
  return res.status(200).json({
    auth,
    profile: serializeAccountProfile(account),
  });
});

router.post("/tutorial-complete", async (req: Request, res: Response) => {
  const account = await requireAccount(req, res);
  if (!account) {
    return;
  }

  account.hasSeenTutorial = true;
  await account.save();

  const auth = buildAccountAuth(account);
  await refreshPlayerSession(req, res, auth.player);
  return res.status(200).json({ auth });
});

router.post(
  "/profile-picture",
  multerUploadMiddleware.single("profilePicture"),
  async (req: Request, res: Response) => {
    const account = await requireAccount(req, res);
    if (!account) {
      return;
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Choose an image to upload.",
      });
    }

    try {
      const fileName = `game-account-${account.id}-${randomUUID()}.jpeg`;
      const image = await Jimp.read(req.file.buffer);
      image.resize({ w: 320 });

      const processedImageBuffer = await image.getBuffer("image/jpeg");

      const uploadCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: processedImageBuffer,
        ContentType: "image/jpeg",
      });

      await s3Client.send(uploadCommand);

      if (account.profilePicture?.startsWith(`${CLOUDFRONT_URL}/`)) {
        try {
          const previousKey = account.profilePicture.split("/").pop();
          if (previousKey) {
            await s3Client.send(
              new DeleteObjectCommand({
                Bucket: BUCKET_NAME,
                Key: previousKey,
              })
            );
          }
        } catch (error) {
          console.error("Error deleting previous game account profile picture:", error);
        }
      }

      account.profilePicture = `${CLOUDFRONT_URL}/${fileName}`;
      await account.save();

      const auth = buildAccountAuth(account);
      await refreshPlayerSession(req, res, auth.player);
      return res.status(200).json({
        auth,
        profile: serializeAccountProfile(account),
      });
    } catch (error) {
      console.error("Error uploading game account profile picture:", error);
      return res.status(500).json({
        message: "Unable to upload that profile picture right now.",
      });
    }
  }
);

export default router;
