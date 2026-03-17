import { NextResponse } from "next/server";

import { getAdminGame, isGameError, updateTeamCredentials } from "@/lib/game";
import { requireAdminSession } from "@/lib/session";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const { teamId } = await params;
  const body = (await request.json().catch(() => null)) as
    | { teamName?: string; pin?: string }
    | null;

  try {
    await updateTeamCredentials(Number(teamId), body?.teamName ?? "", body?.pin ?? "");
    return NextResponse.json({ ok: true, game: await getAdminGame() });
  } catch (error) {
    if (isGameError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
