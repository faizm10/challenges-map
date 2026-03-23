import { NextResponse } from "next/server";

import { UNION_STATION } from "@/lib/config";
import { getChallenges, getLeaderboard } from "@/lib/game";
import { isPublicComingSoon } from "@/lib/public-site-mode";

export async function GET() {
  if (isPublicComingSoon()) {
    return NextResponse.json({ error: "coming_soon" }, { status: 403 });
  }

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
