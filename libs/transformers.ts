import { Timestamp } from 'firebase-admin/firestore';

// VideoDocument のメンバー型定義
interface VideoMember {
  name: string;
  xid?: string;
  role?: string;
}

// VideoDocument 型定義
interface VideoDocument {
  id: string;
  title?: string;
  videoUrl?: string;
  scheduledAt?: Timestamp | Date | string;
  createdAt?: Timestamp | Date | string;
  eventId?: string;
  author?: {
    name?: string;
    xid?: string;
    youtubeChannelUrl?: string;
    iconUrl?: string;
    division?: string;
  };
  members?: VideoMember[];
  music?: {
    title?: string;
    artist?: string;
    url?: string;
  };
  status?: string;
  description?: string;
}

// UserDocument 型定義
interface UserDocument {
  id: string;
  name?: string;
  iconUrl?: string;
  xLink?: {
    xid?: string;
    status?: string;
  };
}

/**
 * Firestore Timestamp または Date を ISO 文字列に変換
 */
const formatTime = (time: Timestamp | Date | string | undefined | null): string => {
  if (!time) return '';
  if (typeof time === 'string') return time;
  if (time instanceof Date) return time.toISOString();
  // Firestore Timestamp
  if ('toDate' in time) return time.toDate().toISOString();
  return '';
};

/**
 * VideoDocument を旧API形式に変換
 * 後方互換性のため、新スキーマを旧キー名にマッピング
 */
export const transformVideoToLegacy = (doc: VideoDocument) => {
  // メンバー配列をCSV文字列に変換
  const memberNames = doc.members?.map((m: VideoMember) => m.name).join(', ') || '';
  const memberIds = doc.members?.map((m: VideoMember) => m.xid || '').join(', ') || '';

  return {
    // ID
    id: doc.id,
    
    // 基本メタデータ
    title: doc.title || '',
    time: formatTime(doc.scheduledAt || doc.createdAt),
    
    // リンク
    ylink: doc.videoUrl || '',
    tlink: doc.author?.xid || '',
    ychlink: doc.author?.youtubeChannelUrl || '',
    
    // 投稿者
    creator: doc.author?.name || '',
    icon: doc.author?.iconUrl || '',
    
    // メンバー（レガシー: CSV形式）
    member: memberNames,
    memberid: memberIds,
    
    // 楽曲詳細
    music: doc.music?.title || '',
    credit: doc.music?.artist || '',
    ymulink: doc.music?.url || '',
    
    // その他
    comment: doc.description || '',
    type: doc.author?.division || '',
    status: doc.status || 'published',
    movieyear: 0,
    eventid: doc.eventId || '',
  };
};

/**
 * UserDocument を旧API形式に変換
 */
export const transformUserToLegacy = (doc: UserDocument) => {
  return {
    username: doc.xLink?.xid || '',
    creatorName: doc.name || '',
    icon: doc.iconUrl || '',
    viewSum: 0,
    likeSum: 0,
    videoCount: 0,
    scoreSum: 0,
    mylink: [],
  };
};
