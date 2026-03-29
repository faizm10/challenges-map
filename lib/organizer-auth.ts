import { GameError } from "@/lib/game-error";
import { hashPassword, verifyPassword } from "@/lib/password";
import { supabase } from "@/lib/supabase";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validateSignupEmail(email: string) {
  const e = normalizeEmail(email);
  if (!e || e.length > 254 || !EMAIL_RE.test(e)) {
    throw new GameError("Enter a valid email address.", 400);
  }
  return e;
}

export async function createOrganizerAccount(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<{ id: number }> {
  const email = validateSignupEmail(input.email);
  const displayName = input.displayName.trim().slice(0, 120);
  if (!displayName) throw new GameError("Display name is required.", 400);

  const password = input.password;
  if (password.length < 8) throw new GameError("Password must be at least 8 characters.", 400);
  if (password.length > 200) throw new GameError("Password is too long.", 400);

  const password_hash = hashPassword(password);

  const { data, error } = await supabase
    .from("organizer_accounts")
    .insert({ email, display_name: displayName, password_hash })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new GameError("An account already exists for that email.", 409);
    }
    throw error;
  }

  return { id: Number(data.id) };
}

export async function verifyOrganizerLogin(
  email: string,
  password: string
): Promise<{ id: number; display_name: string; email: string } | null> {
  const e = normalizeEmail(email);
  if (!e || !password) return null;

  const { data, error } = await supabase
    .from("organizer_accounts")
    .select("id, email, display_name, password_hash")
    .eq("email", e)
    .maybeSingle();

  if (error) throw error;
  if (!data || !verifyPassword(password, String(data.password_hash))) return null;

  return {
    id: Number(data.id),
    display_name: String(data.display_name),
    email: String(data.email),
  };
}

export async function getOrganizerById(
  id: number
): Promise<{ id: number; email: string; display_name: string } | null> {
  const { data, error } = await supabase
    .from("organizer_accounts")
    .select("id, email, display_name")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return {
    id: Number(data.id),
    email: String(data.email),
    display_name: String(data.display_name),
  };
}
