/** URL segment for `/e/[slug]/…` — keep in sync with game creation validation. */
export const EVENT_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

export function normalizeEventSlug(raw: string) {
  return raw.trim().toLowerCase();
}

export function isValidEventSlug(raw: string): boolean {
  const s = normalizeEventSlug(raw);
  return EVENT_SLUG_PATTERN.test(s);
}
