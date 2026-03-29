import { NextResponse } from "next/server";

import { isSupabaseUnavailable } from "@/lib/data-source";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { pin?: string } | null;
  const pin = body?.pin?.trim() ?? "";

  if (!/^\d{6}$/.test(pin)) {
    return NextResponse.json(
      { error: "Enter a valid 6-digit event PIN." },
      { status: 400 }
    );
  }

  try {
    const { data: credentials, error: credentialError } = await supabase
      .from("access_credentials")
      .select("game_id")
      .eq("role", "admin")
      .eq("pin", pin)
      .limit(2);

    if (credentialError) throw credentialError;

    const rows = (credentials ?? []) as Array<{ game_id: number | string | null }>;
    if (rows.length === 0 || rows[0]?.game_id == null) {
      return NextResponse.json({ error: "Event PIN not found." }, { status: 404 });
    }
    if (rows.length > 1) {
      return NextResponse.json(
        { error: "This PIN matches multiple events. Ask organizer for the event link." },
        { status: 409 }
      );
    }

    const gameId = Number(rows[0].game_id);
    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("slug")
      .eq("id", gameId)
      .maybeSingle<{ slug: string | null }>();

    if (gameError) throw gameError;
    if (!game?.slug) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, slug: game.slug });
  } catch (error) {
    if (!isSupabaseUnavailable(error)) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Request failed." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Event PIN lookup is unavailable right now." },
      { status: 503 }
    );
  }
}
