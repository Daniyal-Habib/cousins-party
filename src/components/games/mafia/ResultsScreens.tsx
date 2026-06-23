"use client";

import { motion } from "framer-motion";
import { GlassPanel } from "@/components/theme/GlassPanel";
import { NeonButton } from "@/components/theme/NeonButton";
import { Avatar } from "@/components/theme/Avatar";
import { useMafia } from "@/games/mafia/useMafia";
import { startDayPhase, startNextNight } from "@/games/mafia/mafiaService";

/** Narrates what happened during the night. Host advances to Day. */
export function NightResultsScreen() {
  const { state, code, isHost, me } = useMafia();
  if (!state || !me) return null;

  const night = state.lastNight;
  const byUid = (uid: string) => state.players.find((p) => p.uid === uid);

  return (
    <ResultsShell accent="teal" label="Dawn Breaks" title="Night Recap">
      <div className="space-y-3">
        {night && night.killed.length === 0 && !night.sheriffOutcome && (
          <Story color="teal">The night passed peacefully. Nobody died.</Story>
        )}

        {night?.savedByDoctor && (
          <Story color="teal">
            The Mafia struck{" "}
            <b className="text-ink">{byUid(night.mafiaTarget ?? "")?.name}</b>, but
            the Doctor saved them!
          </Story>
        )}

        {night?.killed.map((uid) => (
          <Story key={uid} color="pink">
            <AvatarName player={byUid(uid)} /> was found eliminated.
          </Story>
        ))}

        {night?.detectiveReport && me.role === "detective" && (
          <Story color="teal">
            🕵️ Your investigation:{" "}
            <b className="text-ink">{byUid(night.detectiveReport.target)?.name}</b> is{" "}
            <b className={night.detectiveReport.isMafia ? "text-neon-pink" : "text-neon-teal"}>
              {night.detectiveReport.isMafia ? "MAFIA" : "not Mafia"}
            </b>
            .
          </Story>
        )}

        {night?.sheriffOutcome && (
          <Story color="orange">
            🔫 The Sheriff shot{" "}
            <b className="text-ink">{byUid(night.sheriffOutcome.shot)?.name}</b>.
            {night.sheriffOutcome.victimWasMafia
              ? " They were Mafia — eliminated!"
              : " They were innocent — the Sheriff fell."}
          </Story>
        )}
      </div>

      {isHost && (
        <NeonButton variant="teal" fullWidth glow className="mt-5" onClick={() => startDayPhase(code)}>
          Begin Day →
        </NeonButton>
      )}
      {!isHost && <Wait text="Waiting for the host to begin the day…" />}
    </ResultsShell>
  );
}

/** Narrates the day vote result. Host advances to next Night. */
export function DayResultsScreen() {
  const { state, code, isHost } = useMafia();
  if (!state) return null;

  const day = state.lastDay;
  const byUid = (uid: string) => state.players.find((p) => p.uid === uid);

  return (
    <ResultsShell accent="pink" label="Verdict" title="Vote Results">
      <div className="space-y-3">
        {day?.tied && (
          <Story color="orange">
            It&apos;s a tie at the top! Nobody is eliminated.
          </Story>
        )}
        {!day?.tied && day?.eliminated && day.eliminated !== "skip" && (
          <Story color="pink">
            The town voted out{" "}
            <AvatarName player={byUid(day.eliminated)} />.
          </Story>
        )}
        {(!day?.eliminated || day?.eliminated === "skip") && !day?.tied && (
          <Story color="teal">The town decided to skip. Nobody was eliminated.</Story>
        )}

        {/* Vote tally */}
        {day && Object.keys(day.votes).length > 0 && (
          <GlassPanel className="mt-2">
            <p className="mb-2 font-display text-[11px] uppercase tracking-wider text-muted">
              Tally
            </p>
            <div className="space-y-1">
              {Object.entries(day.votes).map(([uid, count]) => (
                <div key={uid} className="flex items-center justify-between text-sm">
                  <span className="text-ink">{byUid(uid)?.name}</span>
                  <span className="font-display text-neon-orange">{count}</span>
                </div>
              ))}
              {day.skipped > 0 && (
                <div className="flex items-center justify-between text-sm text-muted">
                  <span>Skipped</span>
                  <span className="font-display">{day.skipped}</span>
                </div>
              )}
            </div>
          </GlassPanel>
        )}
      </div>

      {isHost && (
        <NeonButton variant="pink" fullWidth glow className="mt-5" onClick={() => startNextNight(code)}>
          Next Night →
        </NeonButton>
      )}
      {!isHost && <Wait text="Waiting for the host to start the next night…" />}
    </ResultsShell>
  );
}

/* ---------------- shared bits ---------------- */
function ResultsShell({
  accent,
  label,
  title,
  children,
}: {
  accent: "pink" | "teal";
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto h-full w-full max-w-md overflow-y-auto px-5 py-4 no-scrollbar"
    >
      <div className="mb-5 text-center">
        <p
          className={`font-display text-xs uppercase tracking-[0.4em] ${
            accent === "pink" ? "text-neon-pink neon-text" : "text-neon-teal neon-text-teal"
          }`}
        >
          {label}
        </p>
        <h2 className="mt-1 font-display text-2xl uppercase text-ink">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

function Story({
  color,
  children,
}: {
  color: "pink" | "teal" | "orange";
  children: React.ReactNode;
}) {
  const ring = {
    pink: "border-neon-pink/30",
    teal: "border-neon-teal/30",
    orange: "border-neon-orange/30",
  }[color];
  return (
    <div className={`glass ${ring} p-4 text-sm leading-relaxed text-muted`}>
      {children}
    </div>
  );
}

function Wait({ text }: { text: string }) {
  return (
    <p className="mt-5 text-center text-sm text-muted">{text}</p>
  );
}

function AvatarName({ player }: { player?: { name: string; photoUrl: string | null } }) {
  if (!player) return null;
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <Avatar name={player.name} photoUrl={player.photoUrl} size={20} ring="pink" />
      <b className="text-ink">{player.name}</b>
    </span>
  );
}
