import { NextResponse } from "next/server";

import {
  getTeamDashboard,
  isChallengeReleased,
  isGameError,
  MAX_FILES_PER_UPLOAD_REQUEST,
  uploadTeamChallengeMedia,
} from "@/lib/game";
import { requireTeamSession } from "@/lib/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireTeamSession();
  if (!session?.teamId) {
    return NextResponse.json({ error: "Team access required." }, { status: 401 });
  }

  const { id } = await params;
  const challengeId = Number(id);
  if (!(await isChallengeReleased(challengeId))) {
    return NextResponse.json({ error: "Challenge is not available." }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  const files = formData
    ? Array.from(formData.getAll("files")).filter((value): value is File => value instanceof File)
    : [];

  if (!files.length) {
    return NextResponse.json({ error: "At least one file is required." }, { status: 400 });
  }

  if (files.length > MAX_FILES_PER_UPLOAD_REQUEST) {
    return NextResponse.json(
      { error: `You can upload up to ${MAX_FILES_PER_UPLOAD_REQUEST} files at a time.` },
      { status: 400 }
    );
  }

  try {
    await Promise.all(files.map((file) => uploadTeamChallengeMedia(session.teamId!, challengeId, file)));
    return NextResponse.json({
      ok: true,
      dashboard: await getTeamDashboard(session.teamId),
    });
  } catch (error) {
    if (isGameError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 500 }
    );
  }
}
