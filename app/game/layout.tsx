import DashboardShell from "@/components/DashboardShell";
import DevToolsFloatingButton from "@/components/DevToolsFloatingButton";

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell>
      {children}
      <DevToolsFloatingButton />
    </DashboardShell>
  );
}
