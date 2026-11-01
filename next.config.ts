import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  outputFileTracingIncludes: { "/api/v1/**": ["./public/datasets/v1/*.json"] },
  async headers() { return [{ source: "/datasets/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "X-Content-Type-Options", value: "nosniff" }] }]; },
  reactStrictMode: true,
};

export default nextConfig;
