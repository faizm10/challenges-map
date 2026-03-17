#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, "lib", "config.ts");

const DOWNTOWN_PRESET = [
  // [lng, lat] within downtown Toronto core.
  { teamId: 1, lng: -79.4034, lat: 43.6543 }, // Kensington Market
  { teamId: 2, lng: -79.3957, lat: 43.6629 }, // U of T / Queen's Park
  { teamId: 3, lng: -79.3874, lat: 43.6386 }, // Harbourfront
  { teamId: 4, lng: -79.3591, lat: 43.6503 }, // Distillery District
  { teamId: 5, lng: -79.3807, lat: 43.6561 }, // Yonge-Dundas Square
];

function parseNumber(value) {
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

function fmtCoord(n) {
  // Keep more precision (and trim trailing zeros) so we don't lose user-provided decimals.
  const fixed = n.toFixed(7);
  return fixed.replace(/\.?0+$/, "");
}

function validateLngLat(lng, lat) {
  if (lng < -180 || lng > 180) return "Longitude must be between -180 and 180.";
  if (lat < -90 || lat > 90) return "Latitude must be between -90 and 90.";
  return null;
}

function updateTeamInConfig(source, teamId, lng, lat) {
  const idPattern = `id:\\s*${teamId}\\s*,`;
  const coordsRe = new RegExp(
    `(${idPattern}[\\s\\S]*?coordinates:\\s*)\\[[^\\]]*\\]`,
    "m"
  );

  if (!coordsRe.test(source)) {
    throw new Error(`Could not find coordinates for team ${teamId} in ${CONFIG_PATH}.`);
  }

  const next = source.replace(
    coordsRe,
    `$1[${fmtCoord(lng)}, ${fmtCoord(lat)}]`
  );

  const routeLineRe = new RegExp(
    `(${idPattern}[\\s\\S]*?routeLine:\\s*\\[\\s*)\\[[^\\]]*\\]`,
    "m"
  );

  // Route line exists in v1 seed; keep its first point aligned with start coords.
  if (!routeLineRe.test(next)) {
    return next;
  }

  return next.replace(
    routeLineRe,
    `$1[${fmtCoord(lng)}, ${fmtCoord(lat)}]`
  );
}

async function main() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`Missing ${CONFIG_PATH}`);
    process.exit(1);
  }

  const args = new Set(process.argv.slice(2));
  const interactive = args.has("--interactive");
  const useDowntownPreset = args.has("--downtown") || !interactive;

  if (useDowntownPreset) {
    const original = fs.readFileSync(CONFIG_PATH, "utf8");
    let updated = original;

    for (const entry of DOWNTOWN_PRESET) {
      updated = updateTeamInConfig(updated, entry.teamId, entry.lng, entry.lat);
    }

    if (updated === original) {
      console.log("No changes detected.");
      return;
    }

    fs.writeFileSync(CONFIG_PATH, updated, "utf8");
    console.log("Applied downtown Toronto preset coordinates to TEAM_SEED (auto):");
    for (const entry of DOWNTOWN_PRESET) {
      console.log(`- Team ${entry.teamId}: ${entry.lng}, ${entry.lat}`);
    }
    console.log(`\nUpdated ${CONFIG_PATH}`);
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log("Converge: set TEAM_SEED start coordinates");
    console.log("Interactive mode: enter longitude/latitude for each team. Example: -79.4015 / 43.6516");
    console.log("");

    const entries = [];
    for (let teamId = 1; teamId <= 5; teamId += 1) {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const lngRaw = await rl.question(`Team ${teamId} longitude: `);
        const latRaw = await rl.question(`Team ${teamId} latitude: `);
        const lng = parseNumber(lngRaw);
        const lat = parseNumber(latRaw);

        if (lng === null || lat === null) {
          console.log("Invalid number. Try again.\n");
          continue;
        }

        const err = validateLngLat(lng, lat);
        if (err) {
          console.log(`${err} Try again.\n`);
          continue;
        }

        entries.push({ teamId, lng, lat });
        console.log("");
        break;
      }
    }

    const original = fs.readFileSync(CONFIG_PATH, "utf8");
    let updated = original;
    for (const entry of entries) {
      updated = updateTeamInConfig(updated, entry.teamId, entry.lng, entry.lat);
    }

    if (updated === original) {
      console.log("No changes detected.");
      return;
    }

    fs.writeFileSync(CONFIG_PATH, updated, "utf8");
    console.log(`Updated ${CONFIG_PATH}`);
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
