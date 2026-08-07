/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@retail-media/shared"],
  env: {
    NEXT_PUBLIC_CAMPAIGN_API_URL: process.env.NEXT_PUBLIC_CAMPAIGN_API_URL ?? "http://localhost:4001",
    NEXT_PUBLIC_AD_DELIVERY_API_URL: process.env.NEXT_PUBLIC_AD_DELIVERY_API_URL ?? "http://localhost:4002",
  },
};

module.exports = nextConfig;
