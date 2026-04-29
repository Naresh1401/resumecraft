/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [
      "pdf-parse",
      "mammoth",
      "puppeteer",
      "docx",
      "@prisma/client",
      "bcryptjs",
    ],
  },
  webpack: (config) => {
    config.externals = [...(config.externals || []), { canvas: "canvas" }];
    return config;
  },
};

module.exports = nextConfig;
