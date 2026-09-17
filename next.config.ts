import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // CSV import (M4) submits the full parsed file as a Server Action
    // payload for server-side re-validation; the 1MB default is too small
    // for a few thousand movement rows.
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
