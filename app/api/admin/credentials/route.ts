import { NextResponse } from "next/server";

import { isGameError, updateAdminCredentials } from "@/lib/game";
import { requireAdminSession } from "@/lib/session";

export async function PATCH(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { currentPin?: string; newName?: string; newPin?: string; confirmNewPin?: string }
    | null;

  const currentPin = body?.currentPin?.trim() ?? "";
  const newName = body?.newName?.trim() ?? "";
  const newPin = body?.newPin?.trim() ?? "";
  const confirmNewPin = body?.confirmNewPin?.trim() ?? "";

  if (!currentPin || !newName || !newPin || !confirmNewPin) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  if (newPin !== confirmNewPin) {
    return NextResponse.json(
      { error: "New PIN and confirmation do not match." },
      { status: 400 }
    );
  }

  try {
    await updateAdminCredentials(session.gameId, currentPin, newName, newPin);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isGameError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
