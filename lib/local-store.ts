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

type AccessCredential = (typeof ACCESS_SEED)[number];

type LocalState = {
  teams: Team[];
  challenges: Challenge[];
  teamChallengeStatus: Array<{
    team_id: number;
    challenge_id: number;
    status: "not_started" | "submitted";
    proof_note: string;
    submitted_at: string | null;
  }>;
  teamScores: TeamScore[];
  accessCredentials: AccessCredential[];
};

declare global {
  // eslint-disable-next-line no-var
  var __raceToUnionLocalState: LocalState | undefined;
}

function cloneState(): LocalState {
  return {
    teams: TEAM_ROWS.map((team) => ({ ...team })),
    challenges: CHALLENGE_ROWS.map((challenge) => ({ ...challenge })),
    teamChallengeStatus: TEAM_CHALLENGE_STATUS_ROWS.map((status) => ({
      ...status,
      status: status.status as "not_started" | "submitted",
    })),
    teamScores: TEAM_SCORE_ROWS.map((score) => ({ ...score })),
    accessCredentials: ACCESS_SEED.map((credential) => ({ ...credential })),
  };
}

function getState() {
  if (!global.__raceToUnionLocalState) {
    global.__raceToUnionLocalState = cloneState();
  }

  return global.__raceToUnionLocalState;
}

function getMilestones(entry: {
  completed_count: number;
  arrival_rank: number | null;
}) {
  const milestones: string[] = [];
  if (entry.completed_count > 0) milestones.push("First Submission");
  if (entry.completed_count === 5) milestones.push("All 5 Complete");
  if (entry.arrival_rank === 1) milestones.push("First to Union");
  return milestones;
}

function speedPointsForRank(rank: number | null) {
  return rank === 1 ? 40 : rank === 2 ? 32 : rank === 3 ? 24 : rank === 4 ? 16 : rank === 5 ? 8 : 0;
}

export function findLocalCredential(role: "admin" | "team", name: string, pin: string) {
  return getState().accessCredentials.find(
    (credential) =>
      credential.role === role &&
      credential.display_name === name &&
      credential.pin === pin
  );
}

export function getLocalChallenges(includeHidden = true): Challenge[] {
  const rows = getState().challenges
    .filter((challenge) => includeHidden || Boolean(challenge.is_released))
    .sort((a, b) => a.challenge_order - b.challenge_order);

  return rows.map((row) => ({ ...row }));
}

export function getLocalLeaderboard(): LeaderboardEntry[] {
  const state = getState();
  const releasedCount = state.challenges.filter((challenge) => Boolean(challenge.is_released)).length;

  const scored = state.teams.map((team) => {
    const score = state.teamScores.find((item) => item.team_id === team.id);
    const completedCount = state.teamChallengeStatus.filter(
      (item) => item.team_id === team.id && item.status === "submitted"
    ).length;
    const arrivalRank = score?.arrival_rank ?? null;
    const speedPoints = speedPointsForRank(arrivalRank);
    const challengePoints = Math.min(completedCount * 8, 40);
    const creativityScore = Math.max(0, Math.min(20, score?.creativity_score ?? 0));
    const totalPoints = speedPoints + challengePoints + creativityScore;

    return {
      id: team.id,
      team_name: team.team_name,
      start_location_name: team.start_location_name,
      walk_time: team.walk_time,
      color: team.color,
      badge_label: team.badge_label,
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
    if (b.creativity_score !== a.creativity_score) return b.creativity_score - a.creativity_score;
    return (a.arrival_rank ?? Number.MAX_SAFE_INTEGER) - (b.arrival_rank ?? Number.MAX_SAFE_INTEGER);
  });

  return scored.map((row, index) => ({ ...row, leaderboard_rank: index + 1 }));
}

export function getLocalTeamDashboard(teamId: number): TeamDashboardResponse | null {
  const state = getState();
  const team = state.teams.find((item) => item.id === teamId);
  if (!team) return null;

  const challenges = getLocalChallenges(false).map((challenge) => {
    const status = state.teamChallengeStatus.find(
      (item) => item.team_id === teamId && item.challenge_id === challenge.id
    );

    return {
      ...challenge,
      status: status?.status ?? "not_started",
      proof_note: status?.proof_note ?? "",
      submitted_at: status?.submitted_at ?? null,
    };
  }) as TeamChallengeStatus[];

  const leaderboard = getLocalLeaderboard();
  const teamStats = leaderboard.find((item) => item.id === teamId);
  if (!teamStats) return null;

  return { team, challenges, teamStats, leaderboard };
}

export function getLocalAdminGame(): AdminGameResponse {
  const state = getState();
  return {
    challenges: getLocalChallenges(true),
    teams: state.teams
      .map((team) => getLocalTeamDashboard(team.id))
      .filter(Boolean) as TeamDashboardResponse[],
    scores: state.teamScores.map((score) => ({ ...score })),
    leaderboard: getLocalLeaderboard(),
    pins: {
      admin_hint: "Using local fallback store",
      team_pin_count: state.teams.length,
    },
  };
}

export function updateLocalChallenge(challengeId: number, title: string, text: string) {
  const challenge = getState().challenges.find((item) => item.id === challengeId);
  if (!challenge) return;
  challenge.title = title.slice(0, 120);
  challenge.text = text.slice(0, 500);
}

export function updateLocalChallengeRelease(challengeId: number, isReleased: boolean) {
  const challenge = getState().challenges.find((item) => item.id === challengeId);
  if (!challenge) return;
  challenge.is_released = isReleased ? 1 : 0;
}

export function updateLocalChallengeSubmission(
  teamId: number,
  challengeId: number,
  proofNote: string,
  status: "submitted" | "not_started"
) {
  const item = getState().teamChallengeStatus.find(
    (entry) => entry.team_id === teamId && entry.challenge_id === challengeId
  );
  if (!item) return;
  item.status = status;
  item.proof_note = proofNote.slice(0, 500);
  item.submitted_at = status === "submitted" ? new Date().toISOString() : null;
}

export function updateLocalTeamScore(teamId: number, arrivalRank: number | null, creativityScore: number) {
  const item = getState().teamScores.find((entry) => entry.team_id === teamId);
  if (!item) return;
  item.arrival_rank = arrivalRank;
  item.creativity_score = Math.max(0, Math.min(20, creativityScore));
}

export function isLocalChallengeReleased(challengeId: number) {
  return Boolean(getState().challenges.find((item) => item.id === challengeId)?.is_released);
}

export function resetLocalState() {
  global.__raceToUnionLocalState = cloneState();
  return {
    challenges: getLocalChallenges(true),
    leaderboard: getLocalLeaderboard(),
  };
}
