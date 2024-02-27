/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: "https://pvsf.com",
  generateRobotsTxt: true,
  exclude: ["/server-sitemap-index.xml"], // <= exclude here
  robotsTxtOptions: {
    additionalSitemaps: [
      "https://pvsf.com/server-sitemap-index.xml", // <==== Add here
    ],
  },
};
