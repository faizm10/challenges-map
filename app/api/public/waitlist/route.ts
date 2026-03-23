import { NextResponse } from "next/server";
import { z } from "zod";

import { isSupabaseUnavailable } from "@/lib/data-source";
import { supabase } from "@/lib/supabase";

const bodySchema = z.object({
  email: z.string().trim().email(),
});

const successMessage = "Thanks — you're on the list. We'll be in touch when we open.";

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();

  try {
    const { error } = await supabase.from("waitlist_signups").insert({ email });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, message: successMessage });
      }
      throw error;
    }

    return NextResponse.json({ ok: true, message: successMessage });
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      return NextResponse.json(
        { error: "Signup is temporarily unavailable. Please try again shortly." },
        { status: 503 }
      );
    }
    console.error("waitlist insert", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
