import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import styles from "../../styles/release.module.css";
import Head from "next/head";
import { useState, useRef, useEffect, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faImage, faUser, faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import { faXTwitter } from "@fortawesome/free-brands-svg-icons";
import { useRouter } from "next/router";
import {
  extractYouTubeVideoId,
  fetchReleaseSnapshot,
  getReleaseIconUrl,
  profilePath,
  releasePath,
} from "../../libs/flamenodeRelease";

const YOUTUBE_PLAYLIST_ID = 'PLhxvXoQxAfWJPFEyi1zr0h6w0oQ0KoURc';

const typeClassName = (value, styles) => {
  if (value === "複数人") return styles.typeGroup;
  if (value === "個人") return styles.typeIndividual;
  return styles.typeDefault;
};

const legacyGetStaticProps = async () => {
  // リリースデータの取得
  const releaseRes = await fetch(
    "https://flamenode.net/api/event-endpoints/pvsf2026s?update=scheduled&format=legacy&refresh=15"
  );
  const release = await releaseRes.json();

  let usernames = [];
  try {
    // ユーザーIDのリストを取得
    const usersRes = await fetch("https://pvsf-cash.vercel.app/api/users");
    const users = await usersRes.json();

    // ユーザー名の配列を作成
    usernames = users.map(user => user.username);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    // エラーが発生した場合は空の配列を使用
  }

  return {
    props: {
      release,
      usernames
    },
  };
};

export const getStaticProps = async () => {
  try {
    const { release, usernames } = await fetchReleaseSnapshot();
    return { props: { release, usernames, dataUnavailable: false } };
  } catch (error) {
    console.error("[release] failed to load release data", error);
    return { props: { release: [], usernames: [], dataUnavailable: true } };
  }
};
void legacyGetStaticProps;

export default function Releases({ release, usernames, dataUnavailable = false }) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState('list'); // 'list', 'card', 'members'

  // URLハッシュからビューモードを設定
  useEffect(() => {
    // URLハッシュを取得
    const hash = window.location.hash.toLowerCase();

    // ハッシュに基づいてビューモードを設定
    if (hash === '#grid') {
      setViewMode('card');
    } else if (hash === '#creator') {
      setViewMode('members');
    } else if (hash === '#list') {
      setViewMode('list');
    }
  }, []);

  // ビューモードが変更されたらURLハッシュを更新
  useEffect(() => {
    let hash = '#list';
    if (viewMode === 'card') {
      hash = '#grid';
    } else if (viewMode === 'members') {
      hash = '#creator';
    }

    // URLを更新（履歴に追加せず）
    window.history.replaceState(null, '', hash);
  }, [viewMode]);

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
  const normalizedReleases = useMemo(
    () => (Array.isArray(release) ? release.filter(Boolean) : []),
    [release],
  );
  const groupedReleases = useMemo(() => groupByDate(normalizedReleases), [normalizedReleases]);

  // ユーザー名がリストに含まれているか確認する関数（大文字小文字を区別しない）
  const isValidUsername = (username, usernames) => {
    if (!username || !usernames || !Array.isArray(usernames)) return false;

    // 小文字に変換して比較
    const lowerUsername = username.toLowerCase();
    return usernames.some(name => name && name.toLowerCase() === lowerUsername);
  };

  // アーカイブリンクを生成する関数
  const getArchiveLink = (username) => {
    if (!username) return null;
    // 小文字に変換してリンクを生成
    return profilePath("https://archive.pvsf.jp/user/", username.toLowerCase());
  };

  const openRelease = (id) => {
    const href = releasePath(id);
    if (href) void router.push(href);
  };

  // ビューモード切り替え関数
  const changeViewMode = (mode) => {
    setViewMode(mode);
  };

  const ViewToggle = () => (
    <>
      <h2>投稿予定のご案内</h2>

      <div className={styles.viewToggle}>
        <button
          type="button"
          onClick={() => changeViewMode('list')}
          aria-label="リスト表示"
          aria-pressed={viewMode === 'list'}
          className={`${styles.toggleButton} ${viewMode === 'list' ? styles.active : ''}`}
        >
          <FontAwesomeIcon icon={faBars} />
        </button>
        <button
          type="button"
          onClick={() => changeViewMode('card')}
          aria-label="カード表示"
          aria-pressed={viewMode === 'card'}
          className={`${styles.toggleButton} ${viewMode === 'card' ? styles.active : ''}`}
        >
          <FontAwesomeIcon icon={faImage} />
        </button>
        <button
          type="button"
          onClick={() => changeViewMode('members')}
          aria-label="作者別表示"
          aria-pressed={viewMode === 'members'}
          className={`${styles.toggleButton} ${viewMode === 'members' ? styles.active : ''}`}
        >
          <FontAwesomeIcon icon={faUser} />
        </button>
      </div>
    </>
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
            {individuals.map(release => {
              const twitterId = release.tlink || "";
              const hasArchiveProfile = isValidUsername(twitterId, usernames);

              return (
                <div
                  key={release.id}
                  className={styles.memberCard}
                  onClick={() => openRelease(release.timestamp)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openRelease(release.timestamp);
                    }
                  }}
                  role="link"
                  tabIndex={0}
                >
                  <div className={styles.membertop}>
                    <a
                      href={profilePath("https://x.com/", twitterId) || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={styles.iconLink}
                    >
                      {getReleaseIconUrl(release.icon) ? (
                        <img
                          src={getReleaseIconUrl(release.icon)}
                          alt={release.creator}
                          className={styles.memberIcon}
                        />
                      ) : (
                        <div className={`${styles.memberIcon} ${styles.iconFallback}`} aria-hidden="true">
                          <FontAwesomeIcon icon={faUser} />
                        </div>
                      )}
                    </a>



                    <div className={styles.memberLinks}>
                      {twitterId && (
                        <a
                          href={profilePath("https://x.com/", twitterId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.socialLink}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FontAwesomeIcon icon={faXTwitter} />
                        </a>
                      )}
                      {hasArchiveProfile && (
                        <a
                          href={getArchiveLink(twitterId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.socialLink}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FontAwesomeIcon icon={faExternalLinkAlt} />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className={styles.memberName}>{release.creator}</div>

                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.membersSection}>
          <h3>グループ参加</h3>
          <div className={`${styles.membersList} ${styles.groupList}`}>
            {groups.map(release => {
              const members = release.member ? release.member.split(',') : [];
              const memberIds = release.memberid ? release.memberid.split(',') : [];

              return (
                <div key={release.id} className={styles.groupCard} onClick={() => {
                  // グループカード全体をクリックしたときの処理
                  openRelease(release.timestamp);
                }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openRelease(release.timestamp);
                    }
                  }}
                  role="link"
                  tabIndex={0}
                >
                  {/* アイコン部分 - クリックイベントの伝播を停止 */}
                  {release.tlink ? <a
                    href={profilePath("https://x.com/", release.tlink)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={styles.iconLink}
                  >
                    {getReleaseIconUrl(release.icon) ? (
                      <img
                        src={getReleaseIconUrl(release.icon)}
                        alt={release.creator}
                        className={styles.groupIcon}
                      />
                    ) : (
                      <div className={`${styles.groupIcon} ${styles.iconFallback}`} aria-hidden="true">
                        <FontAwesomeIcon icon={faUser} />
                      </div>
                    )}
                  </a> : (
                    <div className={styles.iconLink} aria-hidden="true">
                      <div className={`${styles.groupIcon} ${styles.iconFallback}`}>
                        <FontAwesomeIcon icon={faUser} />
                      </div>
                    </div>
                  )}
                  <div className={styles.groupInfo}>
                    <div className={styles.groupName}>
                      {release.creator}
                      {release.tlink && (
                        <a
                          href={profilePath("https://x.com/", release.tlink)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className={styles.groupXLink}
                        >
                          <FontAwesomeIcon icon={faXTwitter} size="xs" />
                        </a>
                      )}
                    </div>
                    <div className={styles.groupMembers}>
                      {members.map((member, index) => {
                        const memberId = memberIds[index] ? memberIds[index].trim() : null;
                        const hasArchiveProfile = memberId && isValidUsername(memberId, usernames);

                        return (
                          <div key={index} className={styles.memberItem}>
                            {memberId ? (
                              <>
                                {member.trim()}
                                <a
                                  href={profilePath("https://x.com/", memberId)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <FontAwesomeIcon icon={faXTwitter} size="xs" />
                                </a>
                                {hasArchiveProfile && (
                                  <a
                                    href={getArchiveLink(memberId)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.archiveLink}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" />
                                  </a>
                                )}
                              </>
                            ) : (
                              <span>{member.trim()}</span>
                            )}
                          </div>
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

  // リリースアイテムのコンポーネント内で追加
  const ListItem = ({ release, showYlink }) => {
    const scrollContainerRef = useRef(null);
    const scrollContentRef = useRef(null);
    const animationRef = useRef(null);
    const cloneRef = useRef(null);
    const [shouldScroll, setShouldScroll] = useState(false);
    const [containerWidth, setContainerWidth] = useState(0);
    const [contentWidth, setContentWidth] = useState(0);

    // メンバー情報の取得
    const members = useMemo(() => release.member ? release.member.split(',') : [], [release.member]);
    const memberIds = useMemo(() => release.memberid ? release.memberid.split(',') : [], [release.memberid]);
    const iconUrl = getReleaseIconUrl(release.icon);
    const youtubeId = extractYouTubeVideoId(release.ylink);

    useEffect(() => {
      animationRef.current?.cancel();
      animationRef.current = null;
      cloneRef.current?.remove();
      cloneRef.current = null;
      if (scrollContainerRef.current && scrollContentRef.current) {
        const containerWidth = scrollContainerRef.current.offsetWidth;
        const contentWidth = scrollContentRef.current.offsetWidth;

        setContainerWidth(containerWidth);
        setContentWidth(contentWidth);

        // コンテンツがコンテナより広い場合のみスクロールを有効にする
        const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        setShouldScroll(contentWidth > containerWidth && !reducedMotion);

        // 3秒後にスクロールを開始
        const timer = setTimeout(() => {
          if (contentWidth > containerWidth && !reducedMotion) {
            startScrollAnimation(scrollContentRef.current, contentWidth, containerWidth);
          }
        }, 3000);

        return () => {
          clearTimeout(timer);
          animationRef.current?.cancel();
          animationRef.current = null;
          cloneRef.current?.remove();
          cloneRef.current = null;
        };
      }
    }, [release.comment, release.member, release.memberid]);

    // スクロールアニメーション関数を修正
    const startScrollAnimation = (element, contentWidth, containerWidth) => {
      if (!element) return;

      // スクロール速度（px/秒）
      const scrollSpeed = 50;

      // コンテンツの複製を作成して連続的なスクロールを実現
      const cloneContent = element.cloneNode(true);
      cloneContent.setAttribute('aria-hidden', 'true');
      element.appendChild(cloneContent);
      cloneRef.current = cloneContent;

      // 実際のコンテンツ幅（複製後）
      const totalContentWidth = contentWidth;

      // スクロールに必要な時間（ミリ秒）
      const scrollTime = (totalContentWidth / scrollSpeed) * 1000;

      // アニメーションのキーフレーム
      const keyframes = [
        { transform: 'translateX(0)' },
        { transform: `translateX(-${totalContentWidth}px)` }
      ];

      // アニメーションの設定
      const options = {
        duration: scrollTime,
        iterations: Infinity,
        easing: 'linear'
      };

      // アニメーションの開始
      animationRef.current = element.animate(keyframes, options);
    };

    return (
      <div className={`${styles.tab} ${viewMode === 'list' ? styles.listItem : ''}`} key={release.id}>
        {viewMode === 'list' ? (
          <>
            <div className={styles.listContent}>
              <span className={styles.date}>{release.time}</span>
              <span className={`${styles.types} `}>
                <div className={`${styles.type} ${typeClassName(release.type1, styles)}`}>{release.type1}</div>
                <div className={`${styles.type} ${typeClassName(release.type2, styles)}`}>{release.type2}</div>
              </span>
              {iconUrl ? (
                <img src={iconUrl} alt={release.title} className={styles.icon} />
              ) : (
                <span className={`${styles.icon} ${styles.iconFallback}`} aria-hidden="true">
                  <FontAwesomeIcon icon={faUser} />
                </span>
              )}
              <span className={styles.listCreator}>{release.creator}</span>
              <span className={styles.listTitle}>{release.title}</span>
              <div className={styles.listActions}>
                {showYlink && youtubeId && (
                  <a
                    href={`https://youtu.be/${youtubeId}?list=${YOUTUBE_PLAYLIST_ID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    視聴
                  </a>
                )}
                <Link href={releasePath(release.timestamp) || "/release"}>
                  詳細
                </Link>
              </div>
            </div>
            <div
              className={styles.listContent2}
              ref={scrollContainerRef}
              aria-label="作品コメントとメンバー"
            >
              <div
                ref={scrollContentRef}
                className={styles.scrollContent}
              >
                <span className={styles.listComment}>{release.comment}</span>

                {/* メンバー一覧の表示 */}
                {members.length > 0 && (
                  <span className={styles.members}>
                    メンバー: {members.map((member, index) => {
                      const memberId = memberIds[index] ? memberIds[index].trim() : null;
                      return memberId ? (
                        <span key={index}>
                          <a href={profilePath("https://x.com/", memberId)} target="_blank" rel="noopener noreferrer">
                            {member.trim()}
                          </a>
                          {index < members.length - 1 && ' / '}
                        </span>
                      ) : (
                        <span key={index}>{member.trim()}{index < members.length - 1 && ' / '}</span>
                      );
                    })}
                  </span>
                )}

                {/* スクロールする場合は、間隔を追加 */}
                {shouldScroll && <span className={styles.scrollSpacer} aria-hidden="true" />}
              </div>
            </div>
          </>
        ) : (
          <div className={styles.releases1} style={{
            backgroundImage: showYlink && youtubeId ?
              `url(https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg)` :
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
                  href={profilePath("https://twitter.com/", release.tlink) || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div
                    className={styles.r31}
                    style={{
                      backgroundImage: iconUrl ? `url(${iconUrl})` : 'none',
                    }}
                  >
                    <img src="https://i.gyazo.com/dc3cc7d76ef8ce02789baf16df939178.png" alt="" />
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
                    href={youtubeId ? `https://youtu.be/${youtubeId}?list=${YOUTUBE_PLAYLIST_ID}` : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    id="generated-id-1690507402817-hylf4ea9j"
                  >
                    {" "}
                    YouTubeで視聴する
                  </a>
                </div>
                <div className={styles.r72}>
                  <Link href={releasePath(release.timestamp) || "/release"}>
                    詳細を見る
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
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
        {dataUnavailable ? (
          <div className={styles.releaseState} role="status">
            <strong>リリース情報を一時的に取得できません。</strong>
            <span>時間をおいて、もう一度お試しください。</span>
          </div>
        ) : normalizedReleases.length === 0 ? (
          <div className={styles.releaseState} role="status">
            <strong>公開中の作品はありません。</strong>
          </div>
        ) : viewMode === 'members' ? (
          <MembersView releases={normalizedReleases} />
        ) : (
          <div className={`${styles.table} ${viewMode === 'list' ? styles.listView : ''}`}>
            {Object.entries(groupedReleases).map(([date, releases]) => (
              <div key={date} className={styles.dateGroup}>
                <h2 className={`${styles.dateHeader} ${viewMode === 'list' ? styles.dateHeaderList : styles.dateHeaderTile}`}>
                  {date}
                </h2>
                {releases.map((release) => (
                  <ListItem
                    key={release.id}
                    release={release}
                    showYlink={Boolean(extractYouTubeVideoId(release.ylink))}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
        <Footer />
      </div>
    </div>
  );
}
