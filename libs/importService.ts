// Import Service - Legacy data import functionality
// Converts old JSON format (google_data.json) to Firestore documents

import { db } from '@/libs/firebase';
import {
    collection, doc, setDoc, writeBatch, serverTimestamp, Timestamp
} from 'firebase/firestore';
import type { VideoDocument, VideoMember, SnsUploadPlan } from '@/types/video';
import { extractYouTubeId, generateThumbnails } from '@/libs/videoConverter';

/**
 * Old video data format (from google_data.json / GAS API)
 */
export interface LegacyVideoData {
    // Core fields
    title?: string;
    ylink?: string;
    comment?: string;
    tlink?: string;
    creator?: string;
    icon?: string;
    time?: string;
    eventid?: string;

    // Comma-separated strings
    member?: string;
    memberid?: string;

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

    // Statistics (may be present if from videos_data.json)
    viewCount?: string | number;
    likeCount?: string | number;
    videoScore?: number;
    deterministicScore?: number;
    daysSincePublished?: number;
    largeThumbnail?: string;
    smallThumbnail?: string;
    status?: string;

    [key: string]: unknown;
}

/**
 * Import result statistics
 */
export interface ImportResult {
    success: boolean;
    totalRecords: number;
    importedCount: number;
    skippedCount: number;
    errorCount: number;
    errors: { index: number; message: string; data?: any }[];
    warnings: string[];
}

/**
 * Import options
 */
export interface ImportOptions {
    skipExisting?: boolean;   // Skip if document already exists
    dryRun?: boolean;         // Don't actually write to Firestore
    batchSize?: number;       // Number of documents per batch
}

/**
 * Parse comma-separated member strings into VideoMember array
 */
function parseMembers(memberNames?: string, memberIds?: string): VideoMember[] {
    if (!memberNames || memberNames.trim() === '') return [];

    const names = memberNames.split(',').map(n => n.trim()).filter(n => n);
    const ids = memberIds ? memberIds.split(',').map(id => id.trim()) : [];

    return names.map((name, index) => ({
        name,
        xid: ids[index]?.replace(/^@/, '') || '',
        role: 'Member',
        editApproved: false,
    }));
}

/**
 * Extract YouTube video ID from various URL formats
 */
function extractVideoId(url?: string): string | null {
    if (!url) return null;
    return extractYouTubeId(url);
}

/**
 * Normalize YouTube URL to standard format
 */
function normalizeYouTubeUrl(url?: string): string {
    const videoId = extractVideoId(url);
    if (!videoId) return url || '';
    return `https://youtu.be/${videoId}`;
}

/**
 * Parse time string to Date
 */
function parseTime(timeStr?: string): Date {
    if (!timeStr) return new Date();
    
    try {
        const date = new Date(timeStr);
        if (!isNaN(date.getTime())) return date;
    } catch {
        // Fall through to default
    }
    
    return new Date();
}

/**
 * Generate a unique document ID based on video URL
 */
function generateDocId(video: LegacyVideoData): string {
    const videoId = extractVideoId(video.ylink);
    if (videoId) return videoId;
    
    // Fallback: use hash of title + creator + time
    const str = `${video.title || ''}-${video.creator || ''}-${video.time || Date.now()}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `legacy_${Math.abs(hash).toString(36)}`;
}

/**
 * Convert legacy video data to Firestore VideoDocument
 */
function convertToVideoDocument(legacy: LegacyVideoData): Partial<VideoDocument> {
    const videoId = extractVideoId(legacy.ylink);
    const thumbnails = videoId ? generateThumbnails(videoId) : {
        largeThumbnail: legacy.largeThumbnail || '',
        smallThumbnail: legacy.smallThumbnail || '',
    };

    // Parse SNS plans from othersns field
    const snsPlans: SnsUploadPlan[] = [];
    if (legacy.othersns) {
        const platforms = legacy.othersns.split(',').map(p => p.trim()).filter(p => p);
        platforms.forEach(platform => {
            snsPlans.push({ platform, url: undefined });
        });
    }

    // Determine type (normalize type1/type variants)
    const type = legacy.type1 || legacy.type || '個人';

    return {
        // Basic Info
        videoUrl: normalizeYouTubeUrl(legacy.ylink),
        title: legacy.title || '',
        description: legacy.comment || '',
        startTime: parseTime(legacy.time),
        eventIds: legacy.eventid ? [legacy.eventid] : [],

        // Author Info
        authorXid: legacy.tlink?.replace(/^@/, '') || '',
        authorXidLower: (legacy.tlink?.replace(/^@/, '') || '').toLowerCase(),
        authorName: legacy.creator || '',
        authorIconUrl: legacy.icon || null,
        authorChannelUrl: legacy.ychlink || '',

        // Metadata
        music: legacy.music || '',
        credit: legacy.credit || '',
        type: type,
        type2: legacy.type2 || '個人',

        // Additional Fields
        musicUrl: legacy.ymulink || '',
        movieYear: legacy.movieyear || '',
        otherSns: legacy.othersns || '',
        rightType: legacy.righttype || '',
        data: legacy.data || '',
        software: legacy.soft || '',
        beforeComment: legacy.beforecomment || '',
        afterComment: legacy.aftercomment || '',
        listen: legacy.listen || '',
        episode: legacy.episode || '',
        endMessage: legacy.end || '',
        ywatch: legacy.ywatch || '',
        timestamp: legacy.timestamp ? parseTime(legacy.timestamp) : null,

        // New Fields
        snsPlans,
        homepageComment: legacy.comment || '',
        link: '',
        agreedToTerms: legacy.righttype === '同意する',

        // Members
        members: parseMembers(legacy.member, legacy.memberid),

        // YouTube Stats
        viewCount: typeof legacy.viewCount === 'string' ? parseInt(legacy.viewCount) || 0 : legacy.viewCount || 0,
        likeCount: typeof legacy.likeCount === 'string' ? parseInt(legacy.likeCount) || 0 : legacy.likeCount || 0,
        videoScore: legacy.videoScore || 0,
        deterministicScore: legacy.deterministicScore || 0,
        largeThumbnail: thumbnails.largeThumbnail,
        smallThumbnail: thumbnails.smallThumbnail,
        privacyStatus: legacy.status || 'public',
        daysSincePublished: legacy.daysSincePublished || 0,
        lastStatsFetch: null,

        // Slot Assignment
        slotId: null,

        // System
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
    };
}

/**
 * Import legacy video data to Firestore
 */
export async function importVideos(
    data: LegacyVideoData[],
    options: ImportOptions = {}
): Promise<ImportResult> {
    const {
        skipExisting = true,
        dryRun = false,
        batchSize = 500,
    } = options;

    const result: ImportResult = {
        success: true,
        totalRecords: data.length,
        importedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        errors: [],
        warnings: [],
    };

    // Filter out entries without ylink
    const validData = data.filter((item, index) => {
        if (!item.ylink) {
            result.warnings.push(`インデックス ${index}: ylinkがないためスキップ`);
            result.skippedCount++;
            return false;
        }
        return true;
    });

    if (dryRun) {
        result.importedCount = validData.length;
        result.warnings.push('ドライラン: 実際のインポートは行われませんでした');
        return result;
    }

    // Process in batches
    for (let i = 0; i < validData.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchData = validData.slice(i, i + batchSize);

        for (let j = 0; j < batchData.length; j++) {
            const legacy = batchData[j];
            const globalIndex = i + j;

            try {
                const docId = generateDocId(legacy);
                const videoDoc = convertToVideoDocument(legacy);
                const docRef = doc(db, 'videos', docId);

                batch.set(docRef, {
                    ...videoDoc,
                    id: docId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                }, { merge: skipExisting });

                result.importedCount++;
            } catch (error) {
                result.errorCount++;
                result.errors.push({
                    index: globalIndex,
                    message: error instanceof Error ? error.message : 'Unknown error',
                    data: { title: legacy.title, ylink: legacy.ylink },
                });
            }
        }

        try {
            await batch.commit();
        } catch (error) {
            result.success = false;
            result.errors.push({
                index: i,
                message: `バッチコミット失敗: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
        }
    }

    return result;
}

/**
 * Import legacy user data to create legacy_users mapping collection
 * This maps XID to historical user data for migration
 */
export async function importLegacyUsers(
    videosData: LegacyVideoData[],
    options: ImportOptions = {}
): Promise<ImportResult> {
    const { dryRun = false } = options;

    const result: ImportResult = {
        success: true,
        totalRecords: 0,
        importedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        errors: [],
        warnings: [],
    };

    // Collect unique XIDs from videos
    const xidMap = new Map<string, {
        xid: string;
        creatorName: string;
        icon: string | null;
        ychlink: string;
    }>();

    videosData.forEach(video => {
        const tlink = video.tlink?.replace(/^@/, '').toLowerCase();
        if (tlink && tlink.length > 3) {
            if (!xidMap.has(tlink)) {
                xidMap.set(tlink, {
                    xid: video.tlink?.replace(/^@/, '') || '',
                    creatorName: video.creator || '',
                    icon: video.icon || null,
                    ychlink: video.ychlink || '',
                });
            }
        }

        // Also collect from memberid
        if (video.memberid) {
            const memberIds = video.memberid.split(',').map(id => id.trim().replace(/^@/, '').toLowerCase());
            const memberNames = video.member?.split(',').map(n => n.trim()) || [];

            memberIds.forEach((id, index) => {
                if (id && id.length > 3 && !xidMap.has(id)) {
                    xidMap.set(id, {
                        xid: id,
                        creatorName: memberNames[index] || '',
                        icon: null,
                        ychlink: '',
                    });
                }
            });
        }
    });

    result.totalRecords = xidMap.size;

    if (dryRun) {
        result.importedCount = xidMap.size;
        result.warnings.push('ドライラン: 実際のインポートは行われませんでした');
        return result;
    }

    const batch = writeBatch(db);
    let count = 0;

    const entries = Array.from(xidMap.entries());
    for (let i = 0; i < entries.length; i++) {
        const [xidLower, userData] = entries[i];
        try {
            const docRef = doc(db, 'legacy_users', xidLower);
            batch.set(docRef, {
                ...userData,
                xidLower,
                createdAt: serverTimestamp(),
            }, { merge: true });
            count++;

            // Commit in batches of 500
            if (count % 500 === 0) {
                await batch.commit();
            }
        } catch (error) {
            result.errorCount++;
            result.errors.push({
                index: count,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    // Final commit
    try {
        await batch.commit();
        result.importedCount = count - result.errorCount;
    } catch (error) {
        result.success = false;
        result.errors.push({
            index: -1,
            message: `最終バッチコミット失敗: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
    }

    return result;
}

/**
 * Validate import data before processing
 */
export function validateImportData(data: unknown[]): {
    valid: boolean;
    errors: string[];
    warnings: string[];
} {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(data)) {
        errors.push('データは配列である必要があります');
        return { valid: false, errors, warnings };
    }

    if (data.length === 0) {
        errors.push('データが空です');
        return { valid: false, errors, warnings };
    }

    let missingYlink = 0;
    let missingTitle = 0;

    data.forEach((item, index) => {
        if (typeof item !== 'object' || item === null) {
            errors.push(`インデックス ${index}: オブジェクトではありません`);
            return;
        }

        const video = item as LegacyVideoData;
        if (!video.ylink) missingYlink++;
        if (!video.title) missingTitle++;
    });

    if (missingYlink > 0) {
        warnings.push(`${missingYlink}件のレコードにylinkがありません（スキップされます）`);
    }
    if (missingTitle > 0) {
        warnings.push(`${missingTitle}件のレコードにtitleがありません`);
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}
