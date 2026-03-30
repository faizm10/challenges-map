import { NextResponse } from "next/server";

import { getAdminGame, isGameError, updateGameEventFinish } from "@/lib/game";
import { requireAdminSession } from "@/lib/session";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  return NextResponse.json(await getAdminGame(session.gameId));
}

export async function PATCH(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    finishPointLabel?: string;
    finishShortName?: string | null;
    finishLatitude?: number | null;
    finishLongitude?: number | null;
  } | null;

  try {
    const eventFinish = await updateGameEventFinish(session.gameId, {
      finishPointLabel: body?.finishPointLabel ?? "",
      finishShortName: body?.finishShortName,
      finishLatitude: body?.finishLatitude,
      finishLongitude: body?.finishLongitude,
    });
    return NextResponse.json({ ok: true, eventFinish });
  } catch (error) {
    if (isGameError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
