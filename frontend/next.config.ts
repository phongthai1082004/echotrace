import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(import.meta.dirname, ".."),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cloudfarer2.cabinetdememoire.workers.dev" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "arashiyamabambooforest.com" },
    ],
  },
  async headers() {
    const isDev = process.env.NODE_ENV !== "production";
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://static.cloudflareinsights.com https://www.googletagmanager.com`,
      "style-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://fonts.googleapis.com",
      "connect-src 'self' data: https://cloudfarer2.cabinetdememoire.workers.dev https://www.google-analytics.com https://www.googletagmanager.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https://cloudfarer2.cabinetdememoire.workers.dev https://images.unsplash.com https://lh3.googleusercontent.com https://arashiyamabambooforest.com https://www.google-analytics.com https://www.googletagmanager.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp,
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
  output: 'standalone',
  compress: true,
  experimental: {
    // ponytail: barrel packages (lucide etc.) bloat initial JS → LCP waits for hydration.
    optimizePackageImports: ["lucide-react", "@react-three/drei", "@react-three/fiber", "@react-spring/three", "date-fns", "react-hook-form", "zod"],
  },
};

export default nextConfig;
