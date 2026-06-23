import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds a neon glow ring of the given color */
  glow?: "pink" | "teal" | "orange" | "none";
}

const glowMap = {
  pink: "shadow-neon-pink border-neon-pink/30",
  teal: "shadow-neon-teal border-neon-teal/30",
  orange: "shadow-neon-orange border-neon-orange/30",
  none: "",
};

export function GlassPanel({
  glow = "none",
  className,
  children,
  ...props
}: GlassPanelProps) {
  return (
    <div
      className={cn(
        "glass p-5",
        glowMap[glow],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
