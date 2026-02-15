import fs from "fs";
import path from "path";

// デフォルトエクスポートのハンドラ関数
export default async function handler(req, res) {
  // CORSヘッダーを設定
  const allowedOrigins = [
    "http://localhost:4321",
    "http://localhost:4322",
    "http://localhost:3000",
    "http://localhost:3001",
    "https://pvsf.jp",
    "https://pvsf.pages.dev",
    "https://pvsf-astro.pages.dev",
    "https://pvsf-archive.pages.dev",
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    const sheetData = await fetchSpreadsheetData();
    const newData = await fetchNewData();

    // 新しいデータを既存のデータに統合
    const combinedData = [...sheetData]; // 既存のデータを初期値として使用

    newData
      .filter((item) => item.ylink) // ylinkがある作品のみ
      .forEach((item) => {
        const existingItem = combinedData.find(
          (data) => data.ylink === item.ylink
        );
        if (!existingItem) {
          // .dataと.timeを結合してISO形式に変換
          let timeISO = item.time;
          if (item.data && item.time) {
            const [month, day] = item.data.split("/");
            const [hour, minute] = item.time.split(":");
            const currentYear = new Date().getFullYear();
            const date = new Date(currentYear, month - 1, day, hour, minute);
            date.setHours(date.getHours() + 9); // 9時間を加算
            timeISO = date.toISOString();
          }

          // 既存のデータがない場合のみ新しいデータを追加
          combinedData.push({
            ...item,
            time: timeISO,
          });
        }
      });

    // 既存のデータと新しいデータを結合し、timeで逆順にソート
    const updatedData = combinedData.sort(
      (a, b) => new Date(b.time) - new Date(a.time)
    );

    const batchSize = 9999; // 一度に処理する動画数
    for (let i = 0; i < updatedData.length; i += batchSize) {
      const batch = updatedData.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (video) => {
          const videoId = extractVideoId(video.ylink);
          if (!videoId)
            return {
              ...video,
              status: "Invalid video ID",
              smallThumbnail: "",
              largeThumbnail: "",
              viewCount: 0,
              likeCount: 0,
              daysSincePublished: 0,
              videoScore: 0,
              deterministicScore: 0,
            };

          try {
            const videoInfo = await fetchYouTubeData(videoId);
            return { ...video, ...videoInfo };
          } catch (error) {
            console.error(
              `Error fetching YouTube data for video ID ${videoId}:`,
              error
            );
            return {
              ...video,
              status: "private",
              smallThumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
              largeThumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
              viewCount: 0,
              likeCount: 0,
              daysSincePublished: 0,
              videoScore: 0,
              deterministicScore: 0,
            };
          }
        })
      );

      updatedData.splice(i, batchSize, ...batchResults);
    }

    res.status(200).json(updatedData);
  } catch (error) {
    console.error("エラー:", error);
    res.status(500).json({ error: "エラー" });
  }
}

// スプレッドシートからデータを取得する関数
async function fetchSpreadsheetData() {
  const response = await fetch(
    "https://script.google.com/macros/s/AKfycbyEph6zXb1IWFRLpTRLNLtxU4Kj7oe10bt2ifiyK09a6nM13PASsaBYFe9YpDj9OEkKTw/exec"
  );
  if (!response.ok) {
    throw new Error("スプレッドシートデータの取得に失敗しました");
  }
  return await response.json();
}

// 新しいデータを取得する関数
async function fetchNewData() {
  const response = await fetch(
    "https://script.google.com/macros/s/AKfycbyoJtRhCw1DLnHOcbGkSd2_gXy6Zvdj-nYZbIM17sOL82BdIETte0d-hDRP7qnYyDPpAQ/exec"
  );
  if (!response.ok) {
    throw new Error("新しいデータの取得に失敗しました");
  }
  return await response.json();
}

// YouTube APIを使用して公開状況、再生回数、高評価数、公開日からの経過日数を取得する関数
async function fetchYouTubeData(videoId) {
  const cacheFilePath = path.join(process.cwd(), "cache", `${videoId}.json`);

  // キャッシュが存在する場合は常にそれを使用
  if (fs.existsSync(cacheFilePath)) {
    const cacheData = JSON.parse(fs.readFileSync(cacheFilePath, "utf8"));
    const { data } = cacheData;

    // キャッシュデータを返す
    return {
      ...data,
      videoScore: calculateVideoScore(data, true),
      deterministicScore: calculateVideoScore(data, false),
    };
  }

  // キャッシュがない場合は新規取得
  return await fetchAndCacheYouTubeData(videoId, cacheFilePath);
}

// YouTube APIからデータを取得してキャッシュする関数
async function fetchAndCacheYouTubeData(videoId, cacheFilePath) {
  const now = Date.now();
  const apiKey = process.env.YOUTUBE_API_KEY;

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,statistics,status`
    );
    if (!response.ok) throw new Error("YouTubeデータ取得に失敗しました");

    const data = await response.json();
    if (data.items.length === 0) {
      throw new Error("動画が見つかりません");
    }

    const videoData = data.items[0];
    const thumbnails = videoData.snippet.thumbnails;

    let smallThumbnail = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    let largeThumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    if (thumbnails) {
      if (thumbnails.medium) {
        smallThumbnail = thumbnails.medium.url;
      } else if (thumbnails.default) {
        smallThumbnail = thumbnails.default.url;
      } else if (thumbnails.high) {
        smallThumbnail = thumbnails.high.url;
      } else if (thumbnails.standard) {
        smallThumbnail = thumbnails.standard.url;
      }

      if (thumbnails.maxres) {
        largeThumbnail = thumbnails.maxres.url;
      } else if (thumbnails.high) {
        largeThumbnail = thumbnails.high.url;
      } else if (thumbnails.standard) {
        largeThumbnail = thumbnails.standard.url;
      } else if (thumbnails.medium) {
        largeThumbnail = thumbnails.medium.url;
      } else if (thumbnails.default) {
        largeThumbnail = thumbnails.default.url;
      }
    }

    const result = {
      status: videoData.status.privacyStatus,
      smallThumbnail,
      largeThumbnail,
      viewCount: videoData.statistics.viewCount,
      likeCount: videoData.statistics.likeCount,
      daysSincePublished: Math.floor(
        (Date.now() - new Date(videoData.snippet.publishedAt)) /
          (1000 * 60 * 60 * 24)
      ),
      ylink: `https://youtu.be/${videoId}`,
    };

    // キャッシュを保存
    fs.writeFileSync(
      cacheFilePath,
      JSON.stringify({ timestamp: now, data: result })
    );

    return {
      ...result,
      videoScore: calculateVideoScore(result, true),
      deterministicScore: calculateVideoScore(result, false),
    };
  } catch (error) {
    console.error(
      `Error fetching YouTube data for video ID ${videoId}:`,
      error
    );

    const result = {
      status: "private",
      smallThumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      largeThumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      viewCount: 0,
      likeCount: 0,
      daysSincePublished: 0,
    };

    return {
      ...result,
      videoScore: calculateVideoScore(result, true),
      deterministicScore: 0,
    };
  }
}

// 動画スコアを計算する関数
function calculateVideoScore(
  { viewCount, likeCount, daysSincePublished },
  includeRandom
) {
  const randomValue = includeRandom ? Math.random() * 4000 - 2000 : 0; // ランダム値
  return Math.round(
    Math.sqrt(viewCount) +
      (likeCount * 15) / ((daysSincePublished + 1000) / 1000) +
      randomValue +
      3000 * ((likeCount * 10) / (viewCount || 1)) // viewCountが0の場合に0除算を防ぐ
  );
}

// ylinkから動画IDを抽出する関数
function extractVideoId(url) {
  const match = url.match(
    /youtu\.be\/([a-zA-Z0-9_-]{11})|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)([^"&?\/\s]{11})/
  );
  return match ? match[1] || match[2] : null;
}
