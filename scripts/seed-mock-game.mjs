#!/usr/bin/env node
/**
 * Inserts a disposable mock game: random slug, admin credential, N teams, optional 4 challenges
 * (matching app challenge orders: game_long, checkpoint, checkpoint, union) with DB checkpoint rows
 * so teams do not rely on lib/config TEAM_SEED.
 *
 * Usage:
 *   node scripts/seed-mock-game.mjs
 *   node scripts/seed-mock-game.mjs --teams=5
 *   node scripts/seed-mock-game.mjs --slug=my-qa-event
 *   node scripts/seed-mock-game.mjs --no-challenges
 *   node scripts/seed-mock-game.mjs --delete-slug=mock-abc123   # removes game (CASCADE)
 *
 * Env (or .env.local): NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();

const MAX_CHALLENGES = 4;
const UNION_NAME = "Union Station";
const DEFAULT_FINISH = "Union Station, Front Street entrance";
const UNLOCK_M = 150;

const COLORS = ["#d85f3a", "#2c7a7b", "#2563eb", "#8b5cf6", "#ca8a04", "#db2777", "#0d9488", "#ea580c"];

function loadEnvLocal() {
  try {
    const p = path.join(ROOT, ".env.local");
    const raw = fs.readFileSync(p, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // optional
  }
}

function parseArgs(argv) {
  const out = {
    teams: 3,
    challenges: true,
    slug: "",
    deleteSlug: "",
  };
  for (const arg of argv.slice(2)) {
    if (arg === "--no-challenges") out.challenges = false;
    else if (arg.startsWith("--teams=")) out.teams = Math.min(24, Math.max(1, Number(arg.slice(8)) || 3));
    else if (arg.startsWith("--slug=")) out.slug = arg.slice(7).trim().toLowerCase();
    else if (arg.startsWith("--delete-slug=")) out.deleteSlug = arg.slice(14).trim().toLowerCase();
  }
  return out;
}

function randomDigits(n) {
  let s = "";
  for (let i = 0; i < n; i++) s += String(Math.floor(Math.random() * 10));
  return s;
}

function randomSlug() {
  const part = Math.random().toString(36).slice(2, 10);
  return `mock-${Date.now().toString(36)}-${part}`;
}

function torontoLng() {
  return -79.42 + Math.random() * 0.07;
}
function torontoLat() {
  return 43.63 + Math.random() * 0.05;
}

function pick(arr, i) {
  return arr[i % arr.length];
}

async function nextTableId(supabase, table) {
  const { data, error } = await supabase.from(table).select("id").order("id", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data?.id != null ? Number(data.id) + 1 : 1;
}

loadEnvLocal();
const args = parseArgs(process.argv);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY). Add to .env.local or export them."
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function deleteBySlug(slug) {
  if (!slug) {
    console.error("Provide --delete-slug=<slug>");
    process.exit(1);
  }
  const { data: row, error: findErr } = await supabase.from("games").select("id, slug").eq("slug", slug).maybeSingle();
  if (findErr) throw findErr;
  if (!row) {
    console.log(`No game with slug "${slug}".`);
    return;
  }
  const { error: delErr } = await supabase.from("games").delete().eq("id", row.id);
  if (delErr) throw delErr;
  console.log(`Deleted game id=${row.id} slug=${row.slug} (dependent rows CASCADE if DB is configured).`);
}

async function main() {
  if (args.deleteSlug) {
    await deleteBySlug(args.deleteSlug);
    return;
  }

  const slug = args.slug || randomSlug();
  const adminName = `Mock Admin ${randomDigits(4)}`;
  const adminPin = `ADM${randomDigits(5)}`;
  const gameName = `Mock Event ${randomDigits(4)}`;

  const { data: existing } = await supabase.from("games").select("id").eq("slug", slug).maybeSingle();
  if (existing) {
    console.error(`Slug "${slug}" already exists. Pass a different --slug= or delete the game first.`);
    process.exit(1);
  }

  const { data: gameRow, error: gameErr } = await supabase
    .from("games")
    .insert({
      slug,
      name: gameName,
      finish_point_label: DEFAULT_FINISH,
      settings: {},
    })
    .select("id, slug, name")
    .single();

  if (gameErr) throw gameErr;
  const gameId = Number(gameRow.id);

  const { error: adminErr } = await supabase.from("access_credentials").insert({
    game_id: gameId,
    role: "admin",
    display_name: adminName,
    pin: adminPin,
    team_id: null,
  });
  if (adminErr) throw adminErr;

  /** @type {{ id: number; team_name: string; pin: string }[]} */
  const createdTeams = [];

  for (let i = 0; i < args.teams; i++) {
    const teamName = `Team Mock ${randomDigits(3)}-${i + 1}`;
    const pin = `T${randomDigits(5)}`;
    const nextId = await nextTableId(supabase, "teams");

    const { error: teamErr } = await supabase.from("teams").insert({
      id: nextId,
      game_id: gameId,
      team_name: teamName,
      start_location_name: `Start ${i + 1}`,
      address: `${100 + i} Mock St, Toronto, ON M5V 1A1`,
      route_summary: "Random test route through downtown (mock data).",
      walk_time: "30–40 min",
      color: pick(COLORS, i),
      badge_label: `Squad ${i + 1}`,
    });
    if (teamErr) throw teamErr;

    const { error: scoreErr } = await supabase.from("team_scores").insert({
      team_id: nextId,
      arrival_rank: null,
      creativity_score: 0,
    });
    if (scoreErr) throw scoreErr;

    const { error: credErr } = await supabase.from("access_credentials").insert({
      game_id: gameId,
      role: "team",
      display_name: teamName,
      pin,
      team_id: nextId,
    });
    if (credErr) throw credErr;

    createdTeams.push({ id: nextId, team_name: teamName, pin });
  }

  /** @type {number[]} */
  const challengeIds = [];

  if (args.challenges) {
    const templates = [
      { order: 1, title: "City-wide brief", text: "Mock challenge 1 — long-form team prompt (test).", loc: "Anywhere in play area", upload: true },
      { order: 2, title: "Checkpoint hunt A", text: "Mock checkpoint A — visit your assigned pin.", loc: "Per-team checkpoint", upload: true },
      { order: 3, title: "Checkpoint hunt B", text: "Mock checkpoint B — second route stop.", loc: "Per-team checkpoint", upload: true },
      { order: 4, title: "Finish line", text: "Converge at the finish (mock).", loc: UNION_NAME, upload: false },
    ];

    for (const t of templates) {
      const chId = await nextTableId(supabase, "challenges");
      challengeIds.push(chId);

      const { error: chErr } = await supabase.from("challenges").insert({
        id: chId,
        game_id: gameId,
        challenge_order: t.order,
        title: t.title,
        text: t.text,
        expected_location: t.loc,
        allow_media_upload: t.upload,
        is_released: false,
      });
      if (chErr) throw chErr;

      const statusRows = createdTeams.map((team) => ({
        team_id: team.id,
        challenge_id: chId,
        status: "not_started",
        proof_note: "",
        awarded_points: 0,
        submitted_at: null,
        review_status: "pending",
        review_note: "",
        reviewed_at: null,
        reviewed_by: null,
      }));

      const { error: stErr } = await supabase.from("team_challenge_status").insert(statusRows);
      if (stErr) throw stErr;

      if (t.order === 1) {
        const promptRows = createdTeams.map((team) => ({
          team_id: team.id,
          challenge_id: chId,
          prompt_text: "",
        }));
        const { error: prErr } = await supabase.from("team_challenge_prompts").insert(promptRows);
        if (prErr && prErr.code !== "42P01") throw prErr;
      }

      if (t.order === 2 || t.order === 3) {
        const cpRows = createdTeams.map((team) => ({
          team_id: team.id,
          challenge_id: chId,
          checkpoint_label: `Mock stop ${t.order} — ${team.team_name}`,
          checkpoint_address: `${Math.floor(Math.random() * 900) + 100} Queen St W, Toronto, ON`,
          latitude: torontoLat(),
          longitude: torontoLng(),
          unlock_radius_meters: UNLOCK_M,
        }));
        const { error: cpErr } = await supabase.from("team_challenge_checkpoints").insert(cpRows);
        if (cpErr && cpErr.code !== "42P01") throw cpErr;
      }
    }
  }

  console.log("\nMock game created\n");
  console.log(`  game_id:   ${gameId}`);
  console.log(`  slug:      ${slug}`);
  console.log(`  name:      ${gameName}`);
  console.log("\n  Admin (HQ)");
  console.log(`    Open:    /e/${slug}/admin`);
  console.log(`    Name:    ${adminName}`);
  console.log(`    PIN:     ${adminPin}`);
  console.log("\n  Teams");
  console.log(`    Open:    /e/${slug}/team`);
  for (const t of createdTeams) {
    console.log(`    • ${t.team_name}  /  PIN ${t.pin}`);
  }
  if (args.challenges) {
    console.log(`\n  Challenges: ${challengeIds.length} (all unreleased). IDs: ${challengeIds.join(", ")}`);
  } else {
    console.log("\n  Challenges: skipped (--no-challenges)");
  }
  console.log("\n  Remove:    node scripts/seed-mock-game.mjs --delete-slug=" + slug);
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
