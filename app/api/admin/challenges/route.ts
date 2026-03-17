import { NextResponse } from "next/server";

import { createChallenge, getChallenges, isGameError } from "@/lib/game";
import { requireAdminSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { title?: string; text?: string; expectedLocation?: string; allowMediaUpload?: boolean }
    | null;

  try {
    await createChallenge(
      body?.title ?? "",
      body?.text ?? "",
      body?.expectedLocation ?? "",
      body?.allowMediaUpload ?? true
    );
    return NextResponse.json({ ok: true, challenges: await getChallenges(true) });
  } catch (error) {
    if (isGameError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
