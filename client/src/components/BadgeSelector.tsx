"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { AuthResponse } from "@shared";
import { cn } from "@/lib/utils";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PaperCard } from "@/components/ui/paper-card";
import { AnimatedCard } from "@/components/ui/animated-card";
import { UserBadge, BADGE_DEFINITIONS, ALL_BADGE_IDS, type BadgeId } from "@/components/UserBadge";
import { updateActiveBadges } from "@/lib/api";
import { isAdmin } from "@/lib/featureGate";

export function BadgeSelector({
  auth,
  onAuthChange,
  delay = 0,
}: {
  auth: AuthResponse | null;
  onAuthChange: (auth: AuthResponse) => void;
  delay?: number;
}) {
  const t = useTranslations("profile");
  const badges = (auth?.player.badges ?? []) as BadgeId[];
  const activeBadges = (auth?.player.activeBadges ?? []) as string[];

  if (badges.length === 0) return null;

  const updateBadges = (next: BadgeId[]) => {
    if (auth) {
      onAuthChange({ ...auth, player: { ...auth.player, activeBadges: next } });
    }
    void updateActiveBadges(next).then(() => {
      const badgeName = next.length > 0 ? BADGE_DEFINITIONS[next[0]]?.label : null;
      toast.success(badgeName ? t("badgeUpdated", { badge: badgeName }) : t("badgeHiddenToast"));
    });
  };

  const selectBadge = (badgeId: BadgeId) => {
    const next = activeBadges.includes(badgeId) ? [] : [badgeId];
    updateBadges(next as BadgeId[]);
  };

  const hideAll = () => {
    updateBadges([]);
  };

  return (
    <AnimatedCard delay={delay}>
      <PaperCard>
        <CardHeader>
          <CardTitle>{t("badge")}</CardTitle>
          <CardDescription>{t("badgeDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={hideAll}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                activeBadges.length === 0
                  ? "border-[#8c7a5e] bg-[#f5ecd8] text-[#4e3d2c] shadow-xs"
                  : "border-[#dcc7a3] text-[#9a8670] hover:border-[#b69a6e]",
              )}
            >
              {t("badgeHidden")}
            </button>

            {badges.map((badgeId) => {
              const def = BADGE_DEFINITIONS[badgeId];
              if (!def) return null;
              const isActive = activeBadges.includes(badgeId);

              return (
                <button
                  key={badgeId}
                  type="button"
                  onClick={() => selectBadge(badgeId)}
                  className={cn(
                    "rounded-xl border p-2 transition-all",
                    isActive
                      ? "border-[#8c7a5e] bg-[#f5ecd8] shadow-xs"
                      : "border-transparent hover:border-[#dcc7a3]",
                  )}
                >
                  <UserBadge badge={badgeId} />
                </button>
              );
            })}
          </div>

          {activeBadges.length > 0 && (
            <p className="mt-3 text-xs text-[#9a8670]">
              {t("badgeActive", {
                badge: activeBadges
                  .map((id) => BADGE_DEFINITIONS[id as BadgeId]?.label)
                  .filter(Boolean)
                  .join(", "),
              })}
            </p>
          )}

          {isAdmin(auth) && (
            <div className="mt-5 rounded-xl border border-dashed border-[#c4a978]/50 p-3">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#b09a78]">
                {t("devPreviewBadges")}
              </p>
              <div className="flex flex-col gap-3">
                {ALL_BADGE_IDS.map((id) => (
                  <div key={id} className="flex items-center gap-3">
                    <UserBadge badge={id} />
                    <UserBadge badge={id} compact />
                    <span className="text-[11px] text-[#9a8670]">
                      {t("badgeTier", { tier: BADGE_DEFINITIONS[id].tier, id })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </PaperCard>
    </AnimatedCard>
  );
}
