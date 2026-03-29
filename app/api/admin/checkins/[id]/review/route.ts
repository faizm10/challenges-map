import { NextResponse } from "next/server";

import { getAdminGame, isGameError, reviewTeamCheckin } from "@/lib/game";
import { requireAdminSession } from "@/lib/session";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as
    | { status?: "pending" | "verified" | "rejected"; reviewNote?: string }
    | null;

  const status =
    body?.status === "verified" || body?.status === "rejected" ? body.status : "pending";

  try {
    await reviewTeamCheckin(session.gameId, Number(id), status, body?.reviewNote ?? "", "HQ Admin");
    return NextResponse.json({ ok: true, game: await getAdminGame(session.gameId) });
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
