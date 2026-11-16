/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/dailymed\.nlm\.nih\.gov\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "dailymed-cache",
        expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
      },
    },
    {
      urlPattern: /^https:\/\/api\.fda\.gov\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "openfda-cache",
        expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
      },
    },
  ],
});

const nextConfig = {
  experimental: { serverActions: { allowedOrigins: ["*"] } },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "dailymed.nlm.nih.gov" },
      { protocol: "https", hostname: "api.fda.gov" },
    ],
  },
};

module.exports = withPWA(nextConfig);
