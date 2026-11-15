/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@gamehouse/shared'],
  reactStrictMode: false, // Prevents double mounting socket/canvas in development
  webpack: (config, { isServer }) => {
    // Handle canvas and phaser requirements for client-side rendering
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig;
