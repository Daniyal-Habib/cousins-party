import { GradientBackdrop } from "@/components/theme/GradientBackdrop";
import { BottomNav } from "@/components/nav/BottomNav";

/**
 * Layout for authenticated app screens (home / leaderboard / profile).
 * Provides the Vice City backdrop and persistent bottom nav.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <GradientBackdrop />
      <div className="relative flex min-h-[100dvh] flex-col">
        <div className="flex-1 overflow-y-auto">{children}</div>
        <BottomNav />
      </div>
    </>
  );
}
