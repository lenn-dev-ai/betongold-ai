// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@anthropic-ai/sdk'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
  serverRuntimeConfig: {
    maxDuration: 60,
  },
};

export default nextConfig;
