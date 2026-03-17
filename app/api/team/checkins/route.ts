import { NextResponse } from "next/server";

import { createTeamCheckin, getTeamCheckins, getTeamDashboard, isGameError } from "@/lib/game";
import { requireTeamSession } from "@/lib/session";

export async function GET() {
  const session = await requireTeamSession();
  if (!session?.teamId) {
    return NextResponse.json({ error: "Team access required." }, { status: 401 });
  }

  return NextResponse.json({ checkins: await getTeamCheckins(session.teamId) });
}

export async function POST(request: Request) {
  const session = await requireTeamSession();
  if (!session?.teamId) {
    return NextResponse.json({ error: "Team access required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        checkinType?: "start" | "challenge" | "finish";
        challengeId?: number | null;
        checkinNote?: string;
        latitude?: number | null;
        longitude?: number | null;
        accuracyMeters?: number | null;
        gpsCapturedAt?: string | null;
      }
    | null;

  if (!body?.checkinType) {
    return NextResponse.json({ error: "Check-in type is required." }, { status: 400 });
  }

  try {
    await createTeamCheckin({
      teamId: session.teamId,
      checkinType: body.checkinType,
      challengeId: body.challengeId ?? null,
      checkinNote: body.checkinNote ?? "",
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      accuracyMeters: body.accuracyMeters ?? null,
      gpsCapturedAt: body.gpsCapturedAt ?? null,
    });

    return NextResponse.json({
      ok: true,
      dashboard: await getTeamDashboard(session.teamId),
    });
  } catch (error) {
    if (isGameError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed." },
      { status: 500 }
    );
  }
}
