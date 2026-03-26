/**
 * Dashboard and public pages poll for live updates. Each poll can re-sign Storage URLs and
 * trigger client media loads — keep intervals conservative to reduce Supabase egress.
 */
export const DASHBOARD_POLL_MS = 20_000;
export const PUBLIC_POLL_MS = 15_000;

/**
 * Runs `onTick` on an interval only while the document is visible. When the tab becomes visible
 * again, runs `onTick` once so the UI catches up without waiting for the next interval.
 */
export function subscribeWhileVisible(onTick: () => void, intervalMs: number): () => void {
  const tick = () => {
    if (typeof document === "undefined" || document.visibilityState !== "visible") return;
    onTick();
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      onTick();
    }
  };

  const id = window.setInterval(tick, intervalMs);
  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    window.clearInterval(id);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
