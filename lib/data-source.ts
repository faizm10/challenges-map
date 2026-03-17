export function isSupabaseUnavailable(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as { message?: string; code?: string };
  const message = maybeError.message?.toLowerCase() ?? "";
  const code = maybeError.code ?? "";

  return (
    code === "PGRST205" ||
    message.includes("project removed") ||
    message.includes("schema cache") ||
    message.includes("failed to fetch")
  );
}
