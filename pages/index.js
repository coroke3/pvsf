// pages/index.js
import Link from "next/link";
import Head from "next/head";
import { client } from "../libs/client";
import { createClient } from "microcms-js-sdk";
import Footer from "../components/Footer";
import styles from "../styles/index.module.css";
import { useState, useEffect, useRef } from "react";
import curveStyles from '../styles/curve.module.css';
import aboutStyles from '../styles/about.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';

const nextDates = [
  { date: "03/29", year: "2025", day: "Sat" },
  { date: "03/30", year: "2025", day: "Sun" },
];

export default function Home({ blog, top }) {
  const [isHide, setIsHide] = useState(true);
  const [activeItems, setActiveItems] = useState(new Set());
  const aboutItemRefs = useRef([]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > (window.innerHeight * 0.75)) {
        setIsHide(false);
      } else {
        setIsHide(true);
      }

      // 各aboutitemの位置をチェックしてアニメーション状態を更新
      aboutItemRefs.current.forEach((ref, index) => {
        if (ref) {
          const rect = ref.getBoundingClientRect();
          const isVisible = rect.top < window.innerHeight * 0.8;

          setActiveItems(prev => {
            const newSet = new Set(prev);
            if (isVisible) {
              newSet.add(index);
            } else {
              newSet.delete(index);
            }
            return newSet;
          });
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
              <svg id="_レイヤー_3" data-name="レイヤー 3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 796.32 1905.69">
                <path d="M258.5,1146.44h-77c0-28.81-23.44-52.25-52.25-52.25v-77c71.27,0,129.25,57.98,129.25,129.25Z" />
                <path d="M129.25,1198.69c-28.81,0-52.25-23.44-52.25-52.25H0C0,1217.71,57.98,1275.69,129.25,1275.69c28.81,0,52.25,23.44,52.25,52.25h77c0-71.27-57.98-129.25-129.25-129.25Z" />
                <path d="M134.35,1457.18c-71.27,0-129.25-57.98-129.25-129.25H82.1c0,28.81,23.44,52.25,52.25,52.25v77Z" />
                <polygon points="501.34 920.75 455.49 1017.19 311.68 683.28 402.45 683.28 501.34 920.75" />
                <circle cx="551.85" cy="733.79" r="50.51" />
                <rect x="473.43" y="915.85" width="156.84" height="488.75" transform="translate(1712.08 608.38) rotate(90)" />
                <path d="M307.39,1905.69v-227.62c0-36.65,7.2-72.24,21.39-105.79,13.69-32.37,33.27-61.42,58.2-86.34,24.93-24.93,53.98-44.51,86.34-58.2,33.55-14.19,69.14-21.38,105.79-21.38h217.22v155.57h-217.22c-64.05,0-116.15,52.1-116.15,116.15v227.62h-155.57Z" />
                <rect y="458.51" width="175.36" height="497.73" />
                <path d="M311.78,623.55v-166c80.38,0,145.78-65.39,145.78-145.78s-65.39-145.78-145.78-145.78-145.78,65.39-145.78,145.78H0c0-42.05,8.25-82.89,24.53-121.38,15.71-37.14,38.18-70.47,66.78-99.08s61.94-51.07,99.08-66.78C228.88,8.25,269.72,0,311.78,0s82.89,8.25,121.38,24.53c37.14,15.71,70.47,38.18,99.08,66.78,28.61,28.61,51.08,61.94,66.78,99.08,16.28,38.49,24.54,79.33,24.54,121.38s-8.25,82.89-24.54,121.38c-15.71,37.14-38.18,70.47-66.78,99.08-28.61,28.61-61.94,51.07-99.08,66.78-38.49,16.28-79.33,24.53-121.38,24.53Z" />
              </svg>
            </div>

            <div className={styles.titleArea}>
              <h1>PVSF</h1>
              <p>映像連続投稿祭</p>

            </div>
          </div>

          <div className={styles.scheduleArea}>
            <p className={styles.scheduleJp}>次の開催</p>
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
            {['what\'s pvsf?', 'what\'s event?', 'what\'s join?'].map((title, index) => (
              <div
                key={index}
                ref={el => aboutItemRefs.current[index] = el}
                className={`${aboutStyles.aboutitem} ${activeItems.has(index) ? aboutStyles.active : ''}`}
              >
                <div className={aboutStyles.abouttitle}>
                  <span className={aboutStyles.abouten}>{title}</span>
                </div>
                <div className={aboutStyles.abouarrow}>

                </div>
                <div className={aboutStyles.abouttext}>
                  <div className={aboutStyles.titlebox}>
                    <h2>{title === 'what\'s pvsf?' ? 'PVSFってなに？' : title === 'what\'s event?' ? '何をやってる？' : 'どう参加する？'}</h2>
                  </div>
                  <p>
                    {title === 'what\'s pvsf?' ? 'PVSFはノンジャンルのオンライン映像イベントです。さらに映像を頑張ろうと思えるきっかけになるような機会を設けることを目的に行われています。順位付けはありません。' : title === 'what\'s event?' ? '現在は概ね年三回、映像連続投稿祭「PVSF」や、その関連企画を開催しています。' : '参加は簡単。Discordサーバーに入って作品情報を登録。あとはいつも通りYouTubeに投稿するだけ。'}
                  </p>
                </div>
                {index > 0 && index < 3 && (
                  <div className={`${curveStyles.curve} ${index === 2 ? curveStyles.secondCurve : ''}`}>
                    <svg viewBox="0 0 946.72 433.64">
                      <path
                        className={`${(index === 1 && activeItems.has(1)) || (index === 2 && activeItems.has(2))
                          ? curveStyles.activePath
                          : curveStyles.normalPath
                          }`}
                        d="M83.54,145.16c3.6,19.98,5.91,50.66-8,81-18.63,40.64-49.34,43.53-66,86-2.73,6.97-20.58,52.49,3,87,18.9,27.65,56.92,37.31,86,33,63.51-9.41,100.48-87.83,118-125,24.07-51.05,14.86-63.43,40-100,7.41-10.78,40.37-58.73,94-76,72.84-23.45,98.52,37.15,193,33,66.37-2.92,138.66-36.56,188-81,35.67-32.13,47.26-59.02,87-72,13.33-4.35,70.81-25.68,106,8,29.89,28.6,20.74,79.4,19,89-5.88,32.39-20.77,40.53-34,77-12.45,34.33-13.1,65.3-12,85"
                      />

                    </svg>
                  </div>
                )}
              </div>

            ))}
          </div>
        </section>
        {/* microCMSのtopコンテンツを表示 */}
        {top?.top && (
          <div
            className={styles.topContent}
            dangerouslySetInnerHTML={{ __html: top.top }}
          />
        )}

        {/* 運営情報のブログ記事を表示 */}
        <h2>運営情報</h2>
        <div className={styles.blogGrid}>
          {top?.blog?.map((item, index) => (
            <Link
              href={`/blog/${item.article?.id}`}
              key={index}
              className={styles.blogCard}
            >
              <div className={styles.blogImageWrapper}>
                {item.image ? (
                  <img
                    src={item.image.url}
                    alt=""
                    width={item.image.width}
                    height={item.image.height}
                    className={styles.blogImage}
                  />
                ) : (
                  <div className={styles.noImage}>No Image</div>
                )}
              </div>
              <div className={styles.blogContent}>
                <h3>{item.article?.title}</h3>
                <div className={styles.blogMeta}>
                  <FontAwesomeIcon icon={faCalendar} className={styles.calendarIcon} />
                  <time>
                    {new Date(item.article?.createdAt).toLocaleDateString('ja-JP')}
                  </time>
                </div>
              </div>
            </Link>
          ))}
        </div>


        <Footer />
      </div>
    </div>
  );
}

// getStaticPropsを修正
export async function getStaticProps() {
  try {
    const [topData, blogData] = await Promise.all([
      client.get({
        endpoint: 'top',
      }),
      client.get({
        endpoint: 'blog',
        queries: { offset: 0, limit: 999 },
      }),
    ]);

    return {
      props: {
        top: topData, // オブジェクト形式のデータ
        blog: blogData.contents,
      },
      revalidate: 60,
    };
  } catch (error) {
    console.error('Data fetching error:', error);
    return {
      props: {
        top: {}, // エラー時は空オブジェクト
        blog: [],
      },
      revalidate: 60,
    };
  }
}
