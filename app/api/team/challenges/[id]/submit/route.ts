import { NextResponse } from "next/server";

import { getTeamDashboard, isChallengeReleased, updateTeamChallengeSubmission } from "@/lib/game";
import { requireTeamSession } from "@/lib/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireTeamSession();
  if (!session?.teamId) {
    return NextResponse.json({ error: "Team access required." }, { status: 401 });
  }

  const { id } = await params;
  const challengeId = Number(id);
  if (!(await isChallengeReleased(challengeId))) {
    return NextResponse.json({ error: "Challenge is not available." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as
    | { proofNote?: string; status?: "submitted" | "not_started" }
    | null;

  await updateTeamChallengeSubmission(
    session.teamId,
    challengeId,
    body?.proofNote ?? "",
    body?.status === "not_started" ? "not_started" : "submitted"
  );

  return NextResponse.json({
    ok: true,
    dashboard: await getTeamDashboard(session.teamId),
  });
}
