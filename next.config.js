/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve 'fs' module on the client to prevent bundling errors
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };

      // Handle WASM files
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true,
      };

      config.module.rules.push({
        test: /\.wasm$/,
        type: "webassembly/async",
      });
    }
    return config;
  },
};

module.exports = nextConfig;
