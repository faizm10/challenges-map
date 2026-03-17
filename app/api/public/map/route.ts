import { NextResponse } from "next/server";

import { getPublicMapData } from "@/lib/game";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getPublicMapData());
}
