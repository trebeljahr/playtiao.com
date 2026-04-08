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
