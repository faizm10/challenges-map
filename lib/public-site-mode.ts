/**
 * When PUBLIC_SITE_MODE=coming_soon, public marketing pages rewrite to /coming-soon
 * and GET /api/public/* feeds return 403. Team and admin routes are unchanged.
 */
export function isPublicComingSoon(): boolean {
  return process.env.PUBLIC_SITE_MODE === "coming_soon";
}
