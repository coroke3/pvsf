// Data conversion utilities for video import/export
import type { OldVideoJson, VideoDocument, VideoMember } from '@/types/video';

/**
 * Parse comma-separated member/memberid strings into structured array
 */
export function parseMembers(
    memberStr: string = '',
    memberIdStr: string = ''
): VideoMember[] {
    const names = memberStr.split(/[,、，]/).map(s => s.trim()).filter(Boolean);
    const ids = memberIdStr.split(/[,、，]/).map(s => s.trim());

    return names.map((name, index) => ({
        name,
        xid: ids[index] || '',
        role: '', // Role is empty on import, can be added later
    }));
}

/**
 * Convert members array back to comma-separated strings
 */
export function serializeMembers(members: VideoMember[]): {
    member: string;
    memberid: string;
} {
    return {
        member: members.map(m => m.name).join(','),
        memberid: members.map(m => m.xid).join(','),
    };
}

/**
 * Extract YouTube video ID from URL
 */
export function extractYouTubeId(url: string): string | null {
    if (!url) return null;

    // Handle various YouTube URL formats
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/, // Just the ID
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }

    // Legacy format: slice from position 17-28
    if (url.length >= 28) {
        return url.slice(17, 28);
    }

    return null;
}

/**
 * Generate thumbnail URLs from YouTube video ID
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
 * Convert old video JSON format to Firestore document format
 */
export function convertOldToNew(old: OldVideoJson): Omit<VideoDocument, 'id' | 'createdAt' | 'updatedAt'> {
    const members = parseMembers(old.member, old.memberid);
    const videoId = extractYouTubeId(old.ylink);
    const thumbnails = videoId ? generateThumbnails(videoId) : { largeThumbnail: '', smallThumbnail: '' };

    // Parse movieyear - can be number, string, or "伏せる"
    let movieYear: string | number;
    if (old.movieyear === '伏せる' || old.movieyear === 'hidden') {
        movieYear = '伏せる';
    } else if (typeof old.movieyear === 'number') {
        movieYear = old.movieyear;
    } else if (typeof old.movieyear === 'string') {
        const parsed = parseInt(old.movieyear, 10);
        movieYear = isNaN(parsed) ? old.movieyear : parsed;
    } else {
        movieYear = 0;
    }

    // Convert eventid (comma-separated string) to eventIds (array)
    const eventIds = old.eventid
        ? old.eventid.split(',').map(e => e.trim()).filter(Boolean)
        : [];

    // Parse snsPlans from othersns (comma-separated platforms) if present
    const snsPlans = old.othersns
        ? old.othersns.split(/[,、，]/).map(s => s.trim()).filter(Boolean).map(platform => ({
            platform,
            url: ''
        }))
        : [];

    return {
        videoUrl: old.ylink,
        title: old.title || '',
        description: old.comment || '',
        startTime: old.time ? new Date(old.time) : new Date(),
        eventIds,

        authorXid: old.tlink || '',
        authorXidLower: (old.tlink || '').toLowerCase(),
        authorName: old.creator || '',
        authorIconUrl: old.icon || null,
        authorChannelUrl: old.ychlink || '',

        music: old.music || '',
        credit: old.credit || '',
        type: old.type || old.type1 || '',
        type2: old.type2 || '',

        // Additional Legacy Fields
        musicUrl: old.ymulink || '',
        movieYear,
        otherSns: old.othersns || '',
        rightType: old.righttype || '',
        data: old.data || '',
        software: old.soft || '',
        beforeComment: old.beforecomment || '',
        afterComment: old.aftercomment || '',
        listen: old.listen || '',
        episode: old.episode || '',
        endMessage: old.end || '',
        ywatch: old.ywatch || '',
        timestamp: old.timestamp ? new Date(old.timestamp) : null,

        // New fields
        snsPlans,
        homepageComment: (old as any).homepageComment || (old as any).homecomment || '',
        link: (old as any).link || '',
        agreedToTerms: (old as any).agreedToTerms ?? true, // Default to true for imports

        members,

        viewCount: typeof old.viewCount === 'number' ? old.viewCount : parseInt(String(old.viewCount)) || 0,
        likeCount: typeof old.likeCount === 'number' ? old.likeCount : parseInt(String(old.likeCount)) || 0,
        videoScore: old.videoScore || 0,
        deterministicScore: old.deterministicScore || 0,
        largeThumbnail: old.largeThumbnail || thumbnails.largeThumbnail,
        smallThumbnail: old.smallThumbnail || thumbnails.smallThumbnail,
        privacyStatus: old.status || 'public',
        daysSincePublished: old.daysSincePublished || 0,
        lastStatsFetch: null,

        slotId: null,
    };
}

/**
 * Generate unique document ID from video URL
 */
export function generateVideoDocId(videoUrl: string): string {
    const videoId = extractYouTubeId(videoUrl);
    if (videoId) return videoId;

    // Fallback: hash the URL
    let hash = 0;
    for (let i = 0; i < videoUrl.length; i++) {
        const char = videoUrl.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `vid_${Math.abs(hash).toString(36)}`;
}
