import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "shared.akamai.steamstatic.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "cdn.akamai.steamstatic.com",
        pathname: "**",
      },
    ],
  },
};

export default nextConfig;
