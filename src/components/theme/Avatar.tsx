import { cn } from "@/lib/cn";

const RING = {
  none: "ring-white/15",
  pink: "ring-neon-pink shadow-neon-pink",
  teal: "ring-neon-teal shadow-neon-teal",
  orange: "ring-neon-orange shadow-neon-orange",
};

/**
 * Circular profile avatar. Falls back to an initial letter chip when no photo.
 * Used for player boxes, voting grids, leaderboards, role-reveal cards.
 */
export function Avatar({
  name,
  photoUrl,
  size = 56,
  ring = "none",
  className,
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
  ring?: keyof typeof RING;
  className?: string;
}) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-full ring-2 bg-gradient-to-br from-vice-dusk to-vice-midnight",
        "flex items-center justify-center font-display text-white",
        RING[ring],
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="neon-text">{initial}</span>
      )}
    </div>
  );
}
