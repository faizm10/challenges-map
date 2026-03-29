import { NextResponse } from "next/server";

import { getOrganizerById } from "@/lib/organizer-auth";
import { requireOrganizerSession } from "@/lib/session";

export async function GET() {
  const session = await requireOrganizerSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const row = await getOrganizerById(session.organizerId);
  if (!row) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  return NextResponse.json({
    email: row.email,
    displayName: row.display_name,
  });
}
