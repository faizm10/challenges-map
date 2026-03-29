import { NextResponse } from "next/server";

import { DEFAULT_DEV_GAME_SLUG } from "@/lib/config";
import { displayNamesMatch } from "@/lib/credential-match";
import { isSupabaseUnavailable } from "@/lib/data-source";
import { getGameBySlug } from "@/lib/game";
import { findLocalCredential } from "@/lib/local-store";
import { supabase } from "@/lib/supabase";
import { setSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { gameSlug?: string; name?: string; pin?: string }
    | null;
  const gameSlug = (body?.gameSlug ?? DEFAULT_DEV_GAME_SLUG).trim().toLowerCase();
  const name = body?.name?.trim();
  const pin = body?.pin?.trim();

  if (!name || !pin) {
    return NextResponse.json(
      { error: "Team name and PIN are required." },
      { status: 400 }
    );
  }

  const game = await getGameBySlug(gameSlug);
  if (!game) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  try {
    const { data: rows, error } = await supabase
      .from("access_credentials")
      .select("team_id, display_name, pin")
      .eq("role", "team")
      .eq("game_id", game.id);

    if (error) throw error;

    const row = (rows ?? []).find(
      (r) =>
        displayNamesMatch(String(r.display_name), name) &&
        String(r.pin) === pin &&
        r.team_id != null
    );

    if (row?.team_id == null) {
      return NextResponse.json({ error: "Invalid team name or PIN." }, { status: 401 });
    }

    const teamId = Number(row.team_id);
    await setSession({ role: "team", gameId: game.id, teamId });
    return NextResponse.json({ ok: true, teamId });
  } catch (error) {
    if (!isSupabaseUnavailable(error)) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Request failed." },
        { status: 500 }
      );
    }

    const localCredential = findLocalCredential(game.id, "team", name, pin);
    if (!localCredential?.team_id) {
      return NextResponse.json({ error: "Invalid team name or PIN." }, { status: 401 });
    }

    await setSession({
      role: "team",
      gameId: game.id,
      teamId: Number(localCredential.team_id),
    });
    return NextResponse.json({ ok: true, teamId: Number(localCredential.team_id) });
  }
}
