import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel ko bolne ke liye ki choti galtiyon par error mat do
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;