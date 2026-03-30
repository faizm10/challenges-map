import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dynamic `/e/[slug]/...` URLs are not representable in generated static route types.
  typedRoutes: false,
};

export default nextConfig;
