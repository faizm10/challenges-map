import { NextResponse } from "next/server";

import { allowAnonymousGameCreateFromEnv } from "@/lib/config";
import { createGameWithAdmin, isGameError } from "@/lib/game";
import { requireAdminSession, setSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        slug?: string;
        name?: string;
        adminDisplayName?: string;
        adminPin?: string;
        finishPointLabel?: string;
        finishShortName?: string;
        finishLatitude?: number | null;
        finishLongitude?: number | null;
      }
    | null;

  try {
    let organizerOwnerCredentialId: number | null = null;
    if (!allowAnonymousGameCreateFromEnv()) {
      const admin = await requireAdminSession();
      if (!admin || admin.ownerCredentialId == null) {
        return NextResponse.json(
          {
            error:
              "Organizer sign-in required before creating a new event.",
            code: "ORGANIZER_REQUIRED",
          },
          { status: 401 }
        );
      }
      organizerOwnerCredentialId = Number(admin.ownerCredentialId);
    }

    const created = await createGameWithAdmin({
      slug: body?.slug ?? "",
      name: body?.name ?? "",
      adminDisplayName: body?.adminDisplayName ?? "",
      adminPin: body?.adminPin ?? "",
      organizerId: organizerOwnerCredentialId,
      finishPointLabel: body?.finishPointLabel,
      finishShortName: body?.finishShortName,
      finishLatitude: body?.finishLatitude,
      finishLongitude: body?.finishLongitude,
    });

    await setSession({
      role: "admin",
      gameId: created.id,
      ...(organizerOwnerCredentialId != null
        ? { ownerCredentialId: organizerOwnerCredentialId }
        : {}),
    });

    return NextResponse.json({ ok: true, slug: created.slug, gameId: created.id });
  } catch (error) {
    if (isGameError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
