// Admin slots API - manages registration slots for videos
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { adminDb } from '@/libs/firebase-admin';
import type { SlotDocument, ParsedSlotInput } from '@/types/slot';

/**
 * Parse CSV/TSV slot input
 * Format: date,time or date\ttime (one per line)
 * e.g., 2026-03-01,18:00 or 2026-03-01\t18:00
 */
function parseSlotInput(input: string): ParsedSlotInput[] {
    const lines = input.trim().split(/\r?\n/);
    const slots: ParsedSlotInput[] = [];

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Try to parse as CSV (comma) or TSV (tab)
        let parts: string[];
        if (trimmedLine.includes('\t')) {
            parts = trimmedLine.split('\t');
        } else if (trimmedLine.includes(',')) {
            parts = trimmedLine.split(',');
        } else {
            // Try space separator
            parts = trimmedLine.split(/\s+/);
        }

        if (parts.length >= 2) {
            const date = parts[0].trim();
            const time = parts[1].trim();

            // Validate date format (YYYY-MM-DD)
            if (/^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time)) {
                slots.push({ date, time });
            }
        }
    }

    return slots;
}

/**
 * Check if slots are consecutive (within 6 minute intervals)
 */
function areSlotsConsecutive(slotDateTimes: Date[]): boolean {
    if (slotDateTimes.length <= 1) return true;

    // Sort by time
    const sorted = [...slotDateTimes].sort((a, b) => a.getTime() - b.getTime());

    for (let i = 1; i < sorted.length; i++) {
        const diff = sorted[i].getTime() - sorted[i - 1].getTime();
        // Allow 6 minute intervals (360000 ms)
        if (diff !== 6 * 60 * 1000) {
            return false;
        }
    }

    return true;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Verify admin access
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const user = session.user as any;

    if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    // GET: List all slots
    if (req.method === 'GET') {
        const { eventId } = req.query;

        try {
            let query = adminDb.collection('slots').orderBy('dateTime', 'asc');

            if (eventId && typeof eventId === 'string') {
                query = query.where('eventId', '==', eventId) as any;
            }

            const slotsSnapshot = await query.get();

            const slots = await Promise.all(
                slotsSnapshot.docs.map(async doc => {
                    const data = doc.data() as SlotDocument;
                    let videoTitle: string | undefined;

                    // Fetch video title if assigned
                    if (data.videoId) {
                        try {
                            const videoDoc = await adminDb.collection('videos').doc(data.videoId).get();
                            if (videoDoc.exists) {
                                videoTitle = (videoDoc.data() as any).title;
                            }
                        } catch (e) {
                            // Ignore errors fetching video
                        }
                    }

                    return {
                        id: doc.id,
                        eventId: data.eventId,
                        dateTime: data.dateTime instanceof Date
                            ? data.dateTime.toISOString()
                            : (data.dateTime as any).toDate?.().toISOString() || data.dateTime,
                        videoId: data.videoId,
                        videoTitle,
                        isAvailable: !data.videoId,
                    };
                })
            );

            return res.status(200).json(slots);

        } catch (error) {
            console.error('Error fetching slots:', error);
            return res.status(500).json({ error: 'Failed to fetch slots' });
        }
    }

    // POST: Create slots (bulk from CSV/TSV)
    if (req.method === 'POST') {
        const { eventId, slotsInput, slots: slotsData } = req.body;

        if (!eventId) {
            return res.status(400).json({ error: 'eventId is required' });
        }

        try {
            let parsedSlots: ParsedSlotInput[] = [];

            // Parse from raw text input
            if (slotsInput && typeof slotsInput === 'string') {
                parsedSlots = parseSlotInput(slotsInput);
            }

            // Or use pre-parsed slots array
            if (slotsData && Array.isArray(slotsData)) {
                parsedSlots = slotsData;
            }

            if (parsedSlots.length === 0) {
                return res.status(400).json({
                    error: 'No valid slots found. Format: YYYY-MM-DD,HH:mm (one per line)'
                });
            }

            // Create slot documents
            const batch = adminDb.batch();
            const now = new Date();
            const createdSlotIds: string[] = [];

            for (const slot of parsedSlots) {
                const dateTime = new Date(`${slot.date}T${slot.time}:00`);

                // Generate unique ID based on eventId and dateTime
                const slotId = `${eventId}_${slot.date}_${slot.time.replace(':', '')}`;

                const slotDoc: Omit<SlotDocument, 'id'> = {
                    eventId,
                    dateTime,
                    videoId: null,
                    createdAt: now,
                    updatedAt: now,
                };

                batch.set(adminDb.collection('slots').doc(slotId), slotDoc);
                createdSlotIds.push(slotId);
            }

            await batch.commit();

            return res.status(201).json({
                success: true,
                message: `Created ${createdSlotIds.length} slots`,
                slotIds: createdSlotIds,
            });

        } catch (error) {
            console.error('Error creating slots:', error);
            return res.status(500).json({ error: 'Failed to create slots' });
        }
    }

    // DELETE: Remove slots
    if (req.method === 'DELETE') {
        const { slotIds } = req.body;

        if (!slotIds || !Array.isArray(slotIds) || slotIds.length === 0) {
            return res.status(400).json({ error: 'slotIds array is required' });
        }

        try {
            const batch = adminDb.batch();

            for (const slotId of slotIds) {
                // Check if slot is assigned
                const slotDoc = await adminDb.collection('slots').doc(slotId).get();
                if (slotDoc.exists) {
                    const slotData = slotDoc.data() as SlotDocument;

                    // If slot has a video, unassign the video from slot
                    if (slotData.videoId) {
                        batch.update(adminDb.collection('videos').doc(slotData.videoId), {
                            slotId: null,
                            updatedAt: new Date()
                        });
                    }

                    batch.delete(adminDb.collection('slots').doc(slotId));
                }
            }

            await batch.commit();

            return res.status(200).json({
                success: true,
                message: `Deleted ${slotIds.length} slots`,
            });

        } catch (error) {
            console.error('Error deleting slots:', error);
            return res.status(500).json({ error: 'Failed to delete slots' });
        }
    }

    // PATCH: Assign video to slot(s)
    if (req.method === 'PATCH') {
        const { videoId, slotIds } = req.body;

        if (!videoId) {
            return res.status(400).json({ error: 'videoId is required' });
        }

        if (!slotIds || !Array.isArray(slotIds)) {
            return res.status(400).json({ error: 'slotIds array is required' });
        }

        // Validate max 3 consecutive slots
        if (slotIds.length > 3) {
            return res.status(400).json({ error: 'Maximum 3 slots can be assigned to a video' });
        }

        try {
            // Verify all slots exist and are available
            const slotDocs = await Promise.all(
                slotIds.map(id => adminDb.collection('slots').doc(id).get())
            );

            const slotDateTimes: Date[] = [];
            for (let i = 0; i < slotDocs.length; i++) {
                const doc = slotDocs[i];
                if (!doc.exists) {
                    return res.status(404).json({
                        error: `Slot ${slotIds[i]} not found`
                    });
                }

                const data = doc.data() as SlotDocument;
                if (data.videoId && data.videoId !== videoId) {
                    return res.status(409).json({
                        error: `Slot ${slotIds[i]} is already assigned to another video`
                    });
                }

                const dateTime = data.dateTime instanceof Date
                    ? data.dateTime
                    : (data.dateTime as any).toDate?.() || new Date(data.dateTime);
                slotDateTimes.push(dateTime);
            }

            // Verify slots are consecutive (if more than 1)
            if (slotIds.length > 1 && !areSlotsConsecutive(slotDateTimes)) {
                return res.status(400).json({
                    error: 'Slots must be consecutive (6 minute intervals)'
                });
            }

            // Verify video exists
            const videoDoc = await adminDb.collection('videos').doc(videoId).get();
            if (!videoDoc.exists) {
                return res.status(404).json({ error: 'Video not found' });
            }

            // Perform assignment
            const batch = adminDb.batch();
            const now = new Date();

            // Update slots
            for (const slotId of slotIds) {
                batch.update(adminDb.collection('slots').doc(slotId), {
                    videoId,
                    updatedAt: now
                });
            }

            // Update video with first slot ID
            batch.update(adminDb.collection('videos').doc(videoId), {
                slotId: slotIds[0],
                updatedAt: now
            });

            await batch.commit();

            return res.status(200).json({
                success: true,
                message: `Assigned video to ${slotIds.length} slot(s)`,
            });

        } catch (error) {
            console.error('Error assigning slot:', error);
            return res.status(500).json({ error: 'Failed to assign slot' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
