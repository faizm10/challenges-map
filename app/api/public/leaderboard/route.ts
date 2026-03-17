import { NextResponse } from "next/server";

import { UNION_STATION } from "@/lib/config";
import { getChallenges, getLeaderboard } from "@/lib/game";

export async function GET() {
  const challenges = await getChallenges(true);
  return NextResponse.json({
    event: {
      title: "Converge",
      finish_point: UNION_STATION.finishPoint,
      released_count: challenges.filter((challenge) => challenge.is_released).length,
      total_challenges: challenges.length,
    },
    leaderboard: await getLeaderboard(),
  });
}
