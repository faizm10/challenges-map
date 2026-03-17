import type { Challenge, Team, TeamScore } from "@/lib/types";

import { TEAM_SEED } from "@/lib/config";

export const ACCESS_SEED = [
  {
    role: "admin",
    display_name: "HQ Admin",
    pin: "UNIONHQ2026",
    team_id: null,
  },
  ...TEAM_SEED.map((team, index) => ({
    role: "team",
    display_name: team.teamName,
    pin: `TEAM${index + 1}GO`,
    team_id: team.id,
  })),
] as const;

export const TEAM_ROWS: Team[] = TEAM_SEED.map((team) => ({
  id: team.id,
  team_name: team.teamName,
  start_location_name: team.startLocationName,
  address: team.address,
  route_summary: team.routeSummary,
  walk_time: team.walkTime,
  color: team.color,
  badge_label: team.badgeLabel,
}));

export const TEAM_SCORE_ROWS: TeamScore[] = TEAM_SEED.map((team) => ({
  team_id: team.id,
  arrival_rank: null,
  creativity_score: 0,
}));

export const EMPTY_CHALLENGE_ROWS: Challenge[] = [];

export type TeamChallengeStatusSeedRow = {
  team_id: number;
  challenge_id: number;
  status: "not_started" | "submitted";
  proof_note: string;
  awarded_points: number;
  submitted_at: string | null;
  review_status: "pending" | "verified" | "rejected";
  review_note: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

export const EMPTY_TEAM_CHALLENGE_STATUS_ROWS: TeamChallengeStatusSeedRow[] = [];
