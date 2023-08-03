import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import styles from "../../styles/release.module.css";
import { css } from "@emotion/react";
import Head from "next/head";

export const getStaticProps = async () => {
  const res = await fetch(
    "https://script.google.com/macros/s/AKfycbyoJtRhCw1DLnHOcbGkSd2_gXy6Zvdj-nYZbIM17sOL82BdIETte0d-hDRP7qnYyDPpAQ/exec"
  );
  const release = await res.json();

  return {
    props: { release },
  };
};

export default function Releases(data) {
  return (
    <div>
      <Head>
        <title>投稿予定のご案内 - オンライン映像イベント / PVSF</title>
        <meta
          name="description"
          content={`PVSFにて投稿予定の作品です。ぜひご覧ください。`}
        />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:site" content="@pvscreeningfes" />
        <meta name="twitter:creator" content="@coroke3" />
        <meta property="og:url" content="pvsf.jp" />
        <meta
          property="og:title"
          content="投稿予定のご案内 - オンライン映像イベント / PVSF"
        />
        <meta
          property="og:description"
          content="PVSFにて投稿予定の作品です。ぜひご覧ください。"
        />
        <meta
          property="og:image"
          content="https://i.gyazo.com/35170e03ec321fb94276ca1c918efabc.jpg"
        />
      </Head>
      <Header />
      <div className="content">
        <div className={styles.table}>
          {data.release.map((release) => {
            const showYlink =
              release.ylink !== undefined && release.ylink !== "";
            return (
              <div className={styles.tab} key={release.id}>
                {showYlink ? (
                  <div
                    className={styles.releases1}
                    style={{
                      backgroundImage: `url(https://i.ytimg.com/vi/${release.ylink.slice(
                        17,
                        28
                      )}/maxresdefault.jpg)`,
                    }}
                  >
                    <div className={styles.releases2}>
                      <div
                        className={styles.r1}
                        id="generated-id-1690476115475-vx3fsggdf"
                      >
                        {release.time}
                      </div>
                      <div
                        className={styles.r2}
                        id="generated-id-1690476115475-us5y3bfp6"
                      >
                        {release.type2}
                      </div>
                      <div className={styles.r3}>
                        <a
                          href={`https://twitter.com/${release.tlink}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <div
                            className={styles.r31}
                            style={{
                              backgroundImage: `url(https://drive.google.com/uc?id=${release.icon.slice(
                                33
                              )})`,
                            }}
                          >
                            <img src="https://i.gyazo.com/dc3cc7d76ef8ce02789baf16df939178.png" />
                          </div>
                        </a>
                      </div>
                      <div
                        className={styles.r4}
                        id="generated-id-1690476115475-e07u3mmo7"
                      >
                        {release.creator}
                      </div>
                      <div
                        className={styles.r5}
                        id="generated-id-1690476115475-bu15q8iql"
                      >
                        {release.title}
                      </div>
                      <div
                        className={styles.r6}
                        id="generated-id-1690476115475-gw648oy86"
                      >
                        {release.comment}
                      </div>
                      <div className={styles.r7}>
                        <div className={styles.r71}>
                          {" "}
                          <a
                            href={`https://youtu.be/${release.ylink.slice(
                              17,
                              28
                            )}?list=PLhxvXoQxAfWJu5MXy1QxLuv_RHf_lDsFV`}
                            target="_blank"
                            rel="noopener noreferrer"
                            id="generated-id-1690507402817-hylf4ea9j"
                          >
                            {" "}
                            YouTubeで視聴する
                          </a>
                        </div>
                        <div className={styles.r72}>
                          <Link href={`release/${release.timestamp}`}>
                            詳細を見る
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.releases1}>
                    <div className={styles.releases2}>
                      <div
                        className={styles.r1}
                        id="generated-id-1690476115475-vx3fsggdf"
                      >
                        {release.time}
                      </div>
                      <div
                        className={styles.r2}
                        id="generated-id-1690476115475-us5y3bfp6"
                      >
                        {release.type2}
                      </div>
                      <div className={styles.r3}>
                        <a
                          href={`https://twitter.com/${release.tlink}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <div
                            className={styles.r31}
                            style={{
                              backgroundImage: `url(https://drive.google.com/uc?id=${release.icon.slice(
                                33
                              )})`,
                            }}
                          >
                            <img src="https://i.gyazo.com/dc3cc7d76ef8ce02789baf16df939178.png" />
                          </div>
                        </a>
                      </div>
                      <div
                        className={styles.r4}
                        id="generated-id-1690476115475-e07u3mmo7"
                      >
                        {release.creator}
                      </div>
                      <div
                        className={styles.r5}
                        id="generated-id-1690476115475-bu15q8iql"
                      >
                        {release.title}
                      </div>
                      <div
                        className={styles.r6}
                        id="generated-id-1690476115475-gw648oy86"
                      >
                        {release.comment}
                      </div>
                      <div className={styles.r7}>
                        <div className={styles.r72}>
                          <Link href={`release/${release.timestamp}`}>
                            詳細を見る
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <Footer />
      </div>
    </div>
  );
}
