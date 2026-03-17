import type { Metadata } from "next";

import { LandingPage } from "@/components/landing-page";
import { CHALLENGE_SEED, TEAM_SEED, UNION_STATION } from "@/lib/config";
import { getChallenges, getLeaderboard } from "@/lib/game";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Converge",
  description:
    "Converge is a Toronto team city challenge where squads move through the city, complete live HQ drops, and converge at Union.",
};

export default async function HomePage() {
  const challenges = await getChallenges(true);
  const initialData = {
    event: {
      title: "Converge",
      finish_point: UNION_STATION.finishPoint,
      released_count: challenges.filter((challenge) => challenge.is_released).length,
      total_challenges: CHALLENGE_SEED.length,
    },
    leaderboard: await getLeaderboard(),
  };

  const mapTeams = TEAM_SEED.map((team) => ({
    id: team.id,
    teamName: team.teamName,
    startLocationName: team.startLocationName,
    color: team.color,
  }));

  return <LandingPage initialData={initialData} mapTeams={mapTeams} />;
}
