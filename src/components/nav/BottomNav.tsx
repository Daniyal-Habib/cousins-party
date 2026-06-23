"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

type Tab = {
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
};

const tabs: Tab[] = [
  {
    href: "/home",
    label: "Play",
    icon: () => <PlayIcon />,
  },
  {
    href: "/leaderboard",
    label: "Ranks",
    icon: (a) => <TrophyIcon active={a} />,
  },
  {
    href: "/profile",
    label: "Me",
    icon: (a) => <UserIcon active={a} />,
  },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-30 border-t border-white/10 bg-vice-night/80 backdrop-blur-xl">
      <div className="flex items-stretch justify-around px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link key={tab.href} href={tab.href} className="flex-1">
              <motion.div
                whileTap={{ scale: 0.92 }}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-2xl py-1.5",
                  active ? "text-neon-pink" : "text-muted",
                )}
              >
                <span className={cn(active && "drop-shadow-[0_0_6px_rgba(255,45,123,0.8)]")}>
                  {tab.icon(active)}
                </span>
                <span className="font-display text-[10px] uppercase tracking-wider">
                  {tab.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* ---- icons ---- */
function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
function TrophyIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2}>
      <path d="M6 4h12v3a6 6 0 0 1-12 0V4z" strokeLinejoin="round" />
      <path d="M6 6H4a2 2 0 0 0 2 4M18 6h2a2 2 0 0 1-2 4M9 16h6M10 20h4M12 13v3" strokeLinecap="round" />
    </svg>
  );
}
function UserIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" strokeLinecap="round" />
    </svg>
  );
}
