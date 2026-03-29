import {
  ACTIVE_TEAM_IDS,
  LOCAL_FALLBACK_GAME_ID,
  MAX_CHALLENGES,
  CHALLENGE_PROOF_BUCKET,
  CHALLENGE_SUBMISSION_RANK_POINTS,
  DEFAULT_CHECKPOINT_UNLOCK_RADIUS_METERS,
  MAX_FILES_PER_UPLOAD_REQUEST,
  MAX_UPLOAD_BYTES,
  TEAM_SEED,
  UNION_STATION,
} from "@/lib/config";
import { GameError, isGameError } from "@/lib/game-error";
import { isSupabaseUnavailable } from "@/lib/data-source";
import { EVENT_SLUG_PATTERN } from "@/lib/event-slug";
import {
  createLocalChallenge,
  createLocalCheckin,
  deleteLocalChallenge,
  getLocalAdminGame,
  getLocalChallenges,
  getLocalCheckins,
  getLocalLatestLocations,
  getLocalLeaderboard,
  getLocalRecentCheckins,
  getLocalTeamDashboard,
  getLocalTeamsForGameId,
  isLocalChallengeReleased,
  releaseAllLocalChallenges,
  resetLocalState,
  reviewLocalCheckin,
  updateLocalChallenge,
  updateLocalChallengeCheckpoints,
  updateLocalChallengeExpectedLocation,
  updateLocalChallengeMediaToggle,
  updateLocalChallengePrompts,
  updateLocalChallengeRelease,
  updateLocalChallengeReview,
  updateLocalChallengeSubmission,
  updateLocalTeamCredentials,
  updateLocalTeamScore,
} from "@/lib/local-store";
import { TEAM_ROWS } from "@/lib/seed";
import { supabase } from "@/lib/supabase";
import type {
  AdminCheckinFeedItem,
  AdminGameResponse,
  AdminRoutePoint,
  AdminTeamRoute,
  Challenge,
  ChallengeKind,
  ChallengeUpload,
  LeaderboardEntry,
  PublicMapResponse,
  Team,
  TeamChallengeCheckpoint,
  TeamChallengePrompt,
  TeamCheckin,
  TeamCheckpoint,
  TeamDashboardResponse,
  TeamLatestLocation,
  TeamScore,
} from "@/lib/types";

export type GameRow = {
  id: number;
  slug: string;
  name: string;
  finish_point_label: string | null;
};

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
type ChallengeCheckpointRow = TeamChallengeCheckpoint;
type ChallengePromptRow = TeamChallengePrompt;

async function getTeamIdsForGame(gameId: number): Promise<number[]> {
  try {
    const { data, error } = await supabase
      .from("teams")
      .select("id")
      .eq("game_id", gameId)
      .order("id", { ascending: true });

    if (error) throw error;
    return ((data ?? []) as Array<{ id: number }>).map((row) => Number(row.id));
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      return gameId === LOCAL_FALLBACK_GAME_ID ? [...ACTIVE_TEAM_IDS] : [];
    }
    throw error;
  }
}

async function teamBelongsToGame(gameId: number, teamId: number): Promise<boolean> {
  const ids = await getTeamIdsForGame(gameId);
  return ids.includes(teamId);
}

async function fetchTeamsForGame(gameId: number): Promise<Team[]> {
  try {
    const { data, error } = await supabase
      .from("teams")
      .select("id, team_name, start_location_name, address, route_summary, walk_time, color, badge_label")
      .eq("game_id", gameId)
      .order("id", { ascending: true });

    if (error) throw error;
    return (data ?? []) as Team[];
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      if (gameId !== LOCAL_FALLBACK_GAME_ID) return [];
      return TEAM_ROWS.map((t) => ({ ...t }));
    }
    throw error;
  }
}

async function getChallengeIdsForGame(gameId: number): Promise<number[]> {
  try {
    const { data, error } = await supabase
      .from("challenges")
      .select("id")
      .eq("game_id", gameId);

    if (error) throw error;
    return ((data ?? []) as Array<{ id: number }>).map((row) => Number(row.id));
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      if (gameId !== LOCAL_FALLBACK_GAME_ID) return [];
      return getLocalChallenges(LOCAL_FALLBACK_GAME_ID, true).map((c) => c.id);
    }
    throw error;
  }
}

export async function getGameBySlug(slug: string): Promise<GameRow | null> {
  const clean = slug.trim().toLowerCase();
  if (!clean) return null;
  try {
    const { data, error } = await supabase
      .from("games")
      .select("id, slug, name, finish_point_label")
      .eq("slug", clean)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return {
      id: Number(data.id),
      slug: String(data.slug),
      name: String(data.name),
      finish_point_label: data.finish_point_label ? String(data.finish_point_label) : null,
    };
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      return clean === "converge"
        ? {
            id: LOCAL_FALLBACK_GAME_ID,
            slug: "converge",
            name: "Converge",
            finish_point_label: UNION_STATION.finishPoint,
          }
        : null;
    }
    throw error;
  }
}

export async function createGameWithAdmin(input: {
  slug: string;
  name: string;
  adminDisplayName: string;
  adminPin: string;
  /** Set when the game is created by a signed-in organizer (product flow). */
  organizerId?: number | null;
}): Promise<{ id: number; slug: string }> {
  const slug = input.slug.trim().toLowerCase();
  const name = input.name.trim();
  const adminDisplayName = input.adminDisplayName.trim().slice(0, 120);
  const adminPin = input.adminPin.trim().slice(0, 120);

  if (!slug || !EVENT_SLUG_PATTERN.test(slug)) {
    throw new GameError(
      "Slug must be 3–50 characters: lowercase letters, numbers, and hyphens (no leading/trailing hyphen).",
      400
    );
  }
  if (!name) throw new GameError("Event name is required.", 400);
  if (!adminDisplayName) throw new GameError("Admin display name is required.", 400);
  if (!adminPin) throw new GameError("Admin PIN is required.", 400);

  try {
    const existing = await getGameBySlug(slug);
    if (existing) throw new GameError("That event URL is already taken.", 409);

    const gameInsert: Record<string, unknown> = {
      slug,
      name: name.slice(0, 200),
      finish_point_label: UNION_STATION.finishPoint,
    };
    if (input.organizerId != null && Number.isFinite(input.organizerId)) {
      gameInsert.organizer_id = input.organizerId;
    }

    const { data: gameRow, error: gameError } = await supabase
      .from("games")
      .insert(gameInsert)
      .select("id, slug")
      .single();

    if (gameError) throw gameError;
    const gameId = Number(gameRow.id);

    const { error: credError } = await supabase.from("access_credentials").insert({
      game_id: gameId,
      role: "admin",
      display_name: adminDisplayName,
      pin: adminPin,
      team_id: null,
    });

    if (credError) {
      await supabase.from("games").delete().eq("id", gameId);
      throw credError;
    }

    return { id: gameId, slug: String(gameRow.slug) };
  } catch (error) {
    if (isGameError(error)) throw error;
    if (isSupabaseUnavailable(error)) {
      throw new GameError("Cannot create an event while offline or without database.", 503);
    }
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      throw new GameError("That event URL is already taken.", 409);
    }
    throw error;
  }
}

export async function createTeamForGame(
  gameId: number,
  input: {
    teamName: string;
    pin: string;
    startLocationName?: string;
    address?: string;
    routeSummary?: string;
    walkTime?: string;
    color?: string;
    badgeLabel?: string;
  }
): Promise<Team> {
  const teamName = input.teamName.trim().slice(0, 120);
  const pin = input.pin.trim().slice(0, 120);
  if (!teamName || !pin) throw new GameError("Team name and PIN are required.", 400);

  try {
    const teams = await fetchTeamsForGame(gameId);
    if (teams.length >= 24) throw new GameError("You can add up to 24 teams per event.", 409);

    const { data: maxRow, error: maxError } = await supabase
      .from("teams")
      .select("id")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxError) throw maxError;
    const nextId = maxRow?.id != null ? Number(maxRow.id) + 1 : 1;

    const row = {
      id: nextId,
      game_id: gameId,
      team_name: teamName,
      start_location_name: (input.startLocationName ?? teamName).trim().slice(0, 200),
      address: (input.address ?? "TBD").trim().slice(0, 300),
      route_summary: (input.routeSummary ?? "Route TBD").trim().slice(0, 500),
      walk_time: (input.walkTime ?? "—").trim().slice(0, 80),
      color: (input.color ?? "#d85f3a").trim().slice(0, 32),
      badge_label: (input.badgeLabel ?? "Team").trim().slice(0, 80),
    };

    const { error: teamErr } = await supabase.from("teams").insert(row);
    if (teamErr) {
      if (teamErr.code === "23505") throw new GameError("A team with that name already exists.", 409);
      throw teamErr;
    }

    await supabase.from("team_scores").insert({
      team_id: nextId,
      arrival_rank: null,
      creativity_score: 0,
    });

    const { error: credErr } = await supabase.from("access_credentials").insert({
      game_id: gameId,
      role: "team",
      display_name: teamName,
      pin,
      team_id: nextId,
    });
    if (credErr) {
      await supabase.from("teams").delete().eq("id", nextId);
      throw credErr;
    }

    const created = await fetchTeamsForGame(gameId);
    const t = created.find((x) => x.id === nextId);
    if (!t) throw new GameError("Team was not created.", 500);
    return t;
  } catch (error) {
    if (isGameError(error)) throw error;
    if (isSupabaseUnavailable(error)) {
      throw new GameError("Cannot add teams while offline or without database.", 503);
    }
    throw error;
  }
}

async function getGameRow(gameId: number): Promise<GameRow | null> {
  try {
    const { data, error } = await supabase
      .from("games")
      .select("id, slug, name, finish_point_label")
      .eq("id", gameId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id: Number(data.id),
      slug: String(data.slug),
      name: String(data.name),
      finish_point_label: data.finish_point_label ? String(data.finish_point_label) : null,
    };
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      return gameId === LOCAL_FALLBACK_GAME_ID
        ? {
            id: LOCAL_FALLBACK_GAME_ID,
            slug: "converge",
            name: "Converge",
            finish_point_label: UNION_STATION.finishPoint,
          }
        : null;
    }
    throw error;
  }
}

function unionLabelFromGame(game: GameRow | null) {
  return game?.finish_point_label?.trim() || UNION_STATION.finishPoint;
}

function unionNameFromGame(game: GameRow | null) {
  const label = unionLabelFromGame(game);
  const first = label.split(",")[0]?.trim();
  return first || UNION_STATION.name;
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

function getChallengeKind(challengeOrder: number): ChallengeKind {
  if (challengeOrder === 1) return "game_long";
  if (challengeOrder === 4) return "union";
  return "checkpoint";
}

function normalizeChallengeRow(row: Omit<Challenge, "kind">): Challenge {
  return {
    ...row,
    id: Number(row.id),
    challenge_order: Number(row.challenge_order),
    allow_media_upload: Number(row.allow_media_upload),
    is_released: Number(row.is_released),
    kind: getChallengeKind(Number(row.challenge_order)),
  };
}

function normalizeChallengeCheckpointRow(row: ChallengeCheckpointRow): TeamChallengeCheckpoint {
  return {
    team_id: Number(row.team_id),
    challenge_id: Number(row.challenge_id),
    checkpoint_label: row.checkpoint_label ?? "",
    checkpoint_address: row.checkpoint_address ?? "",
    latitude: toFiniteNumber((row as any).latitude),
    longitude: toFiniteNumber((row as any).longitude),
    unlock_radius_meters: Number(row.unlock_radius_meters ?? DEFAULT_CHECKPOINT_UNLOCK_RADIUS_METERS),
  };
}

function normalizeChallengePromptRow(row: ChallengePromptRow): TeamChallengePrompt {
  return {
    team_id: Number(row.team_id),
    challenge_id: Number(row.challenge_id),
    prompt_text: row.prompt_text ?? "",
  };
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

function isMissingCheckpointTable(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42P01"
  );
}

function isMissingPromptTable(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42P01"
  );
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

async function getChallengeById(gameId: number, challengeId: number): Promise<Challenge | null> {
  try {
    const { data, error } = await supabase
      .from("challenges")
      .select("id, challenge_order, title, text, expected_location, allow_media_upload, is_released")
      .eq("id", challengeId)
      .eq("game_id", gameId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    const challenge = normalizeChallengeRow(data as Omit<Challenge, "kind">);
    const prompts = await getTeamChallengePromptsFromDb(gameId, {
      challengeIds: [challenge.id],
    });
    return attachTeamPromptsToChallenges([challenge], prompts)[0] ?? null;
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      if (gameId !== LOCAL_FALLBACK_GAME_ID) return null;
      return getLocalChallenges(gameId, true).find((c) => c.id === challengeId) ?? null;
    }
    throw error;
  }
}

async function getCheckpointAssignmentsFromDb(gameId: number): Promise<TeamChallengeCheckpoint[]> {
  try {
    const challengeIds = await getChallengeIdsForGame(gameId);
    if (!challengeIds.length) return [];

    const { data, error } = await supabase
      .from("team_challenge_checkpoints")
      .select(
        "team_id, challenge_id, checkpoint_label, checkpoint_address, latitude, longitude, unlock_radius_meters"
      )
      .in("challenge_id", challengeIds);

    if (error) throw error;

    return ((data ?? []) as ChallengeCheckpointRow[]).map(normalizeChallengeCheckpointRow);
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      if (gameId !== LOCAL_FALLBACK_GAME_ID) return [];
      return [];
    }
    if (isMissingCheckpointTable(error)) {
      return [];
    }
    throw error;
  }
}

async function requireChallengeMediaEnabled(gameId: number, challengeId: number) {
  const challenge = await getChallengeById(gameId, challengeId);
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
  challenge?: Pick<Challenge, "title" | "challenge_order" | "kind">
) {
  if (type === "start") return "Start Check-In";
  if (type === "finish") return "Finish Check-In";
  if (challenge?.kind === "union") return "Union Checkpoint";
  if (challenge?.kind === "checkpoint") return `Challenge ${challenge.challenge_order} Checkpoint`;
  return challenge?.title ? `${challenge.title} Check-In` : "Challenge Check-In";
}

function checkpointDescription(
  type: "start" | "challenge" | "finish",
  team: Team,
  challenge: Challenge | undefined,
  unionStationName: string,
  unionFinishLabel: string
) {
  if (type === "start") return `Check in from ${team.start_location_name}.`;
  if (type === "finish") return `Check in when you arrive at ${unionStationName}.`;
  if (!challenge) return "Check in when you reach the checkpoint.";
  if (challenge.kind === "union") {
    return `Arrive at ${unionStationName} to unlock Challenge ${challenge.challenge_order}.`;
  }
  return `Arrive at your assigned checkpoint to unlock Challenge ${challenge.challenge_order}.`;
}

function checkpointExpectedLocation(
  type: "start" | "challenge" | "finish",
  team: Team,
  challenge: Challenge | undefined,
  checkpoint: TeamChallengeCheckpoint | null | undefined,
  unionStationName: string,
  unionFinishLabel: string
) {
  if (type === "start") {
    return {
      label: team.start_location_name,
      description: team.address,
    };
  }

  if (type === "finish") {
    return {
      label: unionStationName,
      description: unionFinishLabel,
    };
  }

  if (challenge?.kind === "union") {
    return {
      label: unionStationName,
      description: unionFinishLabel,
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

function deriveCheckpoints(
  team: Team,
  releasedChallenges: Challenge[],
  checkins: TeamCheckin[],
  checkpointAssignments: TeamChallengeCheckpoint[],
  unionStationName: string,
  unionFinishLabel: string
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
      description: checkpointDescription("start", team, undefined, unionStationName, unionFinishLabel),
      expected_location_label: checkpointExpectedLocation(
        "start",
        team,
        undefined,
        undefined,
        unionStationName,
        unionFinishLabel
      ).label,
      expected_location_description: checkpointExpectedLocation(
        "start",
        team,
        undefined,
        undefined,
        unionStationName,
        unionFinishLabel
      ).description,
      status: startLatest?.status ?? "not_started",
      latest_checkin: startLatest,
    },
    ...releasedChallenges
      .filter((challenge) => challenge.kind !== "game_long")
      .map((challenge) => {
      const latest = byKey.get(`challenge:${challenge.id}`)?.[0] ?? null;
      const checkpoint =
        checkpointAssignments.find(
          (item) => item.team_id === team.id && item.challenge_id === challenge.id
        ) ?? defaultCheckpointForTeamChallenge(team.id, challenge.id, challenge.challenge_order);
      const expected = checkpointExpectedLocation(
        "challenge",
        team,
        challenge,
        checkpoint,
        unionStationName,
        unionFinishLabel
      );
      return {
        key: `challenge-${challenge.id}`,
        checkin_type: "challenge" as const,
        challenge_id: challenge.id,
        label: checkpointLabel("challenge", challenge),
        description: checkpointDescription("challenge", team, challenge, unionStationName, unionFinishLabel),
        expected_location_label: expected.label,
        expected_location_description: expected.description,
        status: (latest?.status ?? "not_started") as TeamCheckpoint["status"],
        latest_checkin: latest,
        unlock_radius_meters: checkpoint?.unlock_radius_meters ?? null,
      };
      }),
    {
      key: "finish",
      checkin_type: "finish",
      challenge_id: null,
      label: "Finish Check-In",
      description: checkpointDescription("finish", team, undefined, unionStationName, unionFinishLabel),
      expected_location_label: checkpointExpectedLocation(
        "finish",
        team,
        undefined,
        undefined,
        unionStationName,
        unionFinishLabel
      ).label,
      expected_location_description: checkpointExpectedLocation(
        "finish",
        team,
        undefined,
        undefined,
        unionStationName,
        unionFinishLabel
      ).description,
      status: finishLatest?.status ?? "not_started",
      latest_checkin: finishLatest,
    },
  ];
}

function deriveVisibleChallengeIds(
  releasedChallenges: Challenge[],
  checkins: TeamCheckin[],
  submittedChallengeIds: Set<number>
) {
  const hasStartedRace = checkins.some((item) => item.checkin_type === "start");
  if (!hasStartedRace) return new Set<number>();

  const challengeCheckins = new Set(
    checkins
      .filter((item) => item.checkin_type === "challenge" && item.challenge_id !== null)
      .map((item) => Number(item.challenge_id))
  );

  const visibleIds = new Set<number>();
  const orderedChallenges = [...releasedChallenges].sort(
    (a, b) => a.challenge_order - b.challenge_order
  );

  for (const challenge of orderedChallenges) {
    if (challenge.kind === "game_long") {
      visibleIds.add(challenge.id);
      continue;
    }

    const previousChallenge = orderedChallenges.find(
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
    label: checkpointLabel(latest.checkin_type, challenge ?? undefined),
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
        label: checkpointLabel("challenge", challenge),
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

/** Dashboards poll every few seconds; reuse signed URLs until near expiry to avoid hammering Storage. */
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

async function signUploadUrl(upload: ChallengeUpload) {
  const cacheKey = `${upload.bucket_name}\0${upload.storage_path}`;
  const now = Date.now();
  const cached = signedUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return { ...upload, signed_url: cached.url };
  }

  const { data, error } = await supabase.storage
    .from(upload.bucket_name)
    .createSignedUrl(upload.storage_path, 60 * 60);

  if (error) throw error;

  signedUrlCache.set(cacheKey, {
    url: data.signedUrl,
    expiresAt: now + 50 * 60 * 1000,
  });

  return {
    ...upload,
    signed_url: data.signedUrl,
  };
}

async function signUploads(uploads: ChallengeUpload[]) {
  return Promise.all(uploads.map(signUploadUrl));
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
      (row) => row.status === "submitted" && row.review_status !== "rejected" && Boolean(row.submitted_at)
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

async function getChallengeUnlockTarget(
  gameId: number,
  teamId: number,
  challengeId: number
): Promise<TeamChallengeCheckpoint | { latitude: number; longitude: number; checkpoint_label: string; checkpoint_address: string; unlock_radius_meters: number } | null> {
  const challenge = await getChallengeById(gameId, challengeId);
  if (!challenge) {
    throw new GameError("Challenge was not found.", 404);
  }

  if (challenge.kind === "game_long") {
    return null;
  }

  if (challenge.kind === "union") {
    return {
      checkpoint_label: UNION_STATION.name,
      checkpoint_address: UNION_STATION.finishPoint,
      latitude: UNION_STATION.coordinates[1],
      longitude: UNION_STATION.coordinates[0],
      unlock_radius_meters: DEFAULT_CHECKPOINT_UNLOCK_RADIUS_METERS,
    };
  }

  const explicit = (await getCheckpointAssignmentsFromDb(gameId)).find(
    (item) => item.team_id === teamId && item.challenge_id === challengeId
  );

  return explicit ?? defaultCheckpointForTeamChallenge(teamId, challengeId, challenge.challenge_order);
}

async function upsertChallengeArrivalCheckin(input: {
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

async function getAllCheckinsFromDb(gameId: number) {
  const teamIds = await getTeamIdsForGame(gameId);
  if (!teamIds.length) return [];

  const { data, error } = await supabase
    .from("team_checkins")
    .select(
      "id, team_id, checkin_type, challenge_id, status, checkin_note, latitude, longitude, accuracy_meters, gps_captured_at, created_at, review_note, reviewed_at, reviewed_by"
    )
    .in("team_id", teamIds)
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

async function getTeamChallengePromptsFromDb(
  gameId: number,
  options?: {
    teamId?: number;
    challengeIds?: number[];
  }
): Promise<TeamChallengePrompt[]> {
  let challengeIds = options?.challengeIds;
  if (!challengeIds?.length) {
    challengeIds = await getChallengeIdsForGame(gameId);
  }
  if (!challengeIds.length) return [];

  let query = supabase
    .from("team_challenge_prompts")
    .select("team_id, challenge_id, prompt_text")
    .in("challenge_id", challengeIds);

  if (options?.teamId !== undefined) {
    query = query.eq("team_id", options.teamId);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingPromptTable(error)) return [];
    throw error;
  }

  return ((data ?? []) as ChallengePromptRow[]).map(normalizeChallengePromptRow);
}

function attachTeamPromptsToChallenges(
  challenges: Challenge[],
  prompts: TeamChallengePrompt[]
): Challenge[] {
  const promptsByChallenge = new Map<number, TeamChallengePrompt[]>();
  for (const prompt of prompts) {
    const current = promptsByChallenge.get(prompt.challenge_id) ?? [];
    current.push(prompt);
    promptsByChallenge.set(prompt.challenge_id, current);
  }

  return challenges.map((challenge) => ({
    ...challenge,
    team_prompts: promptsByChallenge.get(challenge.id) ?? [],
  }));
}

function resolveChallengeTextForTeam(
  challenge: Pick<Challenge, "id" | "kind" | "text">,
  teamId: number,
  prompts: TeamChallengePrompt[]
) {
  if (challenge.kind !== "game_long") return challenge.text;

  const prompt =
    prompts.find((item) => item.team_id === teamId && item.challenge_id === challenge.id) ?? null;

  return prompt?.prompt_text ?? "";
}

export async function getChallenges(gameId: number, includeHidden = true): Promise<Challenge[]> {
  try {
    let query = supabase
      .from("challenges")
      .select("id, challenge_order, title, text, expected_location, allow_media_upload, is_released")
      .eq("game_id", gameId)
      .order("challenge_order", { ascending: true });

    if (!includeHidden) {
      query = query.eq("is_released", true);
    }

    const { data, error } = await query;
    if (error) throw error;
    const challenges = ((data ?? []) as Omit<Challenge, "kind">[]).map(normalizeChallengeRow);
    const prompts = await getTeamChallengePromptsFromDb(gameId, {
      challengeIds: challenges.map((challenge) => challenge.id),
    });
    return attachTeamPromptsToChallenges(challenges, prompts);
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      return getLocalChallenges(gameId, includeHidden);
    }
    throw error;
  }
}

export async function getTeamCheckins(gameId: number, teamId: number): Promise<TeamCheckin[]> {
  if (!(await teamBelongsToGame(gameId, teamId))) return [];
  try {
    return await getTeamCheckinsFromDb(teamId);
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      return getLocalCheckins(gameId, teamId);
    }
    throw error;
  }
}

export async function getLatestLocations(gameId: number): Promise<TeamLatestLocation[]> {
  try {
    const teamIds = await getTeamIdsForGame(gameId);
    const [teamsResult, challenges, checkins] = await Promise.all([
      teamIds.length
        ? supabase
            .from("teams")
            .select("id, team_name, color, badge_label")
            .in("id", teamIds)
            .order("id", { ascending: true })
        : Promise.resolve({ data: [], error: null } as const),
      getChallenges(gameId, true),
      getAllCheckinsFromDb(gameId),
    ]);

    if ("error" in teamsResult && teamsResult.error) throw teamsResult.error;
    const checkinsByTeam = new Map<number, TeamCheckin[]>();
    for (const checkin of checkins) {
      const current = checkinsByTeam.get(checkin.team_id) ?? [];
      current.push(checkin);
      checkinsByTeam.set(checkin.team_id, current);
    }

    const rows = (teamsResult as { data: unknown }).data ?? [];
    return ((rows ?? []) as Array<{
      id: number;
      team_name: string;
      color: string;
      badge_label: string;
    }>).map((team) =>
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
      return getLocalLatestLocations(gameId);
    }
    throw error;
  }
}

export async function getRecentCheckins(gameId: number): Promise<AdminCheckinFeedItem[]> {
  try {
    const teamIds = await getTeamIdsForGame(gameId);
    const challengeIds = await getChallengeIdsForGame(gameId);
    if (!teamIds.length) return [];

    const [teamsResult, checkins, challengesResult, promptRows, statusResult, uploadsResult] = await Promise.all([
      supabase
        .from("teams")
        .select("id, team_name, color, badge_label")
        .in("id", teamIds)
        .order("id", { ascending: true }),
      getAllCheckinsFromDb(gameId),
      challengeIds.length
        ? supabase
            .from("challenges")
            .select("id, challenge_order, title, text, expected_location")
            .in("id", challengeIds)
        : Promise.resolve({ data: [], error: null } as const),
      getTeamChallengePromptsFromDb(gameId),
      supabase
        .from("team_challenge_status")
        .select("team_id, challenge_id, proof_note, review_status")
        .in("team_id", teamIds),
      supabase
        .from("challenge_media")
        .select(
          "id, team_id, challenge_id, bucket_name, storage_path, public_url, media_type, file_name, mime_type, file_size_bytes, uploaded_at"
        )
        .in("team_id", teamIds)
        .order("uploaded_at", { ascending: false }),
    ]);

    if (teamsResult.error) throw teamsResult.error;
    if ("error" in challengesResult && challengesResult.error) throw challengesResult.error;
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
    const chData = (challengesResult as { data: unknown }).data ?? [];
    const challengeMap = new Map(
      ((chData ?? []) as Array<{
        id: number;
        challenge_order: number;
        title: string;
        text: string;
        expected_location: string;
      }>).map((challenge) => [
        challenge.id,
        {
          ...challenge,
          kind: getChallengeKind(Number(challenge.challenge_order)),
        },
      ])
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

    return checkins.map((checkin) => {
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
        checkpoint_label: checkpointLabel(checkin.checkin_type, challenge ?? undefined),
        challenge: challenge
          ? {
              id: challenge.id,
              challenge_order: challenge.challenge_order,
              title: challenge.title,
              text: resolveChallengeTextForTeam(challenge, checkin.team_id, promptRows),
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
      return getLocalRecentCheckins(gameId);
    }
    throw error;
  }
}

export async function getPublicMapData(gameId: number): Promise<PublicMapResponse> {
  try {
    const gameRow = await getGameRow(gameId);
    const teamIds = await getTeamIdsForGame(gameId);
    const teamsPromise = teamIds.length
      ? supabase
          .from("teams")
          .select("id, team_name, start_location_name, address, route_summary, walk_time, color, badge_label")
          .in("id", teamIds)
          .order("id", { ascending: true })
      : Promise.resolve({ data: [], error: null } as const);

    const [teamsResult, challenges, latestLocations, allCheckins] = await Promise.all([
      teamsPromise,
      getChallenges(gameId, true),
      getLatestLocations(gameId),
      getAllCheckinsFromDb(gameId),
    ]);

    if ("error" in teamsResult && teamsResult.error) throw teamsResult.error;

    const teams = ((teamsResult as { data: unknown }).data ?? []) as Team[];
    const checkinsByTeam = new Map<number, TeamCheckin[]>();
    for (const checkin of allCheckins) {
      const current = checkinsByTeam.get(checkin.team_id) ?? [];
      current.push(checkin);
      checkinsByTeam.set(checkin.team_id, current);
    }

    const unionName = unionNameFromGame(gameRow);
    const unionLabel = unionLabelFromGame(gameRow);

    return {
      latestLocations,
      teamRoutes: teams.map((team) =>
        buildAdminTeamRoute(team, checkinsByTeam.get(team.id) ?? [], challenges)
      ),
      union: {
        name: unionName,
        latitude: UNION_STATION.coordinates[1],
        longitude: UNION_STATION.coordinates[0],
        label: unionLabel,
      },
    };
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      const adminGame = getLocalAdminGame(gameId);
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

export async function getLeaderboard(gameId: number): Promise<LeaderboardEntry[]> {
  try {
    const teamIds = await getTeamIdsForGame(gameId);
    const [challengesResult, teamsResult, statusResult] = await Promise.all([
      supabase.from("challenges").select("id, is_released").eq("game_id", gameId),
      teamIds.length
        ? supabase
            .from("teams")
            .select("id, team_name, start_location_name, walk_time, color, badge_label")
            .in("id", teamIds)
            .order("id", { ascending: true })
        : Promise.resolve({ data: [], error: null } as const),
      teamIds.length
        ? supabase
            .from("team_challenge_status")
            .select("team_id, challenge_id, status, awarded_points, submitted_at, review_status")
            .in("team_id", teamIds)
        : Promise.resolve({ data: [], error: null } as const),
    ]);

    if (challengesResult.error) throw challengesResult.error;
    if ("error" in teamsResult && teamsResult.error) throw teamsResult.error;
    if ("error" in statusResult && statusResult.error) throw statusResult.error;

    const teams = ((teamsResult as { data: unknown }).data ?? []) as Array<{
      id: number;
      team_name: string;
      start_location_name: string;
      walk_time: string;
      color: string;
      badge_label: string;
    }>;
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
      return getLocalLeaderboard(gameId);
    }
    throw error;
  }
}

export async function getTeamDashboard(
  gameId: number,
  teamId: number
): Promise<TeamDashboardResponse | null> {
  if (!(await teamBelongsToGame(gameId, teamId))) {
    return null;
  }

  try {
    const gameRow = await getGameRow(gameId);
    const unionName = unionNameFromGame(gameRow);
    const unionLabel = unionLabelFromGame(gameRow);

    const [teamResult, releasedChallenges, statusResult, uploads, checkins, leaderboard, checkpointAssignments] =
      await Promise.all([
        supabase
          .from("teams")
          .select("id, team_name, start_location_name, address, route_summary, walk_time, color, badge_label")
          .eq("id", teamId)
          .eq("game_id", gameId)
          .maybeSingle(),
        getChallenges(gameId, false),
        supabase
          .from("team_challenge_status")
          .select(
            "challenge_id, status, proof_note, awarded_points, submitted_at, review_status, review_note, reviewed_at, reviewed_by"
          )
          .eq("team_id", teamId),
        getTeamUploads(teamId),
        getTeamCheckinsFromDb(teamId),
        getLeaderboard(gameId),
        getCheckpointAssignmentsFromDb(gameId),
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
    const submittedChallengeIds = new Set(
      Array.from(statuses.entries())
        .filter(([, status]) => status.status === "submitted")
        .map(([challengeId]) => Number(challengeId))
    );
    const latestLocation = getLatestLocationForTeam(team, checkins, releasedChallenges);
    const visibleChallengeIds = deriveVisibleChallengeIds(
      releasedChallenges,
      checkins,
      submittedChallengeIds
    );

    const hasStartedRace = checkins.some((item) => item.checkin_type === "start");
    const challengeCheckinIds = new Set(
      checkins
        .filter((item) => item.checkin_type === "challenge" && item.challenge_id !== null)
        .map((item) => Number(item.challenge_id))
    );

    const challenges = releasedChallenges.map((challenge) => {
      const status = statuses.get(challenge.id);
      const checkpoint =
        checkpointAssignments.find(
          (item) => item.team_id === teamId && item.challenge_id === challenge.id
        ) ?? defaultCheckpointForTeamChallenge(teamId, challenge.id, challenge.challenge_order);
      const isUnlocked =
        challenge.kind === "game_long" ? hasStartedRace : challengeCheckinIds.has(challenge.id);
      return {
        ...challenge,
        text: resolveChallengeTextForTeam(
          challenge,
          teamId,
          challenge.team_prompts ?? []
        ),
        is_visible: visibleChallengeIds.has(challenge.id),
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
        checkpoint,
      };
    });

    const teamStats = leaderboard.find((entry) => entry.id === teamId);
    if (!teamStats) return null;

    return {
      team,
      challenges,
      checkpoints: deriveCheckpoints(
        team,
        releasedChallenges,
        checkins,
        checkpointAssignments,
        unionName,
        unionLabel
      ),
      checkins,
      latestLocation,
      teamStats,
      leaderboard,
    };
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      return getLocalTeamDashboard(gameId, teamId);
    }
    throw error;
  }
}

export async function getAdminGame(gameId: number): Promise<AdminGameResponse> {
  try {
    const teamIds = await getTeamIdsForGame(gameId);
    const teamsPromise = teamIds.length
      ? supabase.from("teams").select("id").in("id", teamIds).order("id", { ascending: true })
      : Promise.resolve({ data: [], error: null } as const);

    const [teamsResult, challenges, leaderboard, latestLocations, recentCheckins, credentialsResult, allCheckins] =
      await Promise.all([
        teamsPromise,
        getChallenges(gameId, true),
        getLeaderboard(gameId),
        getLatestLocations(gameId),
        getRecentCheckins(gameId),
        supabase
          .from("access_credentials")
          .select("team_id, display_name, pin")
          .eq("role", "team")
          .eq("game_id", gameId),
        getAllCheckinsFromDb(gameId),
      ]);

    if ("error" in teamsResult && teamsResult.error) throw teamsResult.error;
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

    const teamRows = ((teamsResult as { data: unknown }).data ?? []) as Array<{ id: number }>;

    const teams = await Promise.all(
      teamRows.map(async ({ id }) => {
        const team = await getTeamDashboard(gameId, id);
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
        team_pin_count: teamRows.length,
      },
    };
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      return getLocalAdminGame(gameId);
    }
    throw error;
  }
}

export async function updateChallenge(
  gameId: number,
  challengeId: number,
  title: string,
  text: string,
  expectedLocation: string,
  allowMediaUpload: boolean,
  teamPrompts: Array<{
    teamId: number;
    promptText: string;
  }> = [],
  checkpoints: Array<{
    teamId: number;
    checkpointLabel: string;
    checkpointAddress: string;
    latitude: number | null;
    longitude: number | null;
    unlockRadiusMeters: number | null;
  }> = []
) {
  const cleanTitle = title.trim();
  const cleanText = text.trim();
  const cleanExpectedLocation = expectedLocation.trim();
  if (!cleanTitle || !cleanText) {
    throw new GameError("Title and prompt are required.", 400);
  }

  try {
    const currentChallenge = await getChallengeById(gameId, challengeId);
    if (!currentChallenge) {
      throw new GameError("Challenge was not found.", 404);
    }

    const normalizedExpectedLocation =
      currentChallenge.kind === "union"
        ? UNION_STATION.name
        : currentChallenge.kind === "checkpoint"
          ? cleanExpectedLocation || "Per-team route checkpoint"
          : cleanExpectedLocation;

    const { error } = await supabase
      .from("challenges")
      .update({
        title: cleanTitle.slice(0, 120),
        text: cleanText.slice(0, 500),
        expected_location: normalizedExpectedLocation.slice(0, 160),
        allow_media_upload: allowMediaUpload,
      })
      .eq("id", challengeId)
      .eq("game_id", gameId);

    if (error) throw error;

    if (currentChallenge.kind === "checkpoint") {
      const rows = checkpoints.map((checkpoint) => ({
        team_id: checkpoint.teamId,
        challenge_id: challengeId,
        checkpoint_label: checkpoint.checkpointLabel.trim().slice(0, 120),
        checkpoint_address: checkpoint.checkpointAddress.trim().slice(0, 200),
        latitude: checkpoint.latitude,
        longitude: checkpoint.longitude,
        unlock_radius_meters: Math.max(
          1,
          Math.round(checkpoint.unlockRadiusMeters ?? DEFAULT_CHECKPOINT_UNLOCK_RADIUS_METERS)
        ),
      }));

      const { error: deleteError } = await supabase
        .from("team_challenge_checkpoints")
        .delete()
        .eq("challenge_id", challengeId);
      if (deleteError && !isMissingCheckpointTable(deleteError)) throw deleteError;

      if (rows.length) {
        const { error: insertError } = await supabase
          .from("team_challenge_checkpoints")
          .insert(rows);
        if (insertError && !isMissingCheckpointTable(insertError)) throw insertError;
      }
    }

    if (currentChallenge.kind === "game_long") {
      const gameTeams = await fetchTeamsForGame(gameId);
      const rows = gameTeams.map((team) => ({
        team_id: team.id,
        challenge_id: challengeId,
        prompt_text:
          teamPrompts.find((entry) => entry.teamId === team.id)?.promptText?.trim().slice(0, 500) ?? "",
      }));

      const { error: deletePromptError } = await supabase
        .from("team_challenge_prompts")
        .delete()
        .eq("challenge_id", challengeId);
      if (deletePromptError && !isMissingPromptTable(deletePromptError)) throw deletePromptError;

      const { error: insertPromptError } = await supabase
        .from("team_challenge_prompts")
        .insert(rows);
      if (insertPromptError && !isMissingPromptTable(insertPromptError)) throw insertPromptError;
    }

    return getChallenges(gameId, true);
  } catch (error) {
    if (isGameError(error)) throw error;
    if (isSupabaseUnavailable(error)) {
      const currentChallenge =
        getLocalChallenges(gameId, true).find((item) => item.id === challengeId) ?? null;
      updateLocalChallenge(gameId, challengeId, cleanTitle, cleanText);
      updateLocalChallengeExpectedLocation(
        gameId,
        challengeId,
        currentChallenge?.kind === "union"
          ? UNION_STATION.name
          : currentChallenge?.kind === "checkpoint"
            ? cleanExpectedLocation || "Per-team route checkpoint"
            : cleanExpectedLocation
      );
      updateLocalChallengeMediaToggle(gameId, challengeId, allowMediaUpload);
      if (currentChallenge?.kind === "game_long") {
        const gameTeams = getLocalTeamsForGameId(gameId);
        updateLocalChallengePrompts(
          gameId,
          challengeId,
          gameTeams.map((team) => ({
            team_id: team.id,
            challenge_id: challengeId,
            prompt_text:
              teamPrompts.find((entry) => entry.teamId === team.id)?.promptText?.trim().slice(0, 500) ?? "",
          }))
        );
      }
      if (currentChallenge?.kind === "checkpoint") {
        updateLocalChallengeCheckpoints(
          gameId,
          challengeId,
          checkpoints.map((checkpoint) => ({
            team_id: checkpoint.teamId,
            challenge_id: challengeId,
            checkpoint_label: checkpoint.checkpointLabel,
            checkpoint_address: checkpoint.checkpointAddress,
            latitude: checkpoint.latitude,
            longitude: checkpoint.longitude,
            unlock_radius_meters:
              checkpoint.unlockRadiusMeters ?? DEFAULT_CHECKPOINT_UNLOCK_RADIUS_METERS,
          }))
        );
      }
      return getLocalChallenges(gameId, true);
    }
    throw error;
  }
}

export async function createChallenge(
  gameId: number,
  title: string,
  text: string,
  expectedLocation: string,
  allowMediaUpload: boolean
) {
  const cleanTitle = title.trim();
  const cleanText = text.trim();
  const cleanExpectedLocation = expectedLocation.trim();
  if (!cleanTitle || !cleanText) {
    throw new GameError("Title and prompt are required.", 400);
  }

  try {
    const gameTeams = await fetchTeamsForGame(gameId);
    if (!gameTeams.length) {
      throw new GameError("Add at least one team before creating challenges.", 409);
    }

    const existing = await getChallenges(gameId, true);
    if (existing.length >= MAX_CHALLENGES) {
      throw new GameError(`You can create up to ${MAX_CHALLENGES} challenges.`, 409);
    }

    const nextOrder = existing.length + 1;
    const { data: maxCh, error: maxErr } = await supabase
      .from("challenges")
      .select("id")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (maxErr) throw maxErr;
    const nextId = maxCh?.id != null ? Number(maxCh.id) + 1 : 1;

    const payload = {
      id: nextId,
      game_id: gameId,
      challenge_order: nextOrder,
      title: cleanTitle.slice(0, 120),
      text: cleanText.slice(0, 500),
      expected_location:
        getChallengeKind(nextOrder) === "union"
          ? UNION_STATION.name
          : getChallengeKind(nextOrder) === "checkpoint"
            ? (cleanExpectedLocation || "Per-team route checkpoint").slice(0, 160)
            : cleanExpectedLocation.slice(0, 160),
      allow_media_upload: allowMediaUpload,
      is_released: false,
    };

    const { error: challengeError } = await supabase.from("challenges").insert(payload);
    if (challengeError) throw challengeError;

    const statusRows = gameTeams.map((team) => ({
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

    if (getChallengeKind(nextOrder) === "checkpoint") {
      const checkpointRows = gameTeams.map((team) =>
        defaultCheckpointForTeamChallenge(team.id, nextId, nextOrder)
      ).filter(Boolean) as TeamChallengeCheckpoint[];

      if (checkpointRows.length) {
        const { error: checkpointError } = await supabase
          .from("team_challenge_checkpoints")
          .insert(
            checkpointRows.map((row) => ({
              team_id: row.team_id,
              challenge_id: row.challenge_id,
              checkpoint_label: row.checkpoint_label,
              checkpoint_address: row.checkpoint_address,
              latitude: row.latitude,
              longitude: row.longitude,
              unlock_radius_meters: row.unlock_radius_meters,
            }))
          );
        if (checkpointError && !isMissingCheckpointTable(checkpointError)) throw checkpointError;
      }
    }

    if (getChallengeKind(nextOrder) === "game_long") {
      const { error: promptError } = await supabase.from("team_challenge_prompts").insert(
        gameTeams.map((team) => ({
          team_id: team.id,
          challenge_id: nextId,
          prompt_text: "",
        }))
      );
      if (promptError && !isMissingPromptTable(promptError)) throw promptError;
    }

    return getChallenges(gameId, true);
  } catch (error) {
    if (isGameError(error)) throw error;
    if (isSupabaseUnavailable(error)) {
      const existing = getLocalChallenges(gameId, true);
      if (existing.length >= MAX_CHALLENGES) {
        throw new GameError(`You can create up to ${MAX_CHALLENGES} challenges.`, 409);
      }
      createLocalChallenge(gameId, cleanTitle, cleanText, cleanExpectedLocation, allowMediaUpload);
      return getLocalChallenges(gameId, true);
    }
    throw error;
  }
}

export async function updateChallengeRelease(gameId: number, challengeId: number, isReleased: boolean) {
  try {
    const payload = { is_released: isReleased };
    const { error } = await supabase
      .from("challenges")
      .update(payload)
      .eq("id", challengeId)
      .eq("game_id", gameId);

    if (error) throw error;
    return getChallenges(gameId, true);
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      updateLocalChallengeRelease(gameId, challengeId, isReleased);
      return getLocalChallenges(gameId, true);
    }
    throw error;
  }
}

export async function releaseAllChallenges(gameId: number) {
  try {
    const { error } = await supabase
      .from("challenges")
      .update({ is_released: true })
      .eq("is_released", false)
      .eq("game_id", gameId);

    if (error) throw error;
    return getChallenges(gameId, true);
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      releaseAllLocalChallenges(gameId);
      return getLocalChallenges(gameId, true);
    }
    throw error;
  }
}

export async function deleteChallenge(gameId: number, challengeId: number) {
  try {
    const challenge = await getChallengeById(gameId, challengeId);
    if (!challenge) {
      throw new GameError("Challenge was not found.", 404);
    }

    const { data: mediaRows, error: mediaError } = await supabase
      .from("challenge_media")
      .select("bucket_name, storage_path")
      .eq("challenge_id", challengeId);

    if (mediaError) throw mediaError;

    const uploadsByBucket = new Map<string, string[]>();
    for (const row of mediaRows ?? []) {
      const bucketName = String(row.bucket_name);
      const storagePath = String(row.storage_path);
      const current = uploadsByBucket.get(bucketName) ?? [];
      current.push(storagePath);
      uploadsByBucket.set(bucketName, current);
    }

    for (const [bucketName, storagePaths] of uploadsByBucket.entries()) {
      if (storagePaths.length === 0) continue;
      const { error: removeError } = await supabase.storage.from(bucketName).remove(storagePaths);
      if (removeError) throw removeError;
    }

    const { error: deleteError } = await supabase
      .from("challenges")
      .delete()
      .eq("id", challengeId)
      .eq("game_id", gameId);
    if (deleteError) throw deleteError;

    const remainingChallenges = await getChallenges(gameId, true);
    for (const [index, remainingChallenge] of remainingChallenges.entries()) {
      const nextOrder = index + 1;
      if (remainingChallenge.challenge_order === nextOrder) continue;

      const { error: reorderError } = await supabase
        .from("challenges")
        .update({ challenge_order: nextOrder })
        .eq("id", remainingChallenge.id)
        .eq("game_id", gameId);

      if (reorderError) throw reorderError;
    }

    return getChallenges(gameId, true);
  } catch (error) {
    if (isGameError(error)) throw error;
    if (isSupabaseUnavailable(error)) {
      const deleted = deleteLocalChallenge(gameId, challengeId);
      if (!deleted) {
        throw new GameError("Challenge was not found.", 404);
      }
      return getLocalChallenges(gameId, true);
    }
    throw error;
  }
}

export async function updateTeamChallengeSubmission(
  gameId: number,
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
  if (!(await teamBelongsToGame(gameId, teamId))) {
    throw new GameError("Challenge submission was not found.", 404);
  }
  try {
    const current = await getChallengeStatusRow(teamId, challengeId);
    const challenge = await getChallengeById(gameId, challengeId);
    if (!current) {
      throw new GameError("Challenge submission was not found.", 404);
    }
    if (!challenge) {
      throw new GameError("Challenge was not found.", 404);
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

      if (challenge.kind === "game_long") {
        const hasStartedRace = (await getTeamCheckins(gameId, teamId)).some(
          (item) => item.checkin_type === "start"
        );
        if (!hasStartedRace) {
          throw new GameError("Complete the start check-in first to unlock this challenge.", 409);
        }
      } else {
        const latestCheckin = await getLatestChallengeCheckin(teamId, challengeId);
        if (!latestCheckin) {
          throw new GameError("Reach the checkpoint first to unlock this challenge.", 409);
        }
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
    await recalculateChallengeAwardedPoints(challengeId);
  } catch (error) {
    if (isGameError(error)) {
      throw error;
    }
    if (isSupabaseUnavailable(error)) {
      const localDashboard = getLocalTeamDashboard(gameId, teamId);
      const localChallenge = localDashboard?.challenges.find((item) => item.id === challengeId) ?? null;
      if (status === "submitted") {
        const hasProofNote = proofNote.trim().length > 0;
        const uploadCount = localChallenge?.uploads.length ?? 0;
        if (!hasProofNote && uploadCount === 0) {
          throw new GameError("Add a proof note or upload media before submitting.", 400);
        }
        if (!localChallenge?.is_unlocked) {
          throw new GameError(
            localChallenge?.kind === "game_long"
              ? "Complete the start check-in first to unlock this challenge."
              : "Reach the checkpoint first to unlock this challenge.",
            409
          );
        }
      }
      updateLocalChallengeSubmission(teamId, challengeId, proofNote, status);
      return;
    }
    throw error;
  }
}

export async function uploadTeamChallengeMedia(
  gameId: number,
  teamId: number,
  challengeId: number,
  file: File
) {
  if (!(await teamBelongsToGame(gameId, teamId))) {
    throw new GameError("Challenge submission was not found.", 404);
  }
  try {
    await requireChallengeMediaEnabled(gameId, challengeId);
    const challenge = await getChallengeById(gameId, challengeId);
    const statusRow = await getChallengeStatusRow(teamId, challengeId);
    if (!statusRow) {
      throw new GameError("Challenge submission was not found.", 404);
    }
    if (!challenge) {
      throw new GameError("Challenge was not found.", 404);
    }
    if (statusRow.review_status === "verified") {
      throw new GameError("This challenge has already been verified by HQ and is locked.", 409);
    }
    if (challenge.kind === "game_long") {
      const hasStartedRace = (await getTeamCheckins(gameId, teamId)).some(
        (item) => item.checkin_type === "start"
      );
      if (!hasStartedRace) {
        throw new GameError("Complete the start check-in first to unlock this challenge.", 409);
      }
    } else {
      const latestCheckin = await getLatestChallengeCheckin(teamId, challengeId);
      if (!latestCheckin) {
        throw new GameError("Reach the checkpoint first to unlock this challenge.", 409);
      }
    }

    const { mediaType } = ensureAllowedMedia(file);
    const fileName = sanitizeFileName(file.name || "upload");
    const storagePath = `game-${gameId}/team-${teamId}/challenge-${challengeId}/${Date.now()}-${fileName}`;
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

export async function deleteTeamChallengeMedia(
  gameId: number,
  teamId: number,
  challengeId: number,
  uploadId: number
) {
  if (!(await teamBelongsToGame(gameId, teamId))) {
    throw new GameError("Challenge submission was not found.", 404);
  }
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
  gameId: number,
  teamId: number,
  challengeId: number,
  reviewStatus: "pending" | "verified" | "rejected",
  reviewNote: string,
  reviewedBy: string
) {
  if (!(await teamBelongsToGame(gameId, teamId))) {
    throw new GameError("Team was not found.", 404);
  }
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

export async function createTeamCheckin(
  gameId: number,
  input: {
    teamId: number;
    checkinType: "start" | "challenge" | "finish";
    challengeId?: number | null;
    checkinNote?: string;
    latitude?: number | null;
    longitude?: number | null;
    accuracyMeters?: number | null;
    gpsCapturedAt?: string | null;
  }
) {
  if (!(await teamBelongsToGame(gameId, input.teamId))) {
    throw new GameError("Team was not found.", 404);
  }

  const challengeId = input.challengeId ?? null;
  let challenge: Challenge | null = null;

  if (input.checkinType === "challenge") {
    if (!challengeId) {
      throw new GameError("Challenge check-ins require a challenge ID.", 400);
    }
    if (!(await isChallengeReleased(gameId, challengeId))) {
      throw new GameError("Challenge is not available.", 404);
    }
    challenge = await getChallengeById(gameId, challengeId);
    if (!challenge) {
      throw new GameError("Challenge was not found.", 404);
    }
    const currentChallenge = challenge;
    if (currentChallenge.kind === "game_long") {
      throw new GameError("Challenge 1 unlocks from the start check-in and does not use a checkpoint.", 409);
    }

    const releasedChallenges = await getChallenges(gameId, false);
    const previousChallenge = releasedChallenges.find(
      (item) => item.challenge_order === currentChallenge.challenge_order - 1
    );
    if (previousChallenge) {
      const previousStatus = await getChallengeStatusRow(input.teamId, previousChallenge.id);
      const isPreviousComplete =
        previousChallenge.kind === "game_long"
          ? true
          : previousStatus?.status === "submitted";
      if (!isPreviousComplete) {
        throw new GameError(
          `Complete Challenge ${previousChallenge.challenge_order} before unlocking this checkpoint.`,
          409
        );
      }
    }
  }

  if (input.checkinType !== "challenge" && challengeId !== null) {
    throw new GameError("Only challenge check-ins can include a challenge ID.", 400);
  }

  try {
    if (input.checkinType === "finish") {
      const completedCount = await getSubmittedChallengeCount(input.teamId);
      if (completedCount < MAX_CHALLENGES) {
        throw new GameError(`Finish check-in unlocks only after all ${MAX_CHALLENGES} challenges are completed.`, 409);
      }
    }

    if (input.checkinType === "challenge") {
      const latitude = input.latitude ?? null;
      const longitude = input.longitude ?? null;
      if (latitude === null || longitude === null) {
        throw new GameError("Checkpoint unlock requires live GPS at the checkpoint.", 409);
      }

      const target = await getChallengeUnlockTarget(gameId, input.teamId, challengeId as number);
      if (!target || target.latitude === null || target.longitude === null) {
        throw new GameError("HQ has not configured this checkpoint yet.", 409);
      }

      const distance = haversineMeters(latitude, longitude, target.latitude, target.longitude);
      if (distance > target.unlock_radius_meters) {
        throw new GameError(
          `You need to be within ${Math.round(target.unlock_radius_meters)}m of the checkpoint to unlock this challenge.`,
          409
        );
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

    if (input.checkinType === "challenge") {
      return await upsertChallengeArrivalCheckin({
        teamId: input.teamId,
        challengeId: challengeId as number,
        checkinNote: input.checkinNote,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        accuracyMeters: input.accuracyMeters ?? null,
        gpsCapturedAt: input.gpsCapturedAt ?? null,
      });
    }

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
      try {
        return createLocalCheckin(input);
      } catch (localError) {
        throw new GameError(
          localError instanceof Error ? localError.message : "Check-in failed.",
          409
        );
      }
    }
    throw error;
  }
}

export async function reviewTeamCheckin(
  gameId: number,
  checkinId: number,
  status: "pending" | "verified" | "rejected",
  reviewNote: string,
  reviewedBy: string
) {
  let reviewedCheckin: TeamCheckin | null = null;

  try {
    const prior = await getCheckinById(checkinId);
    if (!prior || !(await teamBelongsToGame(gameId, prior.team_id))) {
      throw new GameError("Check-in not found.", 404);
    }

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
    if (isGameError(error)) throw error;
    if (isSupabaseUnavailable(error)) {
      const row = reviewLocalCheckin(checkinId, status, reviewNote, reviewedBy);
      if (!row) {
        throw new GameError("Check-in not found.", 404);
      }
      return row;
    }
    throw error;
  }

  reviewedCheckin = await getCheckinById(checkinId);
  if (!reviewedCheckin) {
    throw new GameError("Check-in not found.", 404);
  }

  return reviewedCheckin;
}

export async function updateTeamScore(
  gameId: number,
  teamId: number,
  arrivalRank: number | null,
  creativityScore: number
) {
  if (!(await teamBelongsToGame(gameId, teamId))) {
    throw new GameError("Team was not found.", 404);
  }
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

export async function updateTeamCredentials(
  gameId: number,
  teamId: number,
  teamName: string,
  pin: string
) {
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
      .eq("game_id", gameId)
      .maybeSingle<{ id: number }>();

    if (teamLookupError) throw teamLookupError;
    if (!team?.id) {
      throw new GameError("Team was not found.", 404);
    }

    const { data: duplicateTeam, error: duplicateError } = await supabase
      .from("teams")
      .select("id")
      .eq("game_id", gameId)
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
      .eq("team_id", teamId)
      .eq("game_id", gameId);

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

export async function updateAdminCredentials(
  gameId: number,
  currentPin: string,
  newName: string,
  newPin: string
) {
  const cleanCurrentPin = currentPin.trim();
  const cleanNewName = newName.trim().slice(0, 120);
  const cleanNewPin = newPin.trim().slice(0, 120);

  if (!cleanCurrentPin) throw new GameError("Current PIN is required.", 400);
  if (!cleanNewName) throw new GameError("Username is required.", 400);
  if (!cleanNewPin) throw new GameError("New PIN is required.", 400);

  try {
    const { data: current, error: lookupError } = await supabase
      .from("access_credentials")
      .select("id, display_name")
      .eq("role", "admin")
      .eq("game_id", gameId)
      .eq("pin", cleanCurrentPin)
      .maybeSingle<{ id: number; display_name: string }>();

    if (lookupError) throw lookupError;
    if (!current) throw new GameError("Current PIN is incorrect.", 401);

    if (cleanNewName !== current.display_name) {
      const { data: dupe, error: dupeError } = await supabase
        .from("access_credentials")
        .select("id")
        .eq("role", "admin")
        .eq("game_id", gameId)
        .eq("display_name", cleanNewName)
        .maybeSingle<{ id: number }>();

      if (dupeError) throw dupeError;
      if (dupe) throw new GameError("That username is already taken.", 409);
    }

    const { error: updateError } = await supabase
      .from("access_credentials")
      .update({ display_name: cleanNewName, pin: cleanNewPin })
      .eq("id", current.id);

    if (updateError) throw updateError;
  } catch (error) {
    if (isGameError(error)) throw error;
    throw error;
  }
}

export async function isChallengeReleased(gameId: number, challengeId: number) {
  try {
    const { data, error } = await supabase
      .from("challenges")
      .select("id, is_released")
      .eq("id", challengeId)
      .eq("game_id", gameId)
      .maybeSingle();

    if (error) throw error;
    return Boolean(data?.is_released);
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      return isLocalChallengeReleased(gameId, challengeId);
    }
    throw error;
  }
}

async function removeChallengeMediaFilesForRows(
  rows: Array<{ bucket_name: string; storage_path: string }>
) {
  const uploadsByBucket = new Map<string, string[]>();
  for (const row of rows) {
    const bucketName = String(row.bucket_name);
    const storagePath = String(row.storage_path);
    const current = uploadsByBucket.get(bucketName) ?? [];
    current.push(storagePath);
    uploadsByBucket.set(bucketName, current);
  }
  for (const [bucketName, storagePaths] of uploadsByBucket.entries()) {
    if (storagePaths.length === 0) continue;
    const { error: removeError } = await supabase.storage.from(bucketName).remove(storagePaths);
    if (removeError) throw removeError;
  }
}

export async function resetGame(gameId: number) {
  try {
    const teamIds = await getTeamIdsForGame(gameId);
    if (!teamIds.length) {
      return {
        challenges: await getChallenges(gameId, true),
        leaderboard: await getLeaderboard(gameId),
      };
    }

    const { data: mediaRows, error: mediaListError } = await supabase
      .from("challenge_media")
      .select("bucket_name, storage_path")
      .in("team_id", teamIds);
    if (mediaListError) throw mediaListError;
    if (mediaRows?.length) {
      await removeChallengeMediaFilesForRows(
        mediaRows as Array<{ bucket_name: string; storage_path: string }>
      );
    }

    const { data: challengeRows, error: chErr } = await supabase
      .from("challenges")
      .select("id")
      .eq("game_id", gameId);
    if (chErr) throw chErr;
    const challengeIds = ((challengeRows ?? []) as Array<{ id: number }>).map((r) => Number(r.id));

    const delCheckins = await supabase.from("team_checkins").delete().in("team_id", teamIds);
    if (delCheckins.error) throw delCheckins.error;

    const delMedia = await supabase.from("challenge_media").delete().in("team_id", teamIds);
    if (delMedia.error) throw delMedia.error;

    if (challengeIds.length) {
      const delStatus = await supabase.from("team_challenge_status").delete().in("challenge_id", challengeIds);
      if (delStatus.error) throw delStatus.error;

      const cpDel = await supabase.from("team_challenge_checkpoints").delete().in("challenge_id", challengeIds);
      if (cpDel.error && !isMissingCheckpointTable(cpDel.error)) throw cpDel.error;

      const prDel = await supabase.from("team_challenge_prompts").delete().in("challenge_id", challengeIds);
      if (prDel.error && !isMissingPromptTable(prDel.error)) throw prDel.error;
    }

    const delCh = await supabase.from("challenges").delete().eq("game_id", gameId);
    if (delCh.error) throw delCh.error;

    const scoreReset = await supabase
      .from("team_scores")
      .update({ arrival_rank: null, creativity_score: 0 })
      .in("team_id", teamIds);
    if (scoreReset.error) throw scoreReset.error;

    return {
      challenges: await getChallenges(gameId, true),
      leaderboard: await getLeaderboard(gameId),
    };
  } catch (error) {
    if (isSupabaseUnavailable(error)) {
      return resetLocalState(gameId);
    }
    throw error;
  }
}

export { isGameError, GameError } from "@/lib/game-error";
export { MAX_FILES_PER_UPLOAD_REQUEST, TEAM_SEED, UNION_STATION };
