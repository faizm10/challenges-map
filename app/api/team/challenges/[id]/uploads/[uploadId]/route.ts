import { NextResponse } from "next/server";

import { deleteTeamChallengeMedia, getTeamDashboard, isGameError } from "@/lib/game";
import { requireTeamSession } from "@/lib/session";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; uploadId: string }> }
) {
  const session = await requireTeamSession();
  if (!session?.teamId) {
    return NextResponse.json({ error: "Team access required." }, { status: 401 });
  }

  const { id, uploadId } = await params;

  try {
    await deleteTeamChallengeMedia(session.teamId, Number(id), Number(uploadId));
    return NextResponse.json({
      ok: true,
      dashboard: await getTeamDashboard(session.teamId),
    });
  } catch (error) {
    if (isGameError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed." },
      { status: 500 }
    );
  }
}
