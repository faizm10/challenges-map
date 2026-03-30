import { NextResponse } from "next/server";

import { DEFAULT_DEV_GAME_SLUG } from "@/lib/config";
import { isSupabaseUnavailable } from "@/lib/data-source";
import { getGameBySlug } from "@/lib/game";
import { setSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { gameSlug?: string; name?: string; pin?: string }
    | null;

  const gameSlug = (body?.gameSlug ?? DEFAULT_DEV_GAME_SLUG).trim().toLowerCase();
  const name = body?.name?.trim();
  const pin = body?.pin?.trim();

  if (!name || !pin) {
    return NextResponse.json({ error: "Organizer name and PIN are required." }, { status: 400 });
  }

  const game = await getGameBySlug(gameSlug);
  if (!game) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  try {
    const { data: existing, error: lookupError } = await supabase
      .from("access_credentials")
      .select("id")
      .eq("role", "admin")
      .eq("game_id", game.id)
      .eq("display_name", name)
      .maybeSingle<{ id: number }>();

    if (lookupError) throw lookupError;
    if (existing?.id) {
      return NextResponse.json(
        { error: "Organizer name already exists. Please log in instead." },
        { status: 409 }
      );
    }

    const { error: insertError } = await supabase.from("access_credentials").insert({
      game_id: game.id,
      role: "admin",
      display_name: name,
      pin,
      team_id: null,
    });

    if (insertError) throw insertError;

    await setSession({ role: "admin", gameId: game.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      return NextResponse.json(
        { error: "Signup needs Supabase. Local fallback cannot create organizer accounts." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed." },
      { status: 500 }
    );
  }
}

