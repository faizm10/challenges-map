import { NextResponse } from "next/server";

import { resetGame } from "@/lib/game";
import { requireAdminSession } from "@/lib/session";

export async function POST() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  return NextResponse.json({ ok: true, ...resetGame() });
}
