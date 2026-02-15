import { z } from 'zod';

// ------- Sub-schemas -------

const memberSchema = z.object({
  name: z.string().min(1, '名前は必須です'),
  xid: z.string().optional().default(''),
  role: z.string().optional().default(''),
  editApproved: z.boolean().optional().default(false),
});

const snsLinkSchema = z.object({
  platform: z.string(),
  url: z.string().optional().default(''),
});

// ------- Main schema -------

export const entryFormSchema = z.object({
  // 1. Time / Slot
  slotEventId: z.string().optional(),
  slotDateTimes: z.array(z.string()).optional(),
  startTime: z.string().optional(), // ISO string for manual input

  // 2. Production type
  type2: z.enum(['個人', '複数人']),

  // 3. Division
  type: z.enum(['個人', '団体', '混合']),

  // 4. Creator/Team name
  authorName: z.string().min(1, '活動名/チーム名は必須です'),

  // 5. Movie experience
  movieYear: z.string().min(1, '映像歴を入力してください'),

  // 6. X(Twitter) ID
  authorXid: z.string()
    .min(1, 'X IDは必須です')
    .transform(val => {
      // Strip @, URLs
      let v = val.trim().replace(/^@/, '');
      const twitterMatch = v.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/);
      if (twitterMatch) v = twitterMatch[1];
      return v;
    }),
  authorXidIsApproved: z.boolean().optional(), // Whether using approved XID

  // 7. YouTube channel URL
  authorChannelUrl: z.string().min(1, 'YouTubeチャンネルURLは必須です'),

  // 8. Icon
  authorIconUrl: z.string().optional().default(''),
  iconFile: z.any().optional(), // File object for upload (not serialized)

  // 9. Members (for group works)
  members: z.array(memberSchema).optional().default([]),

  // 10. Title
  title: z.string().min(1, '作品名は必須です'),

  // 11. Music title
  music: z.string().min(1, '楽曲名は必須です'),

  // 12. Music credit
  credit: z.string().min(1, '作曲者は必須です'),

  // 13. Music URL
  musicUrl: z.string().optional().default(''),

  // 14. SNS plans (checkboxes)
  snsPlans: z.array(snsLinkSchema).optional().default([]),

  // 14b. SNS links (platform-specific URLs, editable post-submission)
  snsLinks: z.array(snsLinkSchema).optional().default([]),

  // 15. Live stage
  wantsLive: z.boolean().default(false),

  // 16. Comment
  description: z.string().optional().default(''),

  // 17. Terms agreement
  agreedToTerms: z.boolean().refine(val => val === true, { message: '免責事項への同意が必要です' }),

  // 18. Video URL (may be added later from profile)
  videoUrl: z.string().optional().default(''),

  // Legacy-compatible detail fields
  software: z.string().optional().default(''),
  beforeComment: z.string().optional().default(''),
  afterComment: z.string().optional().default(''),
  listen: z.string().optional().default(''),
  episode: z.string().optional().default(''),
  endMessage: z.string().optional().default(''),
  homepageComment: z.string().optional().default(''),
  link: z.string().optional().default(''),

  // Live/Screening fields (post-submission editable)
  wantsStage: z.boolean().optional().default(false),
  preScreeningComment: z.string().optional().default(''),
  postScreeningComment: z.string().optional().default(''),
  usedSoftware: z.string().optional().default(''),
  stageQuestions: z.string().optional().default(''),
  finalNote: z.string().optional().default(''),

  // Event IDs
  eventIds: z.array(z.string()).optional().default([]),
});

export type EntryFormValues = z.infer<typeof entryFormSchema>;

// SNS platform options
export const SNS_PLATFORMS = [
  { id: 'x', label: 'X (Twitter)' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'niconico', label: 'ニコニコ動画' },
  { id: 'bilibili', label: 'bilibili動画' },
] as const;

// Role options for members
export const ROLE_OPTIONS = [
  '映像', '音楽', 'イラスト', 'CG', 'リリック', 'デザイン', '作曲', 'ボーカル', 'その他',
] as const;

// Terms text
export const TERMS_TEXT = `PVSF参加には、使用素材、楽曲が二次創作が許可されている、非営利での利用が許可されていることが必要です。

楽曲・素材等ライセンスに基づき、適切に利用してください。

当企画で投稿された動画は、当企画の宣伝目的で使用されることがあります。

主催、運営スタッフは、投稿された各作品に対して一切の責任を負いかねます。
この企画によって発生したトラブルに対して、主催、運営スタッフは一切の責任はとりません。

最終更新:2025/07/29 21:00`;
