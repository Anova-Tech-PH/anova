import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@attendly/shared", "@attendly/ui"],
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "54331",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "54331",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
