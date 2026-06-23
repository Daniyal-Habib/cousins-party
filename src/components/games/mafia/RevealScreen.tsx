"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassPanel } from "@/components/theme/GlassPanel";
import { NeonButton } from "@/components/theme/NeonButton";
import { Avatar } from "@/components/theme/Avatar";
import { RoleRevealCard } from "@/components/role-reveal/RoleRevealCard";
import { useMafia, ROLE_META } from "@/games/mafia/useMafia";
import { acknowledgeReveal, endRevealPhase } from "@/games/mafia/mafiaService";
import { cn } from "@/lib/cn";

/**
 * Online reveal phase: each client reveals their own role on-device, then
 * acknowledges. Host can advance once everyone has acknowledged.
 */
export function RevealScreen() {
  const { state, me, code, isHost } = useMafia();
  const [revealed, setRevealed] = useState(false);

  if (!state || !me) return null;
  const role = ROLE_META[me.role];
  const acknowledgedCount = state.revealAcknowledged.length;
  const total = state.players.length;

  // If I've acknowledged, show the waiting screen.
  if (state.revealAcknowledged.includes(me.uid)) {
    return (
      <WaitingShell
        title="Roles Locked In"
        subtitle="Pass the spotlight — everyone is reading their card."
        code={code}
        acknowledgedCount={acknowledgedCount}
        total={total}
        isHost={isHost}
        onAdvance={() => endRevealPhase(code)}
      />
    );
  }

  if (!revealed) {
    return (
      <RoleRevealCard
        name={me.name}
        photoUrl={me.photoUrl}
        hidden={role.label}
        hiddenAccent={role.color as "pink" | "teal" | "orange"}
        hiddenSub={role.description}
        onContinue={() => setRevealed(true)}
      />
    );
  }

  // After the card continue: show role summary + confirm.
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center"
    >
      <Avatar name={me.name} photoUrl={me.photoUrl} size={96} ring={role.color as "pink" | "teal" | "orange"} />
      <p className="mt-4 font-display text-[11px] uppercase tracking-[0.4em] text-muted">
        Your role
      </p>
      <p
        className={cn(
          "mt-1 font-display text-4xl uppercase",
          role.color === "pink" && "text-neon-pink neon-text",
          role.color === "teal" && "text-neon-teal neon-text-teal",
          role.color === "orange" && "text-neon-orange neon-text",
        )}
      >
        {role.label}
      </p>
      <p className="mt-3 max-w-xs text-sm text-muted">{role.description}</p>

      <NeonButton
        variant="teal"
        size="lg"
        glow
        className="mt-8"
        onClick={() => acknowledgeReveal(code, me.uid)}
      >
        Got it →
      </NeonButton>
    </motion.div>
  );
}

function WaitingShell({
  title,
  subtitle,
  code,
  acknowledgedCount,
  total,
  isHost,
  onAdvance,
}: {
  title: string;
  subtitle: string;
  code: string;
  acknowledgedCount: number;
  total: number;
  isHost: boolean;
  onAdvance: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center justify-center px-6 text-center"
    >
      <motion.div
        animate={{ rotate: [0, 8, -8, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="mb-4 text-5xl"
      >
        🎭
      </motion.div>
      <h2 className="font-display text-2xl uppercase text-ink neon-text-teal">{title}</h2>
      <p className="mt-2 max-w-xs text-sm text-muted">{subtitle}</p>

      <GlassPanel className="mt-6 w-full max-w-xs">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted">Ready</span>
          <span className="font-display text-ink">
            {acknowledgedCount}/{total}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full bg-neon-pink-orange"
            animate={{ width: `${(acknowledgedCount / total) * 100}%` }}
          />
        </div>
      </GlassPanel>

      {isHost && (
        <NeonButton
          variant="pink"
          size="lg"
          glow
          className="mt-6"
          disabled={acknowledgedCount < total}
          onClick={onAdvance}
        >
          {acknowledgedCount < total ? `Waiting on ${total - acknowledgedCount}…` : "Start Night →"}
        </NeonButton>
      )}
      {!isHost && (
        <p className="mt-6 text-sm text-muted">
          The host will start when everyone&apos;s ready.
        </p>
      )}
      <AnimatePresence />
      {/* code kept for potential debug; void to avoid unused warning */}
      <span className="hidden">{code}</span>
    </motion.div>
  );
}
