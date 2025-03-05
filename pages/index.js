// pages/index.js
import Link from "next/link";
import Head from "next/head";
import { client } from "../libs/client";
import { createClient } from "microcms-js-sdk";
import Footer from "../components/Footer";
import styles from "../styles/index.module.css";
import { useState, useEffect } from "react";

const nextDates = [
  { date: "03/29", year: "2025", day: "Sat" },
  { date: "03/30", year: "2025", day: "Sun" },
];

export default function Home({ blog }) {
  const [isHide, setIsHide] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > window.innerHeight) {
        setIsHide(false);
      } else {
        setIsHide(true);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

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
      <section className={styles.hero}>
        <div className={styles.heroFrame}>
          <div className={styles.heroHeader}>
            <div className={styles.logo}>
            <svg
                viewBox="0 0 803.48 1905.69"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g>
                  <rect
                    x="7.16"
                    y="458.51"
                    width="175.36"
                    height="497.73"
                  ></rect>
                  <path
                    className="cls-1"
                    d="m83,311.78c0-126.35,102.43-228.78,228.78-228.78s228.78,102.43,228.78,228.78-102.43,228.78-228.78,228.78"
                  ></path>
                </g>
                <g>
                  <rect
                    x="480.6"
                    y="915.85"
                    width="156.84"
                    height="488.75"
                    transform="translate(1719.25 601.21) rotate(90)"
                  ></rect>
                  <path d="m314.55,1905.69v-227.62c0-36.65,7.2-72.24,21.39-105.79,13.69-32.37,33.27-61.42,58.2-86.34,24.93-24.93,53.98-44.51,86.34-58.2,33.55-14.19,69.14-21.38,105.79-21.38h217.22v155.57h-217.22c-64.05,0-116.15,52.1-116.15,116.15v227.62h-155.57Z"></path>
                </g>
                <g>
                  <polygon points="508.5 920.75 462.65 1017.19 318.84 683.28 409.61 683.28 508.5 920.75"></polygon>
                  <circle cx="559.02" cy="733.79" r="50.51"></circle>
                </g>
                <g>
                  <path d="m265.66,1146.44h-77c0-28.81-23.44-52.25-52.25-52.25v-77c71.27,0,129.25,57.98,129.25,129.25Z"></path>
                  <path d="m136.41,1198.69c-28.81,0-52.25-23.44-52.25-52.25H7.16c0,71.27,57.98,129.25,129.25,129.25,28.81,0,52.25,23.44,52.25,52.25h77c0-71.27-57.98-129.25-129.25-129.25Z"></path>
                  <path d="m141.51,1457.18c-71.27,0-129.25-57.98-129.25-129.25h77c0,28.81,23.44,52.25,52.25,52.25v77Z"></path>
                </g>
              </svg>
            </div>

            <div className={styles.titleArea}>
              <h1>PVSF</h1>
              <p>映像連続投稿祭</p>
              
            </div>
          </div>

          <div className={styles.scheduleArea}>
          <span className={styles.scheduleJp}>次の開催</span>
            <h2>
              Next Schedule
            </h2>
            <div className={styles.dates}>
              {nextDates.map(({ date, year, day }, index) => (
                <div key={index} className={styles.dateRow}>
                  
                  <div className={styles.dateGroup}>
                    <div className={styles.dateNumber}><div className={styles.year}>{year}</div><div className={styles.day}>{day}</div>{date} </div>
                   
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <div className={`content ${isHide ? "Hide" : ""}`}>
        <section id="about" className={styles.content}>
          <div className={styles.aboutcontainer}>
            <div className={styles.aboutitem}>
              <div className={styles.abouttitle}>
                <span className={styles.abouten}>what&#39;s pvsf?</span>
                <div className={styles.titlebox}>
                  <h2>PVSFってなに？</h2>
                </div>
              </div>
              <div className={styles.abouarrow}></div>
              <div className={styles.abouttext}>
                <p>
                  PVSFはノンジャンルのオンライン映像イベントです。さらに映像を頑張ろうと思えるきっかけになるような機会を設けることを目的に行われています。順位付けはありません。
                </p>
              </div>
            </div>

            <div className={styles.aboutitem}>
              <div className={styles.abouttitle}>
                <span className={styles.abouten}>what&#39;s event?</span>
                <div className={styles.titlebox}>
                  <h2>何をやってる？</h2>
                </div>
              </div>
              <div className={styles.abouarrow}></div>
              <div className={styles.abouttext}>
                <p>
                  現在は概ね年三回、映像連続投稿祭「PVSF」や、その関連企画を開催しています。
                </p>
              </div>
            </div>

            <div className={styles.aboutitem}>
              <div className={styles.abouttitle}>
                <span className={styles.abouten}>what&#39;s join?</span>
                <div className={styles.titlebox}>
                  <h2>どう参加する？</h2>
                </div>
              </div>
              <div className={styles.abouarrow}></div>
              <div className={styles.abouttext}>
                <p>
                  参加は簡単。Discordサーバーに入って作品情報を登録。あとはいつも通りYouTubeに投稿するだけ。
                </p>
              </div>
            </div>
          </div>
        </section>
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
