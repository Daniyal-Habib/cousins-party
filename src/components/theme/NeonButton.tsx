"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/cn";

type Variant = "pink" | "teal" | "orange" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface NeonButtonProps
  extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  /** Adds an animated neon glow ring around the button */
  glow?: boolean;
}

const variants: Record<Variant, string> = {
  pink: "bg-neon-pink-orange text-white shadow-neon-pink",
  teal: "bg-neon-teal-blue text-vice-night shadow-neon-teal",
  orange: "bg-neon-orange text-white shadow-neon-orange",
  ghost: "bg-white/5 text-ink border border-white/15 backdrop-blur-md",
  danger: "bg-red-600/90 text-white shadow-[0_0_12px_rgba(239,68,68,0.6)]",
};

const sizes: Record<Size, string> = {
  sm: "px-4 py-2 text-sm rounded-xl",
  md: "px-6 py-3 text-base rounded-2xl",
  lg: "px-8 py-4 text-lg rounded-2xl",
};

export function NeonButton({
  variant = "pink",
  size = "md",
  fullWidth,
  glow,
  className,
  children,
  disabled,
  ...props
}: NeonButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={cn(
        "relative inline-flex items-center justify-center gap-2",
        "font-bold uppercase tracking-wide select-none",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        glow && "animate-neon-pulse",
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
}
