/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // 後方互換性のため domains も残す（Next.js 15では非推奨だが動作する）
    domains: [
      "i.gyazo.com",
      "i.ytimg.com",
      "cdn.discordapp.com",
      "lh3.googleusercontent.com",
      "drive.google.com",
      "images.microcms-assets.io",
      "firebasestorage.googleapis.com",
      "pbs.twimg.com",
      "abs.twimg.com",
    ],
    // 推奨される方法: remotePatterns を使用（より安全で柔軟）
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.gyazo.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.discordapp.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.discord.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'drive.google.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.microcms-assets.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.microcms-assets.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'abs.twimg.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
