import { TEAM_SEED, UNION_STATION } from "@/lib/config";
import type {
  AdminCheckinFeedItem,
  AdminGameResponse,
  AdminRoutePoint,
  AdminTeamRoute,
  Challenge,
  ChallengeUpload,
  LeaderboardEntry,
  Team,
  TeamCheckin,
  TeamCheckpoint,
  TeamDashboardResponse,
  TeamLatestLocation,
  TeamScore,
} from "@/lib/types";
import {
  ACCESS_SEED,
  EMPTY_CHALLENGE_ROWS,
  EMPTY_TEAM_CHALLENGE_STATUS_ROWS,
  TEAM_ROWS,
  TEAM_SCORE_ROWS,
} from "@/lib/seed";

type AccessCredential = {
  role: "admin" | "team";
  display_name: string;
  pin: string;
  team_id: number | null;
};

type LocalState = {
  teams: Team[];
  challenges: Challenge[];
  teamChallengeStatus: Array<{
    team_id: number;
    challenge_id: number;
    status: "not_started" | "submitted";
    proof_note: string;
    submitted_at: string | null;
    review_status: "pending" | "verified" | "rejected";
    review_note: string;
    reviewed_at: string | null;
    reviewed_by: string | null;
  }>;
  challengeMedia: ChallengeUpload[];
  teamCheckins: TeamCheckin[];
  nextCheckinId: number;
  nextChallengeId: number;
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
    challenges: EMPTY_CHALLENGE_ROWS.map((challenge) => ({ ...challenge })),
    teamChallengeStatus: EMPTY_TEAM_CHALLENGE_STATUS_ROWS.map((status) => ({
      ...status,
      status: status.status as "not_started" | "submitted",
      review_status: status.review_status as "pending" | "verified" | "rejected",
    })),
    challengeMedia: [],
    teamCheckins: [],
    nextCheckinId: 1,
    nextChallengeId: 1,
    teamScores: TEAM_SCORE_ROWS.map((score) => ({ ...score })),
    accessCredentials: ACCESS_SEED.map((credential) => ({
      role: credential.role as AccessCredential["role"],
      display_name: credential.display_name,
      pin: credential.pin,
      team_id: credential.team_id,
    })),
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
  total_challenges: number;
}) {
  const milestones: string[] = [];
  if (entry.completed_count > 0) milestones.push("First Submission");
  if (entry.total_challenges > 0 && entry.completed_count === entry.total_challenges) {
    milestones.push(`All ${entry.total_challenges} Complete`);
  }
  if (entry.arrival_rank === 1) milestones.push("First to Union");
  return milestones;
}

function speedPointsForRank(rank: number | null) {
  return rank === 1 ? 40 : rank === 2 ? 32 : rank === 3 ? 24 : rank === 4 ? 16 : rank === 5 ? 8 : 0;
}

function getTeamSeed(teamId: number) {
  return TEAM_SEED.find((team) => team.id === teamId) ?? null;
}

function buildCheckpointLabel(type: "start" | "challenge" | "finish", challengeTitle?: string) {
  if (type === "start") return "Start Check-In";
  if (type === "finish") return "Finish Check-In";
  return challengeTitle ? `${challengeTitle} Check-In` : "Challenge Check-In";
}

function buildCheckpointDescription(
  type: "start" | "challenge" | "finish",
  team: Team,
  challenge?: Challenge
) {
  if (type === "start") return `Check in from ${team.start_location_name}.`;
  if (type === "finish") return `Check in when you reach ${UNION_STATION.name}.`;
  return challenge
    ? `Check in when your team completes Challenge ${challenge.challenge_order}.`
    : "Check in when the challenge is completed.";
}

function buildExpectedLocation(
  type: "start" | "challenge" | "finish",
  team: Team,
  challenge?: Challenge
) {
  if (type === "start") {
    return {
      label: team.start_location_name,
      description: team.address,
    };
  }

  if (type === "finish") {
    return {
      label: UNION_STATION.name,
      description: UNION_STATION.finishPoint,
    };
  }

  return {
    label: challenge?.expected_location?.trim() || "Location set by HQ",
    description: null,
  };
}

function deriveTeamLatestLocation(teamId: number): TeamLatestLocation | null {
  const state = getState();
  const team = state.teams.find((item) => item.id === teamId);
  if (!team) return null;

  const latest = state.teamCheckins
    .filter((item) => item.team_id === teamId && item.latitude !== null && item.longitude !== null)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];

  if (!latest || latest.latitude === null || latest.longitude === null) return null;

  const challenge = latest.challenge_id
    ? state.challenges.find((item) => item.id === latest.challenge_id)
    : null;

  return {
    team_id: team.id,
    team_name: team.team_name,
    color: team.color,
    badge_label: team.badge_label,
    latitude: latest.latitude,
    longitude: latest.longitude,
    accuracy_meters: latest.accuracy_meters,
    gps_captured_at: latest.gps_captured_at,
    checkin_type: latest.checkin_type,
    challenge_id: latest.challenge_id,
    label: buildCheckpointLabel(latest.checkin_type, challenge?.title),
  };
}

function deriveAdminTeamRoute(teamId: number): AdminTeamRoute | null {
  const state = getState();
  const team = state.teams.find((item) => item.id === teamId);
  if (!team) return null;

  const start = state.teamCheckins
    .filter(
      (item) =>
        item.team_id === teamId &&
        item.checkin_type === "start" &&
        item.latitude !== null &&
        item.longitude !== null
    )
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0] ?? null;

  const challengePoints = state.challenges
    .slice()
    .sort((a, b) => a.challenge_order - b.challenge_order)
    .map((challenge) => {
      const latest = state.teamCheckins
        .filter(
          (item) =>
            item.team_id === teamId &&
            item.checkin_type === "challenge" &&
            item.challenge_id === challenge.id &&
            item.latitude !== null &&
            item.longitude !== null
        )
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0] ?? null;

      if (!latest || latest.latitude === null || latest.longitude === null) return null;

      const point: AdminRoutePoint = {
        team_id: team.id,
        team_name: team.team_name,
        color: team.color,
        badge_label: team.badge_label,
        latitude: latest.latitude,
        longitude: latest.longitude,
        checkin_type: "challenge",
        challenge_id: challenge.id,
        label: `Challenge ${challenge.challenge_order}`,
        created_at: latest.created_at,
      };

      return point;
    })
    .filter(Boolean) as AdminRoutePoint[];

  const finish = state.teamCheckins
    .filter(
      (item) =>
        item.team_id === teamId &&
        item.checkin_type === "finish" &&
        item.latitude !== null &&
        item.longitude !== null
    )
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0] ?? null;

  const points: AdminRoutePoint[] = [];

  if (start && start.latitude !== null && start.longitude !== null) {
    points.push({
      team_id: team.id,
      team_name: team.team_name,
      color: team.color,
      badge_label: team.badge_label,
      latitude: start.latitude,
      longitude: start.longitude,
      checkin_type: "start",
      challenge_id: null,
      label: "Start",
      created_at: start.created_at,
    });
  }

  points.push(...challengePoints);

  if (finish && finish.latitude !== null && finish.longitude !== null) {
    points.push({
      team_id: team.id,
      team_name: team.team_name,
      color: team.color,
      badge_label: team.badge_label,
      latitude: finish.latitude,
      longitude: finish.longitude,
      checkin_type: "finish",
      challenge_id: null,
      label: "Finish",
      created_at: finish.created_at,
    });
  }

  return {
    team_id: team.id,
    team_name: team.team_name,
    color: team.color,
    badge_label: team.badge_label,
    points,
    completed_labels: points.map((point) => point.label),
  };
}

function deriveCheckpoints(teamId: number): TeamCheckpoint[] {
  const state = getState();
  const team = state.teams.find((item) => item.id === teamId);
  if (!team) return [];

  const releasedChallenges = state.challenges
    .filter((challenge) => Boolean(challenge.is_released))
    .sort((a, b) => a.challenge_order - b.challenge_order);

  const makeLatest = (
    type: "start" | "challenge" | "finish",
    challengeId: number | null
  ) =>
    state.teamCheckins
      .filter(
        (item) =>
          item.team_id === teamId &&
          item.checkin_type === type &&
          (type !== "challenge" || item.challenge_id === challengeId)
      )
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0] ?? null;

  const checkpoints: TeamCheckpoint[] = [
    {
      key: "start",
      checkin_type: "start",
      challenge_id: null,
      label: "Start Check-In",
      description: buildCheckpointDescription("start", team),
      expected_location_label: buildExpectedLocation("start", team).label,
      expected_location_description: buildExpectedLocation("start", team).description,
      status: makeLatest("start", null)?.status ?? "not_started",
      latest_checkin: makeLatest("start", null),
    },
    ...releasedChallenges.map((challenge) => {
      const latest = makeLatest("challenge", challenge.id);
      const expected = buildExpectedLocation("challenge", team, challenge);
      return {
        key: `challenge-${challenge.id}`,
        checkin_type: "challenge" as const,
        challenge_id: challenge.id,
        label: `${challenge.title} Check-In`,
        description: buildCheckpointDescription("challenge", team, challenge),
        expected_location_label: expected.label,
        expected_location_description: expected.description,
        status: latest?.status ?? "not_started",
        latest_checkin: latest,
      };
    }),
    {
      key: "finish",
      checkin_type: "finish",
      challenge_id: null,
      label: "Finish Check-In",
      description: buildCheckpointDescription("finish", team),
      expected_location_label: buildExpectedLocation("finish", team).label,
      expected_location_description: buildExpectedLocation("finish", team).description,
      status: makeLatest("finish", null)?.status ?? "not_started",
      latest_checkin: makeLatest("finish", null),
    },
  ];

  return checkpoints;
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

export function getLocalCheckins(teamId: number): TeamCheckin[] {
  return getState()
    .teamCheckins
    .filter((item) => item.team_id === teamId)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .map((item) => ({ ...item }));
}

export function getLocalLatestLocations(): TeamLatestLocation[] {
  return getState().teams
    .map((team) => deriveTeamLatestLocation(team.id))
    .filter(Boolean) as TeamLatestLocation[];
}

export function getLocalRecentCheckins(): AdminCheckinFeedItem[] {
  const state = getState();

  return state.teamCheckins
    .slice()
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .map((checkin) => {
      const team = state.teams.find((item) => item.id === checkin.team_id)!;
      const challenge =
        checkin.challenge_id !== null
          ? state.challenges.find((item) => item.id === checkin.challenge_id) ?? null
          : null;
      const challengeStatus =
        checkin.challenge_id !== null
          ? state.teamChallengeStatus.find(
              (item) =>
                item.team_id === checkin.team_id && item.challenge_id === checkin.challenge_id
            ) ?? null
          : null;
      const uploads =
        checkin.challenge_id !== null
          ? state.challengeMedia
              .filter(
                (item) =>
                  item.team_id === checkin.team_id && item.challenge_id === checkin.challenge_id
              )
              .sort((a, b) => Date.parse(b.uploaded_at) - Date.parse(a.uploaded_at))
              .map((item) => ({ ...item }))
          : [];
      return {
        ...checkin,
        team_name: team.team_name,
        color: team.color,
        badge_label: team.badge_label,
        checkpoint_label: buildCheckpointLabel(checkin.checkin_type, challenge?.title),
        challenge: challenge
          ? {
              id: challenge.id,
              challenge_order: challenge.challenge_order,
              title: challenge.title,
              text: challenge.text,
              expected_location: challenge.expected_location,
              review_status: challengeStatus?.review_status ?? "pending",
            }
          : null,
        uploads,
        proof_note: challengeStatus?.proof_note ?? "",
      };
    });
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
        total_challenges: state.challenges.length,
      }),
      total_challenges: state.challenges.length,
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
    const isUnlocked = state.teamCheckins.some(
      (item) =>
        item.team_id === teamId &&
        item.checkin_type === "challenge" &&
        item.challenge_id === challenge.id
    );

    return {
      ...challenge,
      is_unlocked: isUnlocked,
      status: status?.status ?? "not_started",
      proof_note: status?.proof_note ?? "",
      submitted_at: status?.submitted_at ?? null,
      review_status: status?.review_status ?? "pending",
      review_note: status?.review_note ?? "",
      reviewed_at: status?.reviewed_at ?? null,
      reviewed_by: status?.reviewed_by ?? null,
      uploads: state.challengeMedia
        .filter((item) => item.team_id === teamId && item.challenge_id === challenge.id)
        .sort((a, b) => Date.parse(b.uploaded_at) - Date.parse(a.uploaded_at))
        .map((item) => ({ ...item })),
    };
  });

  const leaderboard = getLocalLeaderboard();
  const teamStats = leaderboard.find((item) => item.id === teamId);
  if (!teamStats) return null;

  return {
    team,
    challenges,
    checkpoints: deriveCheckpoints(teamId),
    checkins: getLocalCheckins(teamId),
    latestLocation: deriveTeamLatestLocation(teamId),
    teamStats,
    leaderboard,
    adminAccess: (() => {
      const credential = state.accessCredentials.find(
        (entry) => entry.role === "team" && entry.team_id === teamId
      );
      return credential
        ? {
            display_name: credential.display_name,
            pin: credential.pin,
          }
        : undefined;
    })(),
  };
}

export function getLocalAdminGame(): AdminGameResponse {
  const state = getState();
  return {
    challenges: getLocalChallenges(true),
    teams: state.teams
      .map((team) => getLocalTeamDashboard(team.id))
      .filter(Boolean) as TeamDashboardResponse[],
    latestLocations: getLocalLatestLocations(),
    teamRoutes: state.teams
      .map((team) => deriveAdminTeamRoute(team.id))
      .filter(Boolean) as AdminTeamRoute[],
    recentCheckins: getLocalRecentCheckins(),
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

export function createLocalChallenge(
  title: string,
  text: string,
  expectedLocation: string,
  allowMediaUpload: boolean
) {
  const state = getState();
  const id = state.nextChallengeId++;
  const challenge = {
    id,
    challenge_order: state.challenges.length + 1,
    title: title.slice(0, 120),
    text: text.slice(0, 500),
    expected_location: expectedLocation.slice(0, 160),
    allow_media_upload: allowMediaUpload ? 1 : 0,
    is_released: 0,
  };

  state.challenges.push(challenge);
  state.teamChallengeStatus.push(
    ...state.teams.map((team) => ({
      team_id: team.id,
      challenge_id: id,
      status: "not_started" as const,
      proof_note: "",
      submitted_at: null,
      review_status: "pending" as const,
      review_note: "",
      reviewed_at: null,
      reviewed_by: null,
    }))
  );

  return { ...challenge };
}

export function updateLocalChallengeExpectedLocation(challengeId: number, expectedLocation: string) {
  const challenge = getState().challenges.find((item) => item.id === challengeId);
  if (!challenge) return;
  challenge.expected_location = expectedLocation.slice(0, 160);
}

export function updateLocalChallengeMediaToggle(challengeId: number, allowMediaUpload: boolean) {
  const challenge = getState().challenges.find((item) => item.id === challengeId);
  if (!challenge) return;
  challenge.allow_media_upload = allowMediaUpload ? 1 : 0;
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
  if (status === "not_started") {
    item.review_status = "pending";
    item.review_note = "";
    item.reviewed_at = null;
    item.reviewed_by = null;
  }
}

export function upsertLocalChallengeCheckinOnSubmit(input: {
  teamId: number;
  challengeId: number;
  checkinNote?: string;
  latitude?: number | null;
  longitude?: number | null;
  accuracyMeters?: number | null;
  gpsCapturedAt?: string | null;
}) {
  const state = getState();
  const existing = state.teamCheckins
    .filter(
      (item) =>
        item.team_id === input.teamId &&
        item.checkin_type === "challenge" &&
        item.challenge_id === input.challengeId
    )
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];

  if (existing) {
    existing.status = "pending";
    existing.checkin_note = (input.checkinNote ?? "").slice(0, 500);
    existing.latitude = input.latitude ?? null;
    existing.longitude = input.longitude ?? null;
    existing.accuracy_meters = input.accuracyMeters ?? null;
    existing.gps_captured_at = input.gpsCapturedAt ?? null;
    existing.created_at = new Date().toISOString();
    existing.review_note = "";
    existing.reviewed_at = null;
    existing.reviewed_by = null;
    return { ...existing };
  }

  return createLocalCheckin({
    teamId: input.teamId,
    checkinType: "challenge",
    challengeId: input.challengeId,
    checkinNote: input.checkinNote,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracyMeters: input.accuracyMeters,
    gpsCapturedAt: input.gpsCapturedAt,
  });
}

export function updateLocalChallengeReview(
  teamId: number,
  challengeId: number,
  reviewStatus: "pending" | "verified" | "rejected",
  reviewNote: string,
  reviewedBy: string
) {
  const item = getState().teamChallengeStatus.find(
    (entry) => entry.team_id === teamId && entry.challenge_id === challengeId
  );
  if (!item) return;
  item.review_status = reviewStatus;
  item.review_note = reviewNote.slice(0, 500);
  item.reviewed_at = reviewStatus === "pending" ? null : new Date().toISOString();
  item.reviewed_by = reviewStatus === "pending" ? null : reviewedBy;
}

export function createLocalCheckin(input: {
  teamId: number;
  checkinType: "start" | "challenge" | "finish";
  challengeId?: number | null;
  checkinNote?: string;
  latitude?: number | null;
  longitude?: number | null;
  accuracyMeters?: number | null;
  gpsCapturedAt?: string | null;
}) {
  const state = getState();
  const id = state.nextCheckinId++;
  const checkin: TeamCheckin = {
    id,
    team_id: input.teamId,
    checkin_type: input.checkinType,
    challenge_id: input.challengeId ?? null,
    status: "pending",
    checkin_note: (input.checkinNote ?? "").slice(0, 500),
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    accuracy_meters: input.accuracyMeters ?? null,
    gps_captured_at: input.gpsCapturedAt ?? null,
    created_at: new Date().toISOString(),
    review_note: "",
    reviewed_at: null,
    reviewed_by: null,
  };

  state.teamCheckins.push(checkin);
  return { ...checkin };
}

export function reviewLocalCheckin(
  checkinId: number,
  status: "pending" | "verified" | "rejected",
  reviewNote: string,
  reviewedBy: string
) {
  const item = getState().teamCheckins.find((entry) => entry.id === checkinId);
  if (!item) return null;
  item.status = status;
  item.review_note = reviewNote.slice(0, 500);
  item.reviewed_at = status === "pending" ? null : new Date().toISOString();
  item.reviewed_by = status === "pending" ? null : reviewedBy;
  return { ...item };
}

export function updateLocalTeamScore(teamId: number, arrivalRank: number | null, creativityScore: number) {
  const item = getState().teamScores.find((entry) => entry.team_id === teamId);
  if (!item) return;
  item.arrival_rank = arrivalRank;
  item.creativity_score = Math.max(0, Math.min(20, creativityScore));
}

export function updateLocalTeamCredentials(teamId: number, teamName: string, pin: string) {
  const state = getState();
  const cleanTeamName = teamName.trim();
  const cleanPin = pin.trim();

  if (!cleanTeamName || !cleanPin) {
    throw new Error("Team name and PIN are required.");
  }

  const duplicateTeam = state.teams.find(
    (entry) => entry.id !== teamId && entry.team_name.toLowerCase() === cleanTeamName.toLowerCase()
  );
  if (duplicateTeam) {
    throw new Error("A team with that name already exists.");
  }

  const team = state.teams.find((entry) => entry.id === teamId);
  const credential = state.accessCredentials.find(
    (entry) => entry.role === "team" && entry.team_id === teamId
  );

  if (!team || !credential) {
    throw new Error("Team credentials were not found.");
  }

  team.team_name = cleanTeamName.slice(0, 120);
  credential.display_name = cleanTeamName.slice(0, 120);
  credential.pin = cleanPin.slice(0, 120);
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
