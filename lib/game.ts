import {
  ACTIVE_TEAM_IDS,
  MAX_CHALLENGES,
  CHALLENGE_PROOF_BUCKET,
  CHALLENGE_SUBMISSION_RANK_POINTS,
  MAX_FILES_PER_UPLOAD_REQUEST,
  MAX_UPLOAD_BYTES,
  TEAM_SEED,
  UNION_STATION,
} from "@/lib/config";
import { isSupabaseUnavailable } from "@/lib/data-source";
import {
  createLocalChallenge,
  createLocalCheckin,
  getLocalAdminGame,
  getLocalChallenges,
  getLocalCheckins,
  getLocalLatestLocations,
  getLocalLeaderboard,
  getLocalRecentCheckins,
  getLocalTeamDashboard,
  isLocalChallengeReleased,
  resetLocalState,
  reviewLocalCheckin,
  updateLocalChallenge,
  updateLocalChallengeExpectedLocation,
  updateLocalChallengeMediaToggle,
  updateLocalChallengeRelease,
  updateLocalChallengeReview,
  updateLocalChallengeSubmission,
  upsertLocalChallengeCheckinOnSubmit,
  updateLocalTeamCredentials,
  updateLocalTeamScore,
} from "@/lib/local-store";
import {
  ACCESS_SEED,
  TEAM_ROWS,
  TEAM_SCORE_ROWS,
} from "@/lib/seed";
import { supabase } from "@/lib/supabase";
import type {
  AdminCheckinFeedItem,
  AdminGameResponse,
  AdminRoutePoint,
  AdminTeamRoute,
  Challenge,
  ChallengeUpload,
  LeaderboardEntry,
  PublicMapResponse,
  Team,
  TeamCheckin,
  TeamCheckpoint,
  TeamDashboardResponse,
  TeamLatestLocation,
  TeamScore,
} from "@/lib/types";

class GameError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "GameError";
    this.status = status;
  }
}

type StatusRow = {
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

type UploadRow = ChallengeUpload;

type CheckinRow = TeamCheckin;

const ACTIVE_TEAM_ID_SET = new Set(ACTIVE_TEAM_IDS);

function isActiveTeamId(teamId: number) {
  return ACTIVE_TEAM_ID_SET.has(teamId);
}

function getMilestones(entry: {
  completed_count: number;
  total_challenges: number;
}): string[] {
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

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120);
}

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeUploadRow(row: UploadRow): ChallengeUpload {
  return {
    id: Number(row.id),
    team_id: Number(row.team_id),
    challenge_id: Number(row.challenge_id),
    bucket_name: row.bucket_name,
    storage_path: row.storage_path,
    public_url: row.public_url,
    signed_url: row.public_url,
    media_type: row.media_type,
    file_name: row.file_name,
    mime_type: row.mime_type,
    file_size_bytes: Number(row.file_size_bytes),
    uploaded_at: row.uploaded_at,
  };
}

async function getChallengeById(challengeId: number): Promise<Challenge | null> {
  const challenges = await getChallenges(true);
  return challenges.find((challenge) => challenge.id === challengeId) ?? null;
}

async function requireChallengeMediaEnabled(challengeId: number) {
  const challenge = await getChallengeById(challengeId);
  if (!challenge) {
    throw new GameError("Challenge was not found.", 404);
  }

  if (!challenge.allow_media_upload) {
    throw new GameError("Media upload is disabled for this challenge.", 409);
  }
}

function normalizeCheckinRow(row: CheckinRow): TeamCheckin {
  return {
    id: Number(row.id),
    team_id: Number(row.team_id),
    checkin_type: row.checkin_type,
    challenge_id: row.challenge_id === null ? null : Number(row.challenge_id),
    status: row.status,
    checkin_note: row.checkin_note ?? "",
    latitude: toFiniteNumber((row as any).latitude),
    longitude: toFiniteNumber((row as any).longitude),
    accuracy_meters: toFiniteNumber((row as any).accuracy_meters),
    gps_captured_at: row.gps_captured_at,
    created_at: row.created_at,
    review_note: row.review_note ?? "",
    reviewed_at: row.reviewed_at,
    reviewed_by: row.reviewed_by,
  };
}

function ensureAllowedMedia(file: File) {
  if (!file || !file.name) {
    throw new GameError("No file was provided.", 400);
  }

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) {
    throw new GameError("Only image and video uploads are allowed.", 415);
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new GameError(
      `Each file must be ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))}MB or smaller.`,
      413
    );
  }

  return { mediaType: (isImage ? "image" : "video") as "image" | "video" };
}

function getTeamSeed(teamId: number) {
  return TEAM_SEED.find((team) => team.id === teamId) ?? null;
}

function buildUploadsByChallenge(uploads: ChallengeUpload[]) {
  const uploadsByChallenge = new Map<number, ChallengeUpload[]>();

  for (const upload of uploads) {
    const current = uploadsByChallenge.get(upload.challenge_id) ?? [];
    current.push(upload);
    uploadsByChallenge.set(upload.challenge_id, current);
  }

  return uploadsByChallenge;
}

function buildCheckinsByKey(checkins: TeamCheckin[]) {
  const byKey = new Map<string, TeamCheckin[]>();

  for (const checkin of checkins) {
    const key =
      checkin.checkin_type === "challenge"
        ? `challenge:${checkin.challenge_id ?? "none"}`
        : checkin.checkin_type;
    const current = byKey.get(key) ?? [];
    current.push(checkin);
    byKey.set(key, current);
  }

  for (const items of byKey.values()) {
    items.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  }

  return byKey;
}

function checkpointLabel(
  type: "start" | "challenge" | "finish",
  challengeTitle?: string
) {
  if (type === "start") return "Start Check-In";
  if (type === "finish") return "Finish Check-In";
  return challengeTitle ? `${challengeTitle} Check-In` : "Challenge Check-In";
}

function checkpointDescription(
  type: "start" | "challenge" | "finish",
  team: Team,
  challenge?: Challenge
) {
  if (type === "start") return `Check in from ${team.start_location_name}.`;
  if (type === "finish") return `Check in when you arrive at ${UNION_STATION.name}.`;
  return challenge
    ? `Check in when your team finishes Challenge ${challenge.challenge_order}.`
    : "Check in after completing the challenge.";
}

function checkpointExpectedLocation(
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

function deriveCheckpoints(
  team: Team,
  releasedChallenges: Challenge[],
  checkins: TeamCheckin[]
): TeamCheckpoint[] {
  const byKey = buildCheckinsByKey(checkins);

  const startLatest = byKey.get("start")?.[0] ?? null;
  const finishLatest = byKey.get("finish")?.[0] ?? null;

  return [
    {
      key: "start",
      checkin_type: "start",
      challenge_id: null,
      label: "Start Check-In",
      description: checkpointDescription("start", team),
      expected_location_label: checkpointExpectedLocation("start", team).label,
      expected_location_description: checkpointExpectedLocation("start", team).description,
      status: startLatest?.status ?? "not_started",
      latest_checkin: startLatest,
    },
    ...releasedChallenges.map((challenge) => {
      const latest = byKey.get(`challenge:${challenge.id}`)?.[0] ?? null;
      const expected = checkpointExpectedLocation("challenge", team, challenge);
      return {
        key: `challenge-${challenge.id}`,
        checkin_type: "challenge" as const,
        challenge_id: challenge.id,
        label: checkpointLabel("challenge", challenge.title),
        description: checkpointDescription("challenge", team, challenge),
        expected_location_label: expected.label,
        expected_location_description: expected.description,
        status: (latest?.status ?? "not_started") as TeamCheckpoint["status"],
        latest_checkin: latest,
      };
    }),
    {
      key: "finish",
      checkin_type: "finish",
      challenge_id: null,
      label: "Finish Check-In",
      description: checkpointDescription("finish", team),
      expected_location_label: checkpointExpectedLocation("finish", team).label,
      expected_location_description: checkpointExpectedLocation("finish", team).description,
      status: finishLatest?.status ?? "not_started",
      latest_checkin: finishLatest,
    },
  ];
}

function getLatestLocationForTeam(
  team: Team,
  checkins: TeamCheckin[],
  challenges: Challenge[]
): TeamLatestLocation | null {
  const latest = checkins.find((item) => item.latitude !== null && item.longitude !== null);
  if (!latest || latest.latitude === null || latest.longitude === null) return null;

  const challenge = latest.challenge_id
    ? challenges.find((item) => item.id === latest.challenge_id)
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
    label: checkpointLabel(latest.checkin_type, challenge?.title),
  };
}

function buildAdminTeamRoute(team: Team, checkins: TeamCheckin[], challenges: Challenge[]): AdminTeamRoute {
  const start = checkins
    .filter(
      (item) =>
        item.checkin_type === "start" &&
        item.latitude !== null &&
        item.longitude !== null
    )
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0] ?? null;

  const challengePoints = challenges
    .slice()
    .sort((a, b) => a.challenge_order - b.challenge_order)
    .map((challenge) => {
      const latest = checkins
        .filter(
          (item) =>
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

  const finish = checkins
    .filter(
      (item) =>
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

async function signUploadUrl(upload: ChallengeUpload) {
  const { data, error } = await supabase.storage
    .from(upload.bucket_name)
    .createSignedUrl(upload.storage_path, 60 * 60);

  if (error) throw error;

  return {
    ...upload,
    signed_url: data.signedUrl,
  };
}

async function signUploads(uploads: ChallengeUpload[]) {
  return Promise.all(uploads.map(signUploadUrl));
}

async function getReleasedCount() {
  const { count, error } = await supabase
    .from("challenges")
    .select("*", { count: "exact", head: true })
    .eq("is_released", true);

  if (error) throw error;
  return count ?? 0;
}

async function getChallengeStatusRow(teamId: number, challengeId: number): Promise<StatusRow | null> {
  const { data, error } = await supabase
    .from("team_challenge_status")
    .select(
      "team_id, challenge_id, status, proof_note, awarded_points, submitted_at, review_status, review_note, reviewed_at, reviewed_by"
    )
    .eq("team_id", teamId)
    .eq("challenge_id", challengeId)
    .maybeSingle();

  if (error) throw error;
  return (data as StatusRow | null) ?? null;
}

async function recalculateChallengeAwardedPoints(challengeId: number) {
  const { data, error } = await supabase
    .from("team_challenge_status")
    .select("team_id, challenge_id, status, awarded_points, submitted_at, review_status")
    .eq("challenge_id", challengeId);

  if (error) throw error;

  const rows = (data ?? []) as Array<{
    team_id: number;
    challenge_id: number;
    status: "not_started" | "submitted";
    awarded_points: number;
    submitted_at: string | null;
    review_status: "pending" | "verified" | "rejected";
  }>;

  const nextPoints = new Map<number, number>();

  rows
    .filter(
      (row) => row.status === "submitted" && row.review_status === "verified" && Boolean(row.submitted_at)
    )
    .sort((a, b) => {
      const timeDiff = Date.parse(a.submitted_at as string) - Date.parse(b.submitted_at as string);
      if (timeDiff !== 0) return timeDiff;
      return Number(a.team_id) - Number(b.team_id);
    })
    .forEach((row, index) => {
      nextPoints.set(Number(row.team_id), pointsForSubmissionRank(index));
    });

  await Promise.all(
    rows.map((row) =>
      supabase
        .from("team_challenge_status")
        .update({ awarded_points: nextPoints.get(Number(row.team_id)) ?? 0 })
        .eq("team_id", Number(row.team_id))
        .eq("challenge_id", challengeId)
    )
  );
}

async function hasChallengeCheckin(teamId: number, challengeId: number) {
  try {
    const { data, error } = await supabase
      .from("team_checkins")
      .select("id")
      .eq("team_id", teamId)
      .eq("checkin_type", "challenge")
      .eq("challenge_id", challengeId)
      .limit(1)
      .maybeSingle<{ id: number }>();

    if (error) throw error;
    return Boolean(data?.id);
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      const localCheckins = getLocalCheckins(teamId);
      return localCheckins.some(
        (checkin) =>
          checkin.checkin_type === "challenge" && checkin.challenge_id === challengeId
      );
    }
    throw error;
  }
}

async function getTeamUploads(teamId: number) {
  const { data, error } = await supabase
    .from("challenge_media")
    .select(
      "id, team_id, challenge_id, bucket_name, storage_path, public_url, media_type, file_name, mime_type, file_size_bytes, uploaded_at"
    )
    .eq("team_id", teamId)
    .order("uploaded_at", { ascending: false });

  if (error) throw error;
  return signUploads(((data ?? []) as UploadRow[]).map(normalizeUploadRow));
}

async function getTeamCheckinsFromDb(teamId: number) {
  const { data, error } = await supabase
    .from("team_checkins")
    .select(
      "id, team_id, checkin_type, challenge_id, status, checkin_note, latitude, longitude, accuracy_meters, gps_captured_at, created_at, review_note, reviewed_at, reviewed_by"
    )
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as CheckinRow[]).map(normalizeCheckinRow);
}

async function getLatestChallengeCheckin(teamId: number, challengeId: number) {
  const { data, error } = await supabase
    .from("team_checkins")
    .select(
      "id, team_id, checkin_type, challenge_id, status, checkin_note, latitude, longitude, accuracy_meters, gps_captured_at, created_at, review_note, reviewed_at, reviewed_by"
    )
    .eq("team_id", teamId)
    .eq("checkin_type", "challenge")
    .eq("challenge_id", challengeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeCheckinRow(data as CheckinRow) : null;
}

async function getChallengeUploadCount(teamId: number, challengeId: number) {
  const { count, error } = await supabase
    .from("challenge_media")
    .select("*", { count: "exact", head: true })
    .eq("team_id", teamId)
    .eq("challenge_id", challengeId);

  if (error) throw error;
  return count ?? 0;
}

async function getSubmittedChallengeCount(teamId: number) {
  const { count, error } = await supabase
    .from("team_challenge_status")
    .select("*", { count: "exact", head: true })
    .eq("team_id", teamId)
    .eq("status", "submitted");

  if (error) throw error;
  return count ?? 0;
}

async function upsertChallengeCheckinOnSubmit(input: {
  teamId: number;
  challengeId: number;
  checkinNote?: string;
  latitude?: number | null;
  longitude?: number | null;
  accuracyMeters?: number | null;
  gpsCapturedAt?: string | null;
}) {
  const existing = await getLatestChallengeCheckin(input.teamId, input.challengeId);
  const payload = {
    status: "pending" as const,
    checkin_note: (input.checkinNote ?? "").slice(0, 500),
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    accuracy_meters: input.accuracyMeters ?? null,
    gps_captured_at: input.gpsCapturedAt ?? null,
    review_note: "",
    reviewed_at: null,
    reviewed_by: null,
  };

  if (existing) {
    const { data, error } = await supabase
      .from("team_checkins")
      .update({
        ...payload,
        created_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select(
        "id, team_id, checkin_type, challenge_id, status, checkin_note, latitude, longitude, accuracy_meters, gps_captured_at, created_at, review_note, reviewed_at, reviewed_by"
      )
      .single();

    if (error) throw error;
    return normalizeCheckinRow(data as CheckinRow);
  }

  const { data, error } = await supabase
    .from("team_checkins")
    .insert({
      team_id: input.teamId,
      checkin_type: "challenge",
      challenge_id: input.challengeId,
      ...payload,
    })
    .select(
      "id, team_id, checkin_type, challenge_id, status, checkin_note, latitude, longitude, accuracy_meters, gps_captured_at, created_at, review_note, reviewed_at, reviewed_by"
    )
    .single();

  if (error) throw error;
  return normalizeCheckinRow(data as CheckinRow);
}

async function getAllCheckinsFromDb() {
  const { data, error } = await supabase
    .from("team_checkins")
    .select(
      "id, team_id, checkin_type, challenge_id, status, checkin_note, latitude, longitude, accuracy_meters, gps_captured_at, created_at, review_note, reviewed_at, reviewed_by"
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as CheckinRow[]).map(normalizeCheckinRow);
}

async function getCheckinById(checkinId: number) {
  const { data, error } = await supabase
    .from("team_checkins")
    .select(
      "id, team_id, checkin_type, challenge_id, status, checkin_note, latitude, longitude, accuracy_meters, gps_captured_at, created_at, review_note, reviewed_at, reviewed_by"
    )
    .eq("id", checkinId)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeCheckinRow(data as CheckinRow) : null;
}

async function clearProofBucket() {
  const bucket = supabase.storage.from(CHALLENGE_PROOF_BUCKET);
  const stack = [""];

  while (stack.length) {
    const prefix = stack.pop() ?? "";
    const { data, error } = await bucket.list(prefix, { limit: 1000 });
    if (error) throw error;

    const filesToRemove: string[] = [];
    for (const item of data ?? []) {
      const nextPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) {
        filesToRemove.push(nextPath);
      } else {
        stack.push(nextPath);
      }
    }

    if (filesToRemove.length) {
      const { error: removeError } = await bucket.remove(filesToRemove);
      if (removeError) throw removeError;
    }
  }
}

export function isGameError(error: unknown): error is GameError {
  return error instanceof GameError;
}

export async function getChallenges(includeHidden = true): Promise<Challenge[]> {
  try {
    let query = supabase
      .from("challenges")
      .select("id, challenge_order, title, text, expected_location, allow_media_upload, is_released")
      .order("challenge_order", { ascending: true });

    if (!includeHidden) {
      query = query.eq("is_released", true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Challenge[];
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      return getLocalChallenges(includeHidden);
    }
    throw error;
  }
}

export async function getTeamCheckins(teamId: number): Promise<TeamCheckin[]> {
  try {
    return await getTeamCheckinsFromDb(teamId);
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      return getLocalCheckins(teamId);
    }
    throw error;
  }
}

export async function getLatestLocations(): Promise<TeamLatestLocation[]> {
  try {
    const [teamsResult, challenges, checkins] = await Promise.all([
      supabase
        .from("teams")
        .select("id, team_name, color, badge_label")
        .order("id", { ascending: true }),
      getChallenges(true),
      getAllCheckinsFromDb(),
    ]);

    if (teamsResult.error) throw teamsResult.error;
    const checkinsByTeam = new Map<number, TeamCheckin[]>();
    for (const checkin of checkins) {
      const current = checkinsByTeam.get(checkin.team_id) ?? [];
      current.push(checkin);
      checkinsByTeam.set(checkin.team_id, current);
    }

    return ((teamsResult.data ?? []) as Array<{
      id: number;
      team_name: string;
      color: string;
      badge_label: string;
    }>)
      .filter((team) => isActiveTeamId(Number(team.id)))
      .map((team) =>
        getLatestLocationForTeam(
          {
            id: team.id,
            team_name: team.team_name,
            start_location_name: "",
            address: "",
            route_summary: "",
            walk_time: "",
            color: team.color,
            badge_label: team.badge_label,
          },
          checkinsByTeam.get(team.id) ?? [],
          challenges
        )
      )
      .filter(Boolean) as TeamLatestLocation[];
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      return getLocalLatestLocations();
    }
    throw error;
  }
}

export async function getRecentCheckins(): Promise<AdminCheckinFeedItem[]> {
  try {
    const [teamsResult, checkins, challengesResult, statusResult, uploadsResult] = await Promise.all([
      supabase
        .from("teams")
        .select("id, team_name, color, badge_label")
        .order("id", { ascending: true }),
      getAllCheckinsFromDb(),
      supabase
        .from("challenges")
        .select("id, challenge_order, title, text, expected_location"),
      supabase
        .from("team_challenge_status")
        .select("team_id, challenge_id, proof_note, review_status"),
      supabase
        .from("challenge_media")
        .select(
          "id, team_id, challenge_id, bucket_name, storage_path, public_url, media_type, file_name, mime_type, file_size_bytes, uploaded_at"
        )
        .order("uploaded_at", { ascending: false }),
    ]);

    if (teamsResult.error) throw teamsResult.error;
    if (challengesResult.error) throw challengesResult.error;
    if (statusResult.error) throw statusResult.error;
    if (uploadsResult.error) throw uploadsResult.error;
    const teamMap = new Map(
      ((teamsResult.data ?? []) as Array<{
        id: number;
        team_name: string;
        color: string;
        badge_label: string;
      }>).map((team) => [team.id, team])
    );
    const challengeMap = new Map(
      ((challengesResult.data ?? []) as Array<{
        id: number;
        challenge_order: number;
        title: string;
        text: string;
        expected_location: string;
      }>).map((challenge) => [challenge.id, challenge])
    );
    const statusMap = new Map(
      ((statusResult.data ?? []) as Array<{
        team_id: number;
        challenge_id: number;
        proof_note: string;
        review_status: "pending" | "verified" | "rejected";
      }>).map((status) => [`${status.team_id}:${status.challenge_id}`, status] as const)
    );
    const uploadsByKey = new Map<string, ChallengeUpload[]>();
    const signedUploads = await signUploads(((uploadsResult.data ?? []) as UploadRow[]).map(normalizeUploadRow));
    for (const upload of signedUploads) {
      const key = `${upload.team_id}:${upload.challenge_id}`;
      const current = uploadsByKey.get(key) ?? [];
      current.push(upload);
      uploadsByKey.set(key, current);
    }

    return checkins
      .filter((checkin) => isActiveTeamId(checkin.team_id))
      .map((checkin) => {
      const team = teamMap.get(checkin.team_id);
      const challenge =
        checkin.challenge_id !== null ? challengeMap.get(checkin.challenge_id) ?? null : null;
      const challengeStatus =
        checkin.challenge_id !== null
          ? statusMap.get(`${checkin.team_id}:${checkin.challenge_id}`) ?? null
          : null;
      const uploads =
        checkin.challenge_id !== null
          ? uploadsByKey.get(`${checkin.team_id}:${checkin.challenge_id}`) ?? []
          : [];

      return {
        ...checkin,
        team_name: team?.team_name ?? `Team ${checkin.team_id}`,
        color: team?.color ?? "#d85f3a",
        badge_label: team?.badge_label ?? "Team",
        checkpoint_label: checkpointLabel(checkin.checkin_type, challenge?.title),
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
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      return getLocalRecentCheckins();
    }
    throw error;
  }
}

export async function getPublicMapData(): Promise<PublicMapResponse> {
  try {
    const [teamsResult, challenges, latestLocations, allCheckins] = await Promise.all([
      supabase
        .from("teams")
        .select("id, team_name, start_location_name, address, route_summary, walk_time, color, badge_label")
        .order("id", { ascending: true }),
      getChallenges(true),
      getLatestLocations(),
      getAllCheckinsFromDb(),
    ]);

    if (teamsResult.error) throw teamsResult.error;

    const teams = (((teamsResult.data ?? []) as Team[]) ?? []).filter((team) => isActiveTeamId(team.id));
    const checkinsByTeam = new Map<number, TeamCheckin[]>();
    for (const checkin of allCheckins) {
      const current = checkinsByTeam.get(checkin.team_id) ?? [];
      current.push(checkin);
      checkinsByTeam.set(checkin.team_id, current);
    }

    return {
      latestLocations,
      teamRoutes: teams.map((team) =>
        buildAdminTeamRoute(team, checkinsByTeam.get(team.id) ?? [], challenges)
      ),
      union: {
        name: UNION_STATION.name,
        latitude: UNION_STATION.coordinates[1],
        longitude: UNION_STATION.coordinates[0],
        label: UNION_STATION.finishPoint,
      },
    };
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      const adminGame = getLocalAdminGame();
      return {
        latestLocations: adminGame.latestLocations,
        teamRoutes: adminGame.teamRoutes,
        union: {
          name: UNION_STATION.name,
          latitude: UNION_STATION.coordinates[1],
          longitude: UNION_STATION.coordinates[0],
          label: UNION_STATION.finishPoint,
        },
      };
    }
    throw error;
  }
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const [challengesResult, teamsResult, statusResult] = await Promise.all([
      supabase.from("challenges").select("id, is_released"),
      supabase
        .from("teams")
        .select("id, team_name, start_location_name, walk_time, color, badge_label")
        .order("id", { ascending: true }),
      supabase.from("team_challenge_status").select("team_id, challenge_id, status, awarded_points, submitted_at, review_status"),
    ]);

    if (challengesResult.error) throw challengesResult.error;
    if (teamsResult.error) throw teamsResult.error;
    if (statusResult.error) throw statusResult.error;

    const teams = ((teamsResult.data ?? []) as Array<{
      id: number;
      team_name: string;
      start_location_name: string;
      walk_time: string;
      color: string;
      badge_label: string;
    }>).filter((team) => isActiveTeamId(Number(team.id)));
    const challenges = (challengesResult.data ?? []) as Array<{
      id: number;
      is_released: boolean;
    }>;
    const releasedChallengeIds = new Set(
      challenges.filter((item) => Boolean(item.is_released)).map((item) => Number(item.id))
    );
    const totalChallenges = challenges.length;
    const releasedCount = challenges.filter((item) => Boolean(item.is_released)).length;

    const statusRows = (statusResult.data ?? []) as Array<{
      team_id: number;
      challenge_id: number;
      status: string;
      awarded_points: number;
      submitted_at: string | null;
      review_status: "pending" | "verified" | "rejected";
    }>;
    const statusesByTeam = new Map<number, Array<{
      challenge_id: number;
      status: string;
      awarded_points: number;
      submitted_at: string | null;
      review_status: "pending" | "verified" | "rejected";
    }>>();
    for (const row of statusRows) {
      if (!releasedChallengeIds.has(Number(row.challenge_id))) continue;
      const current = statusesByTeam.get(Number(row.team_id)) ?? [];
      current.push({
        challenge_id: Number(row.challenge_id),
        status: row.status,
        awarded_points: Number(row.awarded_points ?? 0),
        submitted_at: row.submitted_at ?? null,
        review_status: row.review_status,
      });
      statusesByTeam.set(Number(row.team_id), current);
    }

    const scored = teams.map((row) => {
      const statuses = statusesByTeam.get(row.id) ?? [];
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
        id: row.id,
        team_name: row.team_name,
        start_location_name: row.start_location_name,
        walk_time: row.walk_time,
        color: row.color,
        badge_label: row.badge_label,
        completed_count: completedCount,
        challenge_points: challengePoints,
        total_points: totalPoints,
        released_count: releasedCount,
        total_challenges: totalChallenges,
        progress_percent: progressPercent,
        milestones: getMilestones({
          completed_count: completedCount,
          total_challenges: totalChallenges,
        }),
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
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      return getLocalLeaderboard();
    }
    throw error;
  }
}

export async function getTeamDashboard(teamId: number): Promise<TeamDashboardResponse | null> {
  if (!isActiveTeamId(teamId)) {
    return null;
  }

  try {
    const [teamResult, releasedChallenges, statusResult, uploads, checkins, leaderboard] =
      await Promise.all([
        supabase
          .from("teams")
          .select("id, team_name, start_location_name, address, route_summary, walk_time, color, badge_label")
          .eq("id", teamId)
          .maybeSingle(),
        getChallenges(false),
        supabase
          .from("team_challenge_status")
          .select(
            "challenge_id, status, proof_note, awarded_points, submitted_at, review_status, review_note, reviewed_at, reviewed_by"
          )
          .eq("team_id", teamId),
        getTeamUploads(teamId),
        getTeamCheckinsFromDb(teamId),
        getLeaderboard(),
      ]);

    if (teamResult.error) throw teamResult.error;
    if (statusResult.error) throw statusResult.error;

    const team = teamResult.data as Team | null;
    if (!team) return null;

    const statuses = new Map(
      ((statusResult.data ?? []) as Array<{
        challenge_id: number;
        status: "not_started" | "submitted";
        proof_note: string;
        awarded_points: number;
        submitted_at: string | null;
        review_status: "pending" | "verified" | "rejected";
        review_note: string;
        reviewed_at: string | null;
        reviewed_by: string | null;
      }>).map((status) => [status.challenge_id, status])
    );
    const uploadsByChallenge = buildUploadsByChallenge(uploads);
    const latestLocation = getLatestLocationForTeam(team, checkins, releasedChallenges);

    const challenges = await Promise.all(
      releasedChallenges.map(async (challenge) => {
      const status = statuses.get(challenge.id);
      const isUnlocked = await hasChallengeCheckin(teamId, challenge.id);
      return {
        ...challenge,
        is_unlocked: isUnlocked,
        status: status?.status ?? "not_started",
        proof_note: status?.proof_note ?? "",
        awarded_points: Number(status?.awarded_points ?? 0),
        submitted_at: status?.submitted_at ?? null,
        review_status: status?.review_status ?? "pending",
        review_note: status?.review_note ?? "",
        reviewed_at: status?.reviewed_at ?? null,
        reviewed_by: status?.reviewed_by ?? null,
        uploads: uploadsByChallenge.get(challenge.id) ?? [],
      };
      })
    );

    const teamStats = leaderboard.find((entry) => entry.id === teamId);
    if (!teamStats) return null;

    return {
      team,
      challenges,
      checkpoints: deriveCheckpoints(team, releasedChallenges, checkins),
      checkins,
      latestLocation,
      teamStats,
      leaderboard,
    };
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      return getLocalTeamDashboard(teamId);
    }
    throw error;
  }
}

export async function getAdminGame(): Promise<AdminGameResponse> {
  try {
    const [teamsResult, challenges, leaderboard, latestLocations, recentCheckins, credentialsResult, allCheckins] =
      await Promise.all([
        supabase.from("teams").select("id").order("id", { ascending: true }),
        getChallenges(true),
        getLeaderboard(),
        getLatestLocations(),
        getRecentCheckins(),
        supabase
          .from("access_credentials")
          .select("team_id, display_name, pin")
          .eq("role", "team"),
        getAllCheckinsFromDb(),
      ]);

    if (teamsResult.error) throw teamsResult.error;
    if (credentialsResult.error) throw credentialsResult.error;

    const credentialMap = new Map(
      ((credentialsResult.data ?? []) as Array<{
        team_id: number | null;
        display_name: string;
        pin: string;
      }>)
        .filter((entry) => entry.team_id !== null)
        .map((entry) => [
          Number(entry.team_id),
          {
            display_name: entry.display_name,
            pin: entry.pin,
          },
        ])
    );

    const teams = await Promise.all(
      ((teamsResult.data ?? []) as Array<{ id: number }>)
        .filter(({ id }) => isActiveTeamId(Number(id)))
        .map(async ({ id }) => {
        const team = await getTeamDashboard(id);
        if (!team) return null;
        return {
          ...team,
          adminAccess: credentialMap.get(id),
        };
      })
    );

    const teamMap = new Map(
      (teams.filter(Boolean) as TeamDashboardResponse[]).map((teamView) => [teamView.team.id, teamView.team])
    );
    const checkinsByTeam = new Map<number, TeamCheckin[]>();
    for (const checkin of allCheckins) {
      const current = checkinsByTeam.get(checkin.team_id) ?? [];
      current.push(checkin);
      checkinsByTeam.set(checkin.team_id, current);
    }

    const teamRoutes = Array.from(teamMap.values()).map((team) =>
      buildAdminTeamRoute(team, checkinsByTeam.get(team.id) ?? [], challenges)
    );

    return {
      challenges,
      teams: teams.filter(Boolean) as TeamDashboardResponse[],
      latestLocations,
      teamRoutes,
      recentCheckins,
      leaderboard,
      pins: {
        admin_hint: "Stored in Supabase access_credentials table",
        team_pin_count: ((teamsResult.data ?? []) as Array<{ id: number }>)
          .filter(({ id }) => isActiveTeamId(Number(id))).length,
      },
    };
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      return getLocalAdminGame();
    }
    throw error;
  }
}

export async function updateChallenge(
  challengeId: number,
  title: string,
  text: string,
  expectedLocation: string,
  allowMediaUpload: boolean
) {
  const cleanTitle = title.trim();
  const cleanText = text.trim();
  const cleanExpectedLocation = expectedLocation.trim();
  if (!cleanTitle || !cleanText || !cleanExpectedLocation) {
    throw new GameError("Title, prompt, and expected location are all required.", 400);
  }

  try {
    const { error } = await supabase
      .from("challenges")
      .update({
        title: cleanTitle.slice(0, 120),
        text: cleanText.slice(0, 500),
        expected_location: cleanExpectedLocation.slice(0, 160),
        allow_media_upload: allowMediaUpload,
      })
      .eq("id", challengeId);

    if (error) throw error;
    return getChallenges(true);
  } catch (error) {
    if (isGameError(error)) throw error;
    if (isSupabaseUnavailable(error)) {
      updateLocalChallenge(challengeId, cleanTitle, cleanText);
      updateLocalChallengeExpectedLocation(challengeId, cleanExpectedLocation);
      updateLocalChallengeMediaToggle(challengeId, allowMediaUpload);
      return getLocalChallenges(true);
    }
    throw error;
  }
}

export async function createChallenge(
  title: string,
  text: string,
  expectedLocation: string,
  allowMediaUpload: boolean
) {
  const cleanTitle = title.trim();
  const cleanText = text.trim();
  const cleanExpectedLocation = expectedLocation.trim();
  if (!cleanTitle || !cleanText || !cleanExpectedLocation) {
    throw new GameError("Title, prompt, and expected location are all required.", 400);
  }

  try {
    const existing = await getChallenges(true);
    if (existing.length >= MAX_CHALLENGES) {
      throw new GameError(`You can create up to ${MAX_CHALLENGES} challenges.`, 409);
    }

    const nextOrder = existing.length + 1;
    const nextId =
      existing.reduce((max, challenge) => Math.max(max, challenge.id), 0) + 1;

    const payload = {
      id: nextId,
      challenge_order: nextOrder,
      title: cleanTitle.slice(0, 120),
      text: cleanText.slice(0, 500),
      expected_location: cleanExpectedLocation.slice(0, 160),
      allow_media_upload: allowMediaUpload,
      is_released: false,
    };

    const { error: challengeError } = await supabase.from("challenges").insert(payload);
    if (challengeError) throw challengeError;

    const statusRows = TEAM_ROWS.map((team) => ({
      team_id: team.id,
      challenge_id: nextId,
      status: "not_started",
      proof_note: "",
      awarded_points: 0,
      submitted_at: null,
      review_status: "pending",
      review_note: "",
      reviewed_at: null,
      reviewed_by: null,
    }));

    const { error: statusError } = await supabase.from("team_challenge_status").insert(statusRows);
    if (statusError) throw statusError;

    return getChallenges(true);
  } catch (error) {
    if (isGameError(error)) throw error;
    if (isSupabaseUnavailable(error)) {
      const existing = getLocalChallenges(true);
      if (existing.length >= MAX_CHALLENGES) {
        throw new GameError(`You can create up to ${MAX_CHALLENGES} challenges.`, 409);
      }
      createLocalChallenge(cleanTitle, cleanText, cleanExpectedLocation, allowMediaUpload);
      return getLocalChallenges(true);
    }
    throw error;
  }
}

export async function updateChallengeRelease(challengeId: number, isReleased: boolean) {
  try {
    const payload = { is_released: isReleased };
    const { error } = await supabase
      .from("challenges")
      .update(payload)
      .eq("id", challengeId);

    if (error) throw error;
    return getChallenges(true);
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      updateLocalChallengeRelease(challengeId, isReleased);
      return getLocalChallenges(true);
    }
    throw error;
  }
}

export async function updateTeamChallengeSubmission(
  teamId: number,
  challengeId: number,
  proofNote: string,
  status: "submitted" | "not_started",
  gps?: {
    latitude?: number | null;
    longitude?: number | null;
    accuracyMeters?: number | null;
    gpsCapturedAt?: string | null;
  }
) {
  try {
    const current = await getChallengeStatusRow(teamId, challengeId);
    if (!current) {
      throw new GameError("Challenge submission was not found.", 404);
    }
    if (current.review_status === "verified") {
      throw new GameError("This challenge has already been verified by HQ and is now locked.", 409);
    }

    if (status === "submitted") {
      const hasProofNote = proofNote.trim().length > 0;
      const uploadCount = await getChallengeUploadCount(teamId, challengeId);
      if (!hasProofNote && uploadCount === 0) {
        throw new GameError("Add a proof note or upload media before submitting.", 400);
      }
    }

    const shouldResetReview = status === "not_started" || current.review_status === "rejected";
    const submittedAt =
      status === "submitted"
        ? current.status === "submitted" && current.submitted_at
          ? current.submitted_at
          : new Date().toISOString()
        : null;
    const { error } = await supabase
      .from("team_challenge_status")
      .update({
        status,
        proof_note: proofNote.slice(0, 500),
        awarded_points: status === "submitted" ? current.awarded_points ?? 0 : 0,
        submitted_at: submittedAt,
        review_status: shouldResetReview ? "pending" : current.review_status,
        review_note: shouldResetReview ? "" : current.review_note,
        reviewed_at: shouldResetReview ? null : current.reviewed_at,
        reviewed_by: shouldResetReview ? null : current.reviewed_by,
      })
      .eq("team_id", teamId)
      .eq("challenge_id", challengeId);

    if (error) throw error;

    if (status === "submitted") {
      await upsertChallengeCheckinOnSubmit({
        teamId,
        challengeId,
        checkinNote: proofNote,
        latitude: gps?.latitude ?? null,
        longitude: gps?.longitude ?? null,
        accuracyMeters: gps?.accuracyMeters ?? null,
        gpsCapturedAt: gps?.gpsCapturedAt ?? null,
      });
    }
  } catch (error) {
    if (isGameError(error)) {
      throw error;
    }
    if (isSupabaseUnavailable(error)) {
      if (status === "submitted") {
        const localDashboard = getLocalTeamDashboard(teamId);
        const localChallenge = localDashboard?.challenges.find((item) => item.id === challengeId) ?? null;
        const hasProofNote = proofNote.trim().length > 0;
        const uploadCount = localChallenge?.uploads.length ?? 0;
        if (!hasProofNote && uploadCount === 0) {
          throw new GameError("Add a proof note or upload media before submitting.", 400);
        }
      }
      updateLocalChallengeSubmission(teamId, challengeId, proofNote, status);
      if (status === "submitted") {
        upsertLocalChallengeCheckinOnSubmit({
          teamId,
          challengeId,
          checkinNote: proofNote,
          latitude: gps?.latitude ?? null,
          longitude: gps?.longitude ?? null,
          accuracyMeters: gps?.accuracyMeters ?? null,
          gpsCapturedAt: gps?.gpsCapturedAt ?? null,
        });
      }
      return;
    }
    throw error;
  }
}

export async function uploadTeamChallengeMedia(teamId: number, challengeId: number, file: File) {
  try {
    await requireChallengeMediaEnabled(challengeId);
    const statusRow = await getChallengeStatusRow(teamId, challengeId);
    if (!statusRow) {
      throw new GameError("Challenge submission was not found.", 404);
    }
    if (statusRow.review_status === "verified") {
      throw new GameError("This challenge has already been verified by HQ and is locked.", 409);
    }

    const { mediaType } = ensureAllowedMedia(file);
    const fileName = sanitizeFileName(file.name || "upload");
    const storagePath = `team-${teamId}/challenge-${challengeId}/${Date.now()}-${fileName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const bucket = supabase.storage.from(CHALLENGE_PROOF_BUCKET);

    const { error: uploadError } = await bucket.upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) throw uploadError;

    const payload = {
      team_id: teamId,
      challenge_id: challengeId,
      bucket_name: CHALLENGE_PROOF_BUCKET,
      storage_path: storagePath,
      public_url: "",
      media_type: mediaType,
      file_name: fileName,
      mime_type: file.type,
      file_size_bytes: file.size,
    };

    const { data, error } = await supabase
      .from("challenge_media")
      .insert(payload)
      .select(
        "id, team_id, challenge_id, bucket_name, storage_path, public_url, media_type, file_name, mime_type, file_size_bytes, uploaded_at"
      )
      .single();

    if (error) {
      await bucket.remove([storagePath]);
      throw error;
    }

    return normalizeUploadRow(data as UploadRow);
  } catch (error) {
    if (isGameError(error)) {
      throw error;
    }
    if (isSupabaseUnavailable(error)) {
      throw new GameError(
        "Media uploads are unavailable while the app is using local fallback mode.",
        503
      );
    }
    throw error;
  }
}

export async function deleteTeamChallengeMedia(teamId: number, challengeId: number, uploadId: number) {
  try {
    const statusRow = await getChallengeStatusRow(teamId, challengeId);
    if (!statusRow) {
      throw new GameError("Challenge submission was not found.", 404);
    }
    if (statusRow.review_status === "verified") {
      throw new GameError("This challenge has already been verified by HQ and is locked.", 409);
    }

    const { data, error } = await supabase
      .from("challenge_media")
      .select(
        "id, team_id, challenge_id, bucket_name, storage_path, public_url, media_type, file_name, mime_type, file_size_bytes, uploaded_at"
      )
      .eq("id", uploadId)
      .eq("team_id", teamId)
      .eq("challenge_id", challengeId)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new GameError("Upload not found.", 404);
    }

    const { error: storageError } = await supabase.storage.from(data.bucket_name).remove([data.storage_path]);
    if (storageError) throw storageError;

    const { error: deleteError } = await supabase
      .from("challenge_media")
      .delete()
      .eq("id", uploadId)
      .eq("team_id", teamId)
      .eq("challenge_id", challengeId);
    if (deleteError) throw deleteError;
  } catch (error) {
    if (isGameError(error)) {
      throw error;
    }
    if (isSupabaseUnavailable(error)) {
      throw new GameError(
        "Media uploads are unavailable while the app is using local fallback mode.",
        503
      );
    }
    throw error;
  }
}

export async function reviewTeamChallenge(
  teamId: number,
  challengeId: number,
  reviewStatus: "pending" | "verified" | "rejected",
  reviewNote: string,
  reviewedBy: string
) {
  try {
    const { error } = await supabase
      .from("team_challenge_status")
      .update({
        review_status: reviewStatus,
        review_note: reviewNote.slice(0, 500),
        awarded_points: 0,
        reviewed_at: reviewStatus === "pending" ? null : new Date().toISOString(),
        reviewed_by: reviewStatus === "pending" ? null : reviewedBy,
      })
      .eq("team_id", teamId)
      .eq("challenge_id", challengeId);

    if (error) throw error;
    await recalculateChallengeAwardedPoints(challengeId);
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      updateLocalChallengeReview(teamId, challengeId, reviewStatus, reviewNote, reviewedBy);
      return;
    }
    throw error;
  }
}

export async function createTeamCheckin(input: {
  teamId: number;
  checkinType: "start" | "challenge" | "finish";
  challengeId?: number | null;
  checkinNote?: string;
  latitude?: number | null;
  longitude?: number | null;
  accuracyMeters?: number | null;
  gpsCapturedAt?: string | null;
}) {
  const challengeId = input.challengeId ?? null;

  if (input.checkinType === "challenge") {
    if (!challengeId) {
      throw new GameError("Challenge check-ins require a challenge ID.", 400);
    }
    if (!(await isChallengeReleased(challengeId))) {
      throw new GameError("Challenge is not available.", 404);
    }
  }

  if (input.checkinType !== "challenge" && challengeId !== null) {
    throw new GameError("Only challenge check-ins can include a challenge ID.", 400);
  }

  try {
    if (input.checkinType === "finish") {
      const completedCount = await getSubmittedChallengeCount(input.teamId);
      if (completedCount < 5) {
        throw new GameError("Finish check-in unlocks only after all 5 challenges are completed.", 409);
      }
    }

    const payload = {
      team_id: input.teamId,
      checkin_type: input.checkinType,
      challenge_id: challengeId,
      status: "pending" as const,
      checkin_note: (input.checkinNote ?? "").slice(0, 500),
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      accuracy_meters: input.accuracyMeters ?? null,
      gps_captured_at: input.gpsCapturedAt ?? null,
    };

    const { data, error } = await supabase
      .from("team_checkins")
      .insert(payload)
      .select(
        "id, team_id, checkin_type, challenge_id, status, checkin_note, latitude, longitude, accuracy_meters, gps_captured_at, created_at, review_note, reviewed_at, reviewed_by"
      )
      .single();

    if (error) throw error;
    return normalizeCheckinRow(data as CheckinRow);
  } catch (error) {
    if (isGameError(error)) {
      throw error;
    }
    if (isSupabaseUnavailable(error)) {
      if (input.checkinType === "finish") {
        const localDashboard = getLocalTeamDashboard(input.teamId);
        if ((localDashboard?.teamStats.completed_count ?? 0) < 5) {
          throw new GameError(
            "Finish check-in unlocks only after all 5 challenges are completed.",
            409
          );
        }
      }
      return createLocalCheckin(input);
    }
    throw error;
  }
}

export async function reviewTeamCheckin(
  checkinId: number,
  status: "pending" | "verified" | "rejected",
  reviewNote: string,
  reviewedBy: string
) {
  try {
    const { error } = await supabase
      .from("team_checkins")
      .update({
        status,
        review_note: reviewNote.slice(0, 500),
        reviewed_at: status === "pending" ? null : new Date().toISOString(),
        reviewed_by: status === "pending" ? null : reviewedBy,
      })
      .eq("id", checkinId);

    if (error) throw error;
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      const row = reviewLocalCheckin(checkinId, status, reviewNote, reviewedBy);
      if (!row) {
        throw new GameError("Check-in not found.", 404);
      }
      return row;
    }
    throw error;
  }

  const updated = await getCheckinById(checkinId);
  if (!updated) {
    throw new GameError("Check-in not found.", 404);
  }
  return updated;
}

export async function updateTeamScore(
  teamId: number,
  arrivalRank: number | null,
  creativityScore: number
) {
  try {
    const { error } = await supabase
      .from("team_scores")
      .update({
        arrival_rank: arrivalRank,
        creativity_score: Math.max(0, Math.min(20, creativityScore)),
      })
      .eq("team_id", teamId);

    if (error) throw error;
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      updateLocalTeamScore(teamId, arrivalRank, creativityScore);
      return;
    }
    throw error;
  }
}

export async function updateTeamCredentials(teamId: number, teamName: string, pin: string) {
  const cleanTeamName = teamName.trim();
  const cleanPin = pin.trim();

  if (!cleanTeamName || !cleanPin) {
    throw new GameError("Team name and PIN are required.", 400);
  }

  try {
    const { data: team, error: teamLookupError } = await supabase
      .from("teams")
      .select("id")
      .eq("id", teamId)
      .maybeSingle<{ id: number }>();

    if (teamLookupError) throw teamLookupError;
    if (!team?.id) {
      throw new GameError("Team was not found.", 404);
    }

    const { data: duplicateTeam, error: duplicateError } = await supabase
      .from("teams")
      .select("id")
      .eq("team_name", cleanTeamName)
      .neq("id", teamId)
      .maybeSingle<{ id: number }>();

    if (duplicateError) throw duplicateError;
    if (duplicateTeam?.id) {
      throw new GameError("A team with that name already exists.", 409);
    }

    const { error: teamUpdateError } = await supabase
      .from("teams")
      .update({ team_name: cleanTeamName.slice(0, 120) })
      .eq("id", teamId);

    if (teamUpdateError) throw teamUpdateError;

    const { error: credentialUpdateError } = await supabase
      .from("access_credentials")
      .update({
        display_name: cleanTeamName.slice(0, 120),
        pin: cleanPin.slice(0, 120),
      })
      .eq("role", "team")
      .eq("team_id", teamId);

    if (credentialUpdateError) throw credentialUpdateError;
  } catch (error) {
    if (isGameError(error)) {
      throw error;
    }
    if (isSupabaseUnavailable(error)) {
      try {
        updateLocalTeamCredentials(teamId, cleanTeamName, cleanPin);
        return;
      } catch (localError) {
        throw new GameError(
          localError instanceof Error ? localError.message : "Could not update team credentials.",
          400
        );
      }
    }
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      throw new GameError("A team with that name already exists.", 409);
    }
    throw error;
  }
}

export async function isChallengeReleased(challengeId: number) {
  try {
    const { data, error } = await supabase
      .from("challenges")
      .select("id, is_released")
      .eq("id", challengeId)
      .maybeSingle();

    if (error) throw error;
    return Boolean(data?.is_released);
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      return isLocalChallengeReleased(challengeId);
    }
    throw error;
  }
}

export async function resetGame() {
  try {
    await clearProofBucket();

    const deletes = await Promise.all([
      supabase.from("team_checkins").delete().gte("id", 1),
      supabase.from("challenge_media").delete().gte("id", 1),
      supabase.from("team_challenge_status").delete().gte("team_id", 1),
      supabase.from("team_scores").delete().gte("team_id", 1),
      supabase.from("challenges").delete().gte("id", 1),
      supabase.from("access_credentials").delete().gte("id", 1),
      supabase.from("teams").delete().gte("id", 1),
    ]);

    for (const result of deletes) {
      if (result.error) throw result.error;
    }

    const inserts = await Promise.all([
      supabase.from("teams").insert(TEAM_ROWS),
      supabase.from("team_scores").insert(TEAM_SCORE_ROWS),
      supabase.from("access_credentials").insert(ACCESS_SEED),
    ]);

    for (const result of inserts) {
      if (result.error) throw result.error;
    }

    return {
      challenges: await getChallenges(true),
      leaderboard: await getLeaderboard(),
    };
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      return resetLocalState();
    }
    throw error;
  }
}

export { GameError, MAX_FILES_PER_UPLOAD_REQUEST, TEAM_SEED, UNION_STATION };
