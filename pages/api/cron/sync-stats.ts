// YouTube Stats Sync Cron Job
import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/libs/firebase-admin';
import { extractYouTubeId } from '@/libs/videoConverter';
import { FieldValue } from 'firebase-admin/firestore';

// YouTube Data API v3
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/videos';

interface YouTubeVideoStats {
    viewCount: number;
    likeCount: number;
}

/**
 * Calculate video score based on views and likes
 * Formula: (views + likes * 30) / sqrt(days + 1)
 */
function calculateVideoScore(viewCount: number, likeCount: number, daysSincePublished: number): number {
    const rawScore = viewCount + (likeCount * 30);
    const timeDecay = Math.sqrt(daysSincePublished + 1);
    return Math.round(rawScore / timeDecay);
}

/**
 * Fetch stats for multiple YouTube videos
 */
/**
 * Fetch stats for multiple YouTube videos
 * Returns a Map of results. keys are YouTube IDs.
 * Values are either the stats or null (if API failed/video missing).
 */
async function fetchYouTubeStats(videoIds: string[]): Promise<Map<string, YouTubeVideoStats | null>> {
    const stats = new Map<string, YouTubeVideoStats | null>();

    if (!YOUTUBE_API_KEY || videoIds.length === 0) {
        return stats;
    }

    // YouTube API allows max 50 IDs per request
    const chunks = [];
    for (let i = 0; i < videoIds.length; i += 50) {
        chunks.push(videoIds.slice(i, i + 50));
    }

    for (const chunk of chunks) {
        try {
            const url = new URL(YOUTUBE_API_URL);
            url.searchParams.set('part', 'statistics,status');
            url.searchParams.set('id', chunk.join(','));
            url.searchParams.set('key', YOUTUBE_API_KEY);

            const res = await fetch(url.toString());

            if (!res.ok) {
                console.error('YouTube API error:', await res.text());
                // Mark all in this chunk as failed (null)
                chunk.forEach(id => stats.set(id, null));
                continue;
            }

            const data = await res.json();
            const items = data.items || [];

            // Map found items
            const foundIds = new Set<string>();
            for (const item of items) {
                const statistics = item.statistics || {};
                stats.set(item.id, {
                    viewCount: parseInt(statistics.viewCount || '0', 10),
                    likeCount: parseInt(statistics.likeCount || '0', 10),
                });
                foundIds.add(item.id);
            }

            // Mark missing items in this successful chunk as null (deleted/private?)
            // Or maybe just leave them as 'null' implicitly if we want to handle explicitly
            // For now, if not found in response, it means it's invalid or deleted.
            // But the user request specifically targets "API Unavailable" case.
            // If API succeeds but video is gone, that's different.
            // However, to be safe, if we requested it but didn't get it, we can't update stats.
            chunk.forEach(id => {
                if (!foundIds.has(id)) {
                    // Video ID invalid or deleted. 
                    // Decide whether to null it or ignore. 
                    // Let's leave it undefined in the map so we skip update?
                    // No, let's treat it as similar fallback or just skip.
                    // User task: "If API unavailable".
                    // So I'll just focus on the `!res.ok` block for the fallback.
                }
            });

        } catch (error) {
            console.error('Error fetching YouTube stats:', error);
            // Mark all in this chunk as failed (null) due to exception
            chunk.forEach(id => stats.set(id, null));
        }
    }

    return stats;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Verify cron secret for security (Vercel Cron)
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const startTime = Date.now();

        // Get all videos from Firestore
        const videosSnapshot = await adminDb.collection('videos').get();

        if (videosSnapshot.empty) {
            return res.status(200).json({ message: 'No videos to sync', stats: { total: 0, updated: 0 } });
        }

        // Extract YouTube IDs and filter by update interval
        const videoIdMap = new Map<string, string>(); // youtubeId -> firestoreDocId
        const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

        for (const doc of videosSnapshot.docs) {
            const data = doc.data();
            const youtubeId = extractYouTubeId(data.videoUrl || '');

            if (youtubeId) {
                // Check if update is needed
                const lastFetch = data.lastStatsFetch ? (data.lastStatsFetch.toDate ? data.lastStatsFetch.toDate() : new Date(data.lastStatsFetch)) : null;
                const shouldUpdate = !lastFetch || (Date.now() - lastFetch.getTime() > oneWeekMs);

                if (shouldUpdate) {
                    videoIdMap.set(youtubeId, doc.id);
                }
            }
        }

        if (videoIdMap.size === 0) {
            return res.status(200).json({ message: 'No videos needed update', stats: { total: videosSnapshot.size, updated: 0 } });
        }

        // Fetch stats from YouTube
        const youtubeStats = await fetchYouTubeStats(Array.from(videoIdMap.keys()));

        // Update Firestore with new stats
        const batch = adminDb.batch();
        let updateCount = 0;

        for (const [youtubeId, firestoreId] of Array.from(videoIdMap.entries())) {
            // Check if we have a result (stat or null/failure)
            // If undefined, it means it wasn't processed? No, fetchYouTubeStats processes all chunks.
            // If it's missing from map, it might be because it was a "success chunk" but video not found.
            // If it's explicitly null in map, it was a "failed chunk".

            const stats = youtubeStats.get(youtubeId);
            const docRef = adminDb.collection('videos').doc(firestoreId);
            const doc = videosSnapshot.docs.find(d => d.id === firestoreId);
            const data = doc?.data();

            if (stats) {
                // SUCCESS CASE
                // Calculate days since published
                let daysSincePublished = 0;
                if (data?.startTime) {
                    const startTime = data.startTime.toDate ? data.startTime.toDate() : new Date(data.startTime);
                    daysSincePublished = Math.floor((Date.now() - startTime.getTime()) / (1000 * 60 * 60 * 24));
                }

                // Calculate scores
                const videoScore = calculateVideoScore(stats.viewCount, stats.likeCount, daysSincePublished);
                const deterministicScore = stats.viewCount + (stats.likeCount * 30); // Raw score without time decay

                batch.update(docRef, {
                    viewCount: stats.viewCount,
                    likeCount: stats.likeCount,
                    videoScore,
                    deterministicScore,
                    daysSincePublished,
                    lastStatsFetch: new Date(),
                    updatedAt: new Date(),
                    apiError: FieldValue.delete(), // Clear error if success
                });
            } else if (stats === null) {
                // FAILURE CASE (API Error)
                // Fallback values
                const largeThumbnail = `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`; // Generic URL

                batch.update(docRef, {
                    viewCount: 0,
                    likeCount: 0,
                    // videoScore / deterministicScore not mentioned but implying 0 or keep existing?
                    // User says "再生数等は0を代入". So scores derived from them should probably be 0 too? 
                    // Let's set counts to 0. Scores depend on them.
                    videoScore: 0,
                    deterministicScore: 0,
                    privacyStatus: 'public',
                    largeThumbnail,
                    // smallThumbnail? Let's assume generic too if needed, but user only mentioned thumbnail.
                    // Actually videoConverter generates them.
                    apiError: 'YouTube API Unavailable',
                    updatedAt: new Date(),
                });
            } else {
                // Video missing from successful response (Deleted/Private?)
                // User didn't specify. Skip update or handle?
                // For now, skipping.
                continue;
            }

            updateCount++;
        }

        // Commit updates
        await batch.commit();

        const duration = Date.now() - startTime;

        return res.status(200).json({
            success: true,
            message: 'Stats sync completed',
            stats: {
                total: videoIdMap.size,
                updated: updateCount,
                duration: `${duration}ms`,
            },
        });

    } catch (error: any) {
        console.error('Sync stats error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
