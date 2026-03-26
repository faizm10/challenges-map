import { CHALLENGE_SUBMISSION_RANK_POINTS, MAX_CHALLENGES, TEAM_SEED, UNION_STATION } from "@/lib/config";
import type { LeaderboardEntry, PublicLeaderboardResponse } from "@/lib/types";

function milestonesFor(completedCount: number, totalChallenges: number): string[] {
  const milestones: string[] = [];
  if (completedCount > 0) milestones.push("First Submission");
  if (totalChallenges > 0 && completedCount === totalChallenges) {
    milestones.push(`All ${totalChallenges} Complete`);
  }
  return milestones;
}

/**
 * Deterministic demo leaderboard + event stats for the public homepage.
 * Does not depend on Supabase or local-store runtime state.
 */
export function getMarketingHomeMockData(): PublicLeaderboardResponse {
  const total_challenges = MAX_CHALLENGES;
  const released_count = 3;

  const seedRows: Array<{ challenge_points: number; completed_count: number }> = [
    { challenge_points: 28, completed_count: 2 },
    { challenge_points: 34, completed_count: 3 },
    { challenge_points: 18, completed_count: 1 },
    { challenge_points: 24, completed_count: 2 },
  ];

  const maxPoints = released_count * CHALLENGE_SUBMISSION_RANK_POINTS[0];

  const scored = TEAM_SEED.map((team, index) => {
    const { challenge_points, completed_count } = seedRows[index] ?? seedRows[0];
    const progress_percent =
      maxPoints <= 0
        ? 4
        : Math.max(6, Math.min(100, Math.round((challenge_points / maxPoints) * 100)));

    const entry: Omit<LeaderboardEntry, "leaderboard_rank"> = {
      id: team.id,
      team_name: team.teamName,
      start_location_name: team.startLocationName,
      walk_time: team.walkTime,
      color: team.color,
      badge_label: team.badgeLabel,
      completed_count,
      challenge_points,
      total_points: challenge_points,
      released_count,
      total_challenges,
      progress_percent,
      milestones: milestonesFor(completed_count, total_challenges),
    };

    const lastSubmittedAt =
      completed_count > 0 ? `2026-03-20T${20 + index}:15:00.000Z` : null;

    return { entry, lastSubmittedAt };
  });

  scored.sort((a, b) => {
    if (b.entry.total_points !== a.entry.total_points) return b.entry.total_points - a.entry.total_points;
    if (b.entry.completed_count !== a.entry.completed_count) return b.entry.completed_count - a.entry.completed_count;
    const aLast = a.lastSubmittedAt ? Date.parse(a.lastSubmittedAt) : Number.POSITIVE_INFINITY;
    const bLast = b.lastSubmittedAt ? Date.parse(b.lastSubmittedAt) : Number.POSITIVE_INFINITY;
    if (aLast !== bLast) return aLast - bLast;
    return a.entry.id - b.entry.id;
  });

  const leaderboard = scored.map(({ entry }, index) => ({
    ...entry,
    leaderboard_rank: index + 1,
  }));

  return {
    event: {
      title: "Converge",
      finish_point: UNION_STATION.finishPoint,
      released_count,
      total_challenges,
    },
    leaderboard,
  };
}
