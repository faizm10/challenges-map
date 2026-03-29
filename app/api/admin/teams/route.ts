import { NextResponse } from "next/server";

import { createTeamForGame, getAdminGame, isGameError } from "@/lib/game";
import { requireAdminSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        teamName?: string;
        pin?: string;
        startLocationName?: string;
        address?: string;
        routeSummary?: string;
        walkTime?: string;
        color?: string;
        badgeLabel?: string;
      }
    | null;

  try {
    await createTeamForGame(session.gameId, {
      teamName: body?.teamName ?? "",
      pin: body?.pin ?? "",
      startLocationName: body?.startLocationName,
      address: body?.address,
      routeSummary: body?.routeSummary,
      walkTime: body?.walkTime,
      color: body?.color,
      badgeLabel: body?.badgeLabel,
    });

    return NextResponse.json({ ok: true, game: await getAdminGame(session.gameId) });
  } catch (error) {
    if (isGameError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
