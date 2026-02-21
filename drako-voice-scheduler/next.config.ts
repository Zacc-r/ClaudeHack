import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      // API routes: network-first (always fresh data)
      {
        urlPattern: /^\/api\/.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "drako-api",
          expiration: { maxEntries: 32, maxAgeSeconds: 60 },
          networkTimeoutSeconds: 10,
        },
      },
      // Static assets: cache-first
      {
        urlPattern: /\.(png|jpg|jpeg|svg|ico|webp)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "drako-images",
          expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
      // Pages: network-first (get updates on refresh)
      {
        urlPattern: /^\/(?!api).*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "drako-pages",
          expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 },
          networkTimeoutSeconds: 10,
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA(nextConfig);
