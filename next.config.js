const path = require('path');

// Bundle analyzer is optional - only load if package is installed
let withBundleAnalyzer = (config) => config;
try {
  withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
  });
} catch (e) {
  // Bundle analyzer not installed, skip
}

// Security headers (including CSP) are generated per-request in src/proxy.ts.

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Set Turbopack root to this project directory to silence workspace warning
  turbopack: {
    root: __dirname,
  },

  // API route body size limits (prevents DoS via oversized payloads)
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb',
    },
    // Automatic tree-shaking for barrel exports (reduces bundle size)
    optimizePackageImports: ['lucide-react'],
  },

  // Manual modularizeImports for packages that need explicit transform
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
  },

  // Image optimization configuration
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    // Allow next/image to optimise artwork served from Cloudflare R2 public buckets.
    // Pattern covers both custom domains and default R2.dev URLs.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: '*.cloudflare.com',
      },
    ],
  },

  // Allow Replit development domain and localhost for cross-origin requests
  allowedDevOrigins: [
    process.env.REPLIT_DEV_DOMAIN,
    'localhost',
    'localhost:3000',
    'localhost:5000',
    'localhost:8100',
    '127.0.0.1',
    '127.0.0.1:3000',
    '127.0.0.1:5000',
    '127.0.0.1:8100',
    '0.0.0.0',
    '0.0.0.0:3000',
    '0.0.0.0:5000',
    '0.0.0.0:8100',
  ].filter(Boolean),

  // Disable source maps in production
  productionBrowserSourceMaps: false,

  // Security enhancements
  poweredByHeader: false,  // Remove X-Powered-By header
  reactStrictMode: true,

  // Enable gzip/brotli compression for responses (30-40% transfer reduction)
  compress: true,

  // Hide dev build indicator (removes floating square in dev)
  devIndicators: false,

  // Compiler options
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  // Comprehensive security headers
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    const globalHeaders = [
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Permissions-Policy',
        // IMPORTANT: camera=(self) required for Dream, microphone=(self) for MetaDJai voice
        // Primary config is src/proxy.ts - keep in sync! See docs/security/README.md
        value: 'camera=(self), microphone=(self), geolocation=(), browsing-topics=()',
      },
      {
        key: 'X-Deployment-Platform',
        value: 'Replit',
      },
    ];

    // Only set HSTS in production-like contexts. Setting HSTS in development can
    // cause browsers to "stick" to HTTPS for localhost, which is disruptive.
    if (!isDev) {
      globalHeaders.unshift({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      });
    }

    return [
      {
        source: '/:path*',
        headers: globalHeaders,
      },
      // _next static assets CORS (for production deployments)
      {
        source: '/_next/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, HEAD, OPTIONS',
          },
        ],
      },
    ];
  },

  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'zod/v3': path.resolve(__dirname, 'src/lib/zod-v3-shim.ts'),
    };
    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig);
