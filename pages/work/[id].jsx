// pages/work/[id].jsx
import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { client } from "../../libs/client";
import styles from "../../styles/work.module.css";
import { css } from "@emotion/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTwitter } from "@fortawesome/free-brands-svg-icons";
import { faYoutube } from "@fortawesome/free-brands-svg-icons";


export default function WorkId({ work, previousWorks, nextWorks }) {
  const showComment = work.comment !== undefined && work.comment !== "";
  const showIcon = work.icon !== undefined && work.icon !== "";
  const showCreator = work.creator !== undefined && work.creator !== "";
  const showTwitter = work.tlink !== undefined && work.tlink !== "";
  const showYoutube = work.ylink !== undefined && work.ylink !== "";
  const showMenber = work.member !== undefined && work.member !== "";

  const originalDate = new Date(work.time);
  const modifiedDate = new Date(originalDate.getTime() - 9 * 60 * 60 * 1000);
  const formattedDate = modifiedDate.toLocaleString();
  const showTime = work.time !== undefined && work.time !== "";

  return (
    <div>
      <Header />
      <div className="content">
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
            <h2 className={styles.title}>{work.title}</h2>
            <div className={styles.userinfo}>
              {showIcon && (
                <img
                  src={`https://drive.google.com/uc?id=${work.icon.slice(33)}`}
                  className={styles.icon}
                  alt={`${work.title} - ${work.creater} | PVSF archive`}
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
                      <FontAwesomeIcon icon={faTwitter} />
                    </a>
                  )}
                </h3>
              )}
              {showTime && <p className={styles.time}>{formattedDate}</p>}
            </div>
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
                <div className={styles.ss1}  key={prevWork.id}>
                  <div className={styles.ss12}>
                    <Link href={`/work/${prevWork.id}`}>
                      <img
                        src={`https://i.ytimg.com/vi/${prevWork.ylink.slice(
                          17,
                          28
                        )}/maxresdefault.jpg`}
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
                <div className={styles.ss1} key={nextWork.id}>
                  <div className={styles.ss12}>
                    <Link href={`/work/${nextWork.id}`}>
                      <img
                        src={`https://i.ytimg.com/vi/${nextWork.ylink.slice(
                          17,
                          28
                        )}/maxresdefault.jpg`}
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
  const data = await client.get({
    endpoint: "work",
    queries: { offset: 0, limit: 9999 },
  });

  const paths = data.contents.map((content) => `/work/${content.id}`);
  return { paths, fallback: false };
}

export async function getStaticProps(context) {
  const id = context.params.id;
  const data = await client.get({ endpoint: "work", contentId: id });

  const allWork = await client.get({
    endpoint: "work",
    queries: { offset: 0, limit: 9999 },
  });
  const currentIndex = allWork.contents.findIndex(
    (content) => content.id === id
  );

  const previousWorks = allWork.contents.slice(
    Math.max(currentIndex - 5, 0),
    currentIndex
  );
  const nextWorks = allWork.contents.slice(currentIndex + 1, currentIndex + 6);

  return {
    props: {
      work: data,
      previousWorks,
      nextWorks,
    },
  };
}
