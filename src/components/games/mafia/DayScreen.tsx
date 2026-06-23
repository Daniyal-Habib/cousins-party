"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassPanel } from "@/components/theme/GlassPanel";
import { NeonButton } from "@/components/theme/NeonButton";
import { Avatar } from "@/components/theme/Avatar";
import { PlayerSelectGrid } from "@/components/games/PlayerSelectGrid";
import { ChatPanel } from "@/components/games/ChatPanel";
import { useMafia } from "@/games/mafia/useMafia";
import { submitDayVote, forceEndDay } from "@/games/mafia/mafiaService";
import { useServerTimer } from "@/lib/hooks/useServerTimer";
import { cn } from "@/lib/cn";

export function DayScreen() {
  const { state, me, code, isHost } = useMafia();
  const [tab, setTab] = useState<"vote" | "chat">("vote");
  const [confirmVote, setConfirmVote] = useState<{ targetUid: string; targetName: string; targetPhoto: string | null } | null>(null);
  const { formatted, expired } = useServerTimer(state?.timerEndsAt ?? null);

  if (!state || !me) return null;

  const myVote = (state.dayVotes || {})[me.uid];
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
            author={{ uid: me.uid, name: me.name, photo: me.photoUrl, isDead: true }}
            placeholder="You're out — chat only…"
            accent="pink"
            compact
            viewerIsDead={true}
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
      </div>

      {tab === "vote" ? (
        <div className="space-y-3">
          <PlayerSelectGrid
            players={state.players}
            selectedUid={myVote && myVote !== "skip" ? myVote : null}
            onSelect={(uid) => {
              if (voted) return;
              const target = state.players.find(p => p.uid === uid);
              if (target) {
                setConfirmVote({ targetUid: target.uid, targetName: target.name, targetPhoto: target.photoUrl });
              }
            }}
            selfUid={me.uid}
            emptyHint="Nobody left to vote against."
            votedUids={Object.keys(state.dayVotes || {})}
            disabledUids={voted ? state.players.map(p => p.uid) : []}
          />
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
            <NeonButton
              variant="ghost"
              fullWidth
              onClick={() => castVote("skip")}
            >
              Skip vote
            </NeonButton>
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
            author={{ uid: me.uid, name: me.name, photo: me.photoUrl, isDead: false }}
            placeholder="Discuss who you suspect…"
            accent="pink"
            compact
            viewerIsDead={false}
          />
        </div>
      )}

      {/* Vote Confirmation Modal */}
      <AnimatePresence>
        {confirmVote && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 flex flex-col bg-vice-night"
          >
            {/* Close button */}
            <button
              onClick={() => setConfirmVote(null)}
              className="absolute left-5 top-[max(1rem,env(safe-area-inset-top))] z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Photo fills the screen */}
            <div className="relative flex-1 overflow-hidden">
              {confirmVote.targetPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={confirmVote.targetPhoto} alt={confirmVote.targetName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-vice-dusk to-vice-midnight">
                  <Avatar name={confirmVote.targetName} photoUrl={null} size={140} />
                </div>
              )}
              {/* Frosted gradient at bottom for legibility */}
              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-vice-night to-transparent" />
              {/* Name */}
              <div className="absolute inset-x-0 bottom-0 p-6 text-center">
                <p className="font-display text-3xl uppercase text-ink neon-text">{confirmVote.targetName}</p>
              </div>
            </div>
            
            {/* Action button */}
            <div className="bg-vice-night/95 px-6 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <NeonButton
                variant="pink"
                size="lg"
                fullWidth
                glow
                onClick={() => {
                  castVote(confirmVote.targetUid);
                  setConfirmVote(null);
                }}
              >
                Vote {confirmVote.targetName}
              </NeonButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
