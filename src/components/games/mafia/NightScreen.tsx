"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GlassPanel } from "@/components/theme/GlassPanel";
import { NeonButton } from "@/components/theme/NeonButton";
import { Avatar } from "@/components/theme/Avatar";
import { PlayerSelectGrid } from "@/components/games/PlayerSelectGrid";
import { ChatPanel } from "@/components/games/ChatPanel";
import { useMafia, ROLE_META } from "@/games/mafia/useMafia";
import {
  submitMafiaVote,
  submitDoctorSave,
  submitDetectiveCheck,
  submitSheriffShot,
} from "@/games/mafia/mafiaService";

export function NightScreen() {
  const { state, me, myRole } = useMafia();
  if (!state || !me || !myRole) return null;

  // Spectators / dead players watch a passive night screen.
  if (!me.alive) {
    return (
      <PassiveNight
        title="You are out"
        subtitle="Watch the night unfold from the shadows…"
      />
    );
  }

  switch (myRole) {
    case "mafia":
      return <MafiaNight />;
    case "doctor":
      return <DoctorNight />;
    case "detective":
      return <DetectiveNight />;
    case "sheriff":
      return <SheriffNight />;
    default:
      return (
        <PassiveNight
          title="Night falls"
          subtitle="The town sleeps. Hold tight while powers act in the dark."
        />
      );
  }
}

/* ---------------- Mafia night ---------------- */
function MafiaNight() {
  const { state, me, code } = useMafia();
  const [target, setTarget] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const teammates = state!.players.filter(
    (p) => p.role === "mafia" && p.uid !== me!.uid,
  );
  const myVote = state!.nightActions.mafiaVotes?.[me!.uid];
  const voted = Boolean(myVote);

  async function confirm() {
    if (!target) return;
    await submitMafiaVote(code, target, me!.uid);
    setSubmitted(true);
  }

  return (
    <PhaseShell
      title="Mafia Round"
      subtitle="Pick tonight's target with your crew. You must agree."
      accent="pink"
    >
      {/* Teammates */}
      {teammates.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 px-1 font-display text-[11px] uppercase tracking-[0.3em] text-muted">
            Your Mafia
          </p>
          <div className="flex gap-3">
            {teammates.map((t) => (
              <div key={t.uid} className="flex flex-col items-center gap-1">
                <Avatar name={t.name} photoUrl={t.photoUrl} size={48} ring="pink" />
                <span className="text-[10px] text-ink">{t.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Target grid */}
      {!voted && !submitted && (
        <PlayerSelectGrid
          players={state!.players}
          selectedUid={target}
          onSelect={setTarget}
          selfUid={me!.uid}
          excludeUids={state!.players.filter((p) => p.role === "mafia").map((p) => p.uid)}
          emptyHint="Nobody left to target."
        />
      )}

      {(voted || submitted) && (
        <GlassPanel glow="pink" className="text-center">
          <p className="font-display uppercase text-ink">Vote locked</p>
          <p className="mt-1 text-sm text-muted">
            {teammates.length > 0
              ? "Waiting for the rest of the Mafia to agree…"
              : "Waiting for other roles to finish…"}
          </p>
        </GlassPanel>
      )}

      {!voted && !submitted && (
        <NeonButton
          variant="pink"
          fullWidth
          glow
          className="mt-4"
          disabled={!target}
          onClick={confirm}
        >
          Lock in target
        </NeonButton>
      )}

      {/* Private Mafia chat — gated by security rules from non-mafia */}
      {teammates.length > 0 && (
        <div className="mt-4">
          <p className="mb-1 px-1 font-display text-[11px] uppercase tracking-[0.3em] text-muted">
            Mafia Chat · secret
          </p>
          <div className="glass h-48 overflow-hidden">
            <ChatPanel
              code={code}
              subcollection="mafiaChat"
              author={{ uid: me!.uid, name: me!.name, photo: me!.photoUrl }}
              placeholder="Plot in secret…"
              accent="pink"
              compact
            />
          </div>
        </div>
      )}
    </PhaseShell>
  );
}

/* ---------------- Doctor night ---------------- */
function DoctorNight() {
  const { state, me, code } = useMafia();
  const [target, setTarget] = useState<string | null>(null);
  const submitted = Boolean(state!.nightActions.doctorSave);
  const lockedSave = state!.nightActions.previousDoctorSave;

  async function confirm() {
    if (!target) return;
    await submitDoctorSave(code, target);
  }

  return (
    <PhaseShell
      title="Doctor"
      subtitle="Choose someone to protect tonight."
      accent="teal"
    >
      {!submitted ? (
        <>
          {lockedSave && (
            <p className="mb-3 rounded-xl bg-white/5 px-3 py-2 text-xs text-muted">
              You saved{" "}
              <span className="font-bold text-ink">
                {state!.players.find((p) => p.uid === lockedSave)?.name}
              </span>{" "}
              last night — you can&apos;t pick them again.
            </p>
          )}
          <PlayerSelectGrid
            players={state!.players}
            selectedUid={target}
            onSelect={setTarget}
            selfUid={me!.uid}
            disabledUids={lockedSave ? [lockedSave] : []}
          />
          <NeonButton variant="teal" fullWidth glow className="mt-4" disabled={!target} onClick={confirm}>
            Protect
          </NeonButton>
        </>
      ) : (
        <GlassPanel glow="teal" className="text-center">
          <p className="font-display uppercase text-ink">Protection set</p>
          <p className="mt-1 text-sm text-muted">Awaiting dawn…</p>
        </GlassPanel>
      )}
    </PhaseShell>
  );
}

/* ---------------- Detective night ---------------- */
function DetectiveNight() {
  const { state, me, code } = useMafia();
  const [target, setTarget] = useState<string | null>(null);
  const submitted = Boolean(state!.nightActions.detectiveCheck);

  async function confirm() {
    if (!target) return;
    await submitDetectiveCheck(code, target);
  }

  return (
    <PhaseShell
      title="Detective"
      subtitle="Investigate one player to learn if they're Mafia."
      accent="teal"
    >
      {!submitted ? (
        <>
          <PlayerSelectGrid
            players={state!.players}
            selectedUid={target}
            onSelect={setTarget}
            selfUid={me!.uid}
            excludeUids={[me!.uid]}
          />
          <NeonButton variant="teal" fullWidth glow className="mt-4" disabled={!target} onClick={confirm}>
            Investigate
          </NeonButton>
        </>
      ) : (
        <GlassPanel glow="teal" className="text-center">
          <p className="font-display uppercase text-ink">Investigation underway</p>
          <p className="mt-1 text-sm text-muted">
            Your report will surface when night ends.
          </p>
        </GlassPanel>
      )}
    </PhaseShell>
  );
}

/* ---------------- Sheriff night ---------------- */
function SheriffNight() {
  const { state, me, code } = useMafia();
  const [target, setTarget] = useState<string | null>(null);
  const usedShot = state!.sheriffUsedShot;

  async function confirm() {
    if (!target) return;
    await submitSheriffShot(code, target);
  }

  if (usedShot) {
    return (
      <PhaseShell title="Sheriff" subtitle="You've used your shot." accent="teal">
        <GlassPanel className="text-center text-sm text-muted">
          Stay alert — the rest of the night plays out around you.
        </GlassPanel>
      </PhaseShell>
    );
  }

  return (
    <PhaseShell
      title="Sheriff"
      subtitle="One shot. Hit Mafia → they die. Miss → you die. Or sit this one out."
      accent="teal"
    >
      <PlayerSelectGrid
        players={state!.players}
        selectedUid={target}
        onSelect={setTarget}
        selfUid={me!.uid}
        excludeUids={[me!.uid]}
      />
      <div className="mt-4 flex gap-2">
        <NeonButton variant="ghost" className="flex-1">
          Hold fire
        </NeonButton>
        <NeonButton variant="orange" className="flex-1" disabled={!target} onClick={confirm}>
          Take the shot
        </NeonButton>
      </div>
      <p className="mt-3 text-center text-xs text-muted">
        {ROLE_META.sheriff.description}
      </p>
    </PhaseShell>
  );
}

/* ---------------- Passive (civilian / spectator) ---------------- */
function PassiveNight({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <PhaseShell title={title} subtitle={subtitle} accent="teal">
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="text-6xl"
        >
          🌙
        </motion.div>
        <p className="max-w-xs text-sm text-muted">
          The Mafia stalks, the Doctor guards, the Detective suspects. Wait for
          dawn.
        </p>
      </div>
    </PhaseShell>
  );
}

/* ---------------- Shared shell ---------------- */
function PhaseShell({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string;
  subtitle: string;
  accent: "pink" | "teal";
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto h-full w-full max-w-md overflow-y-auto px-5 py-4 no-scrollbar"
    >
      <div className="mb-4 text-center">
        <p className={`font-display text-xs uppercase tracking-[0.4em] ${accent === "pink" ? "text-neon-pink neon-text" : "text-neon-teal neon-text-teal"}`}>
          Night Phase
        </p>
        <h2 className="mt-1 font-display text-2xl uppercase text-ink">{title}</h2>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>
      {children}
    </motion.div>
  );
}
