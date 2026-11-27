import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Repozitoriy ildizida boshqa lockfile (MARIUS) bor — ildizni aniq ko'rsatamiz
  turbopack: { root: process.cwd() },
  serverExternalPackages: ['pg', '@prisma/adapter-pg'],
  async redirects() {
    // Imkoniyatlar sahifasi olib tashlandi — eski havolalar bosh sahifaga
    return [{ source: '/features', destination: '/', permanent: true }];
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
