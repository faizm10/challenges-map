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
    | {
        title?: string;
        text?: string;
        expectedLocation?: string;
        allowMediaUpload?: boolean;
        teamPrompts?: Array<{
          teamId?: number;
          promptText?: string;
        }>;
        checkpoints?: Array<{
          teamId?: number;
          checkpointLabel?: string;
          checkpointAddress?: string;
          latitude?: number | null;
          longitude?: number | null;
          unlockRadiusMeters?: number | null;
        }>;
      }
    | null;

  try {
    await updateChallenge(
      session.gameId,
      Number(id),
      body?.title ?? "",
      body?.text ?? "",
      body?.expectedLocation ?? "",
      body?.allowMediaUpload ?? true,
      (body?.teamPrompts ?? []).map((prompt) => ({
        teamId: Number(prompt.teamId),
        promptText: prompt.promptText ?? "",
      })),
      (body?.checkpoints ?? []).map((checkpoint) => ({
        teamId: Number(checkpoint.teamId),
        checkpointLabel: checkpoint.checkpointLabel ?? "",
        checkpointAddress: checkpoint.checkpointAddress ?? "",
        latitude: (() => {
          const raw = checkpoint.latitude as unknown;
          return raw === null || raw === undefined || raw === "" ? null : Number(raw);
        })(),
        longitude: (() => {
          const raw = checkpoint.longitude as unknown;
          return raw === null || raw === undefined || raw === "" ? null : Number(raw);
        })(),
        unlockRadiusMeters:
          checkpoint.unlockRadiusMeters === null || checkpoint.unlockRadiusMeters === undefined
            ? null
            : Number(checkpoint.unlockRadiusMeters),
      }))
    );
  } catch (error) {
    if (isGameError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  return NextResponse.json({ ok: true, challenges: await getChallenges(session.gameId, true) });
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
    await deleteChallenge(session.gameId, Number(id));
  } catch (error) {
    if (isGameError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  return NextResponse.json({ ok: true, challenges: await getChallenges(session.gameId, true) });
}
