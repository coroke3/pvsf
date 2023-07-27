// pages/blog/[id].js
import Link from "next/link";
import { client } from "../../libs/client";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { createClient } from 'microcms-js-sdk';


export default function PageId({ page }) {
  return (
    <div>
      <Header />
      <div className="content">
        <h2>{page.title}</h2>
        {page.published.map((published, rich) => (
          <div
            key={rich}
            dangerouslySetInnerHTML={{ __html: published.rich }}
          />
        ))}
        {page.published.map((published, html) => (
          <div
            key={html}
            dangerouslySetInnerHTML={{ __html: published.html }}
          />
        ))}
        <Footer />
      </div>
    </div>
  );
}

// 静的生成のためのパスを指定します
export const getStaticPaths = async () => {
  const data = await client.get({ endpoint: "page" });

  const paths = data.contents.map((content) => `/page/${content.id}`);
  return { paths, fallback: false };
};

// データをテンプレートに受け渡す部分の処理を記述します
export const getStaticProps = async (context) => {
  const id = context.params.id;
  const data = await client.get({ endpoint: "page", contentId: id });

  return {
    props: {
      page: data,
    },
  };
};
