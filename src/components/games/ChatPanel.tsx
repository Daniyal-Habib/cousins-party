"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Avatar } from "@/components/theme/Avatar";
import { useChat, useAutoScroll } from "@/lib/hooks/useChat";
import { cn } from "@/lib/cn";

/**
 * Reusable chat panel for public day chat, spectator chat, and Mafia chat.
 * `subcollection` picks the Firestore path; Mafia chat is gated by security
 * rules so non-Mafia callers simply see nothing.
 */
export function ChatPanel({
  code,
  subcollection,
  author,
  placeholder = "Type a message…",
  accent = "pink",
  compact,
  viewerIsDead,
}: {
  code: string;
  subcollection: string;
  author: { uid: string; name: string; photo: string | null; isDead?: boolean };
  placeholder?: string;
  accent?: "pink" | "teal";
  compact?: boolean;
  viewerIsDead?: boolean;
}) {
  const { messages, send } = useChat(code, subcollection);
  const [text, setText] = useState("");
  const scrollRef = useAutoScroll<HTMLDivElement>(messages.length);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await send(author, text);
    setText("");
  }

  return (
    <div className={cn("flex flex-col", compact ? "h-full" : "h-full")}>
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3 no-scrollbar">
        {messages.filter(m => viewerIsDead || !m.isDead).length === 0 && (
          <p className="mt-4 text-center text-xs text-muted">
            No messages yet — break the ice.
          </p>
        )}
        {messages.filter(m => viewerIsDead || !m.isDead).map((m) => {
          const mine = m.authorUid === author.uid;
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex items-end gap-2", mine && "flex-row-reverse")}
            >
              <Avatar name={m.authorName} photoUrl={m.authorPhoto} size={28} />
              <div className={cn("max-w-[75%]", mine && "items-end text-right")}>
                {!mine && (
                  <p className="mb-0.5 px-1 text-[10px] uppercase tracking-wide text-muted">
                    {m.authorName}
                  </p>
                )}
                <div
                  className={cn(
                    "inline-block rounded-2xl px-3 py-2 text-sm",
                    mine
                      ? accent === "pink"
                        ? "bg-neon-pink-orange text-white"
                        : "bg-neon-teal-blue text-vice-night"
                      : "bg-white/10 text-ink",
                  )}
                >
                  {m.text}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-white/10 p-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          maxLength={500}
          className="flex-1 rounded-full border border-white/15 bg-vice-night/60 px-4 py-2 text-sm text-ink outline-none focus:border-neon-teal"
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          type="submit"
          disabled={!text.trim()}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full text-white disabled:opacity-40",
            accent === "pink" ? "bg-neon-pink-orange" : "bg-neon-teal-blue",
          )}
          aria-label="Send"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
          </svg>
        </motion.button>
      </form>
    </div>
  );
}
