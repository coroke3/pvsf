// pages/blog/[id].js
import Link from "next/link";
import { client } from "../../libs/client";
import Footer from "../../components/Footer";
import { createClient } from "microcms-js-sdk";
import Head from "next/head";

export default function BlogId({ blog }) {
  return (
    <div>
      <Head>
        <title>{blog.title} - オンライン映像イベント / PVSF</title>
        <meta name="description" content={``} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:site" content="@pvscreeningfes" />
        <meta name="twitter:creator" content="@coroke3" />
        <meta property="og:url" content="pvsf.jp" />
        <meta property="og:title" content={`${blog.title} - オンライン映像イベント / PVSF`} />
        <meta property="og:description" content="" />
        <meta
          property="og:image"
          content="https://i.gyazo.com/35170e03ec321fb94276ca1c918efabc.jpg"
        />
      </Head>
      <div className="content" key={blog}>
        <h2>{blog.title}</h2>
        <div
          dangerouslySetInnerHTML={{
            __html: `${blog.publishedAt}`,
          }}
        />
        <Footer />
      </div>
    </div>
  );
}

// 静的生成のためのパスを指定します
export const getStaticPaths = async () => {
  const data = await client.get({ endpoint: "blog" });

  const paths = data.contents.map((content) => `/blog/${content.id}`);
  return { paths, fallback: false };
};

// データをテンプレートに受け渡す部分の処理を記述します
export const getStaticProps = async (context) => {
  const id = context.params.id;
  const data = await client.get({ endpoint: "blog", contentId: id });

  return {
    props: {
      blog: data,
    },
  };
};
