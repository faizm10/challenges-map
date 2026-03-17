import type {
  AdminGameResponse,
  Challenge,
  LeaderboardEntry,
  Team,
  TeamChallengeStatus,
  TeamDashboardResponse,
  TeamScore,
} from "@/lib/types";
import {
  ACCESS_SEED,
  CHALLENGE_ROWS,
  TEAM_CHALLENGE_STATUS_ROWS,
  TEAM_ROWS,
  TEAM_SCORE_ROWS,
} from "@/lib/seed";
import {
  getLocalAdminGame,
  getLocalChallenges,
  getLocalLeaderboard,
  getLocalTeamDashboard,
  isLocalChallengeReleased,
  resetLocalState,
  updateLocalChallenge,
  updateLocalChallengeRelease,
  updateLocalChallengeSubmission,
  updateLocalTeamScore,
} from "@/lib/local-store";
import { supabase } from "@/lib/supabase";
import { isSupabaseUnavailable } from "@/lib/data-source";

function getMilestones(entry: {
  completed_count: number;
  arrival_rank: number | null;
}): string[] {
  const milestones: string[] = [];
  if (entry.completed_count > 0) milestones.push("First Submission");
  if (entry.completed_count === 5) milestones.push("All 5 Complete");
  if (entry.arrival_rank === 1) milestones.push("First to Union");
  return milestones;
}

function speedPointsForRank(rank: number | null) {
  return rank === 1 ? 40 : rank === 2 ? 32 : rank === 3 ? 24 : rank === 4 ? 16 : rank === 5 ? 8 : 0;
}

async function getReleasedCount() {
  const { count, error } = await supabase
    .from("challenges")
    .select("*", { count: "exact", head: true })
    .eq("is_released", true);

  if (error) throw error;
  return count ?? 0;
}

export async function getChallenges(includeHidden = true): Promise<Challenge[]> {
  try {
    let query = supabase
      .from("challenges")
      .select("id, challenge_order, title, text, is_released")
      .order("challenge_order", { ascending: true });

    if (!includeHidden) {
      query = query.eq("is_released", true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Challenge[];
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      return getLocalChallenges(includeHidden);
    }
    throw error;
  }
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const [releasedCount, teamsResult, scoresResult, statusResult] = await Promise.all([
      getReleasedCount(),
      supabase
        .from("teams")
        .select("id, team_name, start_location_name, walk_time, color, badge_label")
        .order("id", { ascending: true }),
      supabase
        .from("team_scores")
        .select("team_id, arrival_rank, creativity_score")
        .order("team_id", { ascending: true }),
      supabase
        .from("team_challenge_status")
        .select("team_id, status"),
    ]);

    if (teamsResult.error) throw teamsResult.error;
    if (scoresResult.error) throw scoresResult.error;
    if (statusResult.error) throw statusResult.error;

    const teams = (teamsResult.data ?? []) as Array<{
      id: number;
      team_name: string;
      start_location_name: string;
      walk_time: string;
      color: string;
      badge_label: string;
    }>;
    const scores = new Map(
      ((scoresResult.data ?? []) as TeamScore[]).map((score) => [score.team_id, score])
    );
    const completedCounts = new Map<number, number>();

    for (const row of (statusResult.data ?? []) as Array<{ team_id: number; status: string }>) {
      if (row.status !== "submitted") continue;
      completedCounts.set(row.team_id, (completedCounts.get(row.team_id) ?? 0) + 1);
    }

    const scored = teams.map((row) => {
    const score = scores.get(row.id);
    const arrivalRank = score?.arrival_rank ?? null;
    const speedPoints = speedPointsForRank(arrivalRank);
    const completedCount = completedCounts.get(row.id) ?? 0;
    const challengePoints = Math.min(completedCount * 8, 40);
    const creativityScore = Math.max(0, Math.min(20, score?.creativity_score ?? 0));
    const totalPoints = speedPoints + challengePoints + creativityScore;

    return {
      id: row.id,
      team_name: row.team_name,
      start_location_name: row.start_location_name,
      walk_time: row.walk_time,
      color: row.color,
      badge_label: row.badge_label,
      arrival_rank: arrivalRank,
      completed_count: completedCount,
      speed_points: speedPoints,
      challenge_points: challengePoints,
      creativity_score: creativityScore,
      total_points: totalPoints,
      released_count: releasedCount,
      progress_percent:
        releasedCount === 0 ? 4 : Math.max(10, Math.min(100, Math.round(totalPoints))),
      milestones: getMilestones({
        completed_count: completedCount,
        arrival_rank: arrivalRank,
      }),
    };
  });

    scored.sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points;
      if (b.creativity_score !== a.creativity_score) {
        return b.creativity_score - a.creativity_score;
      }
      return (a.arrival_rank ?? Number.MAX_SAFE_INTEGER) - (b.arrival_rank ?? Number.MAX_SAFE_INTEGER);
    });

    return scored.map((row, index) => ({ ...row, leaderboard_rank: index + 1 }));
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      return getLocalLeaderboard();
    }
    throw error;
  }
}

export async function getTeamDashboard(teamId: number): Promise<TeamDashboardResponse | null> {
  try {
    const [teamResult, releasedChallenges, statusResult, leaderboard] = await Promise.all([
      supabase
        .from("teams")
        .select("id, team_name, start_location_name, address, route_summary, walk_time, color, badge_label")
        .eq("id", teamId)
        .maybeSingle(),
      getChallenges(false),
      supabase
        .from("team_challenge_status")
        .select("challenge_id, status, proof_note, submitted_at")
        .eq("team_id", teamId),
      getLeaderboard(),
    ]);

    if (teamResult.error) throw teamResult.error;
    if (statusResult.error) throw statusResult.error;

    const team = teamResult.data as Team | null;
    if (!team) return null;

    const statuses = new Map(
      ((statusResult.data ?? []) as Array<{
        challenge_id: number;
        status: "not_started" | "submitted";
        proof_note: string;
        submitted_at: string | null;
      }>).map((status) => [status.challenge_id, status])
    );

    const challenges = releasedChallenges.map((challenge) => {
      const status = statuses.get(challenge.id);
      return {
        ...challenge,
        status: status?.status ?? "not_started",
        proof_note: status?.proof_note ?? "",
        submitted_at: status?.submitted_at ?? null,
      };
    }) as TeamChallengeStatus[];

    const teamStats = leaderboard.find((entry) => entry.id === teamId);
    if (!teamStats) return null;

    return { team, challenges, teamStats, leaderboard };
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      return getLocalTeamDashboard(teamId);
    }
    throw error;
  }
}

export async function getAdminGame(): Promise<AdminGameResponse> {
  try {
    const [teamsResult, challenges, scoresResult, leaderboard] = await Promise.all([
      supabase.from("teams").select("id").order("id", { ascending: true }),
      getChallenges(true),
      supabase
        .from("team_scores")
        .select("team_id, arrival_rank, creativity_score")
        .order("team_id", { ascending: true }),
      getLeaderboard(),
    ]);

    if (teamsResult.error) throw teamsResult.error;
    if (scoresResult.error) throw scoresResult.error;

    const teams = await Promise.all(
      ((teamsResult.data ?? []) as Array<{ id: number }>).map(async ({ id }) => getTeamDashboard(id))
    );

    return {
      challenges,
      teams: teams.filter(Boolean) as TeamDashboardResponse[],
      scores: (scoresResult.data ?? []) as TeamScore[],
      leaderboard,
      pins: {
        admin_hint: "Stored in Supabase access_credentials table",
        team_pin_count: ((teamsResult.data ?? []) as Array<{ id: number }>).length,
      },
    };
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      return getLocalAdminGame();
    }
    throw error;
  }
}

export async function updateChallenge(challengeId: number, title: string, text: string) {
  try {
    const { error } = await supabase
      .from("challenges")
      .update({
        title: title.slice(0, 120),
        text: text.slice(0, 500),
      })
      .eq("id", challengeId);

    if (error) throw error;
    return getChallenges(true);
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      updateLocalChallenge(challengeId, title, text);
      return getLocalChallenges(true);
    }
    throw error;
  }
}

export async function updateChallengeRelease(challengeId: number, isReleased: boolean) {
  try {
    const { error } = await supabase
      .from("challenges")
      .update({ is_released: isReleased })
      .eq("id", challengeId);

    if (error) throw error;
    return getChallenges(true);
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      updateLocalChallengeRelease(challengeId, isReleased);
      return getLocalChallenges(true);
    }
    throw error;
  }
}

export async function updateTeamChallengeSubmission(
  teamId: number,
  challengeId: number,
  proofNote: string,
  status: "submitted" | "not_started"
) {
  try {
    const { error } = await supabase
      .from("team_challenge_status")
      .update({
        status,
        proof_note: proofNote.slice(0, 500),
        submitted_at: status === "submitted" ? new Date().toISOString() : null,
      })
      .eq("team_id", teamId)
      .eq("challenge_id", challengeId);

    if (error) throw error;
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      updateLocalChallengeSubmission(teamId, challengeId, proofNote, status);
      return;
    }
    throw error;
  }
}

export async function updateTeamScore(
  teamId: number,
  arrivalRank: number | null,
  creativityScore: number
) {
  try {
    const { error } = await supabase
      .from("team_scores")
      .update({
        arrival_rank: arrivalRank,
        creativity_score: Math.max(0, Math.min(20, creativityScore)),
      })
      .eq("team_id", teamId);

    if (error) throw error;
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      updateLocalTeamScore(teamId, arrivalRank, creativityScore);
      return;
    }
    throw error;
  }
}

export async function isChallengeReleased(challengeId: number) {
  try {
    const { data, error } = await supabase
      .from("challenges")
      .select("id, is_released")
      .eq("id", challengeId)
      .maybeSingle();

    if (error) throw error;
    return Boolean(data?.is_released);
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      return isLocalChallengeReleased(challengeId);
    }
    throw error;
  }
}

export async function resetGame() {
  try {
    const deletes = await Promise.all([
      supabase.from("team_challenge_status").delete().gte("team_id", 1),
      supabase.from("team_scores").delete().gte("team_id", 1),
      supabase.from("challenges").delete().gte("id", 1),
      supabase.from("access_credentials").delete().gte("id", 1),
      supabase.from("teams").delete().gte("id", 1),
    ]);

    for (const result of deletes) {
      if (result.error) throw result.error;
    }

    const inserts = await Promise.all([
      supabase.from("teams").insert(TEAM_ROWS),
      supabase.from("challenges").insert(CHALLENGE_ROWS),
      supabase.from("team_scores").insert(TEAM_SCORE_ROWS),
      supabase.from("team_challenge_status").insert(TEAM_CHALLENGE_STATUS_ROWS),
      supabase.from("access_credentials").insert(ACCESS_SEED),
    ]);

    for (const result of inserts) {
      if (result.error) throw result.error;
    }

    return {
      challenges: await getChallenges(true),
      leaderboard: await getLeaderboard(),
    };
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      return resetLocalState();
    }
    throw error;
  }
}
