import { NextResponse } from "next/server";

import { getChallenges, updateChallenge } from "@/lib/game";
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
    | { title?: string; text?: string }
    | null;
  updateChallenge(Number(id), body?.title ?? "", body?.text ?? "");

  return NextResponse.json({ ok: true, challenges: getChallenges(true) });
}
