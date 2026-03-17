import { CHALLENGE_SEED, TEAM_SEED } from "@/lib/config";

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

export const TEAM_ROWS = TEAM_SEED.map((team) => ({
  id: team.id,
  team_name: team.teamName,
  start_location_name: team.startLocationName,
  address: team.address,
  route_summary: team.routeSummary,
  walk_time: team.walkTime,
  color: team.color,
  badge_label: team.badgeLabel,
}));

export const CHALLENGE_ROWS = CHALLENGE_SEED.map((challenge) => ({
  id: challenge.id,
  challenge_order: challenge.challengeOrder,
  title: challenge.title,
  text: challenge.text,
  is_released: challenge.isReleased,
}));

export const TEAM_SCORE_ROWS = TEAM_SEED.map((team) => ({
  team_id: team.id,
  arrival_rank: null,
  creativity_score: 0,
}));

export const TEAM_CHALLENGE_STATUS_ROWS = TEAM_SEED.flatMap((team) =>
  CHALLENGE_SEED.map((challenge) => ({
    team_id: team.id,
    challenge_id: challenge.id,
    status: "not_started",
    proof_note: "",
    submitted_at: null,
    review_status: "pending",
    review_note: "",
    reviewed_at: null,
    reviewed_by: null,
  }))
);
