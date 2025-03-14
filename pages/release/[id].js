import Link from "next/link";
import Head from "next/head";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import styles from "../../styles/releases.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXTwitter, faYoutube, faUser } from "@fortawesome/free-brands-svg-icons";

export const getStaticProps = async (context) => {
  const res = await fetch(
    "https://script.google.com/macros/s/AKfycbyoJtRhCw1DLnHOcbGkSd2_gXy6Zvdj-nYZbIM17sOL82BdIETte0d-hDRP7qnYyDPpAQ/exec"
  );
  const releases = await res.json();

  const resUsers = await fetch("https://pvsf-cash.vercel.app/api/users");
  const users = await resUsers.json();

  const timestamp = context.params.id;
  const release = releases.find(
    (release) => release.timestamp.toString() === timestamp
  );

  return {
    props: { release, users },
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

export default function Releases({ release, users }) {
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

  // メンバー情報の処理
  const memberInfo = release.member
    ? release.member.split(/[,、，]/).map((username, index) => {
        const memberId = release.memberid
          ?.split(/[,、，]/)
          ?.[index]
          ?.trim() || '';
        const matchedUser = users.find(
          (user) => user.username.toLowerCase() === memberId.toLowerCase()
        );
        return { username, memberId, matchedUser };
      })
    : [];

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
      <div className={`content ${styles.contentr}`}>
        <div className={styles.bf}>
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
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Name</th>
                    <th>ID</th>
                    <th>LINK</th>
                  </tr>
                </thead>
                <tbody>
                  {memberInfo.map(({ username, memberId, matchedUser }, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{username.trim()}</td>
                      <td className={styles.userlink}>
                        {matchedUser ? (
                          <>
                            <a href={`https://event-archive.vercel.app/user/${matchedUser.username}`} target="_blank" rel="noopener noreferrer" className={styles.userLink}>
                              <FontAwesomeIcon icon={faUser} />
                            </a>
                            <div className={styles.userlis}>
                              <a href={`https://event-archive.vercel.app/user/${matchedUser.username}`} target="_blank" rel="noopener noreferrer" className={styles.userLink}>
                                /{matchedUser.username}
                              </a>
                            </div>
                          </>
                        ) : memberId ? (
                          <div className={styles.userlis}>@{memberId}</div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        {memberId ? (
                          <a href={`https://twitter.com/${memberId}`} target="_blank" rel="noopener noreferrer">
                            <FontAwesomeIcon icon={faXTwitter} className={styles.twitterIcon} />
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}
