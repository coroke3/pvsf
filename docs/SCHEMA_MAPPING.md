# データベース 新旧対応表 (Schema Mapping)

## 概要

旧形式: Google スプレッドシート (GAS API) → `google_data.json` / `videos_data.json`
新形式: Firebase Firestore `videos` コレクション (`VideoDocument`)

## Videos: フィールド対応表

| # | 旧キー | 新キー (Firestore) | 型 (旧) | 型 (新) | 備考 |
|---|--------|-------------------|---------|---------|------|
| 1 | `timestamp` | `timestamp` | string (ISO) | Date \| null | フォーム送信時刻 |
| 2 | `type1` / `type` | `type` | string | string | 参加部門 (個人/団体/混合) |
| 3 | `type2` | `type2` | string | string | 制作形態 (個人/複数人) |
| 4 | `creator` | `authorName` | string | string | 活動名/チーム名 |
| 5 | `movieyear` | `movieYear` | number \| string | string \| number | 映像歴 (数字/伏せる/複数人である) |
| 6 | `tlink` | `authorXid` | string | string | X(Twitter) ID (@なし) |
| - | - | `authorXidLower` | - | string | 検索用小文字化XID (自動生成) |
| 7 | `ychlink` | `authorChannelUrl` | string | string | YouTubeチャンネルURL |
| 8 | `icon` | `authorIconUrl` | string | string \| null | アイコンURL (旧:Google Drive / 新:Firebase Storage) |
| 9 | `member` | `members[].name` | CSV string | VideoMember[] | メンバー名 (旧:カンマ区切り) |
| 10 | `memberid` | `members[].xid` | CSV string | VideoMember[] | メンバーXID (旧:カンマ区切り) |
| - | - | `members[].role` | - | string | 役職 (映像/音楽/イラスト等) 新規 |
| - | - | `members[].editApproved` | - | boolean | 編集権限 新規 |
| 11 | `data` | `data` | string | string | 日付情報 (例: "08/29") |
| 12 | `time` | `startTime` | string (ISO) | Date | 投稿予定時間 |
| 13 | `title` | `title` | string | string | 作品名 |
| 14 | `music` | `music` | string | string | 楽曲名 |
| 15 | `credit` | `credit` | string | string | 作曲者 |
| 16 | `ymulink` | `musicUrl` | string | string | 楽曲URL |
| 17 | `ywatch` | `ywatch` | string | string | 公式ライブ (する/しない) |
| 18 | `othersns` | `otherSns` | string | string | SNS投稿予定 (旧:CSV文字列) |
| - | - | `snsPlans` | - | SnsUploadPlan[] | SNS投稿予定 (構造化) |
| - | - | `snsLinks` | - | SnsLink[] | SNSリンク (platform+url) 新規 |
| 19 | `righttype` | `rightType` | string | string | 免責事項同意 |
| 20 | `comment` | `description` | string | string | 一言コメント |
| 21 | `ylink` | `videoUrl` | string | string | YouTube動画URL (youtu.be/{id}形式) |
| 22 | `eventid` | `eventIds` | string | string[] | イベントID (旧:単一文字列 / 新:配列) |
| 23 | `fu` | - | string | - | レガシー空フィールド (API出力時のみ保持) |
| 24 | `beforecomment` | `beforeComment` | string | string | 上映前コメント |
| 25 | `aftercomment` | `afterComment` | string | string | 上映中/上映後コメント |
| 26 | `soft` | `software` | string | string | 使用ソフト |
| 27 | `listen` | `listen` | string | string | 聞いてほしいこと |
| 28 | `episode` | `episode` | string | string | エピソード |
| 29 | `end` | `endMessage` | string | string | 最後に |

## YouTube API 系フィールド (cron で自動取得)

| 旧キー | 新キー | 型 | 備考 |
|--------|--------|---|------|
| `status` | `privacyStatus` | string | public/private/unlisted |
| `smallThumbnail` | `smallThumbnail` | string | サムネイルURL |
| `largeThumbnail` | `largeThumbnail` | string | サムネイルURL |
| `viewCount` | `viewCount` | string→number | 再生数 (旧:文字列/新:数値) |
| `likeCount` | `likeCount` | string→number | 高評価数 (旧:文字列/新:数値) |
| `daysSincePublished` | `daysSincePublished` | number | 公開日からの経過日数 |
| `videoScore` | `videoScore` | number | スコア (ランダム含む) |
| `deterministicScore` | `deterministicScore` | number | 決定的スコア |
| - | `lastStatsFetch` | - → Date \| null | 最終統計取得日時 新規 |
| - | `apiError` | - → string | APIエラー情報 新規 |

## 新規フィールド (旧形式なし)

| 新キー | 型 | 備考 |
|--------|---|------|
| `id` | string | Firestore ドキュメントID (= YouTube動画ID) |
| `homepageComment` | string | HP掲載コメント |
| `link` | string | 関連リンク |
| `agreedToTerms` | boolean | 利用規約同意 |
| `slotId` | string \| null | 登録枠ID |
| `isApproved` | boolean | 運営承認済み (枠紐付き作品) |
| `approvedAt` | Date \| null | 承認日時 |
| `approvedBy` | string \| null | 承認者ID |
| `wantsStage` | boolean | 登壇希望 |
| `preScreeningComment` | string | 上映前コメント |
| `postScreeningComment` | string | 上映中/上映後コメント |
| `usedSoftware` | string | 使用ソフト/プラグイン (詳細) |
| `stageQuestions` | string | 登壇者向け質問 |
| `finalNote` | string | 最後になにかあれば |
| `snsLinks` | SnsLink[] | SNSプラットフォーム別URL |
| `createdBy` | string | 作成者Discord ID |
| `createdAt` | Date | 作成日時 |
| `updatedAt` | Date | 更新日時 |
| `isDeleted` | boolean | ソフト削除フラグ |
| `deletedAt` | Date \| null | 削除日時 |
| `deletedBy` | string \| null | 削除者ID |

## Users: フィールド対応表

旧APIレスポンス (`users_data.json`) は `videos` データから動的生成される。

| 旧キー | 生成ロジック | 備考 |
|--------|------------|------|
| `username` | `authorXid` (小文字化) + `members[].xid` から集約 | 3文字以下除外、memberid 2回以上出現 |
| `icon` | 個人作品(`type`=個人)のtlinkデータからアイコン取得 | 個人作品なし→null |
| `creatorName` | 個人作品のcreator or メンバー名 | 優先: 個人tlink > memberid個人 |
| `ychlink` | 最新作品のychlink | |
| `iylink` | tlink一致 & PVSFSummary以外の動画ID | 個人作品 |
| `cylink` | memberid一致 & PVSFSummary以外の動画ID | 合作参加 |
| `mylink` | PVSFSummary含むeventidの動画ID | 特別企画 |
| `creatorScore` | baseScore(1000) + 作品数ボーナス + 時間ボーナス + エンゲージメント | 詳細は下記 |

### creatorScore 算出ロジック

```
baseScore = 1000
worksBonus = iylink.length * 50 + cylink.length * 25
timeBonus = max(0, 500 * exp(-daysSinceLatest / 365))
engagementBonus = Σ(個人作品エンゲージメント / max(1, count*0.3))
                + Σ(合作作品エンゲージメント / max(1, count*0.3))

個人作品エンゲージメント (1作品max 500pt):
  viewPoints = (viewCount / 10000) * 200
  likePoints = likeCount * 5
  min(500, viewPoints + likePoints)

合作作品エンゲージメント (1作品max 100pt):
  同上の計算で min(100, ...)
```

## Firestore コレクション構成

```
firestore/
├── videos/           # 作品データ (VideoDocument)
├── users/            # ユーザーデータ (UserDocument) - Discord ID がドキュメントID
├── legacy_users/     # 旧ユーザーデータ (移行参照用)
├── eventSlots/       # イベント枠データ (EventSlotsDocument)
└── operationLogs/    # 操作ログ/差分 (OperationLogDocument)
```
