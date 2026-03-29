import { NextResponse } from "next/server";

import { getAdminGame, reviewTeamChallenge } from "@/lib/game";
import { requireAdminSession } from "@/lib/session";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ teamId: string; challengeId: string }> }
) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const { teamId, challengeId } = await params;
  const body = (await request.json().catch(() => null)) as
    | { reviewStatus?: "pending" | "verified" | "rejected"; reviewNote?: string }
    | null;

  const reviewStatus =
    body?.reviewStatus === "verified" || body?.reviewStatus === "rejected"
      ? body.reviewStatus
      : "pending";

  await reviewTeamChallenge(
    session.gameId,
    Number(teamId),
    Number(challengeId),
    reviewStatus,
    body?.reviewNote ?? "",
    "HQ Admin"
  );

  return NextResponse.json({ ok: true, game: await getAdminGame(session.gameId) });
}
