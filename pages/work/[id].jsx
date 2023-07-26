// pages/work/[id].jsx
import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { client } from "../../libs/client";
import styles from "../../styles/work.module.css";

export default function WorkId({ work, previousWorks, nextWorks }) {
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
            <h2>{work.title}</h2>
            <div dangerouslySetInnerHTML={{ __html: `${work.comment}` }} />
          </div>

          <div className={styles.s2f}>
            <div className={styles.navLinks}>
              {previousWorks.map((prevWork) => (
                <div className={styles.ss1}>
                  <div className={styles.ss12}>
                    <Link key={prevWork.id} href={`/work/${prevWork.id}`}>
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
                <div className={styles.ss1}>
                  <div className={styles.ss12}>
                    <Link key={nextWork.id} href={`/work/${nextWork.id}`}>
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

// 静的生成のためのパスを指定します
export async function getStaticPaths() {
  const data = await client.get({
    endpoint: "work",
    queries: { offset: 0, limit: 999 },
  });

  const paths = data.contents.map((content) => `/work/${content.id}`);
  return { paths, fallback: false };
}

// データをテンプレートに受け渡す部分の処理を記述します
export async function getStaticProps(context) {
  const id = context.params.id;
  const data = await client.get({ endpoint: "work", contentId: id });

  const allWork = await client.get({
    endpoint: "work",
    queries: { offset: 0, limit: 999 },
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
