"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { GradientBackdrop } from "@/components/theme/GradientBackdrop";
import { GlassPanel } from "@/components/theme/GlassPanel";
import { NeonButton } from "@/components/theme/NeonButton";
import { FirebaseErrorBanner } from "@/components/theme/FirebaseErrorBanner";
import { BackHeader } from "@/components/nav/BackHeader";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useUser } from "@/lib/hooks/useUser";
import { createRoom, generateRoomCode } from "@/lib/rooms/roomService";
import type { GameType } from "@/lib/types";

const GAMES: { id: GameType; name: string; tagline: string; available: boolean }[] = [
  { id: "mafia", name: "Mafia", tagline: "Find the killers", available: true },
  { id: "uno", name: "UNO", tagline: "Soon", available: false },
  { id: "word-guesser", name: "Word Guesser", tagline: "Soon", available: false },
];

export default function CreatePageWrapper() {
  return (
    <Suspense>
      <CreatePage />
    </Suspense>
  );
}

function CreatePage() {
  useRequireAuth();
  const router = useRouter();
  const params = useSearchParams();
  const { profile, loading, error: profileError } = useUser();
  const [selected, setSelected] = useState<GameType>(
    (params.get("game") as GameType) ?? "mafia",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    // Surface the real blocker instead of the vague "still loading" message.
    if (profileError) return setError(profileError);
    if (loading) return setError("Still loading your profile — one second.");
    if (!profile) return setError("No profile found. Try logging out and back in.");
    setBusy(true);
    setError(null);
    try {
      const code = await generateRoomCode();
      await createRoom({
        code,
        hostUid: profile.email,
        hostName: profile.name,
        hostPhoto: profile.photoUrl,
        gameType: selected,
      });
      router.replace(`/room/${code}`);
    } catch (e) {
      console.error(e);
      setError(friendlyFirebaseError(e));
      setBusy(false);
    }
  }

  return (
    <>
      <GradientBackdrop />
      <BackHeader title="Create Room" />
      <main className="mx-auto w-full max-w-md space-y-4 px-5 py-4">
        <FirebaseErrorBanner error={profileError} />
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="mb-1 px-1 font-display text-xs uppercase tracking-[0.3em] text-muted">
            Choose a game
          </h2>
          <div className="space-y-3">
            {GAMES.map((g) => {
              const active = selected === g.id;
              return (
                <button
                  key={g.id}
                  disabled={!g.available}
                  onClick={() => setSelected(g.id)}
                  className={`glass flex w-full items-center justify-between p-4 text-left transition ${
                    active ? "border-neon-pink shadow-neon-pink" : ""
                  } ${g.available ? "" : "opacity-50"}`}
                >
                  <div>
                    <p className="font-display text-lg uppercase text-ink">{g.name}</p>
                    <p className="text-xs text-muted">{g.tagline}</p>
                  </div>
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                      active ? "border-neon-pink bg-neon-pink" : "border-white/30"
                    }`}
                  >
                    {active && (
                      <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth={3}>
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {error && <p className="text-center text-sm text-neon-pink neon-text">{error}</p>}

        <NeonButton variant="pink" size="lg" fullWidth glow disabled={busy} onClick={handleCreate}>
          {busy ? "Creating…" : "Create Room →"}
        </NeonButton>

        <GlassPanel className="text-center">
          <p className="text-xs text-muted">
            You&apos;ll get a 4-digit code to share. Up to 12 players can join —
            everyone doodles on a shared canvas while waiting.
          </p>
        </GlassPanel>
      </main>
    </>
  );
}

/** Turn a Firebase permission error into a message pointing at the right console page. */
function friendlyFirebaseError(e: unknown): string {
  const code = (e as { code?: string }).code ?? "";
  const msg = e instanceof Error ? e.message : "";
  if (code === "permission-denied" || /permission|insufficient/i.test(msg)) {
    return "Firestore blocked this write. Open Firebase Console → Firestore Database → Rules, set them to `allow read, write: if true;`, then Publish. (This is a separate page from Realtime Database.)";
  }
  return msg || "Couldn't create room.";
}
