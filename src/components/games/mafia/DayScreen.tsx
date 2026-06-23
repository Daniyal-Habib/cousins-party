"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GlassPanel } from "@/components/theme/GlassPanel";
import { NeonButton } from "@/components/theme/NeonButton";
import { PlayerSelectGrid } from "@/components/games/PlayerSelectGrid";
import { ChatPanel } from "@/components/games/ChatPanel";
import { useMafia } from "@/games/mafia/useMafia";
import { submitDayVote, forceEndDay } from "@/games/mafia/mafiaService";
import { useServerTimer } from "@/lib/hooks/useServerTimer";
import { cn } from "@/lib/cn";

export function DayScreen() {
  const { state, me, code, isHost } = useMafia();
  const [tab, setTab] = useState<"vote" | "chat">("vote");
  const { formatted, expired } = useServerTimer(state?.timerEndsAt ?? null);

  if (!state || !me) return null;

  const myVote = state.dayVotes[me.uid];
  const voted = Boolean(myVote);
  const alive = me.alive;

  // Spectators / eliminated players only see chat.
  if (!alive) {
    return (
      <DayShell timer={formatted} alive={false}>
        <div className="glass h-full overflow-hidden">
          <ChatPanel
            code={code}
            subcollection="chat"
            author={{ uid: me.uid, name: me.name, photo: me.photoUrl }}
            placeholder="You're out — chat only…"
            accent="pink"
            compact
          />
        </div>
      </DayShell>
    );
  }

  async function castVote(target: string) {
    await submitDayVote(code, me!.uid, target);
  }

  return (
    <DayShell timer={formatted} alive>
      {/* Tabs */}
      <div className="mb-3 flex gap-2">
        <TabBtn active={tab === "vote"} onClick={() => setTab("vote")}>
          Vote
        </TabBtn>
        <TabBtn active={tab === "chat"} onClick={() => setTab("chat")}>
          Discuss
        </TabBtn>
        <div className="ml-auto self-center text-xs text-muted">
          {Object.keys(state.dayVotes).length}/{state.players.filter((p) => p.alive).length} voted
        </div>
      </div>

      {tab === "vote" ? (
        <div className="space-y-3">
          {voted ? (
            <GlassPanel glow="pink" className="text-center">
              <p className="font-display uppercase text-ink">
                {myVote === "skip" ? "Skipped" : "Vote locked"}
              </p>
              <p className="mt-1 text-sm text-muted">
                Waiting for everyone to cast their vote…
              </p>
            </GlassPanel>
          ) : (
            <>
              <PlayerSelectGrid
                players={state.players}
                selectedUid={myVote && myVote !== "skip" ? myVote : null}
                onSelect={castVote}
                selfUid={me.uid}
                excludeUids={[me.uid]}
                emptyHint="Nobody left to vote against."
              />
              <NeonButton
                variant="ghost"
                fullWidth
                onClick={() => castVote("skip")}
              >
                Skip vote
              </NeonButton>
            </>
          )}
          {expired && isHost && (
            <NeonButton variant="pink" fullWidth glow onClick={() => forceEndDay(code)}>
              Resolve now
            </NeonButton>
          )}
        </div>
      ) : (
        <div className="glass h-[60vh] overflow-hidden">
          <ChatPanel
            code={code}
            subcollection="chat"
            author={{ uid: me.uid, name: me.name, photo: me.photoUrl }}
            placeholder="Discuss who you suspect…"
            accent="pink"
            compact
          />
        </div>
      )}
    </DayShell>
  );
}

function DayShell({
  timer,
  alive,
  children,
}: {
  timer: string;
  alive: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto h-full w-full max-w-md overflow-y-auto px-5 py-4 no-scrollbar"
    >
      <div className="mb-4 text-center">
        <p className="font-display text-xs uppercase tracking-[0.4em] text-neon-pink neon-text">
          Day Phase
        </p>
        <div className="mt-1 flex items-center justify-center gap-3">
          <h2 className="font-display text-2xl uppercase text-ink">Town Meeting</h2>
          {alive && (
            <span
              className={cn(
                "rounded-full bg-white/10 px-3 py-1 font-display text-sm",
                timer.startsWith("0:") ? "text-neon-pink animate-neon-pulse" : "text-ink",
              )}
            >
              {timer}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted">
          Discuss, accuse, then vote. A tie means nobody is eliminated.
        </p>
      </div>
      {children}
    </motion.div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl px-4 py-2 font-display text-xs uppercase tracking-wide transition",
        active ? "bg-neon-pink-orange text-white shadow-neon-pink" : "bg-white/5 text-muted",
      )}
    >
      {children}
    </button>
  );
}
