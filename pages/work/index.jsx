// pages/index.js
import Link from "next/link";
import { client } from "../../libs/client";

import Header from "../../components/Header";
import Footer from "../../components/Footer";
import styles from "../../styles/works.module.css";

export default function Home({ work }) {
  return (
    <div>
      <Header />
      <div className="content">
        <div className={styles.work}>
          {work.map((work) => (
            <div className={styles.works} key={work.id}>
              <Link href={`../work/${work.id}`}>
                <img
                  src={`https://i.ytimg.com/vi/${work.ylink.slice(
                    17,
                    28
                  )}/maxresdefault.jpg`}
                  width={`100%`}
                  alt={`${work.title} - ${work.creator} | PVSF archive`}
                />
              </Link>
              <h3>{work.title}</h3>
              <p>
                {work.creator} | {new Date(work.time).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
        <Footer />
      </div>
     
    </div>
  );
}

// データをテンプレートに受け渡す部分の処理を記述します
export const getStaticProps = async () => {
  const data = await client.get({
    endpoint: "work",
    queries: { offset: 0, limit: 120 },
  });

  return {
    props: {
      work: data.contents,
    },
  };
};
