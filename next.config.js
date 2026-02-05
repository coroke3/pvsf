/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["i.gyazo.com"],
  },
  // Cloudflare Workers (workerd) で解決できないパッケージを外部化
  serverExternalPackages: [
    "jose",
    "@panva/hkdf",
    "react-textarea-autosize",
    "@emotion/react",
  ],
};

module.exports = nextConfig;
