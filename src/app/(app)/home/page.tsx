"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GlassPanel } from "@/components/theme/GlassPanel";
import { NeonButton } from "@/components/theme/NeonButton";
import { Avatar } from "@/components/theme/Avatar";
import { FirebaseErrorBanner } from "@/components/theme/FirebaseErrorBanner";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useUser } from "@/lib/hooks/useUser";
import { useSession } from "@/lib/stores/session";

export default function HomePage() {
  useRequireAuth();
  const router = useRouter();
  const { profile, error: profileError } = useUser();
  const { name } = useSession();
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!/^\d{4}$/.test(code)) {
      setError("Room codes are 4 digits.");
      return;
    }
    setError(null);
    router.push(`/room/${code}`);
  }

  return (
    <main className="mx-auto w-full max-w-md px-5 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <FirebaseErrorBanner error={profileError} />
      {/* Greeting */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center gap-3"
      >
        <Avatar name={name ?? "?"} photoUrl={profile?.photoUrl} size={52} ring="teal" />
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">Welcome back</p>
          <h1 className="font-display text-2xl uppercase text-ink neon-text-teal">
            {name ?? "Cousin"}
          </h1>
        </div>
        <div className="ml-auto text-right">
          <p className="font-display text-2xl text-neon-orange neon-text">
            {profile?.stars ?? 0}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted">Stars</p>
        </div>
      </motion.section>

      {/* Quick actions */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-6 grid grid-cols-2 gap-3"
      >
        <NeonButton variant="pink" size="lg" fullWidth glow onClick={() => router.push("/create")}>
          Create Room
        </NeonButton>
        <form onSubmit={handleJoin} className="contents">
          <div className="flex flex-col gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              inputMode="numeric"
              maxLength={4}
              placeholder="CODE"
              className="w-full rounded-2xl border border-white/15 bg-vice-night/60 px-4 py-2.5 text-center font-display text-lg uppercase tracking-[0.5em] text-ink outline-none placeholder:tracking-[0.5em] focus:border-neon-teal focus:shadow-neon-teal"
            />
            <NeonButton type="submit" variant="teal" size="sm" fullWidth>
              Join
            </NeonButton>
          </div>
        </form>
      </motion.section>

      {error && (
        <p className="mb-4 text-center text-sm font-semibold text-neon-pink neon-text">
          {error}
        </p>
      )}

      {/* Pass & Play */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <SectionTitle>Pass &amp; Play</SectionTitle>
        <GlassPanel className="flex items-center justify-between">
          <div>
            <p className="font-display uppercase text-ink">Same phone, pass it around</p>
            <p className="mt-1 text-xs text-muted">Perfect for the couch.</p>
          </div>
          <NeonButton variant="orange" size="sm" onClick={() => router.push("/pass-and-play")}>
            Start
          </NeonButton>
        </GlassPanel>
      </motion.section>

      {/* Games */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-6"
      >
        <SectionTitle>Games</SectionTitle>
        <div className="grid grid-cols-1 gap-3">
          <GameCard
            title="Mafia"
            tagline="Find the killers before dawn"
            accent="pink"
            available
            onClick={() => router.push("/create?game=mafia")}
          />
          <GameCard
            title="UNO"
            tagline="Coming soon"
            accent="orange"
            available={false}
          />
          <GameCard
            title="Word Guesser"
            tagline="Coming soon"
            accent="teal"
            available={false}
          />
        </div>
      </motion.section>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 px-1 font-display text-xs uppercase tracking-[0.3em] text-muted">
      {children}
    </h2>
  );
}

function GameCard({
  title,
  tagline,
  accent,
  available,
  onClick,
}: {
  title: string;
  tagline: string;
  accent: "pink" | "teal" | "orange";
  available: boolean;
  onClick?: () => void;
}) {
  const ring = {
    pink: "border-neon-pink/40 shadow-neon-pink",
    teal: "border-neon-teal/40 shadow-neon-teal",
    orange: "border-neon-orange/40 shadow-neon-orange",
  }[accent];

  return (
    <motion.button
      whileTap={{ scale: available ? 0.98 : 1 }}
      onClick={available ? onClick : undefined}
      disabled={!available}
      className={`glass flex w-full items-center justify-between p-4 text-left ${ring} ${
        available ? "" : "opacity-50"
      }`}
    >
      <div>
        <p className="font-display text-xl uppercase text-ink">{title}</p>
        <p className="text-xs text-muted">{tagline}</p>
      </div>
      {available ? (
        <span className="text-neon-teal">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      ) : (
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted">
          Soon
        </span>
      )}
    </motion.button>
  );
}
