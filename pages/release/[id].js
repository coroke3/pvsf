import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import styles from "../../styles/releases.module.css";
import { css } from "@emotion/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTwitter } from "@fortawesome/free-brands-svg-icons";
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
  const showMember = release.member !== undefined && release.member !== "";
  return (
    <div>
      <Header />
      <div className="content">
        <div className={styles.s3f}>
          {works.map((work) => {
            // 修正: works.works ではなく works を直接マップする
            return <div className={styles.works} key={work.id}>
              {work.title}
            </div>; // 修正: work.id を使用する
          })}
        </div>
        <div className={styles.s1f}>
          {showYoutube ? (
            <iframe
              src={`https://www.youtube.com/embed/${release.ylink.slice(
                17,
                28
              )}?autoplay=1`}
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
                src={`https://drive.google.com/uc?id=${release.icon.slice(33)}`}
                className={styles.icon}
                alt={`${release.title} - ${release.creator} | PVSF archive`} // 修正: release.creater を release.creator に変更
              />
            )}
            {showCreator && (
              <h3 className={styles.creator}>
                {release.creator}
                {showYoutube && (
                  <a
                    href={`${release.ylink}`}
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
                    <FontAwesomeIcon icon={faTwitter} />
                  </a>
                )}
              </h3>
            )}
            <p className={styles.time}>
              {release.date} {release.time}{" "}
              {/* 修正: release.data を release.date に変更 */}
            </p>
          </div>
          {showComment && (
            <p>
              <div dangerouslySetInnerHTML={{ __html: `${release.comment}` }} />
            </p>
          )}
          {showMember && (
            <p>
              <div dangerouslySetInnerHTML={{ __html: `${release.member}` }} />
            </p>
          )}
        </div>
        <Footer />
      </div>
    </div>
  );
}
