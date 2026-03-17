import { NextResponse } from "next/server";

import { TEAM_PINS } from "@/lib/config";
import { setSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { pin?: string } | null;
  const pin = body?.pin;
  const match = Object.entries(TEAM_PINS).find(([, value]) => value === pin);

  if (!match) {
    return NextResponse.json({ error: "Invalid team PIN." }, { status: 401 });
  }

  const [teamId] = match;
  await setSession({ role: "team", teamId: Number(teamId) });
  return NextResponse.json({ ok: true, teamId: Number(teamId) });
}
