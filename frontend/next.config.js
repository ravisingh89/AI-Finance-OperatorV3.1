/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Warnings don't fail the build — only errors do
    ignoreDuringBuilds: false,
  },
  typescript: {
    // We handle type errors in CI, not during Vercel build to avoid false failures
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
