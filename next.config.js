/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloudflare Pages / CI では lint をビルドで走らせず、コンパイルを優先する
  // （現在の ESLint 周りで circular JSON エラーが出てビルドが止まるため）
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['i.gyazo.com'],
  },
};

module.exports = nextConfig;
