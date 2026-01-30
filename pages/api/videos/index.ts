// Videos API endpoint with legacy format compatibility
import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/libs/firebase-admin';
import type { VideoDocument, VideoApiResponse } from '@/types/video';

/**
 * Convert eventIds array to comma-separated string for legacy API
 */
function eventIdsToLegacyFormat(eventIds: string[] | undefined): string {
    if (!eventIds || eventIds.length === 0) return '';
    return eventIds.join(',');
}

/**
 * Convert Firestore VideoDocument to legacy API format
 * Matches the format from https://pvsf-cash.vercel.app/api/videos
 */
/**
 * Safely convert Firestore timestamp or date to Date object
 */
function toSafeDate(value: any): Date {
    if (!value) return new Date();
    if (value instanceof Date) {
        return isNaN(value.getTime()) ? new Date() : value;
    }
    // Firestore Timestamp has toDate() method
    if (typeof value.toDate === 'function') {
        try {
            return value.toDate();
        } catch {
            return new Date();
        }
    }
    // Handle Firestore Timestamp serialized format { _seconds, _nanoseconds }
    if (typeof value._seconds === 'number') {
        return new Date(value._seconds * 1000);
    }
    // Handle { seconds, nanoseconds } format
    if (typeof value.seconds === 'number') {
        return new Date(value.seconds * 1000);
    }
    // Try to parse as date string or number
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function convertToLegacyFormat(doc: VideoDocument): VideoApiResponse {
    // Convert members array to comma-separated strings with proper spacing
    const memberNames = doc.members?.map(m => m.name).join(', ') || '';
    const memberIds = doc.members?.map(m => m.xid).join(', ') || '';

    const startTime = toSafeDate(doc.startTime);
    const timestamp = doc.timestamp ? toSafeDate(doc.timestamp) : null;

    // Convert eventIds array to comma-separated string for legacy format
    const eventIdStr = eventIdsToLegacyFormat(doc.eventIds);

    // Handle movieYear - can be number, string, or "伏せる"
    let movieyear: number;
    if (typeof doc.movieYear === 'number') {
        movieyear = doc.movieYear;
    } else if (typeof doc.movieYear === 'string') {
        const parsed = parseInt(doc.movieYear, 10);
        movieyear = isNaN(parsed) ? 0 : parsed;
    } else {
        movieyear = 0;
    }

    // Build response object matching legacy format exactly
    const response: VideoApiResponse = {
        type1: doc.type || '',
        type2: doc.type2 || '',
        type: doc.type || '',
        creator: doc.authorName || '',
        movieyear,
        tlink: doc.authorXid || '',
        ychlink: doc.authorChannelUrl || '',
        icon: doc.authorIconUrl || '',
        member: memberNames,
        memberid: memberIds,
        data: doc.data || '',
        time: startTime.toISOString(),
        title: doc.title || '',
        music: doc.music || '',
        credit: doc.credit || '',
        ymulink: doc.musicUrl || '',
        ywatch: doc.ywatch || '',
        othersns: doc.otherSns || '',
        righttype: doc.rightType || '',
        comment: doc.description || '',
        ylink: doc.videoUrl || '',
        status: doc.privacyStatus || 'public',
        smallThumbnail: doc.smallThumbnail || '',
        largeThumbnail: doc.largeThumbnail || '',
        viewCount: String(doc.viewCount || 0),
        likeCount: String(doc.likeCount || 0),
        daysSincePublished: doc.daysSincePublished || 0,
        videoScore: doc.videoScore ?? null,
        deterministicScore: doc.deterministicScore ?? null,
        fu: '',
        beforecomment: doc.beforeComment || '',
        aftercomment: doc.afterComment || '',
        soft: doc.software || '',
        listen: doc.listen || '',
        episode: doc.episode || '',
        end: doc.endMessage || '',
    };

    // Add optional fields only if they have values (matching legacy behavior)
    if (timestamp) {
        response.timestamp = timestamp.toISOString();
    }
    if (eventIdStr) {
        response.eventid = eventIdStr;
    }

    return response;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get all videos from Firestore
        const videosSnapshot = await adminDb.collection('videos').get();

        if (videosSnapshot.empty) {
            // If no data in Firestore, fallback to legacy API
            // This ensures compatibility during migration
            try {
                const legacyRes = await fetch('https://pvsf-cash.vercel.app/api/videos');
                if (legacyRes.ok) {
                    const legacyData = await legacyRes.json();
                    return res.status(200).json(legacyData);
                }
            } catch (legacyError) {
                console.error('Legacy API fallback failed:', legacyError);
            }
            return res.status(200).json([]);
        }

        // Convert Firestore documents to legacy format (excluding soft-deleted)
        const videos: VideoApiResponse[] = videosSnapshot.docs
            .filter(doc => {
                const data = doc.data() as VideoDocument;
                return !data.isDeleted; // Exclude soft-deleted videos
            })
            .map(doc => {
                const data = doc.data() as VideoDocument;
                return convertToLegacyFormat({
                    ...data,
                    id: doc.id,
                });
            });

        // Optional: Filter by eventid (supports filtering by any event in the array)
        const { eventid } = req.query;
        if (eventid && typeof eventid === 'string') {
            // Filter videos where eventid contains the queried event
            // (eventid in legacy format is comma-separated string)
            const filtered = videos.filter(v => {
                if (!v.eventid) return false;
                const eventIds = v.eventid.split(',').map(e => e.trim());
                return eventIds.includes(eventid);
            });
            return res.status(200).json(filtered);
        }

        return res.status(200).json(videos);

    } catch (error) {
        console.error('Videos API error:', error);

        // Fallback to legacy API on error
        try {
            const legacyRes = await fetch('https://pvsf-cash.vercel.app/api/videos');
            if (legacyRes.ok) {
                const legacyData = await legacyRes.json();
                return res.status(200).json(legacyData);
            }
        } catch (legacyError) {
            console.error('Legacy API fallback failed:', legacyError);
        }

        return res.status(500).json({ error: 'Internal server error' });
    }
}
