import Link from "next/link";

export default function DevToolsFloatingButton() {
  if (process.env.NODE_ENV === "production") return null;

  return (
    <Link
      href="/dev-tools"
      className="fixed bottom-24 end-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(255,182,73,0.4)] bg-[linear-gradient(135deg,rgba(255,182,73,0.9),rgba(255,47,166,0.8))] text-lg shadow-[0_0_24px_rgba(255,182,73,0.4)] transition hover:scale-105 md:bottom-6"
      title="Developer Tools"
      aria-label="Open developer tools"
    >
      🛠️
    </Link>
  );
}
