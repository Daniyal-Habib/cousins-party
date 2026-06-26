"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/theme/Avatar";
import { useUser } from "@/lib/hooks/useUser";
import { NeonButton } from "@/components/theme/NeonButton";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";

export function TopBar({ 
  title,
  subtitle,
  onLeave, 
  requireConfirm = false,
  showProfile = true,
  showRanks = false,
  className
}: { 
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  onLeave?: () => void;
  requireConfirm?: boolean;
  showProfile?: boolean;
  showRanks?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const { profile } = useUser();
  const [showConfirm, setShowConfirm] = useState(false);

  function handleHomeClick() {
    if (requireConfirm) {
      setShowConfirm(true);
    } else if (onLeave) {
      onLeave();
    } else {
      router.push("/home");
    }
  }

  function confirmLeave() {
    setShowConfirm(false);
    if (onLeave) {
      onLeave();
    } else {
      router.push("/home");
    }
  }

  return (
    <>
      <header className={cn("sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-vice-night/80 backdrop-blur-xl border-b border-white/10", className)}>
        <button
          onClick={handleHomeClick}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-neon-teal shadow-[0_0_10px_rgba(31,224,216,0.2)] hover:bg-white/10 active:scale-95 transition"
          aria-label="Home"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>

        <div className="flex flex-col items-center flex-1 px-2 min-w-0">
          {typeof title === "string" ? (
            <h1 className="w-full text-center font-display text-lg uppercase tracking-widest text-ink neon-text-teal truncate">
              {title}
            </h1>
          ) : (
            title
          )}
          {subtitle}
        </div>

        <div className="flex h-10 items-center justify-end gap-2 pr-1 min-w-[3.5rem]">
          {showRanks && (
            <button onClick={() => router.push("/leaderboard")} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-neon-orange hover:bg-white/10 active:scale-95 transition" aria-label="Ranks">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M6 4h12v3a6 6 0 0 1-12 0V4z" strokeLinejoin="round" />
                <path d="M6 6H4a2 2 0 0 0 2 4M18 6h2a2 2 0 0 1-2 4M9 16h6M10 20h4M12 13v3" strokeLinecap="round" />
              </svg>
            </button>
          )}
          {showProfile && profile ? (
            <button onClick={() => router.push("/profile")} className="active:scale-95 transition">
              <Avatar name={profile.name} photoUrl={profile.photoUrl} size={36} ring="teal" />
            </button>
          ) : (
            <div className="h-8 w-8" />
          )}
        </div>
      </header>

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="glass w-full max-w-xs rounded-3xl p-6 text-center shadow-xl border border-white/10"
            >
              <h3 className="font-display text-lg uppercase text-neon-pink neon-text mb-2">Leave?</h3>
              <p className="text-sm text-white/70 mb-6">Are you sure you want to return to home? You will be disconnected.</p>
              <div className="flex gap-3">
                <NeonButton variant="ghost" fullWidth onClick={() => setShowConfirm(false)}>Stay</NeonButton>
                <NeonButton variant="pink" fullWidth onClick={confirmLeave}>Leave</NeonButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
