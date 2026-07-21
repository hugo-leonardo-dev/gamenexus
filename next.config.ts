import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ─── Standalone output ───────────────────────────────────────
  // Habilita a geração de build mínima para Docker.
  // Gera .next/standalone/ com apenas os arquivos necessários para produção.
  // Reduz a imagem Docker de ~1GB para ~200MB.
  output: process.env.DOCKER_BUILD === "true" ? "standalone" : undefined,

  // ─── Image Optimization ──────────────────────────────────────
  // Desabilitado por padrão para economizar RAM na Oracle Cloud Free (1GB).
  // Ative removendo esta linha ou setando unoptimized: false.
  images: {
    unoptimized: true,
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

  // ─── Produção ────────────────────────────────────────────────
  productionBrowserSourceMaps: false,
  compress: true,
};

export default nextConfig;
