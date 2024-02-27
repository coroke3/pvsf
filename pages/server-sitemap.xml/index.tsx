import { GetServerSideProps } from 'next'
import { getServerSideSitemapLegacy } from 'next-sitemap'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  // ここでデータを取得して、そのデータを使うことも可能
  // const response = await fetcher('https://example.com/blogs')
  // const fields = response.contents.map((content) => {
  //   return {
  //     loc: `https://example.com/${content.category.name}/${content.id}`,
  //     lastmod: content.updatedAt
  //   }
  // })

  const fields = []
  fields.push(
    {
      loc: 'https://example.com/',
      lastmod: new Date().toISOString(),
    },
    {
      loc: 'https://example.com/infrastructure',
      lastmod: new Date().toISOString(),
    },
    {
      loc: 'https://example.com/frontend',
      lastmod: new Date().toISOString(),
    },
    {
      loc: 'https://example.com/seo',
      lastmod: new Date().toISOString(),
    }
  )


  return getServerSideSitemapLegacy(ctx, fields)
}


export default function Sitemap() {}