import crypto from "node:crypto";

const KEYLEN = 64;

function scryptParams() {
  return {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  } as const;
}

export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto.scryptSync(plain, salt, KEYLEN, scryptParams()).toString("base64url");
  return `v1$${salt}$${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const [, salt, expected] = parts;
  try {
    const hash = crypto.scryptSync(plain, salt, KEYLEN, scryptParams()).toString("base64url");
    const a = Buffer.from(hash, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
