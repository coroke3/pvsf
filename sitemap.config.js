// next-sitemap.config.js

/** @type {import('next-sitemap').IConfig} */
module.exports = {
    siteUrl: process.env.SITE_URL || 'pvsf.jp',
    generateRobotsTxt: true,  exclude: ['/server-sitemap.xml'],
    robotsTxtOptions: {
      additionalSitemaps: [
        'https:/pvsf.jp/server-sitemap.xml',
      ],
    }
  };