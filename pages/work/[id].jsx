// pages/work/[id].jsx
import Link from "next/link";
import Head from "next/head";
import Footer from "../../components/Footer";
import styles from "../../styles/work.module.css";
import { css } from "@emotion/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXTwitter } from "@fortawesome/free-brands-svg-icons";
import { faYoutube } from "@fortawesome/free-brands-svg-icons";

export default function WorkId({ work, previousWorks, nextWorks }) {
  const showComment = work.comment !== undefined && work.comment !== "";
  const showIcon = work.icon !== undefined && work.icon !== "";
  const showCreator = work.creator !== undefined && work.creator !== "";
  const showTwitter = work.tlink !== undefined && work.tlink !== "";
  const showYoutube = work.ylink !== undefined && work.ylink !== "";
  const showMenber = work.member !== undefined && work.member !== "";
  const showMusic = work.music !== undefined && work.music !== ""  && work.credit !== undefined && work.credit !== "";
  const originalDate = new Date(work.time);
  const modifiedDate = new Date(originalDate.getTime() - 9 * 60 * 60 * 1000);
  const formattedDate = modifiedDate.toLocaleString();
  const showTime = work.time !== undefined && work.time !== "";

  return (
    <div>
      <Head>
        <title>
          {work.title} - {work.creator} - オンライン映像イベント / PVSF archive
        </title>
        <meta
          name="description"
          content={`PVSFへの出展作品です。  ${work.title} - ${work.creator}`}
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@pvscreeningfes" />
        <meta name="twitter:creator" content="@coroke3" />
        <meta property="og:url" content="pvsf.jp" />
        <meta
          property="og:title"
          content={`${work.title} - ${work.creator} / PVSF archive`}
        />
        <meta
          property="og:description"
          content={`PVSF 出展作品  ${work.title} - ${work.creator}  music:${work.music} - ${work.credit}`}
        />
        <meta
          property="og:image"
          content={`https://i.ytimg.com/vi/${work.ylink.slice(
            17,
            28
          )}/maxresdefault.jpg`}
        />
      </Head>
      <div className={styles.contentr}>
        <div className={styles.bf}>
          <div className={styles.s1f}>
            <iframe
              src={`https://www.youtube.com/embed/${work.ylink.slice(
                17,
                28
              )}?autoplay=1`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className={styles.yf}
            ></iframe>
            <h1 className={styles.title}>{work.title}</h1>
            <div className={styles.userinfo}>
              {showIcon && (
                <img
                  src={`https://lh3.googleusercontent.com/d/${work.icon.slice(33)}`}
                  className={styles.icon}
                  alt={`${work.creator} アイコン`}
                />
              )}
              {showCreator && (
                <h3 className={styles.creator}>
                  {work.creator}
                  {showYoutube && (
                    <a
                      href={`${work.ylink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FontAwesomeIcon icon={faYoutube} />
                    </a>
                  )}
                  {showTwitter && (
                    <a
                      href={`https://twitter.com/${work.tlink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FontAwesomeIcon icon={faXTwitter} />
                    </a>
                  )}
                </h3>
              )}
              {showTime && <p className={styles.time}>{formattedDate}</p>}
            </div>
            {showMusic && (
              <p>
                <div
                  dangerouslySetInnerHTML={{
                    __html: `楽曲:${work.music} - ${work.credit}<br> `,
                  }}
                />
              </p>
            )}
            {showComment && (
              <p>
                <div dangerouslySetInnerHTML={{ __html: `${work.comment}` }} />
              </p>
            )}
            {showMenber && (
              <p>
                <div dangerouslySetInnerHTML={{ __html: `${work.member}` }} />
              </p>
            )}
          </div>
          <div className={styles.s2f}>
            <div className={styles.navLinks}>
              {previousWorks.map((prevWork) => (
                <div className={styles.ss1} key={prevWork.ylink.slice(
                  17,
                  28
                )}>
                  <div className={styles.ss12}>
                    <Link href={`/work/${prevWork.ylink.slice(
                          17,
                          28
                        )}`}>
                      <img
                        src={`https://i.ytimg.com/vi/${prevWork.ylink.slice(
                          17,
                          28
                        )}/mqdefault.jpg`}
                        width={`100%`}
                        alt={`${prevWork.title} - ${prevWork.creater} | PVSF archive`}
                      />
                    </Link>
                  </div>
                  <div className={styles.ss13}>
                    <p className={styles.scc}>{prevWork.title}</p>
                    <p className={styles.sc}>{prevWork.creator}</p>
                  </div>
                </div>
              ))}
              {nextWorks.map((nextWork) => (
                <div className={styles.ss1} key={nextWork.ylink.slice(
                  17,
                  28
                )}>
                  <div className={styles.ss12}>
                    <Link href={`/work/${nextWork.ylink.slice(
                          17,
                          28
                        )}`}>
                      <img
                        src={`https://i.ytimg.com/vi/${nextWork.ylink.slice(
                          17,
                          28
                        )}/mqdefault.jpg`}
                        width={`100%`}
                        alt={`${nextWork.title} - ${nextWork.creater} | PVSF archive`}
                      />
                    </Link>
                  </div>
                  <div className={styles.ss13}>
                    <p className={styles.scc}>{nextWork.title}</p>
                    <p className={styles.sc}>{nextWork.creator}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}


export async function getStaticPaths() {
  const res = await fetch(
    "https://script.google.com/macros/s/AKfycbyEph6zXb1IWFRLpTRLNLtxU4Kj7oe10bt2ifiyK09a6nM13PASsaBYFe9YpDj9OEkKTw/exec"  // JSON ファイルのURLを指定
  );
  const data = await res.json();

  const paths = data.map((content) => `/work/${content.ylink.slice(17, 28)}`);
  
  return { paths, fallback: false };
}

export async function getStaticProps(context) {
  const id = context.params.id;

  const res = await fetch(
    "https://script.google.com/macros/s/AKfycbyEph6zXb1IWFRLpTRLNLtxU4Kj7oe10bt2ifiyK09a6nM13PASsaBYFe9YpDj9OEkKTw/exec"  // JSON ファイルのURLを指定
  );
  const allWork = await res.json();

  const currentIndex = allWork.findIndex(
    (content) => content.ylink.slice(17, 28).toString() === id
  );
  const previousWorks = allWork.slice(
    Math.max(currentIndex - 5, 0),
    currentIndex
  );
  const nextWorks = allWork.slice(currentIndex + 1, currentIndex + 6);

  return {
    props: {
      work: allWork.find(content => content.ylink.slice(17, 28) === id),
      previousWorks,
      nextWorks,
    },
  };
}