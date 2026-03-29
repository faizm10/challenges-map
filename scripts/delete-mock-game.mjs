#!/usr/bin/env node
/**
 * Delete mock (or any) game rows from Supabase. Removing a game cascades to teams,
 * challenges, access_credentials, etc. when ON DELETE CASCADE is set on FKs to games.
 *
 * Usage:
 *   node scripts/delete-mock-game.mjs --slug=mock-abc123
 *   node scripts/delete-mock-game.mjs --all-mock --yes    # every slug starting with "mock-"
 *   node scripts/delete-mock-game.mjs --slug=converge     # allowed; prints extra warning
 *   node scripts/delete-mock-game.mjs --slug=my-slug --dry-run
 *   npm run delete:mock -- --slug=my-slug
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY (.env.local ok)
 *
 * If delete fails with FK errors (e.g. team_scores still references teams), run:
 *   supabase/migrations/20250329140000_cascade_team_challenge_fks.sql
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();

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
    slug: "",
    allMock: false,
    yes: false,
    dryRun: false,
  };
  for (const arg of argv.slice(2)) {
    if (arg === "--all-mock") out.allMock = true;
    else if (arg === "--yes") out.yes = true;
    else if (arg === "--dry-run") out.dryRun = true;
    else if (arg.startsWith("--slug=")) out.slug = arg.slice(7).trim().toLowerCase();
  }
  return out;
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

async function deleteGameRow(row, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] would delete id=${row.id} slug=${row.slug}`);
    return;
  }
  const { error } = await supabase.from("games").delete().eq("id", row.id);
  if (error) throw error;
  console.log(`Deleted game id=${row.id} slug=${row.slug}`);
}

async function main() {
  if (args.allMock) {
    if (!args.yes) {
      console.error('Bulk delete requires --yes (deletes every game whose slug starts with "mock-").');
      process.exit(1);
    }
    const { data: rows, error } = await supabase.from("games").select("id, slug").like("slug", "mock-%");
    if (error) throw error;
    const list = rows ?? [];
    if (list.length === 0) {
      console.log('No games with slug like "mock-%".');
      return;
    }
    console.log(`${args.dryRun ? "Would delete" : "Deleting"} ${list.length} game(s):`);
    for (const row of list) {
      await deleteGameRow(row, args.dryRun);
    }
    return;
  }

  if (!args.slug) {
    console.error(`Usage:
  node scripts/delete-mock-game.mjs --slug=<slug>
  node scripts/delete-mock-game.mjs --all-mock --yes
  node scripts/delete-mock-game.mjs --all-mock --dry-run   # list only`);
    process.exit(1);
  }

  if (args.slug === "converge") {
    console.warn('Warning: deleting "converge" removes the default seeded event and all of its data.');
  }

  const { data: row, error: findErr } = await supabase
    .from("games")
    .select("id, slug")
    .eq("slug", args.slug)
    .maybeSingle();

  if (findErr) throw findErr;
  if (!row) {
    console.log(`No game with slug "${args.slug}".`);
    return;
  }

  await deleteGameRow(row, args.dryRun);
}

main().catch((err) => {
  const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
  if (code === "23503") {
    console.error(
      "\nDelete was blocked by a foreign key. Apply the migration:\n  supabase/migrations/20250329140000_cascade_team_challenge_fks.sql\n(Supabase Dashboard → SQL → paste & run, or `supabase db push`.)\n"
    );
  }
  console.error(err);
  process.exit(1);
});
