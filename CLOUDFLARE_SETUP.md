# Cloudflare Pages デプロイ設定ガイド

## 必要なファイル

以下のファイルがリポジトリに含まれている必要があります：

1. **`open-next.config.ts`** - OpenNextの設定ファイル
2. **`wrangler.jsonc`** - Cloudflare Workers設定
3. **`package.json`** - `build:pages` スクリプト

---

## Cloudflare Pages ダッシュボード設定

### 1. プロジェクト作成

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) にログイン
2. **Workers & Pages** → **Create** → **Pages**
3. **Connect to Git** → GitHubリポジトリを選択

### 2. ビルド設定

| 設定項目 | 値 |
|---------|-----|
| **Build command** | `npm run build:pages` |
| **Build output directory** | `.open-next` |
| **Root directory** | `/` (デフォルト) |

### 3. 環境変数

以下の環境変数を **Settings → Environment variables** で設定：

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

> ⚠️ **重要**: `FIREBASE_PRIVATE_KEY` は改行を `\n` に置換して1行にするか、ダブルクォートで囲んでください。

### 4. Node.jsバージョン（重要）

**Settings → Environment variables** で以下を設定：

```
NODE_VERSION=22
```

または、**Build system version** を **v2** に設定（デフォルトでNode.js 22が使用されます）。

> ⚠️ 現在の `yargs` パッケージは `^20.19.0 || ^22.12.0 || >=23` を要求しています。  
> **推奨: Node.js 22** を使用してください。

---

## R2バケット設定（オプション）

`open-next.config.ts` で R2 インクリメンタルキャッシュを使用する場合：

1. **R2** → **Create bucket** でバケットを作成
2. **Workers & Pages** → プロジェクト → **Settings** → **Bindings**
3. **Add binding** → **R2 bucket** を選択
4. Variable name: `CACHE_BUCKET` / Bucket: 作成したバケット

---

## トラブルシューティング

### ビルドエラー: Missing required `open-next.config.ts`

`open-next.config.ts` がリポジトリにコミットされていることを確認してください。

### Node.js バージョンエラー

`NODE_VERSION` 環境変数を `20.19.0` 以上に設定してください。

### Firebase Admin エラー

`FIREBASE_PRIVATE_KEY` の改行が正しくエスケープされているか確認してください。

---

## 確認コマンド

ローカルでビルドをテスト：

```bash
npm install
npm run build:pages
```

ローカルプレビュー：

```bash
npx wrangler pages dev .open-next
```
