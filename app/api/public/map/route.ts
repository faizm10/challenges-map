import { NextResponse } from "next/server";

import { DEFAULT_DEV_GAME_SLUG } from "@/lib/config";
import { getGameBySlug, getPublicMapData } from "@/lib/game";
import { isPublicComingSoon } from "@/lib/public-site-mode";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (isPublicComingSoon()) {
    return NextResponse.json({ error: "coming_soon" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const slug = (searchParams.get("slug") ?? DEFAULT_DEV_GAME_SLUG).trim().toLowerCase();
  const game = await getGameBySlug(slug);
  if (!game) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  return NextResponse.json(await getPublicMapData(game.id));
}
