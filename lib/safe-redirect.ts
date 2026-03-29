/** Prevent open redirects from ?next= query params. */
export function safeNextPath(raw: string | undefined | null): string {
  if (!raw || typeof raw !== "string") return "/e/create";
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return "/e/create";
  if (t.includes("://")) return "/e/create";
  return t;
}
