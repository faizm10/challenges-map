import { NextResponse } from "next/server";

import { getAdminGame } from "@/lib/game";
import { requireAdminSession } from "@/lib/session";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  return NextResponse.json(await getAdminGame(session.gameId));
}
