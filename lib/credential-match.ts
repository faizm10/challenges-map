/** Normalize display names for login lookup (trim, collapse spaces, case-insensitive compare). */
export function normalizeDisplayNameForLookup(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export function displayNamesMatch(stored: string, input: string) {
  return (
    normalizeDisplayNameForLookup(stored).toLowerCase() ===
    normalizeDisplayNameForLookup(input).toLowerCase()
  );
}
