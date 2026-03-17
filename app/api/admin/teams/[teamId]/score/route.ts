import { NextResponse } from "next/server";

import { getLeaderboard, updateTeamScore } from "@/lib/game";
import { requireAdminSession } from "@/lib/session";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const { teamId } = await params;
  const body = (await request.json().catch(() => null)) as
    | { arrivalRank?: string | number | null; creativityScore?: string | number | null }
    | null;

  const rawRank = body?.arrivalRank;
  const arrivalRank =
    rawRank === "" || rawRank === null || rawRank === undefined
      ? null
      : Math.max(1, Math.min(5, Number(rawRank)));

  updateTeamScore(Number(teamId), arrivalRank, Number(body?.creativityScore ?? 0));
  return NextResponse.json({ ok: true, leaderboard: getLeaderboard() });
}
