/** @type {import('next').NextConfig} */
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development', // Desabilita em dev para não interferir
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      // Cache de páginas (HTML)
      {
        urlPattern: /^https?.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'devlife-pages',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 24 * 60 * 60, // 24 horas
          },
        },
      },
      // Cache de imagens
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'devlife-images',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dias
          },
        },
      },
      // Cache de scripts e estilos
      {
        urlPattern: /\.(?:js|css)$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'devlife-static',
          expiration: {
            maxEntries: 60,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 dias
          },
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@devlife/api-client',
    '@devlife/types',
    '@devlife/validation',
    '@devlife/utils',
    '@devlife/config',
  ],
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'expo-secure-store': false,
      'expo-modules-core': false,
      'react-native': false,
    };
    config.watchOptions = {
      ignored: ['**/node_modules', '**/.git', '**/System Volume Information'],
    };
    return config;
  },
};

module.exports = withPWA(nextConfig);