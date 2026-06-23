"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GlassPanel } from "@/components/theme/GlassPanel";
import { NeonButton } from "@/components/theme/NeonButton";
import { Avatar } from "@/components/theme/Avatar";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useUser } from "@/lib/hooks/useUser";
import { useSession } from "@/lib/stores/session";
import { uploadProfilePhoto } from "@/lib/storage/uploadProfilePhoto";

export default function ProfilePage() {
  useRequireAuth();
  const router = useRouter();
  const { profile, updateProfile } = useUser();
  const { name: sessionName, email, logout } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);

  const [editName, setEditName] = useState(profile?.name ?? sessionName ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !email) return;
    setBusy(true);
    setMsg(null);
    try {
      const url = await uploadProfilePhoto(email, file);
      await updateProfile({ photoUrl: url });
      setMsg("Photo updated!");
    } catch (err) {
      console.error(err);
      setMsg("Couldn't upload photo. Storage configured?");
    } finally {
      setBusy(false);
    }
  }

  async function saveName() {
    const n = editName.trim();
    if (n.length < 2) return setMsg("Name too short.");
    await updateProfile({ name: n });
    setMsg("Saved!");
  }

  const winRate =
    profile && profile.gamesPlayed > 0
      ? Math.round((profile.wins / profile.gamesPlayed) * 100)
      : 0;

  return (
    <main className="mx-auto w-full max-w-md px-5 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center"
      >
        <button
          onClick={() => fileRef.current?.click()}
          className="relative"
          aria-label="Change photo"
        >
          <Avatar
            name={profile?.name ?? sessionName ?? "?"}
            photoUrl={profile?.photoUrl}
            size={120}
            ring="pink"
          />
          <span className="absolute -bottom-1 -right-1 rounded-full bg-neon-pink-orange p-2 shadow-neon-pink">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="currentColor">
              <path d="M12 5l7 7-2 2-3-3v6h-4v-6l-3 3-2-2z" />
            </svg>
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={handlePhoto}
        />
        <h1 className="mt-3 font-display text-2xl uppercase text-ink neon-text">
          {profile?.name ?? sessionName}
        </h1>
        <p className="text-xs text-muted">{email}</p>
        {busy && <p className="mt-1 text-xs text-neon-teal">Uploading…</p>}
        {msg && !busy && <p className="mt-1 text-xs text-neon-teal">{msg}</p>}
      </motion.section>

      {/* Stats */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mt-6 grid grid-cols-3 gap-3"
      >
        <Stat label="Stars" value={profile?.stars ?? 0} accent="orange" />
        <Stat label="Wins" value={profile?.wins ?? 0} accent="teal" />
        <Stat label="Win Rate" value={`${winRate}%`} accent="pink" />
      </motion.section>

      {/* Edit name */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6"
      >
        <GlassPanel>
          <label className="mb-1 block font-display text-[11px] uppercase tracking-wider text-muted">
            Display name
          </label>
          <div className="flex gap-2">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="flex-1 rounded-xl border border-white/15 bg-vice-night/60 px-4 py-2.5 text-ink outline-none focus:border-neon-teal focus:shadow-neon-teal"
            />
            <NeonButton variant="teal" size="sm" onClick={saveName}>
              Save
            </NeonButton>
          </div>
          <p className="mt-2 text-xs text-muted">
            Syncs to your global profile across all devices.
          </p>
        </GlassPanel>
      </motion.section>

      {/* Past games */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-6"
      >
        <NeonButton variant="ghost" fullWidth onClick={() => router.push("/profile/history")}>
          Past Games →
        </NeonButton>
      </motion.section>

      {/* Logout */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-4"
      >
        <NeonButton
          variant="danger"
          fullWidth
          onClick={() => {
            logout();
            router.replace("/");
          }}
        >
          Log out
        </NeonButton>
      </motion.section>
    </main>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: "pink" | "teal" | "orange";
}) {
  const color = {
    pink: "text-neon-pink neon-text",
    teal: "text-neon-teal neon-text-teal",
    orange: "text-neon-orange neon-text",
  }[accent];
  return (
    <div className="glass p-3 text-center">
      <p className={`font-display text-2xl ${color}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
    </div>
  );
}
