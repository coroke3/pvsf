import Link from "next/link";
import Head from "next/head";
import Image from "next/image";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import styles from "../../styles/releases.module.css";
import { config } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXTwitter, faYoutube, faTiktok } from "@fortawesome/free-brands-svg-icons";
import { faUser, faClock as faClockSolid, faCalendarDays as faCalendarSolid, faGlobe, faVideo, faPlay, faExternalLinkAlt, faFilm, faTrophy } from "@fortawesome/free-solid-svg-icons";

// HTML やエラーページを返された場合に備えた安全な JSON パース
async function safeParseJson(res) {
  const text = await res.text();
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json") && text.trimStart().startsWith("<")) {
    return null; // HTML の場合は null
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// 静的ページの生成に必要なパスを取得
export async function getStaticPaths() {
  const res = await fetch(
    "https://script.google.com/macros/s/AKfycbyoJtRhCw1DLnHOcbGkSd2_gXy6Zvdj-nYZbIM17sOL82BdIETte0d-hDRP7qnYyDPpAQ/exec"
  );
  const works = await safeParseJson(res);
  if (!works || !Array.isArray(works)) {
    return { paths: [], fallback: "blocking" };
  }

  // 有効なIDのみを対象にし、重複を排除
  const seen = new Set();
  const paths = works
    .map((work) => (work && work.timestamp !== undefined && work.timestamp !== null ? work.timestamp.toString().trim() : ""))
    .filter((id) => {
      if (!id) return false;                 // 空文字は除外 → "/release" 生成を防止
      if (id === "release") return false;   // 明示的に "/release" を除外
      if (id === "/") return false;
      if (id.toLowerCase() === "index") return false;
      if (seen.has(id)) return false;        // 重複排除
      seen.add(id);
      return true;
    })
    .map((id) => ({
      params: {
        // Encode the ID to avoid filesystem issues with characters like ':'
        id: encodeURIComponent(id)
      }
    }));

  return {
    paths,
    fallback: "blocking" // Allow on-demand rendering for new paths
  };
}

// ページのプロパティを取得
export async function getStaticProps({ params }) {
  const res = await fetch(
    "https://script.google.com/macros/s/AKfycbyoJtRhCw1DLnHOcbGkSd2_gXy6Zvdj-nYZbIM17sOL82BdIETte0d-hDRP7qnYyDPpAQ/exec"
  );
  const works = await safeParseJson(res);
  if (!works || !Array.isArray(works)) {
    return { notFound: true };
  }

  // Decode the URL-encoded ID to match against original timestamps
  const decodedId = decodeURIComponent(params.id);

  const release = works.find(
    (work) => work.timestamp.toString() === decodedId
  );

  if (!release) {
    return {
      notFound: true
    };
  }

  // 外部APIからユーザー情報を取得
  let externalUsers = [];
  try {
    const usersRes = await fetch("https://pvsf-cash.vercel.app/api/users");
    if (usersRes.ok) {
      const data = await safeParseJson(usersRes);
      externalUsers = Array.isArray(data) ? data : [];
    }
  } catch (error) {
    // エラー時は空配列のまま
  }

  // PVSF動画データを取得
  let pvsfVideos = [];
  try {
    const videosRes = await fetch("https://pvsf-cash.vercel.app/api/videos");
    if (videosRes.ok) {
      const allVideos = await safeParseJson(videosRes);
      if (Array.isArray(allVideos)) {
        pvsfVideos = allVideos.filter(video =>
          (!video.eventid || !video.eventid.includes("PVSFSummary")) &&
          (!video.status || video.status !== "private")
        );
      }
    }
  } catch (error) {
    // エラー時は空配列のまま
  }

  return {
    props: {
      release,
      works,
      externalUsers,
      pvsfVideos
    },
    revalidate: 60
  };
}

// YouTube動画IDを抽出するヘルパー関数
const extractYouTubeId = (url) => {
  if (!url) return null;
  return url.slice(17, 28);
};

// Googleドライブの共有URLからファイルIDを抽出するヘルパー関数
const extractGoogleDriveFileId = (url) => {
  if (!url) return null;

  // 既にファイルIDの場合はそのまま返す
  if (url.match(/^[a-zA-Z0-9_-]{20,}$/)) {
    return url;
  }

  // Googleドライブの共有URLからファイルIDを抽出
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) {
    return match[1];
  }

  // drive.google.comの他の形式
  const viewMatch = url.match(/id=([a-zA-Z0-9_-]+)/);
  if (viewMatch) {
    return viewMatch[1];
  }

  return null;
};

// メンバー情報を処理するヘルパー関数
const processMemberInfo = (release, works, externalUsers = []) => {
  if (!release.member) return [];

  return release.member.split(/[,、，]/).map((username, index) => {
    const memberId = release.memberid
      ?.split(/[,、，]/)
      ?.[index]
      ?.trim() || '';

    // worksからユーザー情報を検索
    const matchedUser = works.find(
      (user) => user.username && user.username.toLowerCase() === memberId.toLowerCase()
    );

    // 外部APIからユーザー情報を検索（大文字小文字を問わず）
    const externalUser = memberId ? externalUsers.find(
      (user) => user.username && user.username.toLowerCase() === memberId.toLowerCase()
    ) : null;



    // アイコンURLの処理
    let processedIconUrl = null;
    if (externalUser?.icon) {
      const fileId = extractGoogleDriveFileId(externalUser.icon);
      if (fileId) {
        processedIconUrl = `https://lh3.googleusercontent.com/d/${fileId}`;

      }
    }

    return {
      username,
      memberId,
      matchedUser,
      externalUser: externalUser ? {
        ...externalUser,
        processedIconUrl
      } : null
    };
  });
};

// 他投稿サイトの処理ヘルパー関数
const processSocialMedia = (othersns) => {
  if (!othersns) return [];

  const socialMediaMap = {
    'X': { icon: faXTwitter, color: '#1da1f2', baseUrl: 'https://twitter.com/' },
    'x': { icon: faXTwitter, color: '#1da1f2', baseUrl: 'https://twitter.com/' },
    'Twitter': { icon: faXTwitter, color: '#1da1f2', baseUrl: 'https://twitter.com/' },
    'twitter': { icon: faXTwitter, color: '#1da1f2', baseUrl: 'https://twitter.com/' },
    'TikTok': { icon: faTiktok, color: '#ff0050', baseUrl: 'https://www.tiktok.com/@' },
    'tiktok': { icon: faTiktok, color: '#ff0050', baseUrl: 'https://www.tiktok.com/@' },
    'ニコニコ動画': { icon: faVideo, color: '#252525', baseUrl: 'https://www.nicovideo.jp/user/' },
    'ニコニコ': { icon: faVideo, color: '#252525', baseUrl: 'https://www.nicovideo.jp/user/' },
    'nicovideo': { icon: faVideo, color: '#252525', baseUrl: 'https://www.nicovideo.jp/user/' },
    'YouTube': { icon: faYoutube, color: '#ff0000', baseUrl: 'https://www.youtube.com/c/' },
    'youtube': { icon: faYoutube, color: '#ff0000', baseUrl: 'https://www.youtube.com/c/' },
    'Instagram': { icon: faGlobe, color: '#e4405f', baseUrl: 'https://www.instagram.com/' },
    'instagram': { icon: faGlobe, color: '#e4405f', baseUrl: 'https://www.instagram.com/' },
    'Twitch': { icon: faPlay, color: '#9146ff', baseUrl: 'https://www.twitch.tv/' },
    'twitch': { icon: faPlay, color: '#9146ff', baseUrl: 'https://www.twitch.tv/' },
  };

  return othersns.split(/[,、，]/).map((sns, index) => {
    const trimmedSns = sns.trim();
    const snsData = socialMediaMap[trimmedSns] || {
      icon: faGlobe,
      color: '#6c757d',
      baseUrl: '#'
    };

    return {
      name: trimmedSns,
      icon: snsData.icon,
      color: snsData.color,
      url: snsData.baseUrl,
      key: `${trimmedSns}-${index}`
    };
  });
};

// 他投稿サイト表示コンポーネント（簡素化版）
const OtherSocialMedia = ({ release, styles }) => {
  const socialMediaList = processSocialMedia(release.othersns);

  if (socialMediaList.length === 0) return null;

  return (
    <div
      className={styles.otherSocialContainer}
      role="region"
      aria-label="投稿予定のサイト一覧"
    >
      <span className={styles.otherSocialLabel}>投稿予定のサイト:</span>
      <div className={styles.socialMediaSimpleList}>
        {socialMediaList.map((social) => (
          <div
            key={social.key}
            className={styles.socialMediaSimpleItem}
            title={social.name}
            aria-label={`${social.name}に投稿予定`}
          >
            <FontAwesomeIcon
              icon={social.icon}
              className={styles.socialMediaSimpleIcon}
              style={{ '--social-color': social.color }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// メディアコンテンツコンポーネント
const MediaContent = ({ release, styles }) => {
  const youtubeId = extractYouTubeId(release.ylink);

  if (youtubeId) {
    return (
      <div className={styles.videoContainer}>
        <div className={styles.videoWrapper}>
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`}
            title={`${release.title} - ${release.creator}`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className={styles.youtubeEmbed}
          />
        </div>
        <div className={styles.videoLinks}>
          <a
            href={`https://archive.pvsf.jp/${youtubeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.archiveLink}
          >
            <FontAwesomeIcon icon={faExternalLinkAlt} />
            アーカイブで視聴
          </a>
          <a
            href={`https://www.youtube.com/watch?v=${youtubeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.youtubeLink}
          >
            <FontAwesomeIcon icon={faYoutube} />
            YouTubeで視聴
          </a>
        </div>
      </div>
    );
  }

  return (
    <Image
      src="https://i.gyazo.com/9f4ec61924577737d1ea2e4af33b2eae.png"
      className={styles.yf}
      alt="デフォルト画像"
      width={800}
      height={600}
      unoptimized
    />
  );
};

// ユーザー情報コンポーネント
const UserInfo = ({ release, styles }) => {
  return (
    <div className={styles.userinfo}>
      {release.icon && (
        <Image
          src={`https://lh3.googleusercontent.com/d/${release.icon.slice(33)}`}
          alt={release.title || 'アイコン'}
          width={100}
          height={100}
          className={styles.icon}
          unoptimized
          alt={`${release.creator} アイコン`}
        />
      )}

      {release.creator && (
        <h3 className={styles.creator}>
          {release.creator}

          {release.ychlink && (
            <a
              href={release.ychlink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${release.creator}のYouTubeチャンネル`}
            >
              <FontAwesomeIcon icon={faYoutube} />
            </a>
          )}

          {release.tlink && (
            <a
              href={`https://twitter.com/${release.tlink}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${release.creator}のTwitter`}
            >
              <FontAwesomeIcon icon={faXTwitter} />
            </a>
          )}
        </h3>
      )}

      <div
        className={styles.timeContainer}
        tabIndex="0"
        role="region"
        aria-label={`公開予定日時: ${release.data} ${release.time}`}
      >
        <div className={styles.timeInfo}>
          <FontAwesomeIcon icon={faCalendarSolid} className={styles.timeIcon} />
          <span className={styles.timeLabel}>公開日時</span>
        </div>
        <div className={styles.timeValue}>
          <FontAwesomeIcon icon={faClockSolid} className={styles.clockIcon} />
          <span className={styles.timeText}>
            {release.data} {release.time}
          </span>
        </div>
        <div className={styles.timeStatus}>公開予定</div>
      </div>
    </div>
  );
};

// 作品詳細情報コンポーネント
const ReleaseDetails = ({ release, styles }) => {
  return (
    <>
      <p>
        {release.type1}出展 {release.type2}の部
      </p>

      {release.music && release.credit && (
        <p>
          <div
            dangerouslySetInnerHTML={{
              __html: `楽曲: ${release.music} - ${release.credit}<br>`
            }}
          />
        </p>
      )}

      {release.comment && (
        <p>
          <div
            dangerouslySetInnerHTML={{
              __html: release.comment
            }}
          />
        </p>
      )}

      {/* 他投稿サイト表示 */}
      <OtherSocialMedia release={release} styles={styles} />
    </>
  );
};

// メンバーテーブルコンポーネント
const MemberTable = ({ memberInfo, styles }) => {
  if (memberInfo.length === 0) return null;

  return (
    <>
      {/* デスクトップ用テーブル表示 */}
      <div className={styles.memberTableDesktop}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>No</th>
              <th>アイコン</th>
              <th>名前</th>
              <th>ID</th>
              <th>リンク</th>
            </tr>
          </thead>
          <tbody>
            {memberInfo.map(({ username, memberId, matchedUser, externalUser }, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td className={styles.memberIconCell}>
                  {externalUser?.processedIconUrl ? (
                    <img
                      src={externalUser.processedIconUrl}
                      alt={`${username.trim()} アイコン`}
                      className={styles.memberIcon}
                      tabIndex="0"
                      role="img"
                      aria-label={`${username.trim()}のプロフィール画像`}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className={styles.memberIconFallback}
                    style={{ display: externalUser?.processedIconUrl ? 'none' : 'flex' }}
                    tabIndex="0"
                    role="img"
                    aria-label={`${username.trim()}のデフォルトアイコン`}
                  >
                    <FontAwesomeIcon icon={faUser} />
                  </div>
                </td>
                <td className={styles.memberNameCell}>
                  <span className={styles.memberName}>{username.trim()}</span>
                </td>
                <td className={styles.userlink}>
                  {matchedUser ? (
                    <>
                      <a
                        href={`https://event-archive.vercel.app/user/${matchedUser.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.userLink}
                        aria-label={`${matchedUser.username}のプロフィール`}
                      >
                        <FontAwesomeIcon icon={faUser} />
                      </a>
                      <div className={styles.userlis}>
                        <a
                          href={`https://event-archive.vercel.app/user/${matchedUser.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.userLink}
                        >
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
                  <div className={styles.linkContainer}>
                    {memberId && (
                      <a
                        href={`https://twitter.com/${memberId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${memberId}のTwitter`}
                        className={styles.linkIcon}
                      >
                        <FontAwesomeIcon icon={faXTwitter} className={styles.twitterIcon} />
                      </a>
                    )}
                    {externalUser && memberId && (
                      <a
                        href={`https://archive.pvsf.jp/user/${memberId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${memberId}のアーカイブページ`}
                        className={styles.linkIcon}
                      >
                        <FontAwesomeIcon icon={faExternalLinkAlt} className={styles.externalLinkIcon} />
                      </a>
                    )}
                    {!memberId && "-"}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* モバイル用カード表示 */}
      <div className={styles.memberCardContainer}>
        {memberInfo.map(({ username, memberId, matchedUser, externalUser }, index) => (
          <div key={index} className={styles.memberCard}>
            <div className={styles.memberCardNumber}>
              {index + 1}
            </div>

            <div className={styles.memberCardIcon}>
              {externalUser?.processedIconUrl ? (
                <img
                  src={externalUser.processedIconUrl}
                  alt={`${username.trim()} アイコン`}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className={styles.memberIconFallback}
                style={{ display: externalUser?.processedIconUrl ? 'none' : 'flex' }}
              >
                <FontAwesomeIcon icon={faUser} />
              </div>
            </div>

            <div className={styles.memberCardInfo}>
              <div className={styles.memberCardName}>
                {username.trim()}
              </div>

              {matchedUser ? (
                <div className={styles.memberCardId}>
                  <a
                    href={`https://event-archive.vercel.app/user/${matchedUser.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#1da1f2', textDecoration: 'none' }}
                  >
                    /{matchedUser.username}
                  </a>
                </div>
              ) : memberId ? (
                <div className={styles.memberCardId}>@{memberId}</div>
              ) : (
                <div className={styles.memberCardId}>-</div>
              )}

              <div className={styles.memberCardLinks}>
                {memberId && (
                  <a
                    href={`https://twitter.com/${memberId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${memberId}のTwitter`}
                  >
                    <FontAwesomeIcon icon={faXTwitter} />
                  </a>
                )}
                {matchedUser && (
                  <a
                    href={`https://event-archive.vercel.app/user/${matchedUser.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${matchedUser.username}のプロフィール`}
                  >
                    <FontAwesomeIcon icon={faUser} />
                  </a>
                )}
                {externalUser && memberId && (
                  <a
                    href={`https://archive.pvsf.jp/user/${memberId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${memberId}のアーカイブページ`}
                  >
                    <FontAwesomeIcon icon={faExternalLinkAlt} />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

// メタデータ生成ヘルパー
const generateMetadata = (release) => {
  const youtubeId = extractYouTubeId(release.ylink);
  const defaultImage = "https://i.gyazo.com/35170e03ec321fb94276ca1c918efabc.jpg";
  const youtubeImage = youtubeId
    ? `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`
    : defaultImage;

  return {
    title: `${release.title} - ${release.creator} | オンライン映像イベント / PVSF`,
    description: `PVSF 出展作品 ${release.title} - ${release.creator} music:${release.music} - ${release.credit}`,
    image: youtubeImage,
    cardType: youtubeId ? "summary_large_image" : "summary"
  };
};

// メンバーの過去作品を検索するヘルパー関数（tlink + memberid対応）
const findMemberPastWorks = (memberInfo, pvsfVideos) => {
  if (!memberInfo || memberInfo.length === 0 || !pvsfVideos || pvsfVideos.length === 0) {
    return [];
  }

  const memberPastWorks = [];

  memberInfo.forEach(({ username, memberId }) => {
    if (!memberId) return;

    const allWorks = [];

    // 1. tlinkと一致する作品を検索（個人作品）
    const individualWorks = pvsfVideos.filter(video =>
      video.tlink && video.tlink.toLowerCase() === memberId.toLowerCase()
    );

    // 個人作品にタイプを追加
    const individualWorksWithType = individualWorks.map(work => ({
      ...work,
      participationType: 'individual'
    }));

    // 2. memberidと一致する作品を検索（合作参加）
    const collaborationWorks = pvsfVideos.filter(video => {
      if (!video.memberid) return false;

      // memberidをカンマ区切りで分割して大文字小文字を問わず検索
      const memberIds = video.memberid.split(/[,、，]/).map(id => id.trim().toLowerCase());
      return memberIds.includes(memberId.toLowerCase());
    });

    // 合作参加作品にタイプを追加（重複除去のため、individualWorksに含まれていない作品のみ）
    const collaborationWorksWithType = collaborationWorks
      .filter(colWork => !individualWorks.some(indWork => indWork.timestamp === colWork.timestamp))
      .map(work => ({
        ...work,
        participationType: 'collaboration'
      }));

    // 両方の作品を統合
    allWorks.push(...individualWorksWithType, ...collaborationWorksWithType);

    if (allWorks.length > 0) {

      // 日時順でソートして最新7作品まで表示
      const sortedWorks = allWorks
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 7);

      memberPastWorks.push({
        memberName: username.trim(),
        memberId,
        works: sortedWorks
      });
    }
  });

  return memberPastWorks;
};

// tlinkによる関連作品を検索するヘルパー関数（memberidロジックと同様にpvsfVideosから検索）
const findRelatedWorksByTlink = (currentRelease, pvsfVideos) => {
  if (!currentRelease?.tlink || !pvsfVideos || pvsfVideos.length === 0) {
    return [];
  }

  const allWorks = [];

  // 1. tlinkと一致する作品を検索（個人作品）
  const individualWorks = pvsfVideos.filter(video =>
    video.tlink && video.tlink.toLowerCase() === currentRelease.tlink.toLowerCase()
  );

  // 個人作品にタイプを追加
  const individualWorksWithType = individualWorks.map(work => ({
    ...work,
    participationType: 'individual'
  }));

  // 2. memberidと一致する作品を検索（合作参加）
  const collaborationWorks = pvsfVideos.filter(video => {
    if (!video.memberid) return false;

    // memberidをカンマ区切りで分割して大文字小文字を問わず検索
    const memberIds = video.memberid.split(/[,、，]/).map(id => id.trim().toLowerCase());
    return memberIds.includes(currentRelease.tlink.toLowerCase());
  });

  // 合作参加作品にタイプを追加（重複除去のため、individualWorksに含まれていない作品のみ）
  const collaborationWorksWithType = collaborationWorks
    .filter(colWork => !individualWorks.some(indWork => indWork.timestamp === colWork.timestamp))
    .map(work => ({
      ...work,
      participationType: 'collaboration'
    }));

  // 両方の作品を統合
  allWorks.push(...individualWorksWithType, ...collaborationWorksWithType);

  // 最新6作品まで表示（日時順でソート）
  return allWorks
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 6);
};

// 前後の作品を取得するヘルパー関数
const getAdjacentWorks = (works, currentId) => {
  const currentIndex = works.findIndex(work => work.timestamp.toString() === currentId);
  if (currentIndex === -1) return { allWorks: [] };

  // 前3作品 + 現在の作品 + 次3作品の合計7作品を取得
  const startIndex = Math.max(0, currentIndex - 3);
  const endIndex = Math.min(works.length, currentIndex + 4);
  const allWorks = works.slice(startIndex, endIndex);

  return { allWorks, currentIndex: currentIndex - startIndex };
};

// 日時フォーマットのヘルパー関数
const formatWorkDateTime = (work) => {

  // work.dataとwork.timeを直接使用（既にフォーマット済み）
  if (work.data && work.time) {
    return {
      date: work.data,     // "08/29" 形式
      time: work.time      // "18:06" 形式
    };
  }

  // フォールバック: timestampがISO文字列の場合
  if (work.timestamp) {
    const date = new Date(work.timestamp);

    if (!isNaN(date.getTime())) {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');

      return {
        date: `${month}/${day}`,
        time: `${hours}:${minutes}`
      };
    }
  }

  return { date: '--/--', time: '--:--' };
};



// tlinkによる関連作品表示コンポーネント（個人作品と合作参加を区別）
const RelatedWorksByTlink = ({ relatedWorks, currentRelease, styles }) => {
  if (!relatedWorks || relatedWorks.length === 0) return null;

  return (
    <div
      className={styles.pastWorksContainer}
      tabIndex="0"
      role="region"
      aria-label={`${currentRelease.creator}による他の作品一覧`}
    >
      <h4 className={styles.pastWorksTitle}>
        {currentRelease.creator}の過去のPVSF作品
      </h4>

      <div className={styles.relatedWorksGrid}>
        {relatedWorks.map((work, workIndex) => (
          <div
            key={`related-${workIndex}`}
            className={work.participationType === 'collaboration' ? `${styles.pastWorkItem} ${styles.collaborationWork}` : styles.pastWorkItem}
            role="article"
            aria-label={`${currentRelease.creator}の${work.participationType === 'collaboration' ? '合作参加' : '個人'}作品: ${work.title}`}
          >
            <div className={styles.pastWorkThumbnail}>
              <Image
                src={work.smallThumbnail || work.largeThumbnail || "https://i.gyazo.com/9f4ec61924577737d1ea2e4af33b2eae.png"}
                alt={`${work.title} サムネイル`}
                width={320}
                height={180}
                className={styles.pastWorkImage}
                unoptimized
              />
              <div className={styles.pastWorkOverlay} aria-hidden="true">
                <FontAwesomeIcon icon={work.participationType === 'collaboration' ? faTrophy : faFilm} className={styles.pastWorkPlayIcon} />
              </div>
              {work.participationType === 'collaboration' && (
                <div className={styles.collaborationBadge} aria-label="合作参加">
                  <FontAwesomeIcon icon={faTrophy} />
                </div>
              )}
              <a
                href={`https://archive.pvsf.jp/${extractYouTubeId(work.ylink) || 'undefined'}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.pastWorkLink}
                aria-label={`${work.title} (${work.eventid}) を${work.participationType === 'collaboration' ? '合作参加' : ''}アーカイブで視聴する`}
              />
            </div>

            <div className={styles.pastWorkInfo}>
              <h6 className={styles.pastWorkTitle}>
                {work.title}
                {work.participationType === 'collaboration' && <small className={styles.collaborationLabel}>（合作参加）</small>}
              </h6>
              <p className={styles.pastWorkMusic}>
                楽曲: {work.music} - {work.credit}
              </p>
              <div className={styles.pastWorkMeta}>
                <span className={styles.pastWorkEvent}>{work.eventid}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// メンバー過去作品表示コンポーネント
const MemberPastWorks = ({ memberPastWorks, styles }) => {
  if (!memberPastWorks || memberPastWorks.length === 0) return null;

  return (
    <div
      className={styles.pastWorksContainer}
      tabIndex="0"
      role="region"
      aria-label="メンバーの過去PVSF作品一覧"
    >
      <h4 className={styles.pastWorksTitle}>
        メンバーの過去作品
      </h4>

      {memberPastWorks.map((memberWork, memberIndex) => {
        // 4本以上ある場合は個人作品を優先して.videoscoreでソートして上位3つを抽出
        let worksToShow = memberWork.works;
        if (memberWork.works.length >= 4) {
          // 個人作品と合作作品に分けてそれぞれソート
          const individualWorks = memberWork.works
            .filter(work => work.participationType === 'individual')
            .sort((a, b) => (parseFloat(b.videoscore || 0) - parseFloat(a.videoscore || 0)));

          const collaborationWorks = memberWork.works
            .filter(work => work.participationType === 'collaboration')
            .sort((a, b) => (parseFloat(b.videoscore || 0) - parseFloat(a.videoscore || 0)));

          // 個人作品から優先的に選択し、残りを合作作品で補完
          worksToShow = [];

          // まず個人作品から最大3つまで取得
          const individualCount = Math.min(individualWorks.length, 3);
          worksToShow = worksToShow.concat(individualWorks.slice(0, individualCount));

          // 残りの枠があれば合作作品で補完
          const remainingSlots = 3 - worksToShow.length;
          if (remainingSlots > 0 && collaborationWorks.length > 0) {
            worksToShow = worksToShow.concat(collaborationWorks.slice(0, remainingSlots));
          }
        }

        return (
          <div key={memberIndex} className={styles.memberWorksSection}>
            <h5 className={styles.memberWorksName}>
              {memberWork.memberName} の過去作品
            </h5>

            <div className={styles.pastWorksGrid}>
              {worksToShow.map((work, workIndex) => (
                <div
                  key={`work-${workIndex}`}
                  className={work.participationType === 'collaboration' ? `${styles.pastWorkItem} ${styles.collaborationWork}` : styles.pastWorkItem}
                  role="article"
                  aria-label={`${memberWork.memberName}の${work.participationType === 'collaboration' ? '合作参加' : '個人'}作品: ${work.title}`}
                >
                  <div className={styles.pastWorkThumbnail}>
                    <Image
                      src={work.smallThumbnail || work.largeThumbnail || "https://i.gyazo.com/9f4ec61924577737d1ea2e4af33b2eae.png"}
                      alt={`${work.title} サムネイル`}
                      width={320}
                      height={180}
                      className={styles.pastWorkImage}
                      unoptimized
                    />
                    <div className={styles.pastWorkOverlay} aria-hidden="true">
                      <FontAwesomeIcon icon={work.participationType === 'collaboration' ? faTrophy : faFilm} className={styles.pastWorkPlayIcon} />
                    </div>
                    {work.participationType === 'collaboration' && (
                      <div className={styles.collaborationBadge} aria-label="合作参加">
                        <FontAwesomeIcon icon={faTrophy} />
                      </div>
                    )}
                    <a
                      href={`https://archive.pvsf.jp/${extractYouTubeId(work.ylink) || 'undefined'}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.pastWorkLink}
                      aria-label={`${work.title} (${work.eventid}) を${work.participationType === 'collaboration' ? '合作参加' : ''}アーカイブで視聴する`}
                    />
                  </div>

                  <div className={styles.pastWorkInfo}>
                    <h6 className={styles.pastWorkTitle}>
                      {work.title}
                      {work.participationType === 'collaboration' && <small className={styles.collaborationLabel}>（合作参加）</small>}
                    </h6>
                    <p className={styles.pastWorkMusic}>
                      楽曲: {work.music} - {work.credit}
                    </p>
                    <div className={styles.pastWorkMeta}>
                      <span className={styles.pastWorkEvent}>{work.eventid}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// 作品ナビゲーションコンポーネント
const WorksNavigation = ({ works, currentId, styles }) => {
  const { allWorks, currentIndex } = getAdjacentWorks(works, currentId);

  if (allWorks.length === 0) return null;

  return (
    <div className={styles.worksNavigation}>
      <h3 className={styles.navigationTitle}>前後の作品</h3>

      <div className={styles.navigationList}>
        {allWorks.map((work, index) => {
          const { date, time } = formatWorkDateTime(work);
          const isCurrent = index === currentIndex;
          const relativePosition = index - currentIndex;

          // ラベルの決定（現在作品は空、他は相対位置の数字のみ）
          let label = '';


          return (
            <div key={work.timestamp} className={`${styles.navigationItem} ${isCurrent ? styles.currentItem : ''}`}>
              <div className={styles.navigationDateTime}>
                <span className={styles.navigationDate}>{date}</span>
                <span className={styles.navigationTime}>{time}</span>
              </div>

              <div className={styles.navigationWorkInfo}>
                {work.icon && (
                  <Image
                    src={`https://lh3.googleusercontent.com/d/${work.icon.slice(33)}`}
                    className={styles.navigationIcon}
                    alt={`${work.creator} アイコン`}
                    width={50}
                    height={50}
                    unoptimized
                  />
                )}
                <span className={styles.navigationCreator}>{work.creator}</span>
                <span className={styles.navigationLabel}>{label}</span>
              </div>

              {!isCurrent && (
                <Link href={`/release/${work.timestamp}`} className={styles.navigationLink}>
                  <span className="sr-only">{work.title}へ移動</span>
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};



export default function Release({ release, works, externalUsers = [], pvsfVideos = [] }) {
  // データの存在チェック
  const hasData = {
    comment: Boolean(release.comment),
    icon: Boolean(release.icon),
    creator: Boolean(release.creator),
    twitter: Boolean(release.tlink),
    youtube: Boolean(release.ylink),
    youtubeCH: Boolean(release.ychlink),
    member: Boolean(release.member),
    music: Boolean(release.music && release.credit)
  };

  // メンバー情報の処理
  const memberInfo = processMemberInfo(release, works, externalUsers);

  // メンバーの過去作品検索
  const memberPastWorks = findMemberPastWorks(memberInfo, pvsfVideos);

  // tlinkによる関連作品検索（pvsfVideosから検索）
  const relatedWorksByTlink = findRelatedWorksByTlink(release, pvsfVideos);

  // メタデータの生成
  const metadata = generateMetadata(release);

  return (
    <div>
      <Head>
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
        <meta name="twitter:site" content="@pvscreeningfes" />
        <meta name="twitter:creator" content="@coroke3" />
        <meta property="og:url" content="pvsf.jp" />
        <meta property="og:title" content={`${release.title} - ${release.creator} | オンライン映像イベント / PVSF archive`} />
        <meta property="og:image" content={metadata.image} />
        <meta name="twitter:card" content={metadata.cardType} />
        <meta property="og:description" content={metadata.description} />
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
            {/* メディアコンテンツ */}
            <MediaContent release={release} styles={styles} />

            {/* タイトル */}
            <h2 className={styles.title}>{release.title}</h2>

            {/* ユーザー情報 */}
            <UserInfo release={release} styles={styles} />

            {/* 作品ナビゲーション（公開日時の下部） */}
            <WorksNavigation
              works={works}
              currentId={release.timestamp.toString()}
              styles={styles}
            />

            {/* 作品詳細情報 */}
            <ReleaseDetails release={release} styles={styles} />

            {/* メンバーテーブル */}
            <MemberTable memberInfo={memberInfo} styles={styles} />

            {/* メンバーの過去作品 */}
            <MemberPastWorks memberPastWorks={memberPastWorks} styles={styles} />

            {/* 元スプシのtlinkによる関連作品 */}
            <RelatedWorksByTlink
              relatedWorks={relatedWorksByTlink}
              currentRelease={release}
              styles={styles}
            />
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}
