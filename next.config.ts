import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Les CV en PDF passent par un formulaire : on autorise jusqu'à 4 Mo.
    serverActions: { bodySizeLimit: "4mb" },
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
