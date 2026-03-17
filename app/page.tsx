import { LandingPage } from "@/components/landing-page";
import { CHALLENGE_SEED, TEAM_SEED, UNION_STATION } from "@/lib/config";
import { getChallenges, getLeaderboard } from "@/lib/game";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const challenges = getChallenges(true);
  const initialData = {
    event: {
      title: "Race to Union",
      finish_point: UNION_STATION.finishPoint,
      released_count: challenges.filter((challenge) => challenge.is_released).length,
      total_challenges: CHALLENGE_SEED.length,
    },
    leaderboard: getLeaderboard(),
  };

  const mapTeams = TEAM_SEED.map((team) => ({
    id: team.id,
    teamName: team.teamName,
    startLocationName: team.startLocationName,
    color: team.color,
  }));

  return <LandingPage initialData={initialData} mapTeams={mapTeams} />;
}
