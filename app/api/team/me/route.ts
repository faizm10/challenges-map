import { NextResponse } from "next/server";

import { getTeamDashboard } from "@/lib/game";
import { requireTeamSession } from "@/lib/session";

export async function GET() {
  const session = await requireTeamSession();
  if (!session?.teamId) {
    return NextResponse.json({ error: "Team access required." }, { status: 401 });
  }

  const dashboard = await getTeamDashboard(session.gameId, session.teamId);
  if (!dashboard) {
    return NextResponse.json({ error: "Team not found." }, { status: 404 });
  }

  return NextResponse.json(dashboard);
}
