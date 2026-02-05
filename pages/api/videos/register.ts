// Video Registration API - handles new video submissions
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { adminDb } from '@/libs/firebase-admin';
import type { VideoDocument } from '@/types/video';
import type { EventSlotsDocument, TimeSlot } from '@/types/slot';
import { extractYouTubeId, generateThumbnails } from '@/libs/videoConverter';

/**
 * Convert Firestore timestamp to Date
 */
function toDate(value: any): Date {
    if (!value) return new Date();
    if (value instanceof Date) return value;
    if (typeof value.toDate === 'function') return value.toDate();
    if (typeof value._seconds === 'number') return new Date(value._seconds * 1000);
    return new Date(value);
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Require authentication
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const user = session.user as any;

    try {
        const {
            slotId, // Legacy - for backward compatibility
            slotEventId,
            slotDateTime,
            videoUrl,
            title,
            description,
            startTime,
            authorXid,
            authorName,
            authorIconUrl,
            authorChannelUrl,
            music,
            credit,
            type,
            type2,
            musicUrl,
            otherSns,
            rightType,
            software,
            beforeComment,
            afterComment,
            listen,
            episode,
            endMessage,
            members,
            eventIds,
            movieYear,
            snsPlans,
            homepageComment,
            link,
            agreedToTerms,
        } = req.body;

        // Validate required fields
        if (!videoUrl) {
            return res.status(400).json({ error: 'Video URL is required' });
        }
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        // For non-admin users, validate XID authorization
        if (user.role !== 'admin') {
            if (!authorXid) {
                return res.status(400).json({ error: 'Author XID is required' });
            }

            // Check if user has approved XID claim for the author
            const approvedXids = (user.xidClaims || [])
                .filter((c: any) => c.status === 'approved')
                .map((c: any) => c.xid.toLowerCase());

            if (!approvedXids.includes(authorXid.toLowerCase())) {
                return res.status(403).json({
                    error: 'You can only register videos with your approved XID'
                });
            }
        }

        // Determine registration mode
        const isSlotLinked = !!(slotEventId && slotDateTime);
        let assignedEventId: string | null = null;
        let videoStartTime: Date;
        let targetSlotDateTimes: string[] = [];

        if (isSlotLinked) {
            // New event-based slot registration
            const eventDoc = await adminDb.collection('eventSlots').doc(slotEventId).get();

            if (!eventDoc.exists) {
                return res.status(404).json({ error: 'Event not found' });
            }

            const eventData = eventDoc.data() as EventSlotsDocument;

            if (eventData.isDeleted) {
                return res.status(404).json({ error: 'Event not found' });
            }

            // Handle multiple slots (slotDateTimes) or single slot (slotDateTime)
            const slotDateTimes = req.body.slotDateTimes || [slotDateTime];

            // Validate all slots exist and are available
            for (const dateTimeStr of slotDateTimes) {
                const targetDateTime = new Date(dateTimeStr).toISOString();
                const slot = eventData.slots.find((s: TimeSlot) => {
                    const sDateTime = toDate(s.dateTime).toISOString();
                    return sDateTime === targetDateTime;
                });

                if (!slot) {
                    return res.status(404).json({ error: `Slot not found: ${dateTimeStr}` });
                }

                if (slot.videoId) {
                    return res.status(409).json({ error: `Slot is already assigned: ${dateTimeStr}` });
                }

                targetSlotDateTimes.push(targetDateTime);
            }

            // Validate slots are consecutive (if more than 1)
            if (targetSlotDateTimes.length > 1) {
                const sortedEventSlots = [...eventData.slots]
                    .filter(s => !s.videoId)
                    .sort((a, b) => toDate(a.dateTime).getTime() - toDate(b.dateTime).getTime());

                const indices = targetSlotDateTimes.map(dt =>
                    sortedEventSlots.findIndex(s => toDate(s.dateTime).toISOString() === dt)
                );

                // Check if all indices are consecutive
                for (let i = 1; i < indices.length; i++) {
                    if (indices[i] !== indices[i - 1] + 1) {
                        return res.status(400).json({ error: 'Selected slots must be consecutive' });
                    }
                }
            }

            // Maximum 3 slots
            if (targetSlotDateTimes.length > 3) {
                return res.status(400).json({ error: 'Maximum 3 consecutive slots allowed' });
            }

            videoStartTime = new Date(slotDateTime);
            assignedEventId = slotEventId;

        } else {
            // Non-slot registration: startTime must be in the past
            if (!startTime) {
                return res.status(400).json({
                    error: 'Start time is required for non-slot registrations'
                });
            }

            videoStartTime = new Date(startTime);
            const now = new Date();

            if (videoStartTime >= now) {
                return res.status(400).json({
                    error: 'For non-slot registrations, start time must be a past date'
                });
            }
        }

        // Extract YouTube ID and generate thumbnails
        const ytId = extractYouTubeId(videoUrl);
        if (!ytId) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        const thumbnails = generateThumbnails(ytId);

        // Check for duplicate video
        const existingVideo = await adminDb.collection('videos').doc(ytId).get();
        if (existingVideo.exists) {
            const existingData = existingVideo.data() as VideoDocument;
            // Allow re-registration if the video was soft-deleted
            if (!existingData.isDeleted) {
                return res.status(409).json({ error: 'This video is already registered' });
            }
            // If soft-deleted, we proceed (which will overwrite/restore the video)
        }

        // Create video document
        const now = new Date();

        // Determine eventIds - from request or from assigned event slot
        let finalEventIds: string[] = [];
        if (eventIds && Array.isArray(eventIds) && eventIds.length > 0) {
            finalEventIds = eventIds;
        } else if (assignedEventId) {
            finalEventIds = [assignedEventId];
        }

        // Determine movieYear - use provided value or default to year from startTime
        const finalMovieYear = movieYear !== undefined && movieYear !== ''
            ? movieYear
            : videoStartTime.getFullYear();

        const videoDoc: Omit<VideoDocument, 'id'> = {
            videoUrl,
            title,
            description: description || '',
            startTime: videoStartTime,
            eventIds: finalEventIds,

            authorXid: authorXid || '',
            authorXidLower: (authorXid || '').toLowerCase(),
            authorName: authorName || '',
            authorIconUrl: authorIconUrl || null,
            authorChannelUrl: authorChannelUrl || '',

            music: music || '',
            credit: credit || '',
            type: type || '',
            type2: type2 || '',

            musicUrl: musicUrl || '',
            movieYear: finalMovieYear,
            otherSns: otherSns || '',
            rightType: rightType || '',
            data: `${String(videoStartTime.getMonth() + 1).padStart(2, '0')}/${String(videoStartTime.getDate()).padStart(2, '0')}`,
            software: software || '',
            beforeComment: beforeComment || '',
            afterComment: afterComment || '',
            listen: listen || '',
            episode: episode || '',
            endMessage: endMessage || '',
            ywatch: '',
            timestamp: now,

            members: members || [],

            // New fields
            snsPlans: snsPlans || [],
            homepageComment: homepageComment || '',
            link: link || '',
            agreedToTerms: agreedToTerms || false,

            viewCount: 0,
            likeCount: 0,
            videoScore: 0,
            deterministicScore: 0,
            largeThumbnail: thumbnails.largeThumbnail,
            smallThumbnail: thumbnails.smallThumbnail,
            privacyStatus: 'public',
            daysSincePublished: 0,
            lastStatsFetch: null,

            slotId: assignedEventId && targetSlotDateTimes.length > 0
                ? `${assignedEventId}_${targetSlotDateTimes[0]}_x${targetSlotDateTimes.length}`
                : null,
            slotCount: targetSlotDateTimes.length || 1,

            createdAt: now,
            updatedAt: now,
        };

        // Use batch write if slot assignment needed
        const batch = adminDb.batch();

        // Create video
        batch.set(adminDb.collection('videos').doc(ytId), videoDoc);

        // Update event slots if assigned (supports multiple slots)
        if (assignedEventId && targetSlotDateTimes.length > 0) {
            // Need to update all assigned slots in the event document
            const eventDocRef = adminDb.collection('eventSlots').doc(assignedEventId);
            const eventDoc = await eventDocRef.get();

            if (eventDoc.exists) {
                const eventData = eventDoc.data() as EventSlotsDocument;
                const updatedSlots = eventData.slots.map((s: TimeSlot) => {
                    const sDateTime = toDate(s.dateTime).toISOString();
                    // Check if this slot is in our target list
                    if (targetSlotDateTimes.includes(sDateTime)) {
                        return { ...s, videoId: ytId };
                    }
                    return s;
                });

                batch.update(eventDocRef, {
                    slots: updatedSlots,
                    updatedAt: now
                });
            }
        }

        await batch.commit();

        return res.status(201).json({
            success: true,
            videoId: ytId,
            message: isSlotLinked
                ? 'Video registered and assigned to slot successfully'
                : 'Video registered successfully',
        });

    } catch (error) {
        console.error('Video registration error:', error);
        return res.status(500).json({ error: 'Failed to register video' });
    }
}
