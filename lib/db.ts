import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

import { CHALLENGE_SEED, TEAM_SEED } from "@/lib/config";

const dbDir = path.join(process.cwd(), "data");
fs.mkdirSync(dbDir, { recursive: true });

declare global {
  // eslint-disable-next-line no-var
  var __raceToUnionDb: Database.Database | undefined;
}

export const db =
  global.__raceToUnionDb ||
  new Database(path.join(dbDir, "race-to-union.sqlite"));

if (!global.__raceToUnionDb) {
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY,
      team_name TEXT NOT NULL,
      start_location_name TEXT NOT NULL,
      address TEXT NOT NULL,
      route_summary TEXT NOT NULL,
      walk_time TEXT NOT NULL,
      color TEXT NOT NULL,
      badge_label TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS challenges (
      id INTEGER PRIMARY KEY,
      challenge_order INTEGER NOT NULL UNIQUE,
      title TEXT NOT NULL,
      text TEXT NOT NULL,
      is_released INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS team_challenge_status (
      team_id INTEGER NOT NULL,
      challenge_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'not_started',
      proof_note TEXT NOT NULL DEFAULT '',
      submitted_at TEXT,
      PRIMARY KEY (team_id, challenge_id)
    );

    CREATE TABLE IF NOT EXISTS team_scores (
      team_id INTEGER PRIMARY KEY,
      arrival_rank INTEGER,
      creativity_score INTEGER NOT NULL DEFAULT 0
    );
  `);

  global.__raceToUnionDb = db;
}

const insertTeamStmt = db.prepare(`
  INSERT OR REPLACE INTO teams (
    id, team_name, start_location_name, address, route_summary, walk_time, color, badge_label
  ) VALUES (
    @id, @team_name, @start_location_name, @address, @route_summary, @walk_time, @color, @badge_label
  )
`);

const insertChallengeStmt = db.prepare(`
  INSERT OR REPLACE INTO challenges (
    id, challenge_order, title, text, is_released
  ) VALUES (
    @id, @challenge_order, @title, @text, @is_released
  )
`);

export const resetData = db.transaction(() => {
  db.prepare("DELETE FROM team_challenge_status").run();
  db.prepare("DELETE FROM team_scores").run();
  db.prepare("DELETE FROM challenges").run();
  db.prepare("DELETE FROM teams").run();

  for (const team of TEAM_SEED) {
    insertTeamStmt.run({
      id: team.id,
      team_name: team.teamName,
      start_location_name: team.startLocationName,
      address: team.address,
      route_summary: team.routeSummary,
      walk_time: team.walkTime,
      color: team.color,
      badge_label: team.badgeLabel,
    });

    db.prepare(
      "INSERT INTO team_scores (team_id, arrival_rank, creativity_score) VALUES (?, NULL, 0)"
    ).run(team.id);
  }

  for (const challenge of CHALLENGE_SEED) {
    insertChallengeStmt.run({
      id: challenge.id,
      challenge_order: challenge.challengeOrder,
      title: challenge.title,
      text: challenge.text,
      is_released: challenge.isReleased,
    });

    for (const team of TEAM_SEED) {
      db.prepare(
        "INSERT INTO team_challenge_status (team_id, challenge_id, status, proof_note, submitted_at) VALUES (?, ?, 'not_started', '', NULL)"
      ).run(team.id, challenge.id);
    }
  }
});

const hasTeams = db.prepare("SELECT COUNT(*) AS count FROM teams").get() as {
  count: number;
};

if (!hasTeams.count) {
  resetData();
}
