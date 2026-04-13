"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/PageLayout";
import { PaperCard } from "@/components/ui/paper-card";
import { CardContent } from "@/components/ui/card";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <PageLayout maxWidth="max-w-lg">
      <div className="flex flex-col items-center pt-8 sm:pt-16">
        <span className="flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-[#f6e8cf]/55 bg-[linear-gradient(180deg,#faefd8,#ecd4a6)] font-display text-5xl text-[#25170d] shadow-[0_32px_64px_-24px_rgba(37,23,13,0.85)]">
          跳
        </span>
        <h1 className="mt-5 font-display text-5xl tracking-tighter text-[#2f2015]">Tiao</h1>

        <PaperCard className="mt-8 w-full shadow-xl">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4e8d2] font-display text-3xl text-[#6c543c]">
              ?
            </div>
            <h2 className="font-display text-2xl font-bold text-[#2b1e14]">{t("title")}</h2>
            <p className="max-w-sm text-sm text-[#6e5b48]">{t("description")}</p>
            <Button className="mt-2 px-8" onClick={() => (window.location.href = "/")}>
              {t("backToLobby")}
            </Button>
          </CardContent>
        </PaperCard>
      </div>
    </PageLayout>
  );
}
