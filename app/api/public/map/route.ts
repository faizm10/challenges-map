import { NextResponse } from "next/server";

import { getPublicMapData } from "@/lib/game";
import { isPublicComingSoon } from "@/lib/public-site-mode";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isPublicComingSoon()) {
    return NextResponse.json({ error: "coming_soon" }, { status: 403 });
  }

  return NextResponse.json(await getPublicMapData());
}
