import { NextResponse } from "next/server";

import { getAdminGame, isGameError, updateEventJoinPin } from "@/lib/game";
import { requireAdminSession } from "@/lib/session";

export async function PATCH(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { joinPin?: string }
    | null;

  try {
    await updateEventJoinPin(session.gameId, body?.joinPin ?? "");
    return NextResponse.json({ ok: true, game: await getAdminGame(session.gameId) });
  } catch (error) {
    if (isGameError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
