// pages/blog/[id].js
import Link from "next/link";
import { client } from "../../libs/client";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

export default function BlogId({ blog }) {
  return (
    <div>
      <Header />
      <div className="content">
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
