export type SessionRole = "admin" | "team";

export type TeamSeed = {
  id: number;
  teamName: string;
  startLocationName: string;
  address: string;
  routeSummary: string;
  walkTime: string;
  color: string;
  badgeLabel: string;
  coordinates: [number, number];
  routeLine: [number, number][];
};

export type ChallengeSeed = {
  id: number;
  challengeOrder: number;
  title: string;
  text: string;
  isReleased: 0 | 1;
};

export type Team = {
  id: number;
  team_name: string;
  start_location_name: string;
  address: string;
  route_summary: string;
  walk_time: string;
  color: string;
  badge_label: string;
};

export type Challenge = {
  id: number;
  challenge_order: number;
  title: string;
  text: string;
  is_released: number;
};

export type TeamChallengeStatus = {
  id: number;
  challenge_order: number;
  title: string;
  text: string;
  is_released: number;
  status: "not_started" | "submitted";
  proof_note: string;
  submitted_at: string | null;
};

export type TeamScore = {
  team_id: number;
  arrival_rank: number | null;
  creativity_score: number;
};

export type LeaderboardEntry = {
  id: number;
  team_name: string;
  start_location_name: string;
  walk_time: string;
  color: string;
  badge_label: string;
  arrival_rank: number | null;
  creativity_score: number;
  completed_count: number;
  speed_points: number;
  challenge_points: number;
  total_points: number;
  released_count: number;
  progress_percent: number;
  milestones: string[];
  leaderboard_rank: number;
};

export type PublicLeaderboardResponse = {
  event: {
    title: string;
    finish_point: string;
    released_count: number;
    total_challenges: number;
  };
  leaderboard: LeaderboardEntry[];
};

export type TeamDashboardResponse = {
  team: Team;
  challenges: TeamChallengeStatus[];
  teamStats: LeaderboardEntry;
  leaderboard: LeaderboardEntry[];
};

export type AdminGameResponse = {
  challenges: Challenge[];
  teams: TeamDashboardResponse[];
  scores: TeamScore[];
  leaderboard: LeaderboardEntry[];
  pins: {
    admin_hint: string;
    team_pin_count: number;
  };
};
