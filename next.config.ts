import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // For server-side, ensure node-fetch is available
      config.externals = config.externals || [];
      config.externals.push('node-fetch');
    }
    return config;
  },
  serverExternalPackages: ['dropbox', 'node-fetch'],
};

export default nextConfig;
