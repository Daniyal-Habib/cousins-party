"use client";

import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSession } from "@/lib/stores/session";
import type { UserProfile } from "@/lib/types";

/**
 * Syncs the logged-in user's profile from Firestore (live), and exposes
 * helpers to update name/photo. Firestore doc id == lowercased email.
 *
 * If the profile doesn't exist yet (first login), we create it with default
 * stats. Surfaces a human-readable `error` (e.g. "permission-denied") so the
 * UI can tell the user to fix Firestore rules instead of hanging forever.
 */
export function useUser() {
  const { email, name, isLoggedIn } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const configured = Boolean(db);

  useEffect(() => {
    if (!isLoggedIn || !email || !configured) {
      setLoading(false);
      setProfile(null);
      return;
    }
    const ref = doc(db!, "users", email);
    let cancelled = false;

    // Ensure the doc exists on first login.
    (async () => {
      try {
        const snap = await getDoc(ref);
        if (cancelled) return;
        if (!snap.exists()) {
          const now = Date.now();
          await setDoc(ref, {
            email,
            name: name ?? "Player",
            photoUrl: null,
            stars: 0,
            gamesPlayed: 0,
            wins: 0,
            createdAt: now,
            updatedAt: serverTimestamp(),
          });
        }
        setError(null);
      } catch (e) {
        console.error("useUser: ensure profile failed", e);
        setError(friendlyError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    // Live-sync profile afterwards; surface read errors too.
    const unsub = onSnapshot(
      ref,
      (snap) => setProfile((snap.data() as UserProfile) ?? null),
      (e) => {
        console.error("useUser: listen failed", e);
        setError(friendlyError(e));
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
      unsub();
    };
  }, [isLoggedIn, email, name, configured]);

  /** Update display name + photo. */
  async function updateProfile(patch: Partial<Pick<UserProfile, "name" | "photoUrl">>) {
    if (!email || !configured) return;
    await updateDoc(doc(db!, "users", email), { ...patch, updatedAt: serverTimestamp() });
  }

  return { profile, loading, error, updateProfile, configured };
}

/** Turn a Firebase error code into a user-actionable message. */
function friendlyError(e: unknown): string {
  const code = (e as { code?: string }).code ?? "";
  if (code === "permission-denied" || code.includes("permission-denied")) {
    return "Firestore denied access. Open your Firebase console → Firestore → Rules, and set them to allow read/write (see README).";
  }
  if (code === "unavailable") return "Firestore is unavailable. Check your connection.";
  if (code === "unimplemented") {
    return "Firestore isn't enabled for this project yet. Enable it in the Firebase console.";
  }
  return e instanceof Error ? e.message : "Couldn't reach your profile.";
}
