"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/stores/session";

/**
 * Client guard for authenticated screens. Redirects to "/" when not logged in.
 * Returns whether the session has been hydrated from storage yet so callers
 * can avoid flashing protected UI before the redirect fires.
 */
export function useRequireAuth() {
  const router = useRouter();
  const { isLoggedIn, _hasHydrated } = useSession();

  // useSession uses persist middleware; reading isLoggedIn before hydration
  // returns the initial false. We rely on the redirect effect below once it
  // flips. zustand persist hydrates asynchronously in React 18 / Next.js.
  useEffect(() => {
    if (_hasHydrated && !isLoggedIn) router.replace("/");
  }, [isLoggedIn, _hasHydrated, router]);

  return { isLoggedIn, hasHydrated: _hasHydrated };
}
