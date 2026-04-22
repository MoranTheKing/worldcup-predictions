import DashboardShell from "@/components/DashboardShell";
import DevToolsFloatingButton from "@/components/DevToolsFloatingButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell>
      {children}
      <DevToolsFloatingButton />
    </DashboardShell>
  );
}
