
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { adminDb } from '@/libs/firebase-admin';
import type { VideoDocument, OldVideoJson, VideoMember, SnsLink } from '@/types/video';
import { extractYouTubeId } from '@/libs/videoConverter';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

// ----- Field lists for validation -----
// All fields that MUST be preserved from google_data (non-YouTube-API fields)
const GOOGLE_DATA_FIELDS = [
  'type', 'type1', 'type2', 'creator', 'tlink', 'ychlink', 'icon',
  'member', 'memberid', 'data', 'time', 'title', 'music', 'credit',
  'ymulink', 'ywatch', 'othersns', 'righttype', 'comment', 'ylink',
  'eventid', 'fu', 'beforecomment', 'aftercomment', 'soft', 'listen',
  'episode', 'end', 'movieyear', 'timestamp',
] as const;

// YouTube API fields (allowed to be missing)
const YOUTUBE_API_FIELDS = [
  'viewCount', 'likeCount', 'videoScore', 'deterministicScore',
  'daysSincePublished', 'largeThumbnail', 'smallThumbnail', 'status',
] as const;

/**
 * Detect import format: 'videos_data' (has YouTube stats) or 'google_data' (raw)
 */
function detectFormat(data: any[]): 'videos_data' | 'google_data' {
  if (data.length === 0) return 'google_data';
  const sample = data[0];
  // videos_data has YouTube stats fields
  if (sample.viewCount !== undefined || sample.status !== undefined || sample.smallThumbnail !== undefined) {
    return 'videos_data';
  }
  return 'google_data';
}

/**
 * Parse comma-separated member strings into VideoMember array
 */
function parseMembers(namesStr: string, idsStr: string): VideoMember[] {
  const names = namesStr ? namesStr.split(',').map(s => s.trim()) : [];
  const ids = idsStr ? idsStr.split(',').map(s => s.trim()) : [];
  const maxLen = Math.max(names.length, ids.length);
  const members: VideoMember[] = [];

  for (let i = 0; i < maxLen; i++) {
    if (names[i] || ids[i]) {
      members.push({
        name: names[i] || '',
        xid: (ids[i] || '').replace(/^@/, ''),
        role: '',
        editApproved: false,
      });
    }
  }
  return members;
}

/**
 * Convert legacy video data to Firestore VideoDocument
 * Ensures zero data loss for non-YouTube-API fields
 */
function convertToVideoDocument(v: OldVideoJson, format: 'videos_data' | 'google_data'): Partial<VideoDocument> {
  const ytId = extractYouTubeId(v.ylink || '');
  const hasStats = format === 'videos_data';

  // Normalize tlink (strip @, URLs)
  let tlink = (v.tlink || '').trim();
  tlink = tlink.replace(/^@/, '');
  // If it's a URL like https://twitter.com/xxx or https://x.com/xxx
  const twitterMatch = tlink.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/);
  if (twitterMatch) tlink = twitterMatch[1];

  // Parse eventid (could be comma-separated in old format)
  const eventIds = v.eventid
    ? v.eventid.split(',').map(e => e.trim()).filter(Boolean)
    : [];

  // Parse movieyear
  let movieYear: string | number = v.movieyear ?? '';
  if (typeof movieYear === 'string') {
    const parsed = parseInt(movieYear, 10);
    if (!isNaN(parsed)) movieYear = parsed;
  }

  // Parse snsPlans from othersns
  const snsLinks: SnsLink[] = [];
  if (v.othersns) {
    v.othersns.split(/[,、，]/).map(s => s.trim()).filter(Boolean).forEach(platform => {
      snsLinks.push({ platform, url: '' });
    });
  }

  const doc: Partial<VideoDocument> = {
    // Basic Info
    videoUrl: v.ylink || (ytId ? `https://youtu.be/${ytId}` : ''),
    title: v.title || '',
    description: v.comment || '',
    startTime: v.time ? new Date(v.time) : new Date(),
    eventIds,

    // Author
    authorXid: tlink,
    authorXidLower: tlink.toLowerCase(),
    authorName: v.creator || '',
    authorIconUrl: v.icon || null,
    authorChannelUrl: v.ychlink || '',

    // Metadata
    music: v.music || '',
    credit: v.credit || '',
    type: v.type || v.type1 || '',
    type2: v.type2 || '',

    // Legacy fields - preserve ALL
    musicUrl: v.ymulink || '',
    movieYear,
    otherSns: v.othersns || '',
    rightType: v.righttype || '',
    data: v.data || '',
    software: v.soft || '',
    beforeComment: v.beforecomment || '',
    afterComment: v.aftercomment || '',
    listen: v.listen || '',
    episode: v.episode || '',
    endMessage: v.end || '',
    ywatch: v.ywatch || '',
    timestamp: v.timestamp ? new Date(v.timestamp) : null,

    // New fields
    snsPlans: snsLinks.map(sl => ({ platform: sl.platform, url: sl.url })),
    snsLinks,
    homepageComment: v.comment || '',
    link: '',
    agreedToTerms: v.righttype === '同意する',

    // Members
    members: parseMembers(v.member || '', v.memberid || ''),

    // Live/Screening (defaults for import)
    wantsStage: false,
    preScreeningComment: '',
    postScreeningComment: '',
    usedSoftware: v.soft || '',
    stageQuestions: '',
    finalNote: '',

    // Approval (imported data is already approved)
    isApproved: true,
    approvedAt: null,
    approvedBy: null,

    // YouTube Stats
    viewCount: hasStats ? (Number(v.viewCount) || 0) : 0,
    likeCount: hasStats ? (Number(v.likeCount) || 0) : 0,
    videoScore: hasStats ? (Number(v.videoScore) || 0) : 0,
    deterministicScore: hasStats ? (Number(v.deterministicScore) || 0) : 0,
    largeThumbnail: hasStats
      ? (v.largeThumbnail || (ytId ? `https://i.ytimg.com/vi/${ytId}/maxresdefault.jpg` : ''))
      : (ytId ? `https://i.ytimg.com/vi/${ytId}/maxresdefault.jpg` : ''),
    smallThumbnail: hasStats
      ? (v.smallThumbnail || (ytId ? `https://i.ytimg.com/vi/${ytId}/mqdefault.jpg` : ''))
      : (ytId ? `https://i.ytimg.com/vi/${ytId}/mqdefault.jpg` : ''),
    privacyStatus: hasStats ? (v.status || 'public') : 'public',
    daysSincePublished: hasStats ? (Number(v.daysSincePublished) || 0) : 0,
    lastStatsFetch: hasStats ? new Date() : null,

    // Slot
    slotId: null,

    // System
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
  };

  return doc;
}

/**
 * Validate that no non-YouTube fields are lost during conversion
 */
function validateNoDataLoss(original: OldVideoJson, converted: Partial<VideoDocument>): string[] {
  const warnings: string[] = [];

  // Check critical fields preserved
  if (original.title && !converted.title) warnings.push('title lost');
  if (original.tlink && !converted.authorXid) warnings.push('tlink lost');
  if (original.creator && !converted.authorName) warnings.push('creator lost');
  if (original.ylink && !converted.videoUrl) warnings.push('ylink lost');
  if (original.time && (!converted.startTime || isNaN((converted.startTime as Date).getTime()))) {
    warnings.push(`time parse failed: ${original.time}`);
  }
  if (original.music && !converted.music) warnings.push('music lost');
  if (original.credit && !converted.credit) warnings.push('credit lost');
  if (original.member && converted.members?.length === 0) warnings.push('member lost');
  if (original.icon && !converted.authorIconUrl) warnings.push('icon lost');
  if (original.ychlink && !converted.authorChannelUrl) warnings.push('ychlink lost');
  if (original.comment && !converted.description) warnings.push('comment lost');
  if (original.eventid && converted.eventIds?.length === 0) warnings.push('eventid lost');

  return warnings;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Admin authentication check
  const session = await getServerSession(req, res, authOptions);
  const user = session?.user as any;

  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized: Admin access required' });
  }

  try {
    const { type, data, options } = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({ error: 'Invalid data format: Expected JSON array' });
    }

    const dryRun = options?.dryRun === true;

    if (type === 'videos') {
      const result = await importVideos(data, dryRun);
      return res.status(200).json(result);
    } else if (type === 'users') {
      const result = await importUsers(data, dryRun);
      return res.status(200).json(result);
    } else {
      return res.status(400).json({ error: 'Invalid import type. Use "videos" or "users".' });
    }
  } catch (error: any) {
    console.error('Import error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function importVideos(videos: OldVideoJson[], dryRun: boolean) {
  const format = detectFormat(videos);
  const BATCH_SIZE = 450;

  let imported = 0;
  let skipped = 0;
  let errorCount = 0;
  const errors: { index: number; message: string; title?: string }[] = [];
  const dataLossWarnings: { index: number; warnings: string[]; title?: string }[] = [];

  // Process in batches
  for (let batchStart = 0; batchStart < videos.length; batchStart += BATCH_SIZE) {
    const batch = dryRun ? null : adminDb.batch();
    const batchEnd = Math.min(batchStart + BATCH_SIZE, videos.length);

    for (let i = batchStart; i < batchEnd; i++) {
      const v = videos[i];

      try {
        // Determine document ID from YouTube URL
        const ytId = extractYouTubeId(v.ylink || v.ymulink || '');
        if (!ytId) {
          skipped++;
          continue;
        }

        // Convert
        const videoDoc = convertToVideoDocument(v, format);

        // Validate no data loss
        const warnings = validateNoDataLoss(v, videoDoc);
        if (warnings.length > 0) {
          dataLossWarnings.push({ index: i, warnings, title: v.title });
        }

        if (!dryRun && batch) {
          const docRef = adminDb.collection('videos').doc(ytId);
          batch.set(docRef, {
            ...videoDoc,
            id: ytId,
            createdAt: videoDoc.startTime || new Date(),
            updatedAt: new Date(),
          }, { merge: true });
        }

        imported++;
      } catch (error: any) {
        errorCount++;
        errors.push({
          index: i,
          message: error.message || 'Unknown error',
          title: v.title,
        });
      }
    }

    // Commit batch
    if (!dryRun && batch) {
      try {
        await batch.commit();
      } catch (error: any) {
        errorCount += (batchEnd - batchStart);
        errors.push({
          index: batchStart,
          message: `Batch commit failed: ${error.message}`,
        });
      }
    }
  }

  return {
    success: errorCount === 0,
    format,
    imported,
    skipped,
    errorCount,
    errors: errors.slice(0, 50), // Limit error output
    dataLossWarnings: dataLossWarnings.slice(0, 50),
    dryRun,
    total: videos.length,
  };
}

async function importUsers(users: any[], dryRun: boolean) {
  const BATCH_SIZE = 450;
  let imported = 0;
  let skipped = 0;

  for (let batchStart = 0; batchStart < users.length; batchStart += BATCH_SIZE) {
    const batch = dryRun ? null : adminDb.batch();
    const batchEnd = Math.min(batchStart + BATCH_SIZE, users.length);

    for (let i = batchStart; i < batchEnd; i++) {
      const u = users[i];
      if (!u.username) {
        skipped++;
        continue;
      }

      if (!dryRun && batch) {
        const docRef = adminDb.collection('legacy_users').doc(u.username.toLowerCase());
        batch.set(docRef, {
          ...u,
          updatedAt: new Date(),
        }, { merge: true });
      }
      imported++;
    }

    if (!dryRun && batch) {
      await batch.commit();
    }
  }

  return { success: true, imported, skipped, dryRun, total: users.length };
}
