import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LivePodiumLeaderboard } from "@/components/live-podium-leaderboard";
import { resolveEventFinish } from "@/lib/game-finish";
import { getChallenges, getGameBySlug, getLeaderboard } from "@/lib/game";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  return {
    title: game ? `Live Leaderboard — ${game.name}` : "Live Leaderboard",
    description: "Animated live podium leaderboard with real-time team ranking updates.",
  };
}

export default async function EventLeaderboardPage({ params }: Props) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  if (!game) notFound();

  const challenges = await getChallenges(game.id, true);
  const fin = resolveEventFinish(game.finish_point_label, game.settings);
  const initialData = {
    event: {
      title: game.name,
      finish_point: fin.addressLabel,
      released_count: challenges.filter((c) => c.is_released).length,
      total_challenges: challenges.length,
    },
    leaderboard: await getLeaderboard(game.id),
  };

  return <LivePodiumLeaderboard initialData={initialData} eventSlug={slug} />;
}
