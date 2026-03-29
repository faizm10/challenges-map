#!/usr/bin/env node
/**
 * Creates Supabase Storage buckets used by the app.
 * Keep BUCKETS in sync with lib/config.ts (CHALLENGE_PROOF_BUCKET, MAX_UPLOAD_BYTES).
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SECRET_KEY=... node scripts/create-storage-buckets.mjs
 *   npm run storage:buckets
 *
 * Loads .env.local from project root if present (same keys as above).
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
    // .env.local optional
  }
}

loadEnvLocal();

/** @type {{ id: string; public: boolean; fileSizeLimit?: number; allowedMimeTypes?: string[] | null }[]} */
const BUCKETS = [
  {
    id: "challenge-proof",
    public: false,
    fileSizeLimit: 50 * 1024 * 1024,
    allowedMimeTypes: null,
  },
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY). Set them or add to .env.local."
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  for (const bucket of BUCKETS) {
    const { data, error } = await supabase.storage.createBucket(bucket.id, {
      public: bucket.public,
      fileSizeLimit: bucket.fileSizeLimit ?? null,
      allowedMimeTypes: bucket.allowedMimeTypes ?? null,
    });

    if (error) {
      const msg = String(error.message || error);
      if (/already exists|duplicate/i.test(msg)) {
        console.log(`skip (exists): ${bucket.id}`);
        continue;
      }
      console.error(`Failed: ${bucket.id}`, error);
      process.exitCode = 1;
      continue;
    }
    console.log(`created: ${bucket.id}`, data);
  }
}

main();
