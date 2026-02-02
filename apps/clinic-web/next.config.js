/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Suppress middleware deprecation warning (middleware.ts is still the standard approach)
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  async redirects() {
    return [
      { source: '/dashboard/branches', destination: '/dashboard/clinic?tab=branches', permanent: true },
      { source: '/dashboard/categories', destination: '/dashboard/clinic?tab=categories', permanent: true },
      { source: '/dashboard/services', destination: '/dashboard/clinic?tab=services', permanent: true },
      { source: '/dashboard/clinic-info', destination: '/dashboard/clinic?tab=info', permanent: true },
    ]
  },
}

module.exports = nextConfig

