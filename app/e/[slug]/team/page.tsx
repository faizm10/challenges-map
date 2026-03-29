import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TeamDashboard } from "@/components/team-dashboard";
import { getGameBySlug } from "@/lib/game";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  return {
    title: game ? `Team — ${game.name}` : "Team Dashboard",
    description:
      "Team login and live checkpoint dashboard, including challenge proof, GPS check-ins, and standings.",
  };
}

export default async function EventTeamPage({ params }: Props) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  if (!game) notFound();

  return <TeamDashboard gameSlug={slug} />;
}
