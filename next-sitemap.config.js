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
  transform: async (config, path) => {
    return {
      loc: path, // => this will be exported as http(s)://<config.siteUrl>/<path>
      changefreq: config.changefreq,
      priority: config.priority,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
      images: [{ loc: "https://example.com/image.jpg" }],
      news: {
        title: "Article 1",
        publicationName: "Google Scholar",
        publicationLanguage: "en",
        date: new Date(),
      },
    };
  },
};
