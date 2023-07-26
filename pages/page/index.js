// pages/index.js
import Link from "next/link";
import { client } from "../../libs/client";

import Header from "../../components/Header";
import Footer from "../../components/Footer";

export default function Home({ page }) {
  return (
    <div>
        <Header />
        <div className="content">
          <ul>
            {page.map((page) => (
              <li key={page.id}>
                <Link href={`/page/${page.id}`}>{page.title}</Link>
              </li>
            ))}
          </ul>

          <Footer />
        </div>
      </div>
  );
}

// データをテンプレートに受け渡す部分の処理を記述します
export const getStaticProps = async () => {
  const data = await client.get({ endpoint: "page" });

  return {
    props: {
      page: data.contents,
    },
  };
};
