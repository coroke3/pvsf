import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // サイトマップのデータを生成
  const sitemapData = [
    { url: 'https://pvsf.jp/', lastmod: new Date().toISOString() },
    { url: 'https://pvsf.jp/blog', lastmod: new Date().toISOString() }
  ];

  // XML形式のサイトマップを構築
  const xml = buildSitemapXml(sitemapData);

  // サイトマップをレスポンスとして返す
  res.setHeader('Content-Type', 'application/xml');
  res.end(xml); // レスポンスにXMLデータを直接書き込む
}

// サイトマップデータをXML形式に変換する関数
function buildSitemapXml(sitemapData) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  sitemapData.forEach(({ url, lastmod }) => {
    xml += `<url>\n`;
    xml += `<loc>${url}</loc>\n`;
    xml += `<lastmod>${lastmod}</lastmod>\n`;
    xml += `</url>\n`;
  });

  xml += '</urlset>';
  return xml;
}
