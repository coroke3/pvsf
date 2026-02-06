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
            mode, // 'slot' | 'noSlot'
            slotId, // Legacy
            slotEventId,
            slotDateTime,
            slotDateTimes, // Array for multi-slot
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

        if (!title) {
            return res.status(400).json({ error: 'Title is required (Temporary title is acceptable)' });
        }

        // Authorization check (Admin or Approved XID)
        const isUserAdmin = user.role === 'admin';
        
        if (!isUserAdmin) {
            if (!authorXid) {
                return res.status(400).json({ error: 'Author XID is required' });
            }
            const approvedXids = (user.xidClaims || [])
                .filter((c: any) => c.status === 'approved')
                .map((c: any) => c.xid.toLowerCase());
            
            if (!approvedXids.includes(authorXid.toLowerCase())) {
                return res.status(403).json({
                    error: 'You can only register videos with your approved XID'
                });
            }
        }

        // --- Logic Separation based on Mode ---
        let assignedEventId: string | null = null;
        let videoStartTime: Date;
        let targetSlotDateTimes: string[] = [];
        let finalVideoUrl = videoUrl;
        
        // Default mode to 'slot' if missing for backward compatibility, OR infer
        const registrationMode = mode || ((slotEventId && slotDateTime) ? 'slot' : 'noSlot');

        if (registrationMode === 'slot') {
            // == SLOT REGISTRATION ==
            if (!slotEventId) return res.status(400).json({ error: 'Event ID is required for slot registration' });
            
            // Handle multiple slots
            const datesToBook = slotDateTimes || (slotDateTime ? [slotDateTime] : []);
            if (datesToBook.length === 0) return res.status(400).json({ error: 'Slot date time is required' });

            const eventDoc = await adminDb.collection('eventSlots').doc(slotEventId).get();
            if (!eventDoc.exists) return res.status(404).json({ error: 'Event not found' });
            
            const eventData = eventDoc.data() as EventSlotsDocument;
            if (eventData.isDeleted) return res.status(404).json({ error: 'Event not found' });

            // Validate all slots
            for (const dateTimeStr of datesToBook) {
                const targetDateTime = new Date(dateTimeStr).toISOString();
                const slot = eventData.slots.find((s: TimeSlot) => {
                    const sDateTime = toDate(s.dateTime).toISOString();
                    return sDateTime === targetDateTime;
                });

                if (!slot) return res.status(404).json({ error: `Slot not found: ${dateTimeStr}` });
                if (slot.videoId) return res.status(409).json({ error: `Slot is already assigned: ${dateTimeStr}` });
                targetSlotDateTimes.push(targetDateTime);
            }

            // Consecutive check
            if (targetSlotDateTimes.length > 1) {
                // Use ALL slots to ensure strict adjacency (user cannot skip occupied slots)
                const sortedAllSlots = [...eventData.slots]
                    .sort((a, b) => toDate(a.dateTime).getTime() - toDate(b.dateTime).getTime());
                
                const indices = targetSlotDateTimes.map(dt => 
                    sortedAllSlots.findIndex(s => toDate(s.dateTime).toISOString() === dt)
                );
                
                indices.sort((a, b) => a - b);

                for (let i = 1; i < indices.length; i++) {
                    const prevIdx = indices[i - 1];
                    const currIdx = indices[i];

                    // Check index adjacency (must be next immediate slot in the event configuration)
                    if (currIdx !== prevIdx + 1) {
                         return res.status(400).json({ error: 'Selected slots must be consecutive' });
                    }

                    // Check time adjacency safeguard
                    // If an event has a large gap (e.g. overnight break), adjacent indices might have huge time difference.
                    // We interpret "consecutive" as temporal continuity for a single video.
                    const prevTime = toDate(sortedAllSlots[prevIdx].dateTime).getTime();
                    const currTime = toDate(sortedAllSlots[currIdx].dateTime).getTime();
                    const diffMinutes = (currTime - prevTime) / (1000 * 60);

                    // If gap is larger than 120 minutes, assume it's not a continuous session
                    // (Standard slots are usually 5-15 mins. 120 is generous but prevents Day 1 -> Day 2 bridging)
                    if (diffMinutes > 120) {
                        return res.status(400).json({ error: 'Selected slots have a large time gap and cannot be treated as consecutive' });
                    }
                }
            }
            if (targetSlotDateTimes.length > 3) return res.status(400).json({ error: 'Maximum 3 slots allowed' });

            // Set Start Time to first slot
            videoStartTime = new Date(datesToBook[0]); // Use original string input for safety or sorted array? 
            // Better to sort targetSlotDateTimes and use first
            targetSlotDateTimes.sort();
            videoStartTime = new Date(targetSlotDateTimes[0]);
            
            assignedEventId = slotEventId;
            
        } else {
            // == NON-SLOT REGISTRATION (Past Works) ==
            if (!finalVideoUrl) return res.status(400).json({ error: 'Video URL is required for non-slot registration' });
            if (!startTime) return res.status(400).json({ error: 'Start time is required' });
            
            videoStartTime = new Date(startTime);
            if (videoStartTime > new Date()) {
                return res.status(400).json({ error: 'Start time must be in the past for non-slot registration' });
            }
        }

        // --- ID Generation ---
        let videoId = '';
        let thumbnails = { largeThumbnail: '', smallThumbnail: '' };

        if (finalVideoUrl) {
            const ytId = extractYouTubeId(finalVideoUrl);
            if (!ytId) return res.status(400).json({ error: 'Invalid YouTube URL' });
            videoId = ytId;
            thumbnails = generateThumbnails(ytId);
            
            // Check duplicate
            const existing = await adminDb.collection('videos').doc(videoId).get();
            if (existing.exists && !(existing.data() as VideoDocument).isDeleted) {
                return res.status(409).json({ error: 'This video is already registered' });
            }
        } else {
             // Draft ID for Slot-only
             const random = Math.random().toString(36).substring(2, 8);
             videoId = `draft_${Date.now()}_${random}`;
        }

        // --- Create Document ---
        const now = new Date();
        
        let finalEventIds: string[] = [];
        if (eventIds && Array.isArray(eventIds)) finalEventIds = eventIds;
        else if (assignedEventId) finalEventIds = [assignedEventId];

        const finalMovieYear = (movieYear !== undefined && movieYear !== '') ? movieYear : videoStartTime.getFullYear();

        const videoDoc: Omit<VideoDocument, 'id'> = {
            videoUrl: finalVideoUrl || '',
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
            type: type || '個人',
            type2: type2 || '個人',
            
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

        const batch = adminDb.batch();
        batch.set(adminDb.collection('videos').doc(videoId), videoDoc);

        if (assignedEventId && targetSlotDateTimes.length > 0) {
            const eventRef = adminDb.collection('eventSlots').doc(assignedEventId);
            const eDoc = await eventRef.get();
            if (eDoc.exists) {
                const eData = eDoc.data() as EventSlotsDocument;
                const updatedSlots = eData.slots.map(s => {
                    const sTime = toDate(s.dateTime).toISOString();
                    if (targetSlotDateTimes.includes(sTime)) {
                        return { ...s, videoId, videoTitle: title };
                    }
                    return s;
                });
                batch.update(eventRef, { slots: updatedSlots, updatedAt: now });
            }
        }

        await batch.commit();

        return res.status(201).json({
            success: true,
            videoId,
            message: 'Video registered successfully'
        });

    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
