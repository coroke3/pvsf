// YouTube Service - On-demand YouTube API integration with caching
// Fetches video stats and updates Firestore if data is stale (> 7 days)

import { db } from '@/libs/firebase';
import {
    doc, getDoc, updateDoc, serverTimestamp, Timestamp
} from 'firebase/firestore';
import type { VideoDocument } from '@/types/video';

// Cache configuration
const CACHE_MAX_AGE_DAYS = 7;
const CACHE_MAX_AGE_MS = CACHE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

/**
 * YouTube video statistics
 */
export interface YouTubeStats {
    viewCount: number;
    likeCount: number;
    privacyStatus: string;
    largeThumbnail: string;
    smallThumbnail: string;
    publishedAt?: string;
    duration?: string;
}

/**
 * Extract YouTube video ID from URL
 */
export function extractYouTubeId(url: string): string | null {
    if (!url) return null;
    
    // Handle youtu.be format
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) return shortMatch[1];
    
    // Handle youtube.com format
    const longMatch = url.match(
        /youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)([^"&?\/\s]{11})/
    );
    if (longMatch) return longMatch[1];
    
    // Handle bare video ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
    
    return null;
}

/**
 * Generate thumbnail URLs from video ID
 */
export function generateThumbnails(videoId: string): {
    largeThumbnail: string;
    smallThumbnail: string;
} {
    return {
        largeThumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
        smallThumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    };
}

/**
 * Fetch stats from YouTube API
 */
async function fetchYouTubeStats(videoId: string, apiKey: string): Promise<YouTubeStats | null> {
    try {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics,status,snippet,contentDetails&id=${videoId}&key=${apiKey}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            console.error(`YouTube API error: ${response.status}`);
            return null;
        }
        
        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
            return null;
        }
        
        const item = data.items[0];
        const statistics = item.statistics || {};
        const status = item.status || {};
        const snippet = item.snippet || {};
        const thumbnails = snippet.thumbnails || {};
        
        return {
            viewCount: parseInt(statistics.viewCount) || 0,
            likeCount: parseInt(statistics.likeCount) || 0,
            privacyStatus: status.privacyStatus || 'public',
            largeThumbnail: thumbnails.maxres?.url || thumbnails.high?.url || generateThumbnails(videoId).largeThumbnail,
            smallThumbnail: thumbnails.medium?.url || thumbnails.default?.url || generateThumbnails(videoId).smallThumbnail,
            publishedAt: snippet.publishedAt,
            duration: item.contentDetails?.duration,
        };
    } catch (error) {
        console.error('Failed to fetch YouTube stats:', error);
        return null;
    }
}

/**
 * Calculate days since published
 */
function calculateDaysSincePublished(publishedAt?: string): number {
    if (!publishedAt) return 0;
    
    try {
        const publishDate = new Date(publishedAt);
        const now = new Date();
        const diffMs = now.getTime() - publishDate.getTime();
        return Math.floor(diffMs / (24 * 60 * 60 * 1000));
    } catch {
        return 0;
    }
}

/**
 * Calculate video score based on engagement
 */
function calculateVideoScore(
    viewCount: number,
    likeCount: number,
    daysSincePublished: number
): number {
    // Score formula: (views + likes * 10) / log(days + 2)
    const engagement = viewCount + likeCount * 10;
    const timeDecay = Math.log10(daysSincePublished + 2);
    return Math.round(engagement / timeDecay);
}

/**
 * Calculate deterministic score for consistent ordering
 */
function calculateDeterministicScore(videoId: string, videoScore: number): number {
    // Use video ID hash for deterministic ordering of same-score videos
    let hash = 0;
    for (let i = 0; i < videoId.length; i++) {
        hash = ((hash << 5) - hash) + videoId.charCodeAt(i);
        hash = hash & hash;
    }
    return videoScore * 1000000 + Math.abs(hash % 1000000);
}

/**
 * Check if cache is stale
 */
function isCacheStale(lastFetch: Date | Timestamp | null | undefined): boolean {
    if (!lastFetch) return true;
    
    let fetchDate: Date;
    if (lastFetch instanceof Timestamp) {
        fetchDate = lastFetch.toDate();
    } else if (lastFetch instanceof Date) {
        fetchDate = lastFetch;
    } else if (typeof (lastFetch as any).toDate === 'function') {
        fetchDate = (lastFetch as any).toDate();
    } else if (typeof (lastFetch as any)._seconds === 'number') {
        fetchDate = new Date((lastFetch as any)._seconds * 1000);
    } else {
        return true;
    }
    
    const now = new Date();
    return now.getTime() - fetchDate.getTime() > CACHE_MAX_AGE_MS;
}

/**
 * Get YouTube stats for a video, updating if stale
 * This is the main function for on-demand updates
 */
export async function getVideoStats(
    videoId: string,
    cachedData?: Partial<VideoDocument>
): Promise<{
    viewCount: number;
    likeCount: number;
    videoScore: number;
    deterministicScore: number;
    daysSincePublished: number;
    largeThumbnail: string;
    smallThumbnail: string;
    privacyStatus: string;
    wasUpdated: boolean;
}> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    // Default values from cache or generated
    const thumbnails = generateThumbnails(videoId);
    const defaultResult = {
        viewCount: cachedData?.viewCount || 0,
        likeCount: cachedData?.likeCount || 0,
        videoScore: cachedData?.videoScore || 0,
        deterministicScore: cachedData?.deterministicScore || 0,
        daysSincePublished: cachedData?.daysSincePublished || 0,
        largeThumbnail: cachedData?.largeThumbnail || thumbnails.largeThumbnail,
        smallThumbnail: cachedData?.smallThumbnail || thumbnails.smallThumbnail,
        privacyStatus: cachedData?.privacyStatus || 'public',
        wasUpdated: false,
    };
    
    // If no API key, return cached data
    if (!apiKey) {
        return defaultResult;
    }
    
    // Check if cache is still valid
    if (cachedData?.lastStatsFetch && !isCacheStale(cachedData.lastStatsFetch)) {
        return defaultResult;
    }
    
    // Fetch fresh data from YouTube
    const stats = await fetchYouTubeStats(videoId, apiKey);
    
    if (!stats) {
        return defaultResult;
    }
    
    const daysSincePublished = calculateDaysSincePublished(stats.publishedAt);
    const videoScore = calculateVideoScore(stats.viewCount, stats.likeCount, daysSincePublished);
    const deterministicScore = calculateDeterministicScore(videoId, videoScore);
    
    return {
        viewCount: stats.viewCount,
        likeCount: stats.likeCount,
        videoScore,
        deterministicScore,
        daysSincePublished,
        largeThumbnail: stats.largeThumbnail,
        smallThumbnail: stats.smallThumbnail,
        privacyStatus: stats.privacyStatus,
        wasUpdated: true,
    };
}

/**
 * Update video stats in Firestore
 */
export async function updateVideoStatsInFirestore(
    videoDocId: string,
    stats: {
        viewCount: number;
        likeCount: number;
        videoScore: number;
        deterministicScore: number;
        daysSincePublished: number;
        largeThumbnail: string;
        smallThumbnail: string;
        privacyStatus: string;
    }
): Promise<void> {
    try {
        const docRef = doc(db, 'videos', videoDocId);
        await updateDoc(docRef, {
            viewCount: stats.viewCount,
            likeCount: stats.likeCount,
            videoScore: stats.videoScore,
            deterministicScore: stats.deterministicScore,
            daysSincePublished: stats.daysSincePublished,
            largeThumbnail: stats.largeThumbnail,
            smallThumbnail: stats.smallThumbnail,
            privacyStatus: stats.privacyStatus,
            lastStatsFetch: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Failed to update video stats:', error);
        // Don't throw - stats update failure shouldn't break the flow
    }
}

/**
 * Get and update stats for a video document
 * Combines fetch and save operations
 */
export async function refreshVideoStats(
    videoDoc: VideoDocument
): Promise<VideoDocument> {
    const videoId = extractYouTubeId(videoDoc.videoUrl);
    
    if (!videoId) {
        return videoDoc;
    }
    
    const stats = await getVideoStats(videoId, videoDoc);
    
    if (stats.wasUpdated) {
        // Update in Firestore (fire and forget)
        updateVideoStatsInFirestore(videoDoc.id, stats).catch(console.error);
    }
    
    return {
        ...videoDoc,
        viewCount: stats.viewCount,
        likeCount: stats.likeCount,
        videoScore: stats.videoScore,
        deterministicScore: stats.deterministicScore,
        daysSincePublished: stats.daysSincePublished,
        largeThumbnail: stats.largeThumbnail,
        smallThumbnail: stats.smallThumbnail,
        privacyStatus: stats.privacyStatus,
    };
}

/**
 * Batch refresh stats for multiple videos
 * Uses rate limiting to avoid API quota issues
 */
export async function batchRefreshVideoStats(
    videos: VideoDocument[],
    options: {
        maxConcurrent?: number;
        onProgress?: (completed: number, total: number) => void;
    } = {}
): Promise<VideoDocument[]> {
    const { maxConcurrent = 5, onProgress } = options;
    
    const staleVideos = videos.filter(v => {
        const videoId = extractYouTubeId(v.videoUrl);
        if (!videoId) return false;
        return isCacheStale(v.lastStatsFetch);
    });
    
    if (staleVideos.length === 0) {
        return videos;
    }
    
    const results = new Map<string, VideoDocument>();
    let completed = 0;
    
    // Process in batches
    for (let i = 0; i < staleVideos.length; i += maxConcurrent) {
        const batch = staleVideos.slice(i, i + maxConcurrent);
        const batchResults = await Promise.all(
            batch.map(v => refreshVideoStats(v))
        );
        
        batchResults.forEach(v => results.set(v.id, v));
        completed += batch.length;
        
        if (onProgress) {
            onProgress(completed, staleVideos.length);
        }
        
        // Small delay between batches to avoid rate limiting
        if (i + maxConcurrent < staleVideos.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    // Merge results with original videos
    return videos.map(v => results.get(v.id) || v);
}
