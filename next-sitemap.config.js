// next-sitemap.config.js

module.exports = {
  siteUrl: "https://pvsf.jp/",
  generateRobotsTxt: true,
  // これより以下が追加項目
  exclude: ["/server-sitemap.xml"],
  robotsTxtOptions: {
    additionalSitemaps: ["https://pvsf.jp/server-sitemap.xml"],
  },
};
