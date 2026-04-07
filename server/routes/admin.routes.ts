import express, { Request, Response } from "express";
import GameAccount from "../models/GameAccount";
import { requireAdmin } from "../auth/sessionHelper";

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /admin/users/search?q=<query> — search users by display name
// ---------------------------------------------------------------------------

router.get("/users/search", async (req: Request, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const query = (req.query.q as string)?.trim();
  if (!query || query.length < 1) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Search query is required.",
    });
  }

  try {
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const accounts = await GameAccount.find(
      { displayName: { $regex: escapedQuery, $options: "i" } },
      { displayName: 1, badges: 1, activeBadges: 1, unlockedThemes: 1 },
    )
      .limit(20)
      .lean();

    const users = accounts.map((account: any) => ({
      playerId: String(account._id),
      displayName: account.displayName,
      badges: account.badges ?? [],
      activeBadges: account.activeBadges ?? [],
      unlockedThemes: account.unlockedThemes ?? [],
    }));

    return res.status(200).json({ users });
  } catch (error) {
    console.error("[GET /admin/users/search] Error:", error);
    return res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "Unable to search users right now.",
    });
  }
});

// ---------------------------------------------------------------------------
// POST /admin/badges/grant — grant a badge to a user
// ---------------------------------------------------------------------------

router.post("/badges/grant", async (req: Request, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { playerId, badgeId } = req.body as { playerId?: string; badgeId?: string };

  if (!playerId || !badgeId) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "playerId and badgeId are required.",
    });
  }

  try {
    const account = await GameAccount.findById(playerId);
    if (!account) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: "Player not found.",
      });
    }

    const badges = new Set(account.badges ?? []);
    badges.add(badgeId);
    account.badges = [...badges];
    await account.save();

    return res.status(200).json({
      badges: account.badges,
      activeBadges: account.activeBadges ?? [],
    });
  } catch (error) {
    console.error("[POST /admin/badges/grant] Error:", error);
    return res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "Unable to grant badge right now.",
    });
  }
});

// ---------------------------------------------------------------------------
// POST /admin/badges/revoke — revoke a badge from a user
// ---------------------------------------------------------------------------

router.post("/badges/revoke", async (req: Request, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { playerId, badgeId } = req.body as { playerId?: string; badgeId?: string };

  if (!playerId || !badgeId) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "playerId and badgeId are required.",
    });
  }

  try {
    const account = await GameAccount.findById(playerId);
    if (!account) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: "Player not found.",
      });
    }

    account.badges = (account.badges ?? []).filter((id: string) => id !== badgeId);
    // Also remove from active if it was active
    account.activeBadges = (account.activeBadges ?? []).filter((id: string) => id !== badgeId);
    await account.save();

    return res.status(200).json({
      badges: account.badges,
      activeBadges: account.activeBadges,
    });
  } catch (error) {
    console.error("[POST /admin/badges/revoke] Error:", error);
    return res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "Unable to revoke badge right now.",
    });
  }
});

// ---------------------------------------------------------------------------
// POST /admin/themes/grant — grant a board theme to a user
// ---------------------------------------------------------------------------

router.post("/themes/grant", async (req: Request, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { playerId, themeId } = req.body as { playerId?: string; themeId?: string };

  if (!playerId || !themeId) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "playerId and themeId are required.",
    });
  }

  try {
    const account = await GameAccount.findById(playerId);
    if (!account) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: "Player not found.",
      });
    }

    const themes = new Set(account.unlockedThemes ?? []);
    themes.add(themeId);
    account.unlockedThemes = [...themes];
    await account.save();

    return res.status(200).json({
      unlockedThemes: account.unlockedThemes,
    });
  } catch (error) {
    console.error("[POST /admin/themes/grant] Error:", error);
    return res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "Unable to grant theme right now.",
    });
  }
});

// ---------------------------------------------------------------------------
// POST /admin/themes/revoke — revoke a board theme from a user
// ---------------------------------------------------------------------------

router.post("/themes/revoke", async (req: Request, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { playerId, themeId } = req.body as { playerId?: string; themeId?: string };

  if (!playerId || !themeId) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "playerId and themeId are required.",
    });
  }

  try {
    const account = await GameAccount.findById(playerId);
    if (!account) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: "Player not found.",
      });
    }

    account.unlockedThemes = (account.unlockedThemes ?? []).filter((id: string) => id !== themeId);
    await account.save();

    return res.status(200).json({
      unlockedThemes: account.unlockedThemes,
    });
  } catch (error) {
    console.error("[POST /admin/themes/revoke] Error:", error);
    return res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "Unable to revoke theme right now.",
    });
  }
});

export default router;
