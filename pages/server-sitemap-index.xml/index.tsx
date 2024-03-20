// pages/server-sitemap-index.xml/index.tsx
import { getServerSideSitemapIndexLegacy } from "next-sitemap";
import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  // Method to source urls from cms
  const response = await fetch(
    "https://script.google.com/macros/s/AKfycbyEph6zXb1IWFRLpTRLNLtxU4Kj7oe10bt2ifiyK09a6nM13PASsaBYFe9YpDj9OEkKTw/exec"
  );
  const jsonData = await response.json(); // レスポンスデータをjsonDataとして格納

  const sitemapItems = jsonData.map((item) => ({
    loc: `https://pvsf.jp/work/${item.ylink.slice(17, 28)}`,
  }));
  
  return getServerSideSitemapIndexLegacy(ctx, sitemapItems);
  
};

// Default export to prevent next.js errors
export default function SitemapIndex() {}
