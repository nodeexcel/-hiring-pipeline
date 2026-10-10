import type { NextConfig } from "next";

// Conservative headers that cannot break the app. A full CSP is intentionally not set:
// Monaco and the theme bootstrap script need nonces, which belongs in the proxy.
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // The local-stack test server (scripts/dev-local.mjs) uses its own dir so it can run next to `pnpm dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  transpilePackages: ["@app/shared"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  turbopack: {
    // Tailwind v4 is processed by this loader under Turbopack (no postcss.config needed).
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
