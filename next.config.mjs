/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["i.gyazo.com"],
  },
  // Cloudflare Pages (workerd) で解決できないパッケージを外部化
  serverExternalPackages: [
    "jose",
    "@panva/hkdf",
    "react-textarea-autosize",
    "@emotion/react",
  ],
};

export default nextConfig;
