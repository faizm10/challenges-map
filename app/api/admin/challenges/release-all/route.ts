import { NextResponse } from "next/server";

import { getChallenges, isGameError, releaseAllChallenges } from "@/lib/game";
import { requireAdminSession } from "@/lib/session";

export async function PATCH() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  try {
    await releaseAllChallenges(session.gameId);
    return NextResponse.json({ ok: true, challenges: await getChallenges(session.gameId, true) });
  } catch (error) {
    if (isGameError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
