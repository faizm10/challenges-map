import type { Metadata } from "next";

import { LivePodiumLeaderboard } from "@/components/live-podium-leaderboard";
import { UNION_STATION } from "@/lib/config";
import { getChallenges, getLeaderboard } from "@/lib/game";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live Leaderboard",
  description:
    "Animated live podium leaderboard for Converge with real-time team ranking updates.",
};

export default async function LeaderboardPage() {
  const challenges = await getChallenges(true);
  const initialData = {
    event: {
      title: "Converge",
      finish_point: UNION_STATION.finishPoint,
      released_count: challenges.filter((challenge) => challenge.is_released).length,
      total_challenges: challenges.length,
    },
    leaderboard: await getLeaderboard(),
  };

  return <LivePodiumLeaderboard initialData={initialData} />;
}
