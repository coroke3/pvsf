// pages/server-sitemap-index.xml/index.tsx
import { getServerSideSitemapIndexLegacy } from "next-sitemap";
import { GetServerSideProps } from "next";

// 不適切な文字を削除する関数
function removeInvalidChars(input: string): string {
  // 不適切な文字を正規表現で置換
  return input.replace(/[^\x20-\x7E]/g, '');
}

export const runtime = 'experimental-edge';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  // Method to source urls from cms
  const response = await fetch(
    "https://script.google.com/macros/s/AKfycbyEph6zXb1IWFRLpTRLNLtxU4Kj7oe10bt2ifiyK09a6nM13PASsaBYFe9YpDj9OEkKTw/exec"
  );
  const jsonData: any[] = await response.json(); // jsonData の型を any[] として明示的に指定

  const sitemapItems = jsonData.map((item: any) => ({
    // 不適切な文字を削除
    loc: `https://pvsf.jp/work/${removeInvalidChars(item.ylink.slice(17, 28))}`,
  }));
  
  const sitemapUrls = sitemapItems.map((item) => item.loc);

  return getServerSideSitemapIndexLegacy(ctx, sitemapUrls);
};

// Default export to prevent next.js errors
export default function SitemapIndex() {}
