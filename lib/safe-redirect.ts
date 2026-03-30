/** Prevent open redirects from ?next= query params. */
export function safeNextPath(raw: string | undefined | null): string {
  if (!raw || typeof raw !== "string") return "/e/admin";
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return "/e/admin";
  if (t.includes("://")) return "/e/admin";
  return t;
}
