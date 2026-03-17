import { NextResponse } from "next/server";

import { supabase } from "@/lib/supabase";
import { setSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { name?: string; pin?: string }
    | null;
  const name = body?.name?.trim();
  const pin = body?.pin?.trim();

  if (!name || !pin) {
    return NextResponse.json(
      { error: "Admin name and PIN are required." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("access_credentials")
    .select("id")
    .eq("role", "admin")
    .eq("display_name", name)
    .eq("pin", pin)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data?.id) {
    return NextResponse.json({ error: "Invalid admin PIN." }, { status: 401 });
  }

  await setSession({ role: "admin" });
  return NextResponse.json({ ok: true });
}
