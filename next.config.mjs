/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Allow localtunnel and ngrok during development
  experimental: {
    allowedDevOrigins: [
      'https://*.loca.lt',
      'https://*.ngrok-free.app',
      'https://*.trycloudflare.com',
    ],
  },
}

export default nextConfig