import { NextResponse } from "next/server";

import { DEFAULT_DEV_GAME_SLUG } from "@/lib/config";
import { displayNamesMatch } from "@/lib/credential-match";
import { isSupabaseUnavailable } from "@/lib/data-source";
import { getGameBySlug } from "@/lib/game";
import { findLocalCredential } from "@/lib/local-store";
import { supabase } from "@/lib/supabase";
import { setSession } from "@/lib/session";

function hqMismatchHint(gameSlug: string) {
  return `This URL only checks the admin row in access_credentials for event slug "${gameSlug}". Names and PINs from another event will not work — use that event's /e/your-slug/admin link (organizers see the slug when they create the event).`;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { gameSlug?: string; name?: string; pin?: string }
    | null;
  const gameSlug = (body?.gameSlug ?? DEFAULT_DEV_GAME_SLUG).trim().toLowerCase();
  const name = body?.name?.trim();
  const pin = body?.pin?.trim();

  if (!name || !pin) {
    return NextResponse.json(
      { error: "Admin name and PIN are required." },
      { status: 400 }
    );
  }

  const game = await getGameBySlug(gameSlug);
  if (!game) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  try {
    // Table: public.access_credentials (role=admin, game_id matches this event).
    const { data: rows, error } = await supabase
      .from("access_credentials")
      .select("id, display_name, pin")
      .eq("role", "admin")
      .eq("game_id", game.id);

    if (error) throw error;

    const row = (rows ?? []).find(
      (r) => displayNamesMatch(String(r.display_name), name) && String(r.pin) === pin
    );

    if (!row?.id) {
      return NextResponse.json(
        {
          error: "Invalid admin name or PIN for this event.",
          hint: hqMismatchHint(gameSlug),
        },
        { status: 401 }
      );
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
      return NextResponse.json(
        {
          error: "Invalid admin name or PIN for this event.",
          hint: hqMismatchHint(gameSlug),
        },
        { status: 401 }
      );
    }

    await setSession({ role: "admin", gameId: game.id });
    return NextResponse.json({ ok: true, fallback: true });
  }
}
