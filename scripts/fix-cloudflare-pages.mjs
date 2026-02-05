/**
 * Cloudflare Pages デプロイ用のビルド後処理
 * - アセットをルートにコピーし、HTML の /_next/static/ 参照とパスを一致させる
 * - プリレンダ済みページ（/, /page/[id], /blog/[id], /release/[id]）を静的配信用に配置
 * - _routes.json を作成し、静的アセットを CDN から直接配信
 * - _worker.js を用意（Pages の Worker モード用）
 * @see https://www.geekhuashan.com/blog/nextjs-cloudflare-pages-static-assets-404.en
 */
import fs from "fs";
import path from "path";

const OPEN_NEXT_DIR = ".open-next";
const ASSETS_DIR = path.join(OPEN_NEXT_DIR, "assets");
const NEXT_SERVER_PAGES = path.join(".next", "server", "pages");

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

/** プリレンダ済み [id] 系ページを Cloudflare pretty URL 用に配置（/segment/id → segment/id/index.html） */
function createStaticPageStructure(segment) {
  const sourceDir = path.join(NEXT_SERVER_PAGES, segment);
  if (!fs.existsSync(sourceDir)) return 0;
  let count = 0;
  for (const file of fs.readdirSync(sourceDir)) {
    if (!file.endsWith(".html") || file.startsWith("[")) continue;
    const basename = file.replace(/\.html$/, "");
    const targetDir = path.join(OPEN_NEXT_DIR, segment, basename);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(path.join(sourceDir, file), path.join(targetDir, "index.html"));
    count++;
  }
  return count;
}

function main() {
  console.log("🔧 Fixing Cloudflare Pages deployment structure...");

  if (!fs.existsSync(OPEN_NEXT_DIR)) {
    console.error("❌ .open-next directory not found. Run OpenNext build first.");
    process.exit(1);
  }

  if (!fs.existsSync(ASSETS_DIR)) {
    console.warn("⚠️ .open-next/assets not found, skipping asset copy.");
  } else {
    // アセットをルートにコピー（/_next/static/ 等のパスを正しく解決）
    const entries = fs.readdirSync(ASSETS_DIR);
    for (const entry of entries) {
      const src = path.join(ASSETS_DIR, entry);
      const dest = path.join(OPEN_NEXT_DIR, entry);
      if (entry === "assets") continue; // 自己参照を避ける
      copyRecursive(src, dest);
    }
    console.log("✅ Copied assets to root");
  }

  // トップページ（index.html）を確実にルートに配置（NoFallbackError 回避のため静的配信）
  const indexHtmlDest = path.join(OPEN_NEXT_DIR, "index.html");
  const indexHtmlFromNext = path.join(NEXT_SERVER_PAGES, "index.html");
  if (fs.existsSync(indexHtmlFromNext)) {
    fs.copyFileSync(indexHtmlFromNext, indexHtmlDest);
    console.log("✅ Copied index.html to root");
  }

  // プリレンダ済み page/[id], blog/[id], release/[id] を静的配信用に配置
  for (const segment of ["page", "blog", "release"]) {
    const n = createStaticPageStructure(segment);
    if (n > 0) console.log(`✅ Created ${n} static ${segment} pages`);
  }

  // _routes.json: 静的アセットは Worker を経由せず CDN から直接配信
  const routes = {
    version: 1,
    include: ["/*"],
    exclude: [
      "/",
      "/index.html",
      "/page/*",
      "/blog/*",
      "/release/*",
      "/_next/static/*",
      "/_next/data/*",
      "/static/*",
      "/images/*",
      "/favicon.ico",
      "/favicons/*",
      "/robots.txt",
      "/sitemap*.xml",
      "/feed.xml",
      "/404.html",
      "/BUILD_ID",
      "/search.json",
    ],
  };
  fs.writeFileSync(
    path.join(OPEN_NEXT_DIR, "_routes.json"),
    JSON.stringify(routes, null, 2)
  );
  console.log("✅ Created _routes.json");

  // Pages 用に _worker.js を用意（worker.js をコピー）
  const workerPath = path.join(OPEN_NEXT_DIR, "worker.js");
  const workerPagesPath = path.join(OPEN_NEXT_DIR, "_worker.js");
  if (fs.existsSync(workerPath)) {
    fs.copyFileSync(workerPath, workerPagesPath);
    console.log("✅ Created _worker.js for Cloudflare Pages");
  }

  // wrangler.json: Pages が _worker.js をバンドルする際に nodejs_compat を適用するため必須
  // 出力ディレクトリ内に配置することで、デプロイ時の再バンドルで Node 組み込みモジュールが解決される
  const wranglerPagesConfig = {
    name: "pvsf",
    compatibility_date: "2025-02-01",
    compatibility_flags: ["nodejs_compat", "global_fetch_strictly_public"],
  };
  fs.writeFileSync(
    path.join(OPEN_NEXT_DIR, "wrangler.json"),
    JSON.stringify(wranglerPagesConfig, null, 2)
  );
  console.log("✅ Created wrangler.json for Pages deployment");

  console.log("✨ Cloudflare Pages structure ready!");
}

main();
