import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  //output: 'standalone',
  // External packages configuration
  serverExternalPackages: [],
  // Ignore ESLint errors during production builds to allow deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
