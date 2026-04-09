"use client";

/**
 * Cookie / analytics consent banner. Rendered at the bottom of the
 * viewport on the first visit (when consent is "pending") and stays
 * there until the user picks Accept or Reject. After that the banner
 * self-hides and the choice persists via localStorage.
 *
 * The banner only appears when the build is actually configured for
 * OpenPanel (`configured === true`). Forks, dev builds, and CI
 * deployments without analytics env vars never see it — nothing to
 * consent to.
 */

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useAnalyticsConsent } from "@/lib/AnalyticsConsent";

export function ConsentBanner() {
  const { status, configured, grant, revoke } = useAnalyticsConsent();
  const t = useTranslations("consent");

  if (!configured) return null;
  if (status !== "pending") return null;

  return (
    <div
      role="dialog"
      aria-labelledby="consent-banner-title"
      aria-describedby="consent-banner-body"
      className="fixed inset-x-0 bottom-0 z-[200] border-t border-[#dbc6a2] bg-[#f5e6d0] text-[#4a3728] shadow-[0_-4px_16px_rgba(74,55,40,0.18)]"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="space-y-1">
          <h2 id="consent-banner-title" className="text-sm font-semibold">
            {t("title")}
          </h2>
          <p id="consent-banner-body" className="text-sm text-[#6e5b48]">
            {t("body")}{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-[#4a3728]">
              {t("privacyLink")}
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" onClick={revoke}>
            {t("reject")}
          </Button>
          <Button type="button" onClick={grant}>
            {t("accept")}
          </Button>
        </div>
      </div>
    </div>
  );
}
