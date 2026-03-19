import { NextResponse } from "next/server";

import { deleteChallenge, getChallenges, isGameError, updateChallenge } from "@/lib/game";
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
    | { title?: string; text?: string; expectedLocation?: string; allowMediaUpload?: boolean }
    | null;

  try {
    await updateChallenge(
      Number(id),
      body?.title ?? "",
      body?.text ?? "",
      body?.expectedLocation ?? "",
      body?.allowMediaUpload ?? true
    );
  } catch (error) {
    if (isGameError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  return NextResponse.json({ ok: true, challenges: await getChallenges(true) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const { id } = await params;

  try {
    await deleteChallenge(Number(id));
  } catch (error) {
    if (isGameError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  return NextResponse.json({ ok: true, challenges: await getChallenges(true) });
}
