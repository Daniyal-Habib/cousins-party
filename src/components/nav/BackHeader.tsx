"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

/**
 * Screen header with a neon "Back" chevron + title.
 * `onBack` overrides the default router.back().
 */
export function BackHeader({
  title,
  onBack,
  right,
  className,
}: {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex items-center gap-3 px-4 py-3",
        "bg-vice-night/70 backdrop-blur-xl border-b border-white/10",
        className,
      )}
    >
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => (onBack ? onBack() : router.back())}
        aria-label="Back"
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-neon-teal shadow-neon-teal"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.button>

      {title && (
        <h2 className="flex-1 truncate font-display text-lg uppercase tracking-wide text-ink neon-text-teal">
          {title}
        </h2>
      )}
      {!title && <div className="flex-1" />}
      {right}
    </header>
  );
}
