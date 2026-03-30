import { NextResponse } from "next/server";

import { DEFAULT_DEV_GAME_SLUG } from "@/lib/config";
import { isSupabaseUnavailable } from "@/lib/data-source";
import { getGameBySlug } from "@/lib/game";
import { findLocalCredential } from "@/lib/local-store";
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
    const { data, error } = await supabase
      .from("access_credentials")
      .select("id")
      .eq("role", "admin")
      .eq("game_id", game.id)
      .eq("display_name", name)
      .eq("pin", pin)
      .maybeSingle<{ id: number }>();

    if (error) throw error;
    if (!data?.id) {
      return NextResponse.json({ error: "Invalid organizer name or PIN." }, { status: 401 });
    }

    await setSession({ role: "admin", gameId: game.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (!isSupabaseUnavailable(error)) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Request failed." },
        { status: 500 }
      );
    }

    const localCredential = findLocalCredential(game.id, "admin", name, pin);
    if (!localCredential) {
      return NextResponse.json({ error: "Invalid organizer name or PIN." }, { status: 401 });
    }

    await setSession({ role: "admin", gameId: game.id });
    return NextResponse.json({ ok: true, fallback: true });
  }
}

