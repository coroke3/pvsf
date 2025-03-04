import Link from "next/link";
import Head from "next/head";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import styles from "../../styles/releases.module.css";
import { css } from "@emotion/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXTwitter } from "@fortawesome/free-brands-svg-icons";
import { faYoutube } from "@fortawesome/free-brands-svg-icons";

export const getStaticProps = async (context) => {
  const res = await fetch(
    "https://script.google.com/macros/s/AKfycbyoJtRhCw1DLnHOcbGkSd2_gXy6Zvdj-nYZbIM17sOL82BdIETte0d-hDRP7qnYyDPpAQ/exec"
  );
  const res2 = await fetch(
    "https://script.google.com/macros/s/AKfycbyoJtRhCw1DLnHOcbGkSd2_gXy6Zvdj-nYZbIM17sOL82BdIETte0d-hDRP7qnYyDPpAQ/exec"
  );
  const releases = await res.json();
  const works = await res2.json();

  const timestamp = context.params.id;
  const release = releases.find(
    (release) => release.timestamp.toString() === timestamp
  );

  return {
    props: { release, works },
  };
};

export const getStaticPaths = async () => {
  const res = await fetch(
    "https://script.google.com/macros/s/AKfycbyoJtRhCw1DLnHOcbGkSd2_gXy6Zvdj-nYZbIM17sOL82BdIETte0d-hDRP7qnYyDPpAQ/exec"
  );
  const releases = await res.json();
  const paths = releases.map((release) => ({
    params: { id: release.timestamp.toString() },
  }));

  return {
    paths,
    fallback: false,
  };
};

export default function Releases({ release, works }) {
  const showComment = release.comment !== undefined && release.comment !== "";
  const showIcon = release.icon !== undefined && release.icon !== "";
  const showCreator = release.creator !== undefined && release.creator !== "";
  const showTwitter = release.tlink !== undefined && release.tlink !== "";
  const showYoutube = release.ylink !== undefined && release.ylink !== "";
  const showYoutubeCH = release.ychlink !== undefined && release.ychlink !== "";
  const showMember = release.member !== undefined && release.member !== "";
  const showMusic =
    release.music !== undefined &&
    release.music !== "" &&
    release.credit !== undefined &&
    release.credit !== "";

  return (
    <div>
      <Head>
        <title>
          {release.title} - {release.creator} | オンライン映像イベント / PVSF
        </title>
        <meta
          name="description"
          content={`PVSF 出展作品  ${release.title} - ${release.creator}  music:${release.music} - ${release.credit}`}
        />

        <meta name="twitter:site" content="@pvscreeningfes" />
        <meta name="twitter:creator" content="@coroke3" />
        <meta property="og:url" content="pvsf.jp" />
        <meta
          property="og:title"
          content={`${release.title} - ${release.creator} | オンライン映像イベント / PVSF archive`}
        />
        {showYoutube ? (
          <meta
            property="og:image"
            content={`https://i.ytimg.com/vi/${release.ylink.slice(
              17,
              28
            )}/maxresdefault.jpg`}
          />
        ) : (
          <meta
            property="og:image"
            content="https://i.gyazo.com/35170e03ec321fb94276ca1c918efabc.jpg"
          />
        )}
        {showYoutube ? (
          <meta name="twitter:card" content="summary_large_image" />
        ) : (
          <meta name="twitter:card" content="summary" />
        )}
        <meta
          property="og:description"
          content={`PVSF 出展作品  ${release.title} - ${release.creator}  music:${release.music} - ${release.credit}`}
        />

        <link
          rel="icon"
          type="image/png"
          href="https://i.gyazo.com/43e91f32a8de88634732538ebc68f6e0.png"
          sizes="260x260"
        />
      </Head>
      <div className={styles.contentr}>
        <div className={styles.bf}>
          <div className={styles.s3f}>
            {works.map((work) => {
              const showIcon2 = work.icon !== undefined && work.icon !== "";
              return (
                <Link href={`../release/${work.timestamp}`} key={work.id}>
                  <div className={styles.works}>
                    {showIcon2 && (
                      <img
                        src={`https://lh3.googleusercontent.com/d/${work.icon.slice(
                          33
                        )}`}
                        className={styles.icon}
                        alt={`${work.creator} | PVSF archive`}
                      />
                    )}
                    <div className={styles.w1}>{work.creator}</div>
                    <div className={styles.w2}>{work.title}</div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className={styles.s1f}>
            {showYoutube ? (
              <iframe
                src={`https://www.youtube.com/embed/${release.ylink.slice(
                  17,
                  28
                )}?autoplay=1?list=PLhxvXoQxAfWJu5MXy1QxLuv_RHf_lDsFV`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className={styles.yf}
              ></iframe>
            ) : (
              <img
                src="https://i.gyazo.com/9f4ec61924577737d1ea2e4af33b2eae.png"
                className={styles.yf}
              />
            )}
            <h2 className={styles.title}>{release.title}</h2>
            <div className={styles.userinfo}>
              {showIcon && (
                <img
                  src={`https://lh3.googleusercontent.com/d/${release.icon.slice(
                    33
                  )}`}
                  className={styles.icon}
                  alt={`${release.creator} アイコン`}
                />
              )}
              {showCreator && (
                <h3 className={styles.creator}>
                  {release.creator}
                  {showYoutubeCH && (
                    <a
                      href={`${release.ychlink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FontAwesomeIcon icon={faYoutube} />
                    </a>
                  )}
                  {showTwitter && (
                    <a
                      href={`https://twitter.com/${release.tlink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FontAwesomeIcon icon={faXTwitter} />
                    </a>
                  )}
                </h3>
              )}
              <p className={styles.time}>
                {release.data} {release.time}
                {" 公開予定"}
                {/* 修正: release.data を release.date に変更 */}
              </p>
            </div>
            <p>
              {release.type1}
              {"出展  "}
              {release.type2}の部
            </p>
            {showMusic && (
              <p>
                <div
                  dangerouslySetInnerHTML={{
                    __html: `楽曲:${release.music} - ${release.credit}<br> `,
                  }}
                />
              </p>
            )}
            {showComment && (
              <p>
                <div
                  dangerouslySetInnerHTML={{ __html: `${release.comment}` }}
                />
              </p>
            )}
            {showMember && (
              <p>
                参加メンバー
                <div
                  dangerouslySetInnerHTML={{ __html: `${release.member}` }}
                />
              </p>
            )}
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}
