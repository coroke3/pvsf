# Cloudflare Pages デプロイ設定ガイド (Build System v3)

> このプロジェクトは **Cloudflare Pages** へデプロイします。OpenNext を使用して Next.js を Cloudflare の Workers ランタイムで動作させます。

## 必要なファイル

以下のファイルがリポジトリに含まれている必要があります：

1. **`open-next.config.ts`** - OpenNext の設定ファイル
2. **`wrangler.jsonc`** - Cloudflare Pages 用設定
3. **`package.json`** - `build:pages` スクリプト（WRANGLER 変数を内蔵）
4. **`.node-version`** / **`.tool-versions`** - Node.js 20 指定

---

## Cloudflare Pages ダッシュボード設定

### 1. プロジェクト作成

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) にログイン
2. **Workers & Pages** → **Create** → **Pages**
3. **Connect to Git** → GitHub リポジトリを選択

### 2. ビルド設定

| 設定項目 | 値 |
|---------|-----|
| **Build command** | `npm run build:pages` |
| **Build output directory** | `.open-next` |
| **Root directory** | `/` (デフォルト) |

### 3. Build System Version

**Settings → Build & deployments → Build system version** で **v3** を選択

### 4. 環境変数

**Settings → Environment variables** で以下の環境変数を設定してください。

> ✅ `WRANGLER_BUILD_PLATFORM` と `WRANGLER_BUILD_CONDITIONS` は `build:pages` スクリプトに内蔵済みのため、ダッシュボードでの設定は不要です。

```
# Firebase (本番環境)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (サーバーサイド用)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# NextAuth.js
NEXTAUTH_SECRET=your_random_secret_string
NEXTAUTH_URL=https://your-domain.pages.dev

# Discord OAuth
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
```

> ⚠️ `FIREBASE_PRIVATE_KEY` は改行を `\n` に置換して1行にしてください。

---

## Node.js バージョン

Cloudflare の asdf では Node.js 22 が未対応のため、**Node.js 20** を使用します。

- `.node-version`: `20`
- `.tool-versions`: `nodejs 20.18.1`

ビルド環境の `NODE_VERSION` や `NVM_NODE_VERSION` で Node 22 を指定している場合は、20 に変更してください。

---

## R2 バケット設定（ISR 用・オプション）

`open-next.config.ts` で R2 インクリメンタルキャッシュを使用する場合：

1. **R2** → **Create bucket** でバケットを作成
2. **Workers & Pages** → プロジェクト → **Settings** → **Bindings**
3. **Add binding** → **R2 bucket** を選択
4. Variable name: `NEXT_INC_CACHE_R2_BUCKET` / Bucket: 作成したバケット
5. `wrangler.jsonc` に R2 バインディングを追加

R2 未設定の場合は ISR のキャッシュが制限されますが、ビルドと基本的な動作は可能です。

---

## トラブルシューティング

### ビルドエラー: Missing required `open-next.config.ts`

`open-next.config.ts` がリポジトリにコミットされていることを確認してください。

### ビルドエラー: Could not resolve "@emotion/react" または "jose"

`package.json` の `build:pages` に `WRANGLER_BUILD_PLATFORM=node` が含まれているか確認してください。含まれていない場合は手動で追加するか、Cloudflare ダッシュボードで設定してください。

### ビルドエラー: node-build: definition not found: 22

`.tool-versions` と `.node-version` を Node.js 20 に変更してください。

### wrangler.toml の警告

「A wrangler.toml file was found but it does not appear to be valid」という警告は無視して構いません。`wrangler.jsonc` が使用されます。

### edge runtime エラー

`experimental-edge` ランタイムは OpenNext と互換性がありません。該当ページから `export const runtime = 'experimental-edge';` を削除してください。

### トップページ・静的アセットで 404 になる

`scripts/fix-cloudflare-pages.mjs` が `build:pages` の最後に自動実行されます。このスクリプトは以下を行います：

1. **アセットをルートにコピー**: HTML が参照する `/_next/static/` と実際のファイルパスを一致させます
2. **`_routes.json` の作成**: 静的アセットを CDN から直接配信するようルーティングを設定します
3. **`_worker.js` の生成**: Cloudflare Pages の Worker モード用エントリーポイントを用意します

`wrangler.jsonc` の `run_worker_first` が `true` の場合は、すべてのリクエストが Worker を経由します。ダイナミックルートやリライトが必要な場合は必須です。

---

## 確認コマンド

ローカルでビルドをテスト：

```bash
npm install
npm run build:pages
```

> **Windows ユーザー**: `cross-env` により Windows でもローカルビルドが可能です。

ローカルプレビュー：

```bash
npx wrangler pages dev .open-next
```

---

## 設定まとめ

| 項目 | 設定値 |
|------|--------|
| Build system version | **v3** |
| Build command | `npm run build:pages` |
| Build output directory | `.open-next` |
| Node.js version | 20 |
| ビルド用環境変数 | build:pages スクリプトに内蔵 |
