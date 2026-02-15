import fs from "fs";
import path from "path";
import fetch from "node-fetch";

// ylinkから動画IDを抽出する関数
function extractVideoId(url) {
  if (!url) return null;
  const match = url.match(
    /youtu\.be\/([a-zA-Z0-9_-]{11})|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)([^"&?\/\s]{11})/
  );
  return match ? match[1] || match[2] : null;
}

// キャッシュから動画データを取得するヘルパー関数
const getCachedVideoData = (videoId) => {
  const cacheFilePath = path.join(process.cwd(), "cache", `${videoId}.json`);
  if (fs.existsSync(cacheFilePath)) {
    const cacheData = JSON.parse(fs.readFileSync(cacheFilePath, "utf8"));
    return cacheData.data; // dataプロパティに実際の動画情報が入っていると仮定
  }
  return null;
};

// 動画のエンゲージメントポイントを計算するヘルパー関数
const getVideoEngagementPoints = (viewCount, likeCount, isIndividualWork) => {
  const adjustedViewCount = viewCount || 0;
  const adjustedLikeCount = likeCount || 0;

  let viewPoints = 0;
  // 再生数10000につき200pt (例: 10000再生 -> 200pt, 20000再生 -> 400pt)
  viewPoints = (adjustedViewCount / 10000) * 200;

  const likePoints = adjustedLikeCount * 5;

  let totalEngagementPointsForOneVideo = viewPoints + likePoints;

  // 作品の種類に応じて最大ポイントを適用
  if (isIndividualWork) {
    return Math.min(500, totalEngagementPointsForOneVideo); // 個人作品は最大500pt
  } else {
    return Math.min(100, totalEngagementPointsForOneVideo); // 合作作品は最大100pt
  }
};

// デフォルトエクスポートのハンドラ関数
export default async function handler(req, res) {
  try {
    // スプレッドシートデータを取得
    const response = await fetch(
      "https://script.google.com/macros/s/AKfycbyEph6zXb1IWFRLpTRLNLtxU4Kj7oe10bt2ifiyK09a6nM13PASsaBYFe9YpDj9OEkKTw/exec"
    );

    if (!response.ok) {
      throw new Error("スプレッドシートデータの取得に失敗しました");
    }

    const data = await response.json();

    // 文字列を正規化する関数
    const normalizeString = (str) => {
      if (!str) return "";
      return str.toLowerCase().trim().replace(/[\s\u3000]+/g, "").replace(/[^\w]/g, "");
    };

    // `tlink`を含む配列を抽出し、正規化
    const tlinkList = data
      .map((item) => normalizeString(item.tlink))
      .filter(Boolean)
      .filter((value) => value.length > 3) // 3文字以下の値を削除
      .filter((value, index, self) => self.indexOf(value) === index) // 重複削除
      .sort(); // 並び替え

    // `memberid`を含む配列を抽出し、正規化
    const memberidList = data
      .map((item) => item.memberid)
      .filter(Boolean)
      .flatMap((memberid) => memberid.split(","))
      .filter(Boolean)
      .map((memberid) => normalizeString(memberid)) // 正規化
      .filter((value) => value.length > 3) // 3文字以下の値を削除

    // `memberidList`の中で2回以上出現するユーザーを抽出
    const memberidCounts = memberidList.reduce((counts, memberid) => {
      counts[memberid] = (counts[memberid] || 0) + 1;
      return counts;
    }, {});

    const activeMemberidList = Object.keys(memberidCounts)
      .filter((key) => memberidCounts[key] >= 2)
      .sort(); // 2回以上の出現のものだけを抽出し、並び替え

    // 全てのユーザー名を統合（tlink + 活発なmemberid）
    const allUsernames = [...new Set([...tlinkList, ...activeMemberidList])].sort();

    // 各ユーザーの全ての情報を取得する関数
    const getUserWithAllInfo = (username) => {
      // tlinkとしてのデータを取得
      const tlinkData = data.filter(item =>
        item.tlink && normalizeString(item.tlink) === username
      );

      // memberidとしてのデータを取得
      const memberidData = data.filter(item => {
        if (!item.memberid || !item.member) return false;
        const memberids = item.memberid.split(",").map(id => normalizeString(id));
        return memberids.includes(username);
      });

      console.log(`username "${username}" - tlink: ${tlinkData.length} items, memberid: ${memberidData.length} items`);

      if (tlinkData.length === 0 && memberidData.length === 0) {
        return {
          username: username,
          icon: null,
          creatorName: null,
          ychlink: null,
          iylink: [],
          cylink: [],
          mylink: []
        };
      }

      // 個人データの優先度を決定（tlinkデータ > memberidの個人データ > その他）
      let latestData = null;
      let creatorName = null;
      let iconData = null;

      // tlinkデータがある場合は優先
      if (tlinkData.length > 0) {
        const personalTlinkData = tlinkData.filter(item =>
          item.type === "個人" || item.type1 === "個人" || item.type2 === "個人"
        );

        if (personalTlinkData.length > 0) {
          // 個人データがある場合
          latestData = personalTlinkData.sort((a, b) => new Date(b.time) - new Date(a.time))[0];
          iconData = latestData; // アイコンも個人データから取得
          creatorName = latestData.creator || null;
        } else {
          // 個人データがない場合、memberidとmemberからの取得を試みる
          let foundFromMemberData = false;

          // まずmemberidDataから取得を試みる（個人データを優先）
          if (memberidData.length > 0) {
            const personalMemberData = memberidData.filter(item =>
              item.type === "個人" || item.type1 === "個人" || item.type2 === "個人"
            );
            const targetMemberData = personalMemberData.length > 0 ? personalMemberData : memberidData;

            for (const item of targetMemberData) {
              if (item.memberid && item.member) {
                const memberids = item.memberid.split(",").map(id => normalizeString(id));
                const members = item.member.split(",").map(name => name.trim());
                const index = memberids.indexOf(username);
                if (index !== -1 && index < members.length) {
                  latestData = item;
                  creatorName = members[index];
                  foundFromMemberData = true;
                  break;
                }
              }
            }
          }

          // memberidDataから取得できない場合、tlinkDataの中でmemberidとmemberが存在するものを探す
          if (!foundFromMemberData) {
            for (const item of tlinkData) {
              if (item.memberid && item.member) {
                const memberids = item.memberid.split(",").map(id => normalizeString(id));
                const members = item.member.split(",").map(name => name.trim());
                const index = memberids.indexOf(username);
                if (index !== -1 && index < members.length) {
                  latestData = item;
                  creatorName = members[index];
                  foundFromMemberData = true;
                  break;
                }
              }
            }
          }

          // それでも取得できない場合は全データから選択（creatorNameのみ）
          if (!foundFromMemberData) {
            latestData = tlinkData.sort((a, b) => new Date(b.time) - new Date(a.time))[0];
            creatorName = latestData.creator || null;
          }

          // 個人データがない場合はアイコンを取得しない
          iconData = null;
        }
      } else if (memberidData.length > 0) {
        // tlinkデータがない場合はmemberidデータから取得
        const personalMemberData = memberidData.filter(item =>
          item.type === "個人" || item.type1 === "個人" || item.type2 === "個人"
        );
        const targetMemberData = personalMemberData.length > 0 ? personalMemberData : memberidData;
        latestData = targetMemberData.sort((a, b) => new Date(b.time) - new Date(a.time))[0];

        // memberidに対応するmember名を取得
        if (latestData.memberid && latestData.member) {
          const memberids = latestData.memberid.split(",").map(id => normalizeString(id));
          const members = latestData.member.split(",").map(name => name.trim());
          const index = memberids.indexOf(username);
          if (index !== -1 && index < members.length) {
            creatorName = members[index];
          }
        }

        // memberidを根拠にしたアイコン取得は行わない
        iconData = null;
      }

      // 動画IDを分類
      const iylink = [];
      const cylink = [];
      const mylink = [];

      // tlinkからの動画ID（個人扱い）
      tlinkData.forEach(item => {
        if (item.ylink) {
          const videoId = extractVideoId(item.ylink);
          if (videoId) {
            // eventidにPVSFSummaryが含まれる場合はmylinkに分類
            if (item.eventid && item.eventid.includes("PVSFSummary")) {
              mylink.push(videoId);
            } else {
              iylink.push(videoId);
            }
          }
        }
      });

      // memberidからの動画ID（複数人扱い）
      memberidData.forEach(item => {
        if (item.ylink && item.memberid) {
          const memberids = item.memberid.split(",").map(id => normalizeString(id));
          if (memberids.includes(username)) {
            const videoId = extractVideoId(item.ylink);
            if (videoId) {
              // eventidにPVSFSummaryが含まれる場合はmylinkに分類
              if (item.eventid && item.eventid.includes("PVSFSummary")) {
                mylink.push(videoId);
              } else {
                cylink.push(videoId);
              }
            }
          }
        }
      });

      console.log(`username "${username}" iylink: ${iylink.length}, cylink: ${cylink.length}, mylink: ${mylink.length}`);

      // creatorScoreを計算
      const creatorScore = calculateCreatorScore(iylink, cylink, mylink, latestData);

      return {
        username: username,
        icon: iconData?.icon || null,
        creatorName: creatorName,
        ychlink: latestData?.ychlink || null,
        iylink: [...new Set(iylink)], // 重複削除
        cylink: [...new Set(cylink)], // 重複削除
        mylink: [...new Set(mylink)], // 重複削除
        creatorScore: creatorScore
      };
    };

    // creatorScoreを計算する関数
    const calculateCreatorScore = (iylink, cylink, mylink, latestData) => {
      const baseScore = 1000;

      // 作品数ボーナス
      const individualWorksBonus = iylink.length * 50; // 個人作品: 50pt/作品
      const collaborationWorksBonus = cylink.length * 25; // 合作作品: 25pt/作品
      const specialWorksBonus = mylink.length * 0; // 特別作品: 0pt/作品
      const worksBonus = individualWorksBonus + collaborationWorksBonus + specialWorksBonus;

      // 時間ボーナス（最新作品からの経過日数に基づく）
      let timeBonus = 0;
      if (latestData && latestData.time) {
        const daysSinceLatest = Math.floor((Date.now() - new Date(latestData.time)) / (1000 * 60 * 60 * 24));
        timeBonus = Math.max(0, 500 * Math.exp(-daysSinceLatest / 365)); // 3年でほぼ0になる緩やかな指数減衰関数 (最大500pt)
      }

      // エンゲージメントボーナス
      let engagementBonus = 0;

      // 個人作品エンゲージメントボーナス
      let individualEngagementSum = 0;
      iylink.forEach(videoId => {
        const videoData = getCachedVideoData(videoId);
        if (videoData) {
          const viewCount = parseInt(videoData.viewCount || 0);
          const likeCount = parseInt(videoData.likeCount || 0);
          individualEngagementSum += getVideoEngagementPoints(viewCount, likeCount, true);
        }
      });
      const individualDivisor = Math.max(1, iylink.length * 0.3);
      engagementBonus += individualEngagementSum / individualDivisor;

      // 合作作品エンゲージメントボーナス
      let collaborationEngagementSum = 0;
      cylink.forEach(videoId => {
        const videoData = getCachedVideoData(videoId);
        if (videoData) {
          const viewCount = parseInt(videoData.viewCount || 0);
          const likeCount = parseInt(videoData.likeCount || 0);
          collaborationEngagementSum += getVideoEngagementPoints(viewCount, likeCount, false);
        }
      });
      const collaborationDivisor = Math.max(1, cylink.length * 0.3);
      engagementBonus += collaborationEngagementSum / collaborationDivisor;

      const totalScore = baseScore + timeBonus + worksBonus + engagementBonus;
      return Math.round(totalScore);
    };

    // 全ユーザー（全情報付き）を作成
    const username = allUsernames.map(user => getUserWithAllInfo(user));

    // APIレスポンスとして返す
    res.status(200).json(username);
  } catch (error) {
    console.error("エラー:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
