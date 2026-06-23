"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Local session state only. The actual profile lives in Firestore keyed by
 * email; this store just remembers WHO is logged in on this device so we can
 * fetch/sync their profile and route them past the login screen.
 */
interface SessionState {
  email: string | null;
  name: string | null;
  /** Set once the user has completed instant-login at least once. */
  isLoggedIn: boolean;
  login: (email: string, name: string) => void;
  logout: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      email: null,
      name: null,
      isLoggedIn: false,
      login: (email, name) =>
        set({ email: email.trim().toLowerCase(), name: name.trim(), isLoggedIn: true }),
      logout: () => set({ email: null, name: null, isLoggedIn: false }),
    }),
    { name: "cgn-session" },
  ),
);
