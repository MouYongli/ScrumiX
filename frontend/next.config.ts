import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1',
  },
  // Explicitly load environment variables
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

export default nextConfig;
