import {
  CHALLENGE_SUBMISSION_RANK_POINTS,
  DEFAULT_CHECKPOINT_UNLOCK_RADIUS_METERS,
  TEAM_SEED,
  UNION_STATION,
} from "@/lib/config";
import type {
  AdminCheckinFeedItem,
  AdminGameResponse,
  AdminRoutePoint,
  AdminTeamRoute,
  Challenge,
  ChallengeKind,
  ChallengeUpload,
  LeaderboardEntry,
  Team,
  TeamChallengeCheckpoint,
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
    awarded_points: number;
    submitted_at: string | null;
    review_status: "pending" | "verified" | "rejected";
    review_note: string;
    reviewed_at: string | null;
    reviewed_by: string | null;
  }>;
  teamChallengeCheckpoints: TeamChallengeCheckpoint[];
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
    teamChallengeCheckpoints: [],
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
  total_challenges: number;
}) {
  const milestones: string[] = [];
  if (entry.completed_count > 0) milestones.push("First Submission");
  if (entry.total_challenges > 0 && entry.completed_count === entry.total_challenges) {
    milestones.push(`All ${entry.total_challenges} Complete`);
  }
  return milestones;
}

function pointsForSubmissionRank(rank: number) {
  return CHALLENGE_SUBMISSION_RANK_POINTS[rank] ?? 0;
}

function getTeamSeed(teamId: number) {
  return TEAM_SEED.find((team) => team.id === teamId) ?? null;
}

function getChallengeKind(challengeOrder: number): ChallengeKind {
  if (challengeOrder === 1) return "game_long";
  if (challengeOrder === 4) return "union";
  return "checkpoint";
}

function defaultCheckpointForTeamChallenge(
  teamId: number,
  challengeId: number,
  challengeOrder: number
): TeamChallengeCheckpoint | null {
  const seed = getTeamSeed(teamId);
  if (!seed) return null;

  if (challengeOrder === 2 || challengeOrder === 3) {
    const checkpoint =
      seed.routeCheckpoints.find((item) => item.challengeOrder === challengeOrder) ?? null;
    if (!checkpoint) return null;
    return {
      team_id: teamId,
      challenge_id: challengeId,
      checkpoint_label: checkpoint.label,
      checkpoint_address: checkpoint.address,
      longitude: checkpoint.coordinates[0],
      latitude: checkpoint.coordinates[1],
      unlock_radius_meters: DEFAULT_CHECKPOINT_UNLOCK_RADIUS_METERS,
    };
  }

  return null;
}

function haversineMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLatitude = toRadians(latitudeB - latitudeA);
  const dLongitude = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(dLatitude / 2) * Math.sin(dLatitude / 2) +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(dLongitude / 2) *
      Math.sin(dLongitude / 2);

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getLocalChallengeCheckpoint(teamId: number, challenge: Challenge): TeamChallengeCheckpoint | null {
  const explicit = getState().teamChallengeCheckpoints.find(
    (item) => item.team_id === teamId && item.challenge_id === challenge.id
  );

  if (explicit) return { ...explicit };

  if (challenge.kind === "checkpoint") {
    return defaultCheckpointForTeamChallenge(teamId, challenge.id, challenge.challenge_order);
  }

  return null;
}

function buildCheckpointLabel(
  type: "start" | "challenge" | "finish",
  challenge?: Pick<Challenge, "title" | "challenge_order" | "kind">
) {
  if (type === "start") return "Start Check-In";
  if (type === "finish") return "Finish Check-In";
  if (challenge?.kind === "union") return "Union Checkpoint";
  if (challenge?.kind === "checkpoint") return `Challenge ${challenge.challenge_order} Checkpoint`;
  return challenge?.title ? `${challenge.title} Check-In` : "Challenge Check-In";
}

function buildCheckpointDescription(
  type: "start" | "challenge" | "finish",
  team: Team,
  challenge?: Challenge
) {
  if (type === "start") return `Check in from ${team.start_location_name}.`;
  if (type === "finish") return `Check in when you reach ${UNION_STATION.name}.`;
  if (!challenge) return "Check in when you reach the checkpoint.";
  if (challenge.kind === "union") {
    return `Arrive at ${UNION_STATION.name} to unlock Challenge ${challenge.challenge_order}.`;
  }
  return `Arrive at your assigned checkpoint to unlock Challenge ${challenge.challenge_order}.`;
}

function buildExpectedLocation(
  type: "start" | "challenge" | "finish",
  team: Team,
  challenge?: Challenge,
  checkpoint?: TeamChallengeCheckpoint | null
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

  if (challenge?.kind === "union") {
    return {
      label: UNION_STATION.name,
      description: UNION_STATION.finishPoint,
    };
  }

  if (checkpoint) {
    return {
      label: checkpoint.checkpoint_label || `Challenge ${challenge?.challenge_order} checkpoint`,
      description: checkpoint.checkpoint_address || null,
    };
  }

  return {
    label: challenge?.expected_location?.trim() || "Location set by HQ",
    description: null,
  };
}

function deriveVisibleChallengeIds(teamId: number) {
  const state = getState();
  const hasStartedRace = state.teamCheckins.some(
    (item) => item.team_id === teamId && item.checkin_type === "start"
  );

  if (!hasStartedRace) return new Set<number>();

  const challengeCheckins = new Set(
    state.teamCheckins
      .filter(
        (item) =>
          item.team_id === teamId &&
          item.checkin_type === "challenge" &&
          item.challenge_id !== null
      )
      .map((item) => Number(item.challenge_id))
  );

  const releasedChallenges = getLocalChallenges(false);
  const submittedChallengeIds = new Set(
    state.teamChallengeStatus
      .filter((item) => item.team_id === teamId && item.status === "submitted")
      .map((item) => item.challenge_id)
  );
  const visibleIds = new Set<number>();

  for (const challenge of releasedChallenges) {
    if (challenge.kind === "game_long") {
      visibleIds.add(challenge.id);
      continue;
    }

    const previousChallenge = releasedChallenges.find(
      (item) => item.challenge_order === challenge.challenge_order - 1
    );
    const isPreviousComplete = previousChallenge
      ? previousChallenge.kind === "game_long"
        ? hasStartedRace
        : submittedChallengeIds.has(previousChallenge.id)
      : hasStartedRace;

    if (isPreviousComplete && challengeCheckins.has(challenge.id)) {
      visibleIds.add(challenge.id);
    }
  }

  return visibleIds;
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
    label: buildCheckpointLabel(latest.checkin_type, challenge ?? undefined),
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
        label: buildCheckpointLabel("challenge", challenge),
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
    ...releasedChallenges
      .filter((challenge) => challenge.kind !== "game_long")
      .map((challenge) => {
      const latest = makeLatest("challenge", challenge.id);
      const checkpoint = getLocalChallengeCheckpoint(teamId, challenge);
      const expected = buildExpectedLocation("challenge", team, challenge, checkpoint);
      return {
        key: `challenge-${challenge.id}`,
        checkin_type: "challenge" as const,
        challenge_id: challenge.id,
        label: buildCheckpointLabel("challenge", challenge),
        description: buildCheckpointDescription("challenge", team, challenge),
        expected_location_label: expected.label,
        expected_location_description: expected.description,
        status: latest?.status ?? "not_started",
        latest_checkin: latest,
        unlock_radius_meters: checkpoint?.unlock_radius_meters ?? null,
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

  return rows.map((row) => ({ ...row, kind: getChallengeKind(row.challenge_order) }));
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
        checkpoint_label: buildCheckpointLabel(checkin.checkin_type, challenge ?? undefined),
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
  const releasedChallenges = state.challenges.filter((challenge) => Boolean(challenge.is_released));
  const releasedCount = releasedChallenges.length;
  const releasedChallengeIds = new Set(releasedChallenges.map((challenge) => challenge.id));

  const scored = state.teams.map((team) => {
    const statuses = state.teamChallengeStatus.filter(
      (item) => item.team_id === team.id && releasedChallengeIds.has(item.challenge_id)
    );
    const completed = statuses.filter((item) => item.status === "submitted");
    const completedCount = completed.length;
    let challengePoints = 0;
    let lastSubmittedAt: string | null = null;

    for (const item of completed) {
      const submittedAt = item.submitted_at ?? null;
      if (submittedAt) {
        if (!lastSubmittedAt || Date.parse(submittedAt) > Date.parse(lastSubmittedAt)) {
          lastSubmittedAt = submittedAt;
        }
      }
      challengePoints += Number(item.awarded_points ?? 0);
    }

    const totalPoints = challengePoints;
    const maxPoints = releasedCount * pointsForSubmissionRank(0);
    const progressPercent =
      maxPoints <= 0 ? 4 : Math.max(6, Math.min(100, Math.round((totalPoints / maxPoints) * 100)));

    const entry: Omit<LeaderboardEntry, "leaderboard_rank"> = {
      id: team.id,
      team_name: team.team_name,
      start_location_name: team.start_location_name,
      walk_time: team.walk_time,
      color: team.color,
      badge_label: team.badge_label,
      completed_count: completedCount,
      challenge_points: challengePoints,
      total_points: totalPoints,
      released_count: releasedCount,
      progress_percent: progressPercent,
      milestones: getMilestones({
        completed_count: completedCount,
        total_challenges: state.challenges.length,
      }),
      total_challenges: state.challenges.length,
    };
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

  return scored.map(({ entry }, index) => ({ ...entry, leaderboard_rank: index + 1 }));
}

export function getLocalTeamDashboard(teamId: number): TeamDashboardResponse | null {
  const state = getState();
  const team = state.teams.find((item) => item.id === teamId);
  if (!team) return null;
  const visibleChallengeIds = deriveVisibleChallengeIds(teamId);

  const challenges = getLocalChallenges(false).map((challenge) => {
    const status = state.teamChallengeStatus.find(
      (item) => item.team_id === teamId && item.challenge_id === challenge.id
    );
    const checkpoint = getLocalChallengeCheckpoint(teamId, challenge);
    const hasStartedRace = state.teamCheckins.some(
      (item) => item.team_id === teamId && item.checkin_type === "start"
    );
    const isUnlocked =
      challenge.kind === "game_long"
        ? hasStartedRace
        : state.teamCheckins.some(
            (item) =>
              item.team_id === teamId &&
              item.checkin_type === "challenge" &&
              item.challenge_id === challenge.id
          );

    return {
      ...challenge,
      is_unlocked: isUnlocked,
      is_visible: visibleChallengeIds.has(challenge.id),
      status: status?.status ?? "not_started",
      proof_note: status?.proof_note ?? "",
      awarded_points: Number(status?.awarded_points ?? 0),
      submitted_at: status?.submitted_at ?? null,
      review_status: status?.review_status ?? "pending",
      review_note: status?.review_note ?? "",
      reviewed_at: status?.reviewed_at ?? null,
      reviewed_by: status?.reviewed_by ?? null,
      checkpoint,
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
  const challengeOrder = state.challenges.length + 1;
  const kind = getChallengeKind(challengeOrder);
  const challenge = {
    id,
    challenge_order: challengeOrder,
    kind,
    title: title.slice(0, 120),
    text: text.slice(0, 500),
    expected_location:
      kind === "union"
        ? UNION_STATION.name
        : kind === "checkpoint"
          ? (expectedLocation.trim() || "Per-team route checkpoint").slice(0, 160)
          : expectedLocation.slice(0, 160),
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
      awarded_points: 0,
      submitted_at: null,
      review_status: "pending" as const,
      review_note: "",
      reviewed_at: null,
      reviewed_by: null,
    }))
  );

  if (kind === "checkpoint") {
    state.teamChallengeCheckpoints.push(
      ...state.teams
        .map((team) => defaultCheckpointForTeamChallenge(team.id, id, challengeOrder))
        .filter(Boolean) as TeamChallengeCheckpoint[]
    );
  }

  return { ...challenge, kind };
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

export function updateLocalChallengeCheckpoints(
  challengeId: number,
  checkpoints: TeamChallengeCheckpoint[]
) {
  const state = getState();
  state.teamChallengeCheckpoints = state.teamChallengeCheckpoints.filter(
    (entry) => entry.challenge_id !== challengeId
  );
  state.teamChallengeCheckpoints.push(
    ...checkpoints.map((entry) => ({
      ...entry,
      checkpoint_label: entry.checkpoint_label.slice(0, 120),
      checkpoint_address: entry.checkpoint_address.slice(0, 200),
      unlock_radius_meters: Math.max(1, Math.round(entry.unlock_radius_meters)),
    }))
  );
}

export function updateLocalChallengeRelease(challengeId: number, isReleased: boolean) {
  const challenge = getState().challenges.find((item) => item.id === challengeId);
  if (!challenge) return;
  challenge.is_released = isReleased ? 1 : 0;
}

export function releaseAllLocalChallenges() {
  const state = getState();
  for (const challenge of state.challenges) {
    challenge.is_released = 1;
  }
}

export function deleteLocalChallenge(challengeId: number) {
  const state = getState();
  const challengeIndex = state.challenges.findIndex((item) => item.id === challengeId);
  if (challengeIndex === -1) {
    return false;
  }

  state.challenges.splice(challengeIndex, 1);
  state.teamChallengeStatus = state.teamChallengeStatus.filter(
    (entry) => entry.challenge_id !== challengeId
  );
  state.teamChallengeCheckpoints = state.teamChallengeCheckpoints.filter(
    (entry) => entry.challenge_id !== challengeId
  );
  state.challengeMedia = state.challengeMedia.filter((entry) => entry.challenge_id !== challengeId);
  state.teamCheckins = state.teamCheckins.filter((entry) => entry.challenge_id !== challengeId);

  state.challenges
    .sort((a, b) => a.challenge_order - b.challenge_order)
    .forEach((challenge, index) => {
      challenge.challenge_order = index + 1;
    });

  return true;
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
  const wasSubmitted = item.status === "submitted";
  const previousSubmittedAt = item.submitted_at;
  item.status = status;
  item.proof_note = proofNote.slice(0, 500);
  const submittedAt =
    status === "submitted"
      ? wasSubmitted && previousSubmittedAt
        ? previousSubmittedAt
        : new Date().toISOString()
      : null;
  item.submitted_at = submittedAt;
  if (status === "not_started") {
    item.awarded_points = 0;
    item.review_status = "pending";
    item.review_note = "";
    item.reviewed_at = null;
    item.reviewed_by = null;
  }
  updateLocalChallengeReview(
    teamId,
    challengeId,
    item.review_status,
    item.review_note,
    item.reviewed_by ?? ""
  );
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
  item.awarded_points = 0;
  item.reviewed_at = reviewStatus === "pending" ? null : new Date().toISOString();
  item.reviewed_by = reviewStatus === "pending" ? null : reviewedBy;

  const challengeRows = getState().teamChallengeStatus
    .filter(
      (entry) =>
        entry.challenge_id === challengeId &&
        entry.status === "submitted" &&
        entry.review_status !== "rejected" &&
        Boolean(entry.submitted_at)
    )
    .sort((a, b) => {
      const timeDiff = Date.parse(a.submitted_at as string) - Date.parse(b.submitted_at as string);
      if (timeDiff !== 0) return timeDiff;
      return a.team_id - b.team_id;
    });

  challengeRows.forEach((entry, index) => {
    entry.awarded_points = pointsForSubmissionRank(index);
  });
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

  if (input.checkinType === "finish") {
    const completedCount = state.teamChallengeStatus.filter(
      (entry) => entry.team_id === input.teamId && entry.status === "submitted"
    ).length;
    if (completedCount < 4) {
      throw new Error("Finish check-in unlocks only after all 4 challenges are completed.");
    }
  }

  if (input.checkinType === "challenge") {
    const challenge = getLocalChallenges(true).find((item) => item.id === input.challengeId) ?? null;
    if (!challenge) {
      throw new Error("Challenge was not found.");
    }
    if (challenge.kind === "game_long") {
      throw new Error("Challenge 1 unlocks from the start check-in and does not use a checkpoint.");
    }
    const previousChallenge = getLocalChallenges(true).find(
      (item) => item.challenge_order === challenge.challenge_order - 1
    );
    if (previousChallenge) {
      const previousStatus = state.teamChallengeStatus.find(
        (entry) => entry.team_id === input.teamId && entry.challenge_id === previousChallenge.id
      );
      const isPreviousComplete =
        previousChallenge.kind === "game_long"
          ? true
          : previousStatus?.status === "submitted";
      if (!isPreviousComplete) {
        throw new Error(
          `Complete Challenge ${previousChallenge.challenge_order} before unlocking this checkpoint.`
        );
      }
    }
    if (input.latitude == null || input.longitude == null) {
      throw new Error("Checkpoint unlock requires live GPS at the checkpoint.");
    }

    const checkpoint =
      challenge.kind === "union"
        ? {
            latitude: UNION_STATION.coordinates[1],
            longitude: UNION_STATION.coordinates[0],
            unlock_radius_meters: DEFAULT_CHECKPOINT_UNLOCK_RADIUS_METERS,
          }
        : getLocalChallengeCheckpoint(input.teamId, challenge);

    if (!checkpoint || checkpoint.latitude == null || checkpoint.longitude == null) {
      throw new Error("HQ has not configured this checkpoint yet.");
    }

    const distance = haversineMeters(
      input.latitude,
      input.longitude,
      checkpoint.latitude,
      checkpoint.longitude
    );

    if (distance > checkpoint.unlock_radius_meters) {
      throw new Error(
        `You need to be within ${Math.round(checkpoint.unlock_radius_meters)}m of the checkpoint to unlock this challenge.`
      );
    }

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
  }

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
