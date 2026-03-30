/** Values used in the session cookie; see `SessionPayload` in `lib/session.ts`. */
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
  routeCheckpoints: Array<{
    challengeOrder: 2 | 3;
    label: string;
    address: string;
    coordinates: [number, number];
  }>;
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

export type ChallengeKind = "game_long" | "checkpoint" | "union";

export type TeamChallengePrompt = {
  team_id: number;
  challenge_id: number;
  prompt_text: string;
};

export type Challenge = {
  id: number;
  challenge_order: number;
  kind: ChallengeKind;
  title: string;
  text: string;
  expected_location: string;
  allow_media_upload: number;
  is_released: number;
  team_prompts?: TeamChallengePrompt[];
};

export type TeamChallengeCheckpoint = {
  team_id: number;
  challenge_id: number;
  checkpoint_label: string;
  checkpoint_address: string;
  latitude: number | null;
  longitude: number | null;
  unlock_radius_meters: number;
};

export type TeamChallengeStatus = {
  id: number;
  challenge_order: number;
  kind: ChallengeKind;
  title: string;
  text: string;
  expected_location: string;
  allow_media_upload: number;
  is_released: number;
  is_visible: boolean;
  is_unlocked: boolean;
  status: "not_started" | "submitted";
  proof_note: string;
  awarded_points: number;
  submitted_at: string | null;
  review_status: "pending" | "verified" | "rejected";
  review_note: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  uploads: ChallengeUpload[];
  checkpoint: TeamChallengeCheckpoint | null;
};

export type ChallengeUpload = {
  id: number;
  team_id: number;
  challenge_id: number;
  bucket_name: string;
  storage_path: string;
  public_url: string;
  signed_url: string;
  media_type: "image" | "video";
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  uploaded_at: string;
};

export type TeamCheckin = {
  id: number;
  team_id: number;
  checkin_type: "start" | "challenge" | "finish";
  challenge_id: number | null;
  status: "pending" | "verified" | "rejected";
  checkin_note: string;
  latitude: number | null;
  longitude: number | null;
  accuracy_meters: number | null;
  gps_captured_at: string | null;
  created_at: string;
  review_note: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

export type TeamCheckpoint = {
  key: string;
  checkin_type: "start" | "challenge" | "finish";
  challenge_id: number | null;
  label: string;
  description: string;
  expected_location_label: string;
  expected_location_description?: string | null;
  status: "not_started" | "pending" | "verified" | "rejected";
  latest_checkin: TeamCheckin | null;
  unlock_radius_meters?: number | null;
};

export type TeamLatestLocation = {
  team_id: number;
  team_name: string;
  color: string;
  badge_label: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  gps_captured_at: string | null;
  checkin_type: "start" | "challenge" | "finish";
  challenge_id: number | null;
  label: string;
};

export type AdminCheckinFeedItem = TeamCheckin & {
  team_name: string;
  color: string;
  badge_label: string;
  checkpoint_label: string;
  challenge: null | {
    id: number;
    challenge_order: number;
    title: string;
    text: string;
    expected_location: string;
    review_status: "pending" | "verified" | "rejected";
  };
  uploads: ChallengeUpload[];
  proof_note: string;
};

export type AdminRoutePoint = {
  team_id: number;
  team_name: string;
  color: string;
  badge_label: string;
  latitude: number;
  longitude: number;
  checkin_type: "start" | "challenge" | "finish";
  challenge_id: number | null;
  label: string;
  created_at: string;
};

export type AdminTeamRoute = {
  team_id: number;
  team_name: string;
  color: string;
  badge_label: string;
  points: AdminRoutePoint[];
  completed_labels: string[];
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
  completed_count: number;
  challenge_points: number;
  total_points: number;
  released_count: number;
  total_challenges: number;
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

export type PublicMapResponse = {
  latestLocations: TeamLatestLocation[];
  teamRoutes: AdminTeamRoute[];
  union: {
    name: string;
    latitude: number;
    longitude: number;
    label: string;
  };
};

/** Resolved finish / convergence point for an event (defaults to Union Station when unset). */
export type EventFinishDisplay = {
  shortName: string;
  addressLabel: string;
  latitude: number;
  longitude: number;
};

export type TeamDashboardResponse = {
  team: Team;
  challenges: TeamChallengeStatus[];
  checkpoints: TeamCheckpoint[];
  checkins: TeamCheckin[];
  latestLocation: TeamLatestLocation | null;
  teamStats: LeaderboardEntry;
  leaderboard: LeaderboardEntry[];
  eventFinish: EventFinishDisplay;
  adminAccess?: {
    display_name: string;
    pin: string;
  };
};

export type AdminGameResponse = {
  challenges: Challenge[];
  teams: TeamDashboardResponse[];
  latestLocations: TeamLatestLocation[];
  teamRoutes: AdminTeamRoute[];
  recentCheckins: AdminCheckinFeedItem[];
  leaderboard: LeaderboardEntry[];
  eventFinish: EventFinishDisplay;
  pins: {
    admin_hint: string;
    team_pin_count: number;
    event_join_pin: string | null;
  };
};
