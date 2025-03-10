import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import styles from "../../styles/release.module.css";
import { css } from "@emotion/react";
import Head from "next/head";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faImage, faUser } from "@fortawesome/free-solid-svg-icons";

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
  const [viewMode, setViewMode] = useState('list'); // 'list', 'card', 'members'

  // 日付でグループ化する関数
  const groupByDate = (releases) => {
    return releases.reduce((groups, release) => {
      const date = release.data;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(release);
      return groups;
    }, {});
  };

  // リリースを日付でグループ化
  const groupedReleases = groupByDate(data.release);

  const ViewToggle = () => (
    <div className={styles.viewToggle}>
      <button 
        onClick={() => setViewMode('list')}
        className={`${styles.toggleButton} ${viewMode === 'list' ? styles.active : ''}`}
      >
        <FontAwesomeIcon icon={faBars} />
      </button>
      <button 
        onClick={() => setViewMode('card')}
        className={`${styles.toggleButton} ${viewMode === 'card' ? styles.active : ''}`}
      >
        <FontAwesomeIcon icon={faImage} />
      </button>
      <button 
        onClick={() => setViewMode('members')}
        className={`${styles.toggleButton} ${viewMode === 'members' ? styles.active : ''}`}
      >
        <FontAwesomeIcon icon={faUser} />
      </button>
    </div>
  );

  // 参加者一覧モードのコンポーネント
  const MembersView = ({ releases }) => {
    // 個人参加者と複数人参加者を分類
    const individuals = releases.filter(r => r.type1 === "個人");
    const groups = releases.filter(r => r.type1 === "複数人");

    return (
      <div className={styles.membersView}>
        <div className={styles.membersSection}>
          <h3>個人参加</h3>
          <div className={styles.membersList}>
            {individuals.map(release => (
              <div key={release.id} className={styles.memberCard}>
                <img 
                  src={`https://lh3.googleusercontent.com/d/${release.icon.slice(33)}`}
                  alt={release.creator}
                  className={styles.memberIcon}
                />
                <div className={styles.memberInfo}>
                  <div className={styles.memberName}>{release.creator}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.membersSection}>
          <h3>グループ参加</h3>
          <div className={styles.membersList}>
            {groups.map(release => {
              const members = release.member ? release.member.split(',') : [];
              const memberIds = release.memberid ? release.memberid.split(',') : [];

              return (
                <div key={release.id} className={styles.groupCard}>
                  <img 
                    src={`https://lh3.googleusercontent.com/d/${release.icon.slice(33)}`}
                    alt={release.creator}
                    className={styles.groupIcon}
                  />
                  <div className={styles.groupInfo}>
                    <div className={styles.groupName}>{release.creator}</div>
                    <div className={styles.groupMembers}>
                      {members.map((member, index) => {
                        const memberId = memberIds[index] ? memberIds[index].trim() : null;
                        return memberId ? (
                          <a 
                            key={index}
                            href={`https://x.com/${memberId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {member.trim()}
                          </a>
                        ) : (
                          <span key={index}>{member.trim()}</span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

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
      <div className="content">
        <ViewToggle />
        {viewMode === 'members' ? (
          <MembersView releases={data.release} />
        ) : (
          <div className={`${styles.table} ${viewMode === 'list' ? styles.listView : ''}`}>
            {Object.entries(groupedReleases).map(([date, releases]) => (
              <div key={date} className={styles.dateGroup}>
                {viewMode === 'list' && (
                  <div className={styles.dateHeader}>
                    {date}
                  </div>
                )}
                {releases.map((release) => {
                  const showYlink =
                    release.ylink !== undefined && release.ylink !== "";
                  const iconUrl = `https://lh3.googleusercontent.com/d/${release.icon.slice(33)}`;

                  // メンバー情報の取得
                  const members = release.member ? release.member.split(',') : []; // カンマ区切りでメンバーを取得
                  const memberIds = release.memberid ? release.memberid.split(',') : []; // カンマ区切りでメンバーIDを取得

                  return (
                    <div className={`${styles.tab} ${viewMode === 'list' ? styles.listItem : ''}`} key={release.id}>
                      {viewMode === 'list' ? (
                        <>
                        <div className={styles.listContent}>
                          
                          <span className={styles.date}>{release.time}</span>
                          <span className={`${styles.types} `}>
                          <div className={`${styles.type}  ${styles[release.type1]} `}>              {release.type1}</div>
                          <div className={`${styles.type}  ${styles[release.type2]}`}>              {release.type2}</div>
                          </span>
                          <img src={iconUrl} alt={release.title} className={styles.icon} />
                          <span className={styles.listCreator}>{release.creator}</span>
                          <span className={styles.listTitle}>{release.title}</span>
                          <div className={styles.listActions}>
                            {showYlink && (
                              <a
                                href={`https://youtu.be/${release.ylink.slice(17,28)}?list=PLhxvXoQxAfWJu5MXy1QxLuv_RHf_lDsFV`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                視聴
                              </a>
                            )}
                            <Link href={`release/${release.timestamp}`}>
                              詳細
                            </Link>
                          </div>
                          </div>
                          <div className={styles.listContent2}>
                          <span className={styles.listComment}>{release.comment}</span>

                          {/* メンバー一覧の表示 */}
                          {members.length > 0 && (
                            <span className={styles.members}>
                              メンバー: {members.map((member, index) => {
                                const memberId = memberIds[index] ? memberIds[index].trim() : null; // メンバーIDを取得
                                return memberId ? (
                                  <span key={index}>
                                    <a href={`https://x.com/${memberId}`} target="_blank" rel="noopener noreferrer">
                                      {member.trim()}
                                    </a>
                                    {index < members.length - 1 && ', '} {/* カンマ区切り */}
                                  </span>
                                ) : (
                                  <span key={index}>{member.trim()}{index < members.length - 1 && ', '}</span>
                                );
                              })}
                            </span>
                          )}

                         
                          </div>
                        </>
                      ) : (
                        <div className={styles.releases1} style={{
                          backgroundImage: showYlink ? 
                            `url(https://i.ytimg.com/vi/${release.ylink.slice(17,28)}/maxresdefault.jpg)` : 
                            'none'
                        }}>
                          <div className={styles.releases2}>
                            <div className={styles.r0}>{release.data}</div>
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
                                    backgroundImage: `url(${iconUrl})`,
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
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
        <Footer />
      </div>
    </div>
  );
}
