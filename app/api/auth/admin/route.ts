import { NextResponse } from "next/server";

import { isSupabaseUnavailable } from "@/lib/data-source";
import { findLocalCredential } from "@/lib/local-store";
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

  try {
    const { data, error } = await supabase
      .from("access_credentials")
      .select("id")
      .eq("role", "admin")
      .eq("display_name", name)
      .eq("pin", pin)
      .maybeSingle<{ id: number }>();

    if (error) throw error;
    if (!data?.id) {
      return NextResponse.json({ error: "Invalid admin name or PIN." }, { status: 401 });
    }

    await setSession({ role: "admin" });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (!isSupabaseUnavailable(error)) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Request failed." },
        { status: 500 }
      );
    }

    const localCredential = findLocalCredential("admin", name, pin);
    if (!localCredential) {
      return NextResponse.json({ error: "Invalid admin name or PIN." }, { status: 401 });
    }

    await setSession({ role: "admin" });
    return NextResponse.json({ ok: true, fallback: true });
  }
}
