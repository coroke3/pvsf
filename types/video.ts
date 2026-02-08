// Type definitions for Video data
import type { SoftDeleteFields } from './common';

/**
 * Old video data format (from videos_data.csv / GAS API)
 * Matches the format from https://pvsf-cash.vercel.app/api/videos
 */
export interface OldVideoJson {
  // Core fields
  title: string;
  ylink: string;
  comment: string;
  tlink: string;
  creator: string;
  icon: string;
  time: string;
  eventid?: string;

  // Comma-separated strings
  member: string;
  memberid: string;

  // Metadata
  music?: string;
  credit?: string;
  type?: string;
  type1?: string;
  type2?: string;

  // Additional legacy fields
  ychlink?: string;
  ymulink?: string;
  movieyear?: number | string;
  othersns?: string;
  righttype?: string;
  data?: string;
  soft?: string;
  beforecomment?: string;
  aftercomment?: string;
  listen?: string;
  episode?: string;
  end?: string;
  ywatch?: string;
  timestamp?: string;
  fu?: string;

  // Statistics
  viewCount?: string | number;
  likeCount?: string | number;
  videoScore?: number;
  deterministicScore?: number;
  daysSincePublished?: number;

  // Thumbnails
  largeThumbnail?: string;
  smallThumbnail?: string;
  status?: string;

  [key: string]: unknown;
}

/**
 * Member information structure
 */
export interface VideoMember {
  name: string;
  xid: string;
  role: string; // Role (e.g., "Movie", "Illust", "Vocal")
  editApproved?: boolean; // Whether the author approved this member to edit (default: false)
}

/**
 * SNS upload plan entry
 */
export interface SnsUploadPlan {
  platform: string; // SNS platform name (e.g., "YouTube", "X", "ニコニコ動画")
  url?: string;     // URL once uploaded (filled in later)
}

/**
 * Firestore Video Document Schema
 */
export interface VideoDocument extends SoftDeleteFields {
  id: string;

  // Basic Info
  videoUrl: string;
  title: string;
  description: string;
  startTime: Date;
  eventIds: string[]; // Array of event IDs (e.g., ["PVSF2024S", "PVSF2025S"])

  // Author Info
  authorXid: string;
  authorXidLower: string;
  authorName: string;
  authorIconUrl: string | null;
  authorChannelUrl: string; // ychlink

  // Metadata (Editable)
  music: string;
  credit: string;
  type: string; // "個人" | "団体" | "混合"
  type2: string; // "個人" | "複数人" | "一般" | "ビギナー"

  // Additional Legacy Fields
  musicUrl: string;  // ymulink
  movieYear: string | number; // movieyear - can be number (years), string (text), or "伏せる"
  otherSns: string;  // othersns (e.g., "X", "YouTube")
  rightType: string; // righttype (e.g., "同意する")
  data: string;      // data field (e.g., "08/29")
  software: string;  // soft
  beforeComment: string; // beforecomment
  afterComment: string;  // aftercomment
  listen: string;    // listen (聞いてほしいこと等)
  episode: string;   // episode (最近のエピソード)
  endMessage: string; // end (最後に)
  ywatch: string;    // ywatch (e.g., "しない")
  timestamp: Date | null; // timestamp
  
  // New Fields
  snsPlans: SnsUploadPlan[]; // Planned SNS uploads (platform and URL)
  homepageComment: string;   // Homepage display comment
  link: string;              // Related link
  agreedToTerms: boolean;    // Whether user agreed to terms

  // Members (Structured)
  members: VideoMember[];

  // YouTube Stats (Managed by Cron)
  viewCount: number;
  likeCount: number;
  videoScore: number;
  deterministicScore: number;
  largeThumbnail: string;
  smallThumbnail: string;
  privacyStatus: string;
  daysSincePublished: number;
  lastStatsFetch: Date | null;
  apiError?: string;

  // Slot Assignment
  slotId: string | null; // Assigned registration slot ID

  // System
  createdBy?: string; // Discord User ID of the submitter
  createdAt: Date;
  updatedAt: Date;

  [key: string]: unknown;
}

/**
 * Video form data for creating/editing videos
 */
export interface VideoFormData {
  videoUrl: string;
  title: string;
  description: string;
  startTime: string; // ISO string for form
  eventIds: string[]; // Array of event IDs
  authorXid: string;
  authorName: string;
  authorIconUrl: string;
  authorChannelUrl: string;
  music: string;
  credit: string;
  musicUrl: string;
  type: string;
  type2: string;
  movieYear: string; // Years of experience or text or "伏せる"
  software: string;
  beforeComment: string;
  afterComment: string;
  listen: string;
  episode: string;
  endMessage: string;
  members: VideoMember[];
  snsPlans: SnsUploadPlan[];
  homepageComment: string;
  link: string;
  agreedToTerms: boolean;
}

/**
 * API response format (legacy compatible)
 * Matches the format from https://pvsf-cash.vercel.app/api/videos
 */
export interface VideoApiResponse {
  timestamp?: string;
  type1: string; // Alias for type
  type2: string;
  type?: string; // Original type field (same as type1)
  creator: string;
  movieyear: number;
  tlink: string;
  ychlink: string;
  icon: string;
  member: string;
  memberid: string;
  data: string;
  time: string;
  title: string;
  music: string;
  credit: string;
  ymulink: string;
  ywatch: string;
  othersns: string;
  righttype: string;
  comment: string;
  ylink: string;
  eventid?: string; // Optional - may not exist for some videos
  status: string;
  smallThumbnail: string;
  largeThumbnail: string;
  viewCount: string;
  likeCount: string;
  daysSincePublished: number;
  videoScore: number | null;
  deterministicScore: number | null;
  // Legacy fields (always included for compatibility)
  fu: string;
  beforecomment: string;
  aftercomment: string;
  soft: string;
  listen: string;
  episode: string;
  end: string;
  createdBy?: string;
}

/**
 * User API response format (legacy compatible)
 */
export interface UserApiResponseLegacy {
  username: string;      // XID (lowercase)
  icon: string | null;
  creatorName: string;
  ychlink: string;
  iylink: string[];      // Individual video IDs
  cylink: string[];      // Collaboration video IDs
  mylink: string[];      // Member participation video IDs
  creatorScore: number;
}
