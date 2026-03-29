import { NextResponse } from "next/server";

import { allowAnonymousGameCreateFromEnv } from "@/lib/config";
import { createGameWithAdmin, isGameError } from "@/lib/game";
import { requireOrganizerSession, setSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { slug?: string; name?: string; adminDisplayName?: string; adminPin?: string }
    | null;

  try {
    let organizerId: number | null = null;
    if (!allowAnonymousGameCreateFromEnv()) {
      const org = await requireOrganizerSession();
      if (!org) {
        return NextResponse.json(
          {
            error:
              "Create a free organizer account first, then set up your event. Open Sign up from the home page.",
            code: "ORGANIZER_REQUIRED",
          },
          { status: 401 }
        );
      }
      organizerId = org.organizerId;
    }

    const created = await createGameWithAdmin({
      slug: body?.slug ?? "",
      name: body?.name ?? "",
      adminDisplayName: body?.adminDisplayName ?? "",
      adminPin: body?.adminPin ?? "",
      organizerId: organizerId ?? undefined,
    });

    await setSession({ role: "admin", gameId: created.id });

    return NextResponse.json({ ok: true, slug: created.slug, gameId: created.id });
  } catch (error) {
    if (isGameError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
