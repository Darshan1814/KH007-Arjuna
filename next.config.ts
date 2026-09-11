import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build a self-contained server in .next/standalone for the Docker image.
  // The Dockerfile copies only that folder + .next/static + public into the
  // final image so the production container stays small.
  output: "standalone",

  // Production tooling — don't fail the production build over stylistic
  // issues; the unit tests + tsc still gate code quality elsewhere.
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },

  // Allow Next.js Image to load from external avatars used in the chat /
  // expert profile flows (LinkedIn, Google, etc.).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
