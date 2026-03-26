function errorText(error: unknown): string {
  if (error && typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return String(error ?? "");
}

/**
 * True when we should fall back to `lib/local-store` instead of failing the request.
 * Includes quota / Fair Use (402) so the marketing homepage still renders if the project is restricted.
 */
export function isSupabaseUnavailable(error: unknown) {
  if (!error) return false;

  const text = errorText(error).toLowerCase();
  const maybe = error && typeof error === "object" ? (error as Record<string, unknown>) : null;
  const code = String(maybe?.code ?? "").toLowerCase();
  const status = Number(maybe?.status ?? maybe?.statusCode ?? NaN);

  if (Number.isFinite(status) && (status === 402 || status === 503)) return true;

  return (
    code === "pgrst205" ||
    text.includes("project removed") ||
    text.includes("schema cache") ||
    text.includes("failed to fetch") ||
    text.includes("exceed_") ||
    text.includes("service for this project is restricted") ||
    text.includes("egress") ||
    text.includes("fair use") ||
    text.includes("402") ||
    text.includes("overdue_payment")
  );
}
