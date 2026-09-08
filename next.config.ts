import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/humanize": ["./SKILL.md"],
  },
};

export default nextConfig;
