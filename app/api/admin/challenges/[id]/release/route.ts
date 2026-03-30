import { NextResponse } from "next/server";

import { getChallenges, getLeaderboard, updateChallengeRelease } from "@/lib/game";
import { requireAdminSession } from "@/lib/session";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { isReleased?: boolean } | null;
  await updateChallengeRelease(session.gameId, Number(id), Boolean(body?.isReleased));

  return NextResponse.json({
    ok: true,
    challenges: await getChallenges(session.gameId, true),
    leaderboard: await getLeaderboard(session.gameId),
  });
}
