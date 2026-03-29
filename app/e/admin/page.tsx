import type { Metadata } from "next";

import { AdminGamesHub } from "@/components/admin-games-hub";
import { listGameSummaries } from "@/lib/game";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "HQ — Events",
  description: "Choose an event to open HQ or create a new game.",
};

export default async function AdminHubPage() {
  const games = await listGameSummaries();
  return <AdminGamesHub initialGames={games} />;
}
