"use client";

import { useEffect, useRef, useState } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ChatMessage } from "@/lib/types";

/**
 * Live chat on a Firestore subcollection.
 *  - Public day chat   → rooms/{code}/chat
 *  - Spectator chat    → rooms/{code}/spectatorChat
 *  - Mafia-only chat   → rooms/{code}/mafiaChat  (security rules restrict reads
 *    to players whose role is "mafia"; non-mafia clients receive permission
 *    errors and the hook surfaces no messages — keeping it off their device).
 */
export function useChat(code: string, subcollection: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [denied, setDenied] = useState(false);
  const [enabled] = useState(Boolean(db));

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "rooms", code, subcollection), orderBy("createdAt", "asc"));
    // Permission-denied (e.g. non-mafia reading mafiaChat) → silently no-op,
    // which is exactly the desired privacy behavior.
    const unsub = onSnapshot(
      q,
      (snap) => setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatMessage)),
      (err) => {
        if ((err as { code?: string }).code === "permission-denied") setDenied(true);
      },
    );
    return unsub;
  }, [code, subcollection]);

  async function send(author: { uid: string; name: string; photo: string | null; isDead?: boolean }, text: string) {
    if (!db || !text.trim()) return;
    await addDoc(collection(db, "rooms", code, subcollection), {
      authorUid: author.uid,
      authorName: author.name,
      authorPhoto: author.photo,
      isDead: author.isDead ?? false,
      text: text.trim().slice(0, 500),
      createdAt: serverTimestamp(),
    });
  }

  return { messages, send, denied, enabled };
}

/**
 * Auto-scroll a chat container to bottom when new messages arrive.
 * Returns a ref to attach to the scrollable element.
 */
export function useAutoScroll<T extends HTMLElement>(dep: unknown) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [dep]);
  return ref;
}
