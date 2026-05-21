const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true
  }
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
