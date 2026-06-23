import { cn } from "@/lib/cn";

/**
 * Full-bleed Vice City backdrop:
 *  - sunset gradient sky (purple -> pink -> orange)
 *  - retro perspective grid horizon
 *  - palm-tree silhouettes
 *  - subtle floating neon orbs
 *
 * Sits absolutely behind page content; pointer-events disabled.
 */
export function GradientBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      {/* Sunset sky */}
      <div className="absolute inset-0 bg-vice-sunset opacity-90" />

      {/* Starfield specks */}
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:50px_50px]" />

      {/* Sun disc */}
      <div className="absolute left-1/2 top-[36%] h-40 w-40 -translate-x-1/2 rounded-full bg-gradient-to-b from-yellow-200 via-neon-orange to-neon-pink opacity-80 blur-[2px]" />
      {/* Sun scanline bars (retro) */}
      <div className="absolute left-1/2 top-[36%] h-40 w-44 -translate-x-1/2 overflow-hidden opacity-80">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="absolute left-0 right-0 h-[6px] bg-vice-night"
            style={{ top: `${55 + i * 10}%` }}
          />
        ))}
      </div>

      {/* Perspective grid horizon */}
      <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-vice-grid bg-grid [perspective:300px] [transform:rotateX(60deg)] opacity-50" />

      {/* Palm-tree silhouettes */}
      <PalmTree className="absolute -left-4 bottom-0 h-72 w-44 text-vice-night/90" />
      <PalmTree className="absolute -right-6 bottom-0 h-80 w-48 -scale-x-100 text-vice-night/90" />

      {/* Floating neon orbs */}
      <div className="absolute left-[15%] top-[18%] h-3 w-3 rounded-full bg-neon-pink shadow-neon-pink animate-float-up" />
      <div className="absolute right-[22%] top-[28%] h-2 w-2 rounded-full bg-neon-teal shadow-neon-teal animate-float-up [animation-delay:1s]" />
      <div className="absolute left-[60%] top-[14%] h-2.5 w-2.5 rounded-full bg-neon-blue shadow-neon-teal animate-float-up [animation-delay:2s]" />
    </div>
  );
}

/** Stylized palm-tree silhouette (SVG path), inherits currentColor. */
function PalmTree({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 200"
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Trunk */}
      <path d="M46 200 C 44 150, 45 110, 52 80 C 53 76, 50 74, 48 78 C 42 110, 43 150, 44 200 Z" />
      {/* Fronds */}
      <path d="M50 78 C 30 66, 10 64, 0 74 C 18 70, 34 74, 50 82 Z" />
      <path d="M50 78 C 70 66, 90 64, 100 74 C 82 70, 66 74, 50 82 Z" />
      <path d="M50 76 C 36 56, 24 40, 12 40 C 28 52, 40 64, 50 80 Z" />
      <path d="M50 76 C 64 56, 76 40, 88 40 C 72 52, 60 64, 50 80 Z" />
      <path d="M50 74 C 48 54, 50 34, 56 20 C 54 40, 54 58, 52 78 Z" />
    </svg>
  );
}
