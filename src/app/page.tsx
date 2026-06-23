"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GradientBackdrop } from "@/components/theme/GradientBackdrop";
import { NeonButton } from "@/components/theme/NeonButton";
import { GlassPanel } from "@/components/theme/GlassPanel";
import { useSession } from "@/lib/stores/session";

export default function LoginPage() {
  const router = useRouter();
  const { isLoggedIn, login } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Already logged in -> go to home.
  useEffect(() => {
    if (isLoggedIn) router.replace("/home");
  }, [isLoggedIn, router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    const em = email.trim().toLowerCase();
    if (n.length < 2) return setError("Tell us your name, cousin.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))
      return setError("Enter a valid email — it's your player ID.");
    setError(null);
    login(em, n);
    router.replace("/home");
  }

  return (
    <>
      <GradientBackdrop />
      <main className="relative flex min-h-[100dvh] flex-col items-center px-6 pb-10 pt-[14vh]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          className="w-full max-w-sm"
        >
          {/* Logo / title */}
          <div className="mb-8 text-center">
            <p className="font-display text-xs uppercase tracking-[0.4em] text-neon-teal neon-text-teal">
              Vice City Nights
            </p>
            <h1 className="mt-2 font-display text-5xl uppercase leading-none">
              <span className="gradient-title">Cousins</span>
              <br />
              <span className="text-ink neon-text">Game Night</span>
            </h1>
            <p className="mt-3 text-sm text-muted">Mafia · UNO · Word Guesser</p>
          </div>

          <GlassPanel glow="pink" className="space-y-4">
            <h2 className="font-display text-lg uppercase tracking-wide text-ink">
              Sign in
            </h2>
            <p className="-mt-2 text-xs text-muted">
              No passwords. Your email is just your player ID so your stars
              sync across phones.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <Field
                label="Name"
                value={name}
                onChange={setName}
                placeholder="e.g. Daniyal"
                autoFocus
              />
              <Field
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
              />

              {error && (
                <p className="text-sm font-semibold text-neon-pink neon-text">
                  {error}
                </p>
              )}

              <NeonButton type="submit" variant="pink" size="lg" fullWidth glow>
                Enter →
              </NeonButton>
            </form>
          </GlassPanel>

          <p className="mt-6 text-center text-xs text-muted/70">
            Built for the cousins · Online &amp; Pass &amp; Play
          </p>
        </motion.div>
      </main>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-display text-[11px] uppercase tracking-wider text-muted">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        className="w-full rounded-2xl border border-white/15 bg-vice-night/60 px-4 py-3 text-ink outline-none transition placeholder:text-muted/50 focus:border-neon-teal focus:shadow-neon-teal"
      />
    </label>
  );
}
