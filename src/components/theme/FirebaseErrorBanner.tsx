"use client";

import { motion, AnimatePresence } from "framer-motion";
import { NeonButton } from "./NeonButton";

/**
 * Surfaces a Firestore/Firebase setup error inline. Shown when a hook reports
 * an `error` string (e.g. permission-denied on a brand-new project whose rules
 * default to deny). Helps the user fix their Firebase config instead of staring
 * at a hung screen.
 */
export function FirebaseErrorBanner({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry?: () => void;
}) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="mx-3 mb-3 rounded-2xl border border-neon-pink/50 bg-neon-pink/10 p-3 backdrop-blur-md"
        >
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-lg">⚠️</span>
            <div className="flex-1">
              <p className="font-display text-xs uppercase tracking-wide text-neon-pink">
                Setup needed
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink">{error}</p>
              {error.includes("Rules") && (
                <pre className="mt-2 overflow-x-auto rounded-lg bg-vice-night/80 p-2 text-[10px] text-neon-teal no-scrollbar">{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}</pre>
              )}
              {onRetry && (
                <div className="mt-2">
                  <NeonButton variant="ghost" size="sm" onClick={onRetry}>
                    Try again
                  </NeonButton>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
