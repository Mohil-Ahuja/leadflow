import type { NextConfig } from "next";

// The browser always calls same-origin /api/*; Next forwards it to FastAPI.
// This avoids CORS in development and lets Docker point at the backend by
// service name. Rewrites are resolved at build time.
const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
