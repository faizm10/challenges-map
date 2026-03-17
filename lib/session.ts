import crypto from "node:crypto";

import { cookies } from "next/headers";

import { COOKIE_NAME, SESSION_SECRET } from "@/lib/config";
import type { SessionRole } from "@/lib/types";

type SessionPayload = {
  role: SessionRole;
  teamId?: number;
};

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
    return JSON.parse(Buffer.from(base, "base64url").toString("utf8")) as SessionPayload;
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
  return session?.role === "admin" ? session : null;
}

export async function requireTeamSession() {
  const session = await getSession();
  return session?.role === "team" && session.teamId ? session : null;
}
