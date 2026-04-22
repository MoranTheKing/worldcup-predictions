import DashboardShell from "@/components/DashboardShell";
import DevToolsFloatingButton from "@/components/DevToolsFloatingButton";
import GameSubNav from "@/components/game/GameSubNav";

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-3xl">
        <div className="mb-1">
          <h1
            className="text-2xl md:text-3xl font-black"
            style={{ fontFamily: "var(--font-display)", color: "var(--wc-fg1)" }}
          >
            משחק הניחושים
          </h1>
          <p className="text-sm mt-1 mb-5" style={{ color: "var(--wc-fg2)" }}>
            ניחוש פעם אחת — מתחרה בכל הליגות שלך
          </p>
        </div>
        <GameSubNav />
        {children}
      </div>
      <DevToolsFloatingButton />
    </DashboardShell>
  );
}
