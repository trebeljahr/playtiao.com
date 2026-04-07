import { cn } from "@/lib/utils";
import { CardHeader, CardContent } from "@/components/ui/card";
import { PaperCard } from "@/components/ui/paper-card";

/** Basic pulsing rectangle — pass className for width/height/rounding. */
export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("rounded-sm bg-[#e8dcc8]", className)} />;
}

/** PaperCard with a skeleton header and N placeholder list rows. */
export function SkeletonCard({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col animate-pulse", className)}>
      <PaperCard className="overflow-hidden shadow-lg flex-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-black/5 bg-black/2 py-4">
          <SkeletonBlock className="h-7 w-32 rounded-lg" />
        </CardHeader>
        <CardContent className="space-y-3 pt-6">
          {Array.from({ length: rows }, (_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-2xl border border-[#dcc7a2] bg-[#fffdf7] p-4"
            >
              <div className="flex flex-col gap-2">
                <SkeletonBlock className="h-5 w-24" />
                <SkeletonBlock className="h-3.5 w-40 bg-[#ede3d2]" />
              </div>
              <SkeletonBlock className="h-8 w-16 rounded-lg" />
            </div>
          ))}
        </CardContent>
      </PaperCard>
    </div>
  );
}

/** Game page skeleton — board square on left, side panel on right (stacked on mobile). */
export function SkeletonGamePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top,rgba(255,247,231,0.76),transparent_58%)]" />

      {/* Navbar placeholder */}
      <div className="flex h-14 items-center px-4 animate-pulse">
        <SkeletonBlock className="h-8 w-8 rounded-lg" />
      </div>

      <main className="mx-auto flex max-w-416 flex-col gap-5 px-4 pb-3 pt-2 sm:px-6 lg:px-6 xl:pt-2 animate-pulse">
        <section className="grid gap-3 xl:min-h-[calc(100dvh-6rem)] xl:content-center xl:gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,30rem)] xl:items-start">
          {/* Board skeleton */}
          <div className="flex items-center justify-center xl:items-start xl:justify-end">
            <div
              className="relative mx-auto w-full max-w-[min(100%,calc(100svh-8rem))] xl:max-w-[min(100%,calc(100svh-3rem))]"
              style={{ aspectRatio: "1/1" }}
            >
              <div className="h-full w-full rounded-4xl border border-[#d0bb94]/50 bg-[linear-gradient(180deg,#e8dcc8,#ddd0b8)] p-3">
                <div className="h-full w-full rounded-[1.55rem] bg-[#d4c6ab]/60" />
              </div>
            </div>
          </div>

          {/* Side panel skeleton */}
          <div className="mx-auto w-full max-w-[calc(100svh-8rem)] space-y-4 xl:mx-0 xl:w-auto xl:min-w-88 xl:max-w-120">
            <PaperCard>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-black/5 bg-black/2 py-4">
                <SkeletonBlock className="h-6 w-20 rounded-lg" />
                <SkeletonBlock className="h-5 w-16 rounded-full" />
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                {/* Score tiles */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="rounded-3xl border border-black/10 bg-[linear-gradient(180deg,#39312b,#14100d)] p-5">
                    <div className="flex items-center justify-between">
                      <SkeletonBlock className="h-5 w-16 rounded-sm bg-white/15" />
                      <SkeletonBlock className="h-8 w-8 rounded-lg bg-white/15" />
                    </div>
                    <SkeletonBlock className="mt-2 h-4 w-24 rounded-sm bg-white/10" />
                  </div>
                  <div className="rounded-3xl border border-[#d3c3ad] bg-[linear-gradient(180deg,#fffef8,#efe4d1)] p-5">
                    <div className="flex items-center justify-between">
                      <SkeletonBlock className="h-5 w-16 rounded-sm" />
                      <SkeletonBlock className="h-8 w-8 rounded-lg" />
                    </div>
                    <SkeletonBlock className="mt-2 h-4 w-24 rounded-sm bg-[#ede3d2]" />
                  </div>
                </div>
                {/* Move history placeholder */}
                <SkeletonBlock className="h-20 w-full rounded-2xl bg-[#ede3d2]" />
              </CardContent>
            </PaperCard>
          </div>
        </section>
      </main>
    </div>
  );
}

/**
 * Full-page skeleton with background gradient, navbar placeholder, and content slot.
 * Pass children for custom content, or omit to get a default SkeletonCard.
 */
export function SkeletonPage({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top,rgba(255,247,231,0.76),transparent_58%)]" />

      {/* Navbar placeholder */}
      <div className="flex h-14 items-center px-4 animate-pulse">
        <SkeletonBlock className="h-8 w-8 rounded-lg" />
      </div>

      {/* Content */}
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pb-12 pt-8 sm:px-6 lg:px-8 animate-pulse">
        {children ?? (
          <>
            <SkeletonBlock className="h-8 w-48 rounded-lg" />
            <SkeletonCard />
          </>
        )}
      </main>
    </div>
  );
}
