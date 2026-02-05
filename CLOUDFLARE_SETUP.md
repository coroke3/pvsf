# Cloudflare Pages デプロイ設定ガイド (Build System v3)

> このプロジェクトは **Cloudflare Pages** へデプロイします。OpenNext を使用して Next.js を Cloudflare の Workers ランタイムで動作させます。
>
> **Node.js 組み込みモジュールの解決エラーが発生する場合**：Cloudflare **Workers** への直接デプロイに切り替えることを推奨します（下記「Cloudflare Workers へのデプロイ（推奨）」を参照）。

## 必要なファイル

以下のファイルがリポジトリに含まれている必要があります：

1. **`open-next.config.ts`** - OpenNext の設定ファイル
2. **`wrangler.jsonc`** - Cloudflare Pages 用設定（`pages_build_output_dir` と `nodejs_compat` を含む）
3. **`wrangler.workers.jsonc`** - Cloudflare Workers 直接デプロイ用（`deploy:workers` で使用）
4. **`package.json`** - `build:pages` / `build:workers` スクリプト（WRANGLER 変数を内蔵）
5. **`.node-version`** / **`.tool-versions`** - Node.js 20 指定

---

## Cloudflare Workers へのデプロイ（推奨）

`async_hooks`、`fs`、`path` などの Node.js 組み込みモジュールの解決エラーが Pages デプロイで発生する場合、**Cloudflare Workers** への直接デプロイを使用してください。Workers では `wrangler.jsonc` の `compatibility_flags` や `nodejs_compat` が確実に適用されます。

### 手順

1. **Cloudflare にログイン**
   ```bash
   npx wrangler login
   ```

2. **環境変数を wrangler.jsonc に設定**
   - `wrangler.jsonc` の `vars` に本番用の環境変数を追加するか、`[vars]` セクションで設定
   - または `wrangler secret put` でシークレットを登録

3. **ビルド＆デプロイ**
   ```bash
   npm run deploy:workers
   ```

   - `build:workers`：OpenNext ビルド（fix-cloudflare-pages を実行しない）
   - `deploy:workers`：ビルド後に `@opennextjs/cloudflare deploy` で Workers へデプロイ

### wrangler.workers.jsonc の確認

Workers デプロイでは `wrangler.workers.jsonc` が使用されます（`--config wrangler.workers.jsonc`）。以下を確認してください：

- `compatibility_date`: `2024-09-23` 以降
- `compatibility_flags`: `["nodejs_compat", "global_fetch_strictly_public"]`

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
5. `wrangler.workers.jsonc` に R2 バインディングを追加

R2 未設定の場合は ISR のキャッシュが制限されますが、ビルドと基本的な動作は可能です。

---

## トラブルシューティング

### ビルドエラー: Missing required `open-next.config.ts`

`open-next.config.ts` がリポジトリにコミットされていることを確認してください。

### ビルドエラー: Could not resolve "@emotion/react" または "jose"

`open-next.config.ts` で `useWorkerdCondition: false` を設定し、Node 解決を使用するようにしてください。これにより @emotion/react などの workerd 非対応パッケージが正しくバンドルされます。

なお、`package.json` の `build:pages` に `WRANGLER_BUILD_PLATFORM=node` が含まれているか、`.env` に設定があるかも確認してください。

### ビルドエラー: node-build: definition not found: 22

`.tool-versions` と `.node-version` を Node.js 20 に変更してください。

### ビルドエラー: Could not resolve "async_hooks" などの Node 組み込みモジュール

デプロイ時に `async_hooks`、`fs`、`path` などの Node.js 組み込みモジュールが解決できない場合：

**推奨**: **Cloudflare Workers** への直接デプロイに切り替えてください（上記「Cloudflare Workers へのデプロイ（推奨）」を参照）。Workers では `nodejs_compat` が確実に適用されます。

Pages を使い続ける場合の確認事項：

- **`wrangler.jsonc`**（Pages 用）に `pages_build_output_dir: ".open-next"` と `compatibility_flags: ["nodejs_compat", "global_fetch_strictly_public"]` を含める。これにより Pages が wrangler 設定を認識し、`_worker.js` バンドル時に `nodejs_compat` が適用される。
- **`wrangler.workers.jsonc`**（Workers 用）は `deploy:workers` 専用。`wrangler.jsonc` とは別ファイルとして維持する。

### wrangler.toml の警告

「A wrangler.toml file was found but it does not appear to be valid」という警告は無視して構いません。`wrangler.jsonc` が使用されます。

### edge runtime エラー

`experimental-edge` ランタイムは OpenNext と互換性がありません。該当ページから `export const runtime = 'experimental-edge';` を削除してください。

### トップページ・静的アセットで 404 になる

`scripts/fix-cloudflare-pages.mjs` が `build:pages` の最後に自動実行されます。このスクリプトは以下を行います：

1. **アセットをルートにコピー**: HTML が参照する `/_next/static/` と実際のファイルパスを一致させます
2. **トップページ（index.html）の配置**: `index.html` をルートに配置し、ルートパス `/` を静的配信します（NoFallbackError 回避）
3. **プリレンダ済みページの静的化**: `/page/[id]`, `/blog/[id]`, `/release/[id]` を pretty URL 形式（`segment/id/index.html`）で配置し、CDN から直接配信します
4. **`_routes.json` の作成**: `/`, `/page/*`, `/blog/*`, `/release/*`, 静的アセットを CDN から直接配信するようルーティングを設定します
5. **`_worker.js` の生成**: Cloudflare Pages の Worker モード用エントリーポイントを用意します

`wrangler.jsonc` の `run_worker_first` が `true` の場合は、すべてのリクエストが Worker を経由します。ダイナミックルートやリライトが必要な場合は必須です。トップページは `_routes.json` の `exclude` に含めることで Worker をバイパスし、CDN から直接配信されます。

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
