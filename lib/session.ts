import crypto from "node:crypto";

import { cookies } from "next/headers";

import { COOKIE_NAME, SESSION_SECRET } from "@/lib/config";
import { verifyTeamBelongsToGame } from "@/lib/team-session-guard";

export type SessionPayload =
  | { role: "admin"; gameId: number; ownerCredentialId?: number }
  | { role: "team"; gameId: number; teamId: number };

function sign(value: string) {
  return crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(value)
    .digest("hex");
}

function encode(payload: SessionPayload) {
  const json = JSON.stringify(payload);
  const base = Buffer.from(json).toString("base64url");
  return `${base}.${sign(base)}`;
}

function decode(value: string): SessionPayload | null {
  const [base, signature] = value.split(".");
  if (!base || !signature || sign(base) !== signature) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(base, "base64url").toString("utf8")) as SessionPayload;
    if (
      parsed.role === "admin" &&
      typeof parsed.gameId === "number" &&
      (parsed.ownerCredentialId === undefined || typeof parsed.ownerCredentialId === "number")
    ) {
      return parsed;
    }
    if (
      parsed.role === "team" &&
      typeof parsed.gameId === "number" &&
      typeof parsed.teamId === "number"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getSession() {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  return raw ? decode(raw) : null;
}

export async function setSession(payload: SessionPayload) {
  if (payload.role === "admin") {
    if (payload.gameId == null || !Number.isFinite(payload.gameId)) {
      throw new Error("Admin session requires a valid gameId.");
    }
    if (
      payload.ownerCredentialId !== undefined &&
      (payload.ownerCredentialId == null || !Number.isFinite(payload.ownerCredentialId))
    ) {
      throw new Error("Admin session ownerCredentialId must be a valid number when provided.");
    }
  } else {
    if (
      payload.gameId == null ||
      !Number.isFinite(payload.gameId) ||
      payload.teamId == null ||
      !Number.isFinite(payload.teamId)
    ) {
      throw new Error("Team session requires valid gameId and teamId.");
    }
  }
  const store = await cookies();
  store.set(COOKIE_NAME, encode(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function requireAdminSession() {
  const session = await getSession();
  if (session?.role !== "admin") return null;
  return session;
}

export async function requireTeamSession() {
  const session = await getSession();
  if (session?.role !== "team" || session.teamId == null || session.gameId == null) {
    return null;
  }
  const ok = await verifyTeamBelongsToGame(session.gameId, session.teamId);
  return ok ? session : null;
}
