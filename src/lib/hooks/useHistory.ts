"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { GameHistoryEntry } from "@/lib/types";

/** Live list of the signed-in user's past games (newest first). */
export function useHistory(email: string | null) {
  const [entries, setEntries] = useState<GameHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!email || !db) {
      setLoading(false);
      setEntries([]);
      return;
    }
    const q = query(
      collection(db, "users", email, "history"),
      orderBy("playedAt", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setEntries(snap.docs.map((d) => d.data() as GameHistoryEntry));
      setLoading(false);
    });
    return unsub;
  }, [email]);

  return { entries, loading };
}
