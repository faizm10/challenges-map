import { NextResponse } from "next/server";

import { ADMIN_PIN } from "@/lib/config";
import { setSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { pin?: string } | null;
  if (body?.pin !== ADMIN_PIN) {
    return NextResponse.json({ error: "Invalid admin PIN." }, { status: 401 });
  }

  await setSession({ role: "admin" });
  return NextResponse.json({ ok: true });
}
