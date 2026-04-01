/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // The component.tsx is AI-generated — skip type checking and linting at build
  // time so a minor type error doesn't abort the render pipeline.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
