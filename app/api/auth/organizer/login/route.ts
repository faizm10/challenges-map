import { NextResponse } from "next/server";

import { isSupabaseUnavailable } from "@/lib/data-source";
import { verifyOrganizerLogin } from "@/lib/organizer-auth";
import { setSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;

  const email = body?.email ?? "";
  const password = body?.password ?? "";

  if (!email.trim() || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  try {
    const account = await verifyOrganizerLogin(email, password);
    if (!account) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    await setSession({ role: "organizer", organizerId: account.id });
    return NextResponse.json({ ok: true, organizerId: account.id });
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      return NextResponse.json(
        { error: "Login requires a database connection." },
        { status: 503 }
      );
    }
    throw error;
  }
}
