/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    domains: ["i.gyazo.com"],
  },
  // Cloudflare Pages (workerd) で解決できないパッケージを外部化
  serverExternalPackages: [
    "jose",
    "@panva/hkdf",
    "react-textarea-autosize",
    "@emotion/react",
    "@emotion/cache",
    "@emotion/utils",
    "@emotion/use-insertion-effect-with-fallbacks",
  ],
};

export default nextConfig;
