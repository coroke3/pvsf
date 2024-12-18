// pages/index.js
import Link from "next/link";
import Head from "next/head";
import { client } from "../libs/client";
import { createClient } from "microcms-js-sdk";
import Header from "../components/Header";
import Footer from "../components/Footer";
import styles from "../styles/index.module.css";

export default function Home({ blog }) {
  return (
    <div>
      <Head>
        <title>オンライン映像イベント / PVSF</title>
        <meta
          name="description"
          content={`PVSFはノンジャンルのオンライン映像イベント`}
        />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:site" content="@pvscreeningfes" />
        <meta name="twitter:creator" content="@coroke3" />
        <meta property="og:url" content="http://pvsf.jp/" />
        <meta property="og:title" content="オンライン映像イベント / PVSF" />
        <meta
          property="og:description"
          content="PVSFはノンジャンルのオンライン映像イベント"
        />
        <meta
          property="og:image"
          content="https://i.gyazo.com/35170e03ec321fb94276ca1c918efabc.jpg"
        />
      </Head>
      <div className={styles.videobg}>
        <iframe
          src="https://www.youtube.com/embed/5ZhHfVIUS98?autoplay=1&vq=highres&start=0&mute=1&showinfo=1&playsinline=1&loop=1&controls=0&playlist=5ZhHfVIUS98&disablekb=1"
          frameborder="0"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>
      <Header />
      <div className="content">
        <div className={styles.itopm}>
          <div className={styles.topms1}>
            <h2>
              <span>PVSFってなに？</span>
            </h2>
            <h3>Whats pvsf?</h3>
          </div>
          <div className={`${styles.topms2} ${styles.topml}`}>
            <p>
              PVSFは
              <wbr />
              ノンジャンルの
              <wbr />
              オンライン映像イベントです。
              <wbr />
              さらに映像を頑張ろうと
              <wbr />
              思えるきっかけになるような
              <wbr />
              機会を設けることを
              <wbr />
              目的に
              <wbr />
              行われています。
              <wbr />
              順位付けは
              <wbr />
              ありません。
            </p>
          </div>
        </div>
        <div className={`${styles.itopm} ${styles.topml2}`}>
          <div className={`${styles.topms1} ${styles.topml}`}>
            <h2>
              <span>どんな企画をやってるの？</span>
            </h2>
            <h3>Whats Event?</h3>
          </div>
          <div className={styles.topms2}>
            <p>
              現在は
              <wbr />
              概ね年三回、
              <wbr />
              映像連続投稿祭 「PVSF」や、
              <wbr />
              その関連企画を
              <wbr />
              開催しています。
            </p>
          </div>
        </div>
        <div className={styles.itopm}>
          <div className={styles.topms1}>
            <h2>
              <span>どうやって参加するの？</span>
            </h2>
            <h3>Whats join?</h3>
          </div>
          <div className={`${styles.topms2} ${styles.topml}`}>
            <p>
              参加は簡単。
              <wbr />
              Discordサーバーに入って
              <wbr />
              作品情報を登録。
              <wbr />
              あとは
              <wbr />
              いつも通り
              <wbr />
              YouTubeに
              <wbr />
              投稿するだけ
            </p>
          </div>
        </div>
        <h2>次回にご期待ください</h2>
        <p>
          次回は3月下旬の開催です。再出発。新しくなったPVSFにご期待ください。
        </p>
        <p></p>

        <h2>運営募集中</h2>
        <p>
          告知画像やオープニングエンディングを作成するデザイナー、映像クリエイター、企画事務や改善を担う事務方やアドバイザー等を募集しています。ぜひご応募ください。
          <br />
          <Link href="https://forms.gle/YJCwWxDC5Mi3CkRp9">募集フォーム</Link>
        </p>
        <p></p>

        <h2>運営情報</h2>
        <ul>
          {blog.map((blog) => (
            <li key={blog.id}>
              <Link href={`/blog/${blog.id}`}>{blog.title}</Link>
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
  const data = await client.get({
    endpoint: "blog",
    queries: { offset: 0, limit: 999 },
  });

  return {
    props: {
      blog: data.contents,
    },
  };
};
