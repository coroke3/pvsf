// Video Service - Client-side Firestore access for Cloudflare Pages compatibility
// Provides video CRUD operations without API routes
import { db } from '@/libs/firebase';
import {
    collection, query, where, getDocs, getDoc, doc,
    setDoc, updateDoc, addDoc, serverTimestamp,
    orderBy, limit, Timestamp
} from 'firebase/firestore';
import type { VideoDocument, VideoMember, SnsUploadPlan } from '@/types/video';
import { extractYouTubeId, generateThumbnails } from '@/libs/videoConverter';

// Interface for video creation data
export interface CreateVideoData {
    videoUrl: string;
    title: string;
    description?: string;
    startTime?: Date | string;
    authorXid: string;
    authorName: string;
    authorIconUrl?: string;
    authorChannelUrl?: string;
    music?: string;
    credit?: string;
    type?: string;
    type2?: string;
    musicUrl?: string;
    movieYear?: string | number;
    otherSns?: string;
    rightType?: string;
    software?: string;
    beforeComment?: string;
    afterComment?: string;
    listen?: string;
    episode?: string;
    endMessage?: string;
    members?: VideoMember[];
    eventIds?: string[];
    snsPlans?: SnsUploadPlan[];
    homepageComment?: string;
    link?: string;
    agreedToTerms?: boolean;
    slotEventId?: string;
    slotDateTime?: string;
}

// Interface for list filters
export interface VideoFilters {
    eventId?: string;
    authorXid?: string;
    limit?: number;
    includeDeleted?: boolean;
}

// Interface for update data
export interface UpdateVideoData {
    title?: string;
    description?: string;
    music?: string;
    credit?: string;
    type?: string;
    type2?: string;
    authorXid?: string;
    authorName?: string;
    authorIconUrl?: string;
    authorChannelUrl?: string;
    eventIds?: string[];
    startTime?: Date | string;
    musicUrl?: string;
    otherSns?: string;
    rightType?: string;
    software?: string;
    beforeComment?: string;
    afterComment?: string;
    listen?: string;
    episode?: string;
    endMessage?: string;
    members?: VideoMember[];
}

/**
 * Convert Firestore timestamp to Date
 */
function toDate(value: any): Date {
    if (!value) return new Date();
    if (value instanceof Date) return value;
    if (value instanceof Timestamp) return value.toDate();
    if (typeof value.toDate === 'function') return value.toDate();
    if (typeof value._seconds === 'number') return new Date(value._seconds * 1000);
    if (typeof value === 'string') return new Date(value);
    return new Date();
}

/**
 * Get all videos with optional filters
 */
export async function getVideos(filters: VideoFilters = {}): Promise<VideoDocument[]> {
    try {
        const videosRef = collection(db, 'videos');
        let q = query(videosRef);

        // Filter by deleted status
        if (!filters.includeDeleted) {
            q = query(videosRef, where('isDeleted', '!=', true));
        }

        // Apply limit
        if (filters.limit) {
            q = query(q, limit(filters.limit));
        }

        const snapshot = await getDocs(q);

        let videos = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                ...data,
                id: docSnap.id,
                startTime: toDate(data.startTime),
                createdAt: toDate(data.createdAt),
                updatedAt: toDate(data.updatedAt),
            } as VideoDocument;
        });

        // Client-side filtering for eventId
        if (filters.eventId) {
            videos = videos.filter(v =>
                v.eventIds?.includes(filters.eventId!)
            );
        }

        // Client-side filtering for authorXid
        if (filters.authorXid) {
            videos = videos.filter(v =>
                v.authorXidLower === filters.authorXid!.toLowerCase()
            );
        }

        return videos;
    } catch (error) {
        console.error('Failed to get videos:', error);
        throw error;
    }
}

/**
 * Get a single video by ID
 */
export async function getVideo(videoId: string): Promise<VideoDocument | null> {
    try {
        const docRef = doc(db, 'videos', videoId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        const data = docSnap.data();
        return {
            ...data,
            id: docSnap.id,
            startTime: toDate(data.startTime),
            createdAt: toDate(data.createdAt),
            updatedAt: toDate(data.updatedAt),
        } as VideoDocument;
    } catch (error) {
        console.error('Failed to get video:', error);
        throw error;
    }
}

/**
 * Create a new video
 */
export async function createVideo(
    data: CreateVideoData,
    userId: string
): Promise<string> {
    try {
        // Extract YouTube ID and generate thumbnails
        const youtubeId = extractYouTubeId(data.videoUrl);
        const thumbnails = youtubeId ? generateThumbnails(youtubeId) : { largeThumbnail: '', smallThumbnail: '' };

        // Build document data
        const videoData: Partial<VideoDocument> = {
            videoUrl: data.videoUrl,
            title: data.title,
            description: data.description || '',
            startTime: data.startTime ? new Date(data.startTime) : new Date(),
            authorXid: data.authorXid,
            authorXidLower: data.authorXid.toLowerCase(),
            authorName: data.authorName,
            authorIconUrl: data.authorIconUrl || null,
            authorChannelUrl: data.authorChannelUrl || '',
            music: data.music || '',
            credit: data.credit || '',
            type: data.type || '',
            type2: data.type2 || '',
            musicUrl: data.musicUrl || '',
            movieYear: data.movieYear || '',
            otherSns: data.otherSns || '',
            rightType: data.rightType || '',
            software: data.software || '',
            beforeComment: data.beforeComment || '',
            afterComment: data.afterComment || '',
            listen: data.listen || '',
            episode: data.episode || '',
            endMessage: data.endMessage || '',
            members: data.members || [],
            eventIds: data.eventIds || [],
            snsPlans: data.snsPlans || [],
            homepageComment: data.homepageComment || '',
            link: data.link || '',
            agreedToTerms: data.agreedToTerms || false,
            data: '',
            ywatch: '',
            timestamp: null,
            // YouTube stats (initialized)
            viewCount: 0,
            likeCount: 0,
            videoScore: 0,
            deterministicScore: 0,
            largeThumbnail: thumbnails.largeThumbnail,
            smallThumbnail: thumbnails.smallThumbnail,
            privacyStatus: 'public',
            daysSincePublished: 0,
            lastStatsFetch: null,
            slotId: null,
            isDeleted: false,
            deletedAt: null,
            deletedBy: null,
        };

        // Add with auto-generated ID
        const docRef = await addDoc(collection(db, 'videos'), {
            ...videoData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        return docRef.id;
    } catch (error) {
        console.error('Failed to create video:', error);
        throw error;
    }
}

/**
 * Update a video
 */
export async function updateVideo(
    videoId: string,
    data: UpdateVideoData
): Promise<void> {
    try {
        const docRef = doc(db, 'videos', videoId);

        // Build update data
        const updateData: Record<string, any> = {
            updatedAt: serverTimestamp(),
        };

        // Copy all provided fields
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.music !== undefined) updateData.music = data.music;
        if (data.credit !== undefined) updateData.credit = data.credit;
        if (data.type !== undefined) updateData.type = data.type;
        if (data.type2 !== undefined) updateData.type2 = data.type2;
        if (data.authorXid !== undefined) {
            updateData.authorXid = data.authorXid;
            updateData.authorXidLower = data.authorXid.toLowerCase();
        }
        if (data.authorName !== undefined) updateData.authorName = data.authorName;
        if (data.authorIconUrl !== undefined) updateData.authorIconUrl = data.authorIconUrl;
        if (data.authorChannelUrl !== undefined) updateData.authorChannelUrl = data.authorChannelUrl;
        if (data.eventIds !== undefined) updateData.eventIds = data.eventIds;
        if (data.startTime !== undefined) updateData.startTime = new Date(data.startTime);
        if (data.musicUrl !== undefined) updateData.musicUrl = data.musicUrl;
        if (data.otherSns !== undefined) updateData.otherSns = data.otherSns;
        if (data.rightType !== undefined) updateData.rightType = data.rightType;
        if (data.software !== undefined) updateData.software = data.software;
        if (data.beforeComment !== undefined) updateData.beforeComment = data.beforeComment;
        if (data.afterComment !== undefined) updateData.afterComment = data.afterComment;
        if (data.listen !== undefined) updateData.listen = data.listen;
        if (data.episode !== undefined) updateData.episode = data.episode;
        if (data.endMessage !== undefined) updateData.endMessage = data.endMessage;
        if (data.members !== undefined) updateData.members = data.members;

        await updateDoc(docRef, updateData);
    } catch (error) {
        console.error('Failed to update video:', error);
        throw error;
    }
}

/**
 * Soft delete a video
 */
export async function deleteVideo(videoId: string, userId: string): Promise<void> {
    try {
        const docRef = doc(db, 'videos', videoId);
        await updateDoc(docRef, {
            isDeleted: true,
            deletedAt: serverTimestamp(),
            deletedBy: userId,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Failed to delete video:', error);
        throw error;
    }
}

/**
 * Restore a soft-deleted video
 */
export async function restoreVideo(videoId: string): Promise<void> {
    try {
        const docRef = doc(db, 'videos', videoId);
        await updateDoc(docRef, {
            isDeleted: false,
            deletedAt: null,
            deletedBy: null,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Failed to restore video:', error);
        throw error;
    }
}

/**
 * Check if user can edit a video
 */
export async function canEditVideo(videoId: string, userId: string, userXids: string[]): Promise<boolean> {
    try {
        const video = await getVideo(videoId);
        if (!video) return false;

        // Check if user is the author
        if (userXids.some(xid => xid.toLowerCase() === video.authorXidLower)) {
            return true;
        }

        // Check if user is in members with editApproved
        if (video.members?.some(m =>
            userXids.some(xid => xid.toLowerCase() === m.xid.toLowerCase()) && m.editApproved
        )) {
            return true;
        }

        return false;
    } catch (error) {
        console.error('Failed to check video edit permission:', error);
        return false;
    }
}
