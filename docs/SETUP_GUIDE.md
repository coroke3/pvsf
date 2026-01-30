# Discord & Firebase 認証セットアップガイド

このプロジェクトでは、ユーザー管理に **NextAuth.js** (Discord プロバイダー) と **Firebase Admin SDK** を使用しています。

以下の手順に従って認証システムを設定してください。

## 1. Discord Developer Portal の設定

1. [Discord Developer Portal](https://discord.com/developers/applications) にアクセスします。
2. **New Application** をクリックし、名前を付けます（例: "PVSF Dev"）。
3. 左サイドバーの **OAuth2** タブに移動します。
4. **Client ID** と **Client Secret** を控えます。
5. Secret が表示されていない場合は **Reset Secret** をクリックしてください。
6. **Redirects** に以下を追加します:
   - `http://localhost:3000/api/auth/callback/discord`
   - *(本番環境用URLは後で追加します。例: `https://your-domain.com/api/auth/callback/discord`)*
7. (任意) ボット機能を使用する場合は **Bot** タブで設定を行ってください。

## 2. Firebase Console の設定

1. [Firebase Console](https://console.firebase.google.com/) にアクセスします。
2. 新しいプロジェクトを作成するか、既存のプロジェクトを選択します。
3. **Authentication (認証) を有効化**:
   - Build (構築) -> Authentication -> Get Started (始める) をクリック。
4. **Firestore Database を有効化**:
   - Build (構築) -> Firestore Database -> Create Database (データベースの作成) をクリック。
   - **Test mode (テストモード)** で開始します（開発用）。
5. **クライアント側の設定を取得**:
   - プロジェクト設定（歯車アイコン） -> General (全般) に移動します。
   - 下にスクロールし、"Your apps" (マイアプリ) -> Web app (</>) を選択。
   - アプリを登録します（Hostingの設定はまだ不要です）。
   - `firebaseConfig` の値（apiKey, authDomain など）をコピーします。

## 3. Firebase Admin の設定 (サービスアカウント)

1. プロジェクト設定の **Service accounts (サービスアカウント)** タブに移動します。
2. **Generate new private key (新しい秘密鍵の生成)** をクリックします。
3. サービスアカウントの認証情報が含まれた JSON ファイルがダウンロードされます。
4. **重要**: このファイルの内容が `FIREBASE_SERVICE_ACCOUNT_KEY` です。
   - **形式**: `.env.local` に貼り付ける際は、JSON全体を **1行** にする必要があります。
   - ファイル内の改行コードをすべて削除してから貼り付けてください。

## 4. 環境変数の設定

`.env.local` ファイルを開き、以下の値を入力してください:

```bash
# Firebase Client SDK (手順 2.5)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase Admin SDK (手順 3)
# 1行にしたJSON文字列をここに貼り付けます
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":...}

# Discord OAuth (手順 1)
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET= # ランダムな文字列を生成して設定してください (openssl rand -base64 32 等)
```

## 5. MicroCMS の設定 (未設定の場合)

MicroCMSを使用している場合は、キーが設定されているか確認してください:
```bash
NEXT_PUBLIC_SERVICE_DOMAIN=...
NEXT_PUBLIC_API_KEY=...
```

## 6. サーバーの再起動

`.env.local` を保存した後、開発サーバーを再起動してください:
```bash
Ctrl+C
npm run dev
```

## 7. 管理者権限の付与

**重要**: 初期状態では全員が `user` ロールになります。管理者権限を付与するには Firestore を直接操作します。

1. [Firebase Console](https://console.firebase.google.com/) の **Firestore Database** を開きます。
2. `users` コレクションを開きます。
3. 自分のユーザー・ドキュメントを探します（IDはDiscordのユーザーIDになっています）。
4. `role` フィールドの値を `'user'` から `'admin'` に書き換えます。
5. **重要**: アプリ側で一度ログアウトし、再ログインすると管理者権限が反映されます。
