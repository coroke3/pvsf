export const runtime = "experimental-edge";

import { getAllWorkIds } from "../libs/work";
import { getAllPageIds } from "../libs/page";
import { getAllBlogIds } from "../libs/blog";

const Sitemap = () => null;

export default Sitemap;
export async function getServerSideProps() {
    try {
      // 各ページの ID を取得
      const workIds = await getAllWorkIds();
      const pageIds = await getAllPageIds();
      const blogIds = await getAllBlogIds();
  
      // 各ページのパスを生成
      const workPaths = workIds.map((id) => `/work/${id.params.id}`);
      const pagePaths = pageIds.map((id) => `/page/${id.params.id}`);
      const blogPaths = blogIds.map((id) => `/blog/${id.params.id}`);
  
      // サイトマップを生成
      const generateSitemap = (paths) => {
        return paths.map((path) => `<url><loc>https://pvsf.jp${path}</loc></url>`).join("");
      };
  
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          ${generateSitemap(workPaths)}
          ${generateSitemap(pagePaths)}
          ${generateSitemap(blogPaths)}
        </urlset>`;
  
      return { 
        props: { 
          sitemap 
        } 
      };
    } catch (error) {
      console.error("Error generating sitemap:", error);
      return { props: { error: "Error generating sitemap" } };
    }
  }
  