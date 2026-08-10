import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@attendly/shared", "@attendly/ui"],
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
