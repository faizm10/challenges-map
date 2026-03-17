import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase environment variables are missing.");
}

declare global {
  // eslint-disable-next-line no-var
  var __raceToUnionSupabase:
    | ReturnType<typeof createClient>
    | undefined;
}

export const supabase =
  global.__raceToUnionSupabase ||
  createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

if (!global.__raceToUnionSupabase) {
  global.__raceToUnionSupabase = supabase;
}
