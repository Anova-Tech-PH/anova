import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@attendly/shared", "@attendly/ui"],
};

export default nextConfig;
