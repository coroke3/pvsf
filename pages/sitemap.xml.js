export const runtime = 'edge';

import { getAllWorkIds } from '../libs/work';
import { getAllPageIds } from '../libs/page'; 
import { getAllBlogIds } from '../libs/blog'; 


const Sitemap = () => null;

export default Sitemap;

export async function getServerSideProps({ res }) {
  try {
    const workIds = await getAllWorkIds(); 
    const workPaths = workIds.map((id) => `/work/${id.params.id}`);

    const pageIds = await getAllPageIds(); 
    const pagePaths = pageIds.map((id) => `/page/${id.params.id}`);

    const blogIds = await getAllBlogIds(); 
    const blogPaths = blogIds.map((id) => `/blog/${id.params.id}`);

    const generateSitemap = (paths) => {
      return paths.map((path) => `<url><loc>https://pvsf.jp${path}</loc></url>`).join('');
    };

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        ${generateSitemap(workPaths)}
        ${generateSitemap(pagePaths)}
        ${generateSitemap(blogPaths)}
      </urlset>`;

    res.setHeader('Content-Type', 'text/xml');
    res.write(sitemap);
    res.end();

    return { props: {} };
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return { props: { error: 'Error generating sitemap' } };
  }
}
