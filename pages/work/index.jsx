import Link from "next/link";
import Image from "next/image";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import styles from "../../styles/works.module.css";
import Head from "next/head";

export default function Home({ work }) {
  // -9時間を引く関数
  const subtractNineHours = (dateString) => {
    const originalDate = new Date(dateString);
    const modifiedDate = new Date(originalDate.getTime() - 9 * 60 * 60 * 1000);
    return modifiedDate.toLocaleString();
  };

  return (
    <div>
      <Head>
        <title>過去の投稿作品 - オンライン映像イベント / PVSF archive</title>
        <meta
          name="description"
          content={`過去の投稿作品です。ぜひご覧ください。`}
        />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:site" content="@pvscreeningfes" />
        <meta name="twitter:creator" content="@coroke3" />
        <meta property="og:url" content="pvsf.jp/work" />
        <meta property="og:title" content="過去の投稿作品 - オンライン映像イベント / PVSF archive" />
        <meta property="og:description" content="過去の投稿作品です。ぜひご覧ください。" />
        <meta
          property="og:image"
          content="https://i.gyazo.com/35170e03ec321fb94276ca1c918efabc.jpg"
        />
      </Head>
      <Header />
      <div className="content">
        <div className={styles.work}>
          {work.map((work) => (
            <div className={styles.works} key={work.ylink}>
              <Link href={`../work/${work.ylink.slice(
                    17,
                    28
                  )}`}>
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
                {work.creator} | {subtractNineHours(work.time)}
              </p>
            </div>
          ))}
        </div>
        <Footer />
      </div>
    </div>
  );
}


export const getStaticProps = async () => {
  const res = await fetch(
    "https://script.google.com/macros/s/AKfycbyEph6zXb1IWFRLpTRLNLtxU4Kj7oe10bt2ifiyK09a6nM13PASsaBYFe9YpDj9OEkKTw/exec"
  );
  const work = await res.json();

  return {
    props: { work },
  };
};