/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: "https://pvsf.jp",
  generateRobotsTxt: true,
  exclude: ["/server-sitemap.xml"], // <= exclude here
  robotsTxtOptions: {
    additionalSitemaps: [
      "https://pvsf.jp/server-sitemap.xml", // <==== Add here
    ],
  },
};
