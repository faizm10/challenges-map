import { NextResponse } from "next/server";

import { DEFAULT_DEV_GAME_SLUG } from "@/lib/config";
import { resolveEventFinish } from "@/lib/game-finish";
import { getChallenges, getGameBySlug, getLeaderboard } from "@/lib/game";
import { isPublicComingSoon } from "@/lib/public-site-mode";

export async function GET(request: Request) {
  if (isPublicComingSoon()) {
    return NextResponse.json({ error: "coming_soon" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const slug = (searchParams.get("slug") ?? DEFAULT_DEV_GAME_SLUG).trim().toLowerCase();
  const game = await getGameBySlug(slug);
  if (!game) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const challenges = await getChallenges(game.id, true);
  const fin = resolveEventFinish(game.finish_point_label, game.settings);

  return NextResponse.json({
    event: {
      title: game.name,
      finish_point: fin.addressLabel,
      released_count: challenges.filter((challenge) => challenge.is_released).length,
      total_challenges: challenges.length,
    },
    leaderboard: await getLeaderboard(game.id),
  });
}
