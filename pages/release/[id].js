import Link from "next/link";
import Head from "next/head";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import styles from "../../styles/releases.module.css";
import { config } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXTwitter, faYoutube, faUser, faTiktok } from "@fortawesome/free-brands-svg-icons";
import { faClock as faClockSolid, faCalendarDays as faCalendarSolid, faGlobe, faVideo, faPlay, faExternalLinkAlt, faFilm, faTrophy } from "@fortawesome/free-solid-svg-icons";

// 静的ページの生成に必要なパスを取得
export async function getStaticPaths() {
  const res = await fetch(
    "https://script.google.com/macros/s/AKfycbyoJtRhCw1DLnHOcbGkSd2_gXy6Zvdj-nYZbIM17sOL82BdIETte0d-hDRP7qnYyDPpAQ/exec"
  );
  const works = await res.json();

  // 全ての作品のパスを生成
  const paths = works.map((work) => ({
    params: { id: work.timestamp.toString() }
  }));

  return {
    paths,
    fallback: false // 未定義のパスは404
  };
}

// ページのプロパティを取得
export async function getStaticProps({ params }) {
  const res = await fetch(
    "https://script.google.com/macros/s/AKfycbyoJtRhCw1DLnHOcbGkSd2_gXy6Zvdj-nYZbIM17sOL82BdIETte0d-hDRP7qnYyDPpAQ/exec"
  );
  const works = await res.json();

  const release = works.find(
    (work) => work.timestamp.toString() === params.id
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
      externalUsers = await usersRes.json();
      // デバッグ用：最初の3ユーザーの情報を出力
      if (externalUsers.length > 0) {
      }
    } else {
    }
  } catch (error) {
  }

  // PVSF動画データを取得
  let pvsfVideos = [];
  try {
    const videosRes = await fetch("https://pvsf-cash.vercel.app/api/videos");
    if (videosRes.ok) {
      const allVideos = await videosRes.json();
      // eventidに"PVSFSummary"が含まれるものと、statusが"private"のものを除外
      pvsfVideos = allVideos.filter(video =>
        (!video.eventid || !video.eventid.includes("PVSFSummary")) &&
        (!video.status || video.status !== "private")
      );
    } else {
    }
  } catch (error) {
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
      <div className={styles.videoThumbnailContainer}>
        <a
          href={`https://archive.pvsf.jp/${youtubeId}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.videoThumbnailLink}
        >
          <img
            src={`https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`}
            className={styles.yf}
            alt={`${release.title} - YouTube動画サムネイル`}
          />
          <div className={styles.playButtonOverlay}>
            <div className={styles.playButton}>
              <svg
                width="68"
                height="48"
                viewBox="0 0 68 48"
                className={styles.playIcon}
              >
                <path
                  d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z"
                  fill="#f00"
                />
                <path
                  d="m 45,24 -18,10 0,-20"
                  fill="#fff"
                />
              </svg>
            </div>
          </div>
        </a>
      </div>
    );
  }

  return (
    <img
      src="https://i.gyazo.com/9f4ec61924577737d1ea2e4af33b2eae.png"
      className={styles.yf}
      alt="デフォルト画像"
    />
  );
};

// ユーザー情報コンポーネント
const UserInfo = ({ release, styles }) => {
  return (
    <div className={styles.userinfo}>
      {release.icon && (
        <img
          src={`https://lh3.googleusercontent.com/d/${release.icon.slice(33)}`}
          className={styles.icon}
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

// 元スプシのtlinkによる関連作品を検索するヘルパー関数
const findRelatedWorksByTlink = (currentRelease, allWorks) => {
  if (!currentRelease?.tlink || !allWorks || allWorks.length === 0) {
    return [];
  }

  // 現在の作品のtlinkと一致する他の作品を検索（大文字小文字を問わず、自分自身は除外）
  const relatedWorks = allWorks.filter(work =>
    work.tlink &&
    work.tlink.toLowerCase() === currentRelease.tlink.toLowerCase() &&
    work.timestamp.toString() !== currentRelease.timestamp.toString()
  );


  // 最新6作品まで表示（日時順でソート）
  return relatedWorks
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

// 元スプシのtlinkによる関連作品表示コンポーネント
const RelatedWorksByTlink = ({ relatedWorks, currentRelease, styles }) => {
  if (!relatedWorks || relatedWorks.length === 0) return null;

  return (
    <div
      className={styles.pastWorksContainer}
      tabIndex="0"
      role="region"
      aria-label={`${currentRelease.creator}による他の作品一覧`}
    >
      <h3 className={styles.pastWorksTitle}>
        <FontAwesomeIcon icon={faUser} className={styles.pastWorksTitleIcon} />
        {currentRelease.creator}による他の作品
      </h3>

      <div className={styles.pastWorksGrid}>
        {relatedWorks.map((work) => {
          const youtubeId = extractYouTubeId(work.ylink);
          const thumbnailUrl = youtubeId
            ? `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`
            : '/next.svg';

          const workDate = new Date(work.timestamp * 1000);
          const formattedDate = `${workDate.getFullYear()}/${String(workDate.getMonth() + 1).padStart(2, '0')}/${String(workDate.getDate()).padStart(2, '0')}`;

          return (
            <div key={work.timestamp} className={styles.pastWorkItem}>
              <Link href={`/release/${work.timestamp}`} className={styles.pastWorkLink}>
                <div className={styles.pastWorkThumbnail}>
                  <img
                    src={thumbnailUrl}
                    alt={`${work.title}のサムネイル`}
                    className={styles.pastWorkImage}
                    onError={(e) => {
                      e.target.src = '/next.svg';
                    }}
                  />
                  <div className={styles.pastWorkOverlay}>
                    <FontAwesomeIcon icon={faPlay} className={styles.pastWorkPlayIcon} />
                  </div>
                </div>
                <div className={styles.pastWorkInfo}>
                  <h4 className={styles.pastWorkTitle}>{work.title}</h4>
                  {work.music && (
                    <p className={styles.pastWorkMusic}>楽曲: {work.music}</p>
                  )}
                  <div className={styles.pastWorkMeta}>
                    {work.event && (
                      <span className={styles.pastWorkEvent}>{work.event}</span>
                    )}
                    <span className={styles.pastWorkDate}>{formattedDate}</span>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
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
        <FontAwesomeIcon icon={faTrophy} className={styles.pastWorksTitleIcon} />
        メンバーの過去PVSF作品
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
              <FontAwesomeIcon icon={faUser} className={styles.memberWorksIcon} />
              {memberWork.memberName} さんの作品 (表示{worksToShow.length}作品{memberWork.works.length >= 4 ? ` / 全${memberWork.works.length}作品中` : ''})
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
                    <img
                      src={work.smallThumbnail || work.largeThumbnail || "https://i.gyazo.com/9f4ec61924577737d1ea2e4af33b2eae.png"}
                      alt={`${work.title} サムネイル`}
                      className={styles.pastWorkImage}
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
          if (!isCurrent) {
            label = relativePosition.toString(); // -3, -2, -1, 1, 2, 3
          }

          return (
            <div key={work.timestamp} className={`${styles.navigationItem} ${isCurrent ? styles.currentItem : ''}`}>
              <div className={styles.navigationDateTime}>
                <span className={styles.navigationDate}>{date}</span>
                <span className={styles.navigationTime}>{time}</span>
              </div>

              <div className={styles.navigationWorkInfo}>
                {work.icon && (
                  <img
                    src={`https://lh3.googleusercontent.com/d/${work.icon.slice(33)}`}
                    className={styles.navigationIcon}
                    alt={`${work.creator} アイコン`}
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

  // 元スプシのtlinkによる関連作品検索
  const relatedWorksByTlink = findRelatedWorksByTlink(release, works);

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
