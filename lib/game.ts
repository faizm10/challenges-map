import type {
  AdminGameResponse,
  Challenge,
  LeaderboardEntry,
  Team,
  TeamChallengeStatus,
  TeamDashboardResponse,
  TeamScore,
} from "@/lib/types";
import { db, resetData } from "@/lib/db";

function getReleasedCount() {
  return (
    db.prepare("SELECT COUNT(*) AS count FROM challenges WHERE is_released = 1").get() as {
      count: number;
    }
  ).count;
}

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

export function getChallenges(includeHidden = true): Challenge[] {
  const sql = includeHidden
    ? "SELECT id, challenge_order, title, text, is_released FROM challenges ORDER BY challenge_order"
    : "SELECT id, challenge_order, title, text, is_released FROM challenges WHERE is_released = 1 ORDER BY challenge_order";
  return db.prepare(sql).all() as Challenge[];
}

export function getLeaderboard(): LeaderboardEntry[] {
  const releasedCount = getReleasedCount();
  const rows = db
    .prepare(
      `
      SELECT
        t.id,
        t.team_name,
        t.start_location_name,
        t.walk_time,
        t.color,
        t.badge_label,
        ts.arrival_rank,
        COALESCE(ts.creativity_score, 0) AS creativity_score,
        SUM(CASE WHEN tcs.status = 'submitted' THEN 1 ELSE 0 END) AS completed_count
      FROM teams t
      LEFT JOIN team_scores ts ON ts.team_id = t.id
      LEFT JOIN team_challenge_status tcs ON tcs.team_id = t.id
      GROUP BY
        t.id, t.team_name, t.start_location_name, t.walk_time, t.color, t.badge_label,
        ts.arrival_rank, ts.creativity_score
      ORDER BY t.id
      `
    )
    .all() as Array<{
      id: number;
      team_name: string;
      start_location_name: string;
      walk_time: string;
      color: string;
      badge_label: string;
      arrival_rank: number | null;
      creativity_score: number;
      completed_count: number;
    }>;

  const scored = rows.map((row) => {
    const speedPoints =
      row.arrival_rank === 1
        ? 40
        : row.arrival_rank === 2
          ? 32
          : row.arrival_rank === 3
            ? 24
            : row.arrival_rank === 4
              ? 16
              : row.arrival_rank === 5
                ? 8
                : 0;
    const challengePoints = Math.min(row.completed_count * 8, 40);
    const creativityScore = Math.max(0, Math.min(20, row.creativity_score ?? 0));
    const totalPoints = speedPoints + challengePoints + creativityScore;

    return {
      ...row,
      speed_points: speedPoints,
      challenge_points: challengePoints,
      creativity_score: creativityScore,
      total_points: totalPoints,
      released_count: releasedCount,
      progress_percent:
        releasedCount === 0 ? 4 : Math.max(10, Math.min(100, Math.round(totalPoints))),
      milestones: getMilestones(row),
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
}

export function getTeamDashboard(teamId: number): TeamDashboardResponse | null {
  const team = db
    .prepare(
      `
      SELECT id, team_name, start_location_name, address, route_summary, walk_time, color, badge_label
      FROM teams WHERE id = ?
      `
    )
    .get(teamId) as Team | undefined;

  if (!team) return null;

  const challenges = db
    .prepare(
      `
      SELECT
        c.id,
        c.challenge_order,
        c.title,
        c.text,
        c.is_released,
        tcs.status,
        tcs.proof_note,
        tcs.submitted_at
      FROM challenges c
      JOIN team_challenge_status tcs
        ON tcs.challenge_id = c.id AND tcs.team_id = ?
      WHERE c.is_released = 1
      ORDER BY c.challenge_order
      `
    )
    .all(teamId) as TeamChallengeStatus[];

  const leaderboard = getLeaderboard();
  const teamStats = leaderboard.find((entry) => entry.id === teamId);
  if (!teamStats) return null;

  return { team, challenges, teamStats, leaderboard };
}

export function getAdminGame(): AdminGameResponse {
  return {
    challenges: getChallenges(true),
    teams: [1, 2, 3, 4, 5]
      .map((teamId) => getTeamDashboard(teamId))
      .filter(Boolean) as TeamDashboardResponse[],
    scores: db
      .prepare("SELECT team_id, arrival_rank, creativity_score FROM team_scores ORDER BY team_id")
      .all() as TeamScore[],
    leaderboard: getLeaderboard(),
    pins: {
      admin_hint: "Hardcoded in server config",
      team_pin_count: 5,
    },
  };
}

export function updateChallenge(challengeId: number, title: string, text: string) {
  db.prepare("UPDATE challenges SET title = ?, text = ? WHERE id = ?").run(
    title.slice(0, 120),
    text.slice(0, 500),
    challengeId
  );
  return getChallenges(true);
}

export function updateChallengeRelease(challengeId: number, isReleased: boolean) {
  db.prepare("UPDATE challenges SET is_released = ? WHERE id = ?").run(isReleased ? 1 : 0, challengeId);
  return getChallenges(true);
}

export function updateTeamChallengeSubmission(
  teamId: number,
  challengeId: number,
  proofNote: string,
  status: "submitted" | "not_started"
) {
  db.prepare(
    `
    UPDATE team_challenge_status
    SET status = ?, proof_note = ?, submitted_at = ?
    WHERE team_id = ? AND challenge_id = ?
    `
  ).run(
    status,
    proofNote.slice(0, 500),
    status === "submitted" ? new Date().toISOString() : null,
    teamId,
    challengeId
  );
}

export function updateTeamScore(teamId: number, arrivalRank: number | null, creativityScore: number) {
  db.prepare(
    "UPDATE team_scores SET arrival_rank = ?, creativity_score = ? WHERE team_id = ?"
  ).run(arrivalRank, Math.max(0, Math.min(20, creativityScore)), teamId);
}

export function isChallengeReleased(challengeId: number) {
  const result = db
    .prepare("SELECT id, is_released FROM challenges WHERE id = ?")
    .get(challengeId) as { id: number; is_released: number } | undefined;
  return result?.is_released === 1;
}

export function resetGame() {
  resetData();
  return {
    challenges: getChallenges(true),
    leaderboard: getLeaderboard(),
  };
}
