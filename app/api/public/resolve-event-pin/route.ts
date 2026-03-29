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
    const { data: games, error: gamesError } = await supabase
      .from("games")
      .select("slug, settings");

    if (gamesError) throw gamesError;

    const matches = ((games ?? []) as Array<{ slug: string | null; settings: Record<string, unknown> | null }>)
      .filter((game) => {
        if (!game?.slug || !game?.settings || typeof game.settings !== "object") return false;
        const joinPin = (game.settings as Record<string, unknown>).join_pin;
        return typeof joinPin === "string" && joinPin === pin;
      })
      .map((game) => game.slug)
      .filter((slug): slug is string => Boolean(slug));

    if (matches.length === 0) {
      return NextResponse.json({ error: "Event PIN not found." }, { status: 404 });
    }
    if (matches.length > 1) {
      return NextResponse.json(
        { error: "This PIN matches multiple events. Ask organizer for the event link." },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true, slug: matches[0] });
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
