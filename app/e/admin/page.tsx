import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminGamesHub } from "@/components/admin-games-hub";
import { listGameSummariesForOwnerCredential } from "@/lib/game";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "HQ — Events",
  description: "Choose an event to open HQ or create a new game.",
};

export default async function AdminHubPage() {
  const session = await getSession();
  if (session?.role !== "admin" || session.ownerCredentialId == null) {
    redirect("/organizer/login?next=%2Fe%2Fadmin");
  }
  const games = await listGameSummariesForOwnerCredential(Number(session.ownerCredentialId));
  return <AdminGamesHub initialGames={games} />;
}
