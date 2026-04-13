import type { ReactNode } from "react";
import "./[locale]/globals.css";

/**
 * Root layout that wraps ALL routes, including the locale segment.
 * Only exists so the root `not-found.tsx` and `global-error.tsx` can render
 * with a valid <html> shell. The real layout lives in `[locale]/layout.tsx`.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
