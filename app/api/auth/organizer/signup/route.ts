import { NextResponse } from "next/server";

import { isGameError } from "@/lib/game-error";
import { isSupabaseUnavailable } from "@/lib/data-source";
import { createOrganizerAccount } from "@/lib/organizer-auth";
import { setSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string; displayName?: string }
    | null;

  try {
    const account = await createOrganizerAccount({
      email: body?.email ?? "",
      password: body?.password ?? "",
      displayName: body?.displayName ?? "",
    });

    await setSession({ role: "organizer", organizerId: account.id });
    return NextResponse.json({ ok: true, organizerId: account.id });
  } catch (error) {
    if (isGameError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (isSupabaseUnavailable(error)) {
      return NextResponse.json(
        { error: "Account signup requires a database connection." },
        { status: 503 }
      );
    }
    const code =
      error && typeof error === "object" && "code" in error ? String((error as { code?: string }).code) : "";
    if (code === "42P01") {
      return NextResponse.json(
        { error: "Run the organizer_accounts migration on your database." },
        { status: 503 }
      );
    }
    throw error;
  }
}
