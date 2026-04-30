import { notFound } from "next/navigation";
import { getBzzoiroLivePreview } from "@/lib/bzzoiro/live-preview";
import MatchDetailClient, {
  type MatchDetailDevEvent,
  type MatchPagePlayer,
} from "../../[id]/MatchDetailClient";

export const dynamic = "force-dynamic";

export default async function BzzoiroLivePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isInteger(eventId) || eventId <= 0) notFound();

  const preview = await getBzzoiroLivePreview(eventId);
  if (!preview) notFound();

  return (
    <MatchDetailClient
      match={preview.previewMatch}
      bzzoiro={preview.matchCenter}
      players={[] as MatchPagePlayer[]}
      devEvents={[] as MatchDetailDevEvent[]}
    />
  );
}
