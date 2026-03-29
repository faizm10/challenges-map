import { ACTIVE_TEAM_IDS, LOCAL_FALLBACK_GAME_ID } from "@/lib/config";
import { isSupabaseUnavailable } from "@/lib/data-source";
import { supabase } from "@/lib/supabase";

export async function verifyTeamBelongsToGame(gameId: number, teamId: number): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("teams")
      .select("id")
      .eq("id", teamId)
      .eq("game_id", gameId)
      .maybeSingle();

    if (error) throw error;
    return Boolean(data?.id);
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      return gameId === LOCAL_FALLBACK_GAME_ID && ACTIVE_TEAM_IDS.includes(teamId);
    }
    throw error;
  }
}
