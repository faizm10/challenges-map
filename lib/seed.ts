import type { Challenge, Team, TeamScore } from "@/lib/types";

import { TEAM_SEED } from "@/lib/config";

/**
 * Local fallback + default `converge` dev seed. Matches rows you can put in
 * `access_credentials` for game slug `converge` when mirroring production.
 */
export const DEMO_CONVERGE_HQ_DISPLAY_NAME = "HQ Admin";
export const DEMO_CONVERGE_HQ_PIN = "UNIONHQ2026";

export const ACCESS_SEED = [
  {
    role: "admin",
    display_name: DEMO_CONVERGE_HQ_DISPLAY_NAME,
    pin: DEMO_CONVERGE_HQ_PIN,
    team_id: null,
  },
  ...TEAM_SEED.map((team) => ({
    role: "team",
    display_name: team.teamName,
    pin:
      team.teamName === "Team Izzy"
        ? "Izzy1231"
        : team.teamName === "Team Faiz"
          ? "Faiz671"
          : team.teamName === "Team James"
            ? "James1011"
            : "Naman2011",
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
