import type { NextConfig } from "next";

// MIServe is a logged-in app where almost every page reads the session,
// so Cache Components is left off and pages render per request.
const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs"],
  experimental: {
    // up to 5 attachments x 10 MB per request, plus form overhead
    serverActions: { bodySizeLimit: "52mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
