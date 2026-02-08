import { z } from 'zod';

// 制作形態・参加部門の選択肢
const productionTypes = ['individual', 'group', 'mixed'] as const;

export const basicInfoSchema = z.object({
  productionType: z.enum(productionTypes).describe("制作形態を選択してください"),
  division: z.enum(productionTypes).describe("参加部門を選択してください"),
  authorName: z.string().min(1, "活動名/チーム名は必須です"),
  career: z.string().min(1, "映像歴を入力してください"),
  authorXid: z.string()
    .min(1, "X IDは必須です")
    .regex(/^[a-zA-Z0-9_]+$/, "IDに@や記号は含められません")
    .transform(val => val.replace('@', '')), 
  channelUrl: z.string()
    .url("有効なURLを入力してください")
    .regex(/youtube\.com|youtu\.be/, "YouTubeのURLを入力してください"),
});

export const memberSchema = z.object({
  members: z.array(z.object({
    name: z.string().min(1, "名前は必須です"),
    xid: z.string().optional(),
  })).optional(),
});

export const contentSchema = z.object({
  title: z.string().min(1, "作品名は必須です"),
  musicTitle: z.string().min(1, "楽曲名は必須です"),
  musicArtist: z.string().min(1, "作曲者は必須です"),
  musicUrl: z.string().url().optional().or(z.literal('')),
  wantsLive: z.boolean(),
  otherPlans: z.string().optional(),
  videoUrl: z.string().url().optional().or(z.literal('')), 
});

export const finalizeSchema = z.object({
  agreed: z.boolean().refine(val => val === true, { message: "同意が必要です" }),
  notes: z.string().optional(),
});

export const entryFormSchema = z.intersection(basicInfoSchema, memberSchema)
  .and(contentSchema)
  .and(finalizeSchema);

export type EntryFormValues = z.infer<typeof entryFormSchema>;
