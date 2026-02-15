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
 * videos_data.json 形式と完全互換
 */
export const transformVideoToLegacy = (doc: VideoDocument & {
  // Extended fields for full compatibility
  videoScore?: number;
  deterministicScore?: number;
  viewCount?: number;
  likeCount?: number;
  daysSincePublished?: number;
  largeThumbnail?: string;
  smallThumbnail?: string;
  privacyStatus?: string;
  type2?: string;
  movieYear?: number | string;
  otherSns?: string;
  rightType?: string;
  data?: string;
  software?: string;
  beforeComment?: string;
  afterComment?: string;
  listen?: string;
  episode?: string;
  endMessage?: string;
  ywatch?: string;
  timestamp?: Timestamp | Date | string;
  createdBy?: string;
}) => {
  // メンバー配列をCSV文字列に変換
  const memberNames = doc.members?.map((m: VideoMember) => m.name).join(',') || '';
  const memberIds = doc.members?.map((m: VideoMember) => m.xid || '').join(',') || '';

  // type / type1 の正規化（type は type1 として扱う）
  const type1 = doc.author?.division || '';

  return {
    // Timestamp (ISO format)
    timestamp: formatTime(doc.timestamp || doc.createdAt),
    
    // Type fields
    type1: type1,
    type2: doc.type2 || '個人',
    type: type1, // Alias for type1
    
    // Creator info
    creator: doc.author?.name || '',
    movieyear: typeof doc.movieYear === 'number' ? doc.movieYear : 
               (typeof doc.movieYear === 'string' ? parseInt(doc.movieYear) || 0 : 0),
    tlink: doc.author?.xid || '',
    ychlink: doc.author?.youtubeChannelUrl || '',
    icon: doc.author?.iconUrl || '',
    
    // Members (Legacy CSV format)
    member: memberNames,
    memberid: memberIds,
    
    // Schedule/Event
    data: doc.data || '',
    time: formatTime(doc.scheduledAt || doc.createdAt),
    
    // Work info
    title: doc.title || '',
    music: doc.music?.title || '',
    credit: doc.music?.artist || '',
    ymulink: doc.music?.url || '',
    ywatch: doc.ywatch || '',
    othersns: doc.otherSns || '',
    righttype: doc.rightType || '',
    comment: doc.description || '',
    ylink: doc.videoUrl || '',
    eventid: doc.eventId || '',
    
    // Status
    status: doc.privacyStatus || doc.status || 'public',
    
    // Thumbnails
    smallThumbnail: doc.smallThumbnail || '',
    largeThumbnail: doc.largeThumbnail || '',
    
    // YouTube Statistics
    viewCount: String(doc.viewCount || 0),
    likeCount: String(doc.likeCount || 0),
    daysSincePublished: doc.daysSincePublished || 0,
    videoScore: doc.videoScore ?? null,
    deterministicScore: doc.deterministicScore ?? null,
    
    // Legacy fields (always included for compatibility)
    fu: '',
    beforecomment: doc.beforeComment || '',
    aftercomment: doc.afterComment || '',
    soft: doc.software || '',
    listen: doc.listen || '',
    episode: doc.episode || '',
    end: doc.endMessage || '',
    
    // System
    createdBy: doc.createdBy || '',
  };
};

/**
 * UserDocument を旧API形式に変換
 * users_data.json 形式と完全互換
 */
export const transformUserToLegacy = (doc: UserDocument & {
  youtubeChannelUrl?: string;
  creatorScore?: number;
  videos?: {
    individual?: string[];
    collaboration?: string[];
    mvHonpen?: string[];
  };
}) => {
  return {
    // XID (Twitter/X ID)
    username: doc.xLink?.xid || '',
    
    // Profile
    icon: doc.iconUrl || '',
    creatorName: doc.name || '',
    ychlink: doc.youtubeChannelUrl || '',
    
    // Video links by category
    // iylink: Individual works (type1 = 個人)
    iylink: doc.videos?.individual || [],
    // cylink: Collaboration works (type1 = 合作)
    cylink: doc.videos?.collaboration || [],
    // mylink: MV/本編 works
    mylink: doc.videos?.mvHonpen || [],
    
    // Score
    creatorScore: doc.creatorScore || 0,
  };
};
