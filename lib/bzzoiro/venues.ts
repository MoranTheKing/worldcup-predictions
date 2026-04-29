import { bzzoiroGet, bzzoiroGetPaginated, getBzzoiroPublicImageUrl } from "@/lib/bzzoiro/client";
import type { BzzoiroMatchEvent } from "@/lib/bzzoiro/matches";

export type BzzoiroVenue = {
  id?: number | string | null;
  name?: string | null;
  city?: string | null;
  country?: string | null;
  capacity?: number | null;
  team?: {
    id?: number | string | null;
    name?: string | null;
  } | null;
};

export type BzzoiroVenuePageData = {
  venue: BzzoiroVenue | null;
  imageUrl: string | null;
  worldCupEvents: BzzoiroMatchEvent[];
};

export async function getBzzoiroVenuePageData(venueId: string | number): Promise<BzzoiroVenuePageData> {
  const [venue, events] = await Promise.all([
    getBzzoiroVenue(venueId),
    getBzzoiroVenueWorldCupEvents(venueId),
  ]);

  return {
    venue,
    imageUrl: getBzzoiroPublicImageUrl("venue", venueId),
    worldCupEvents: events,
  };
}

async function getBzzoiroVenue(venueId: string | number) {
  try {
    return await bzzoiroGet<BzzoiroVenue>(`/venues/${encodeURIComponent(String(venueId))}/`);
  } catch (error) {
    console.error("[bzzoiro] venue detail fetch failed", error);
    return null;
  }
}

async function getBzzoiroVenueWorldCupEvents(venueId: string | number) {
  const leagueId = process.env.BSD_WORLD_CUP_LEAGUE_ID;
  if (!leagueId) return [];

  try {
    const events = await bzzoiroGetPaginated<BzzoiroMatchEvent>(
      "/events/",
      {
        league: leagueId,
        date_from: "2026-06-01",
        date_to: "2026-07-31",
        tz: "Asia/Jerusalem",
      },
      6,
    );

    return dedupeEvents(events)
      .filter((event) => String(event.venue?.id ?? "") === String(venueId))
      .sort((left, right) => getEventTime(left) - getEventTime(right));
  } catch (error) {
    console.error("[bzzoiro] venue events fetch failed", error);
    return [];
  }
}

function getEventTime(event: BzzoiroMatchEvent) {
  return new Date(event.event_date ?? event.date ?? "").getTime() || Number.MAX_SAFE_INTEGER;
}

function dedupeEvents(events: BzzoiroMatchEvent[]) {
  const seen = new Set<string>();
  const unique: BzzoiroMatchEvent[] = [];

  for (const event of events) {
    const key = [
      event.id ?? "",
      event.event_date ?? event.date ?? "",
      event.home_team ?? "",
      event.away_team ?? "",
    ].join("|");

    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(event);
  }

  return unique;
}
