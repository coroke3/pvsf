// Admin: Manage event slots (event-based slot management)
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { adminDb } from '@/libs/firebase-admin';
import type { EventSlotsDocument, TimeSlot, EventSlotsApiResponse } from '@/types/slot';

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

/**
 * Parse slots input (CSV/TSV format)
 * Format: YYYY-MM-DD,HH:mm or YYYY-MM-DD\tHH:mm
 */
function parseSlotsInput(input: string): Date[] {
    const lines = input.trim().split(/\r?\n/);
    const slots: Date[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let parts: string[];
        if (trimmed.includes('\t')) {
            parts = trimmed.split('\t');
        } else if (trimmed.includes(',')) {
            parts = trimmed.split(',');
        } else {
            parts = trimmed.split(/\s+/);
        }

        if (parts.length >= 2) {
            const date = parts[0].trim();
            const time = parts[1].trim();

            if (/^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time)) {
                slots.push(new Date(`${date}T${time}:00`));
            }
        }
    }

    // Sort by date
    slots.sort((a, b) => a.getTime() - b.getTime());
    return slots;
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

    // GET: List all event slots
    if (req.method === 'GET') {
        try {
            const snapshot = await adminDb.collection('eventSlots').get();

            const events: EventSlotsApiResponse[] = await Promise.all(
                snapshot.docs
                    .filter(doc => {
                        const data = doc.data();
                        return !data.isDeleted;
                    })
                    .map(async (doc) => {
                        const data = doc.data() as EventSlotsDocument;
                        const slots = data.slots || [];

                        // Get video titles for assigned slots
                        const slotsWithTitles = await Promise.all(
                            slots.map(async (slot) => {
                                let videoTitle: string | undefined;
                                if (slot.videoId) {
                                    try {
                                        const videoDoc = await adminDb.collection('videos').doc(slot.videoId).get();
                                        if (videoDoc.exists) {
                                            const videoData = videoDoc.data();
                                            if (!videoData?.isDeleted) {
                                                videoTitle = videoData?.title;
                                            }
                                        }
                                    } catch (e) {
                                        // Ignore errors
                                    }
                                }

                                const dateTime = toDate(slot.dateTime);
                                return {
                                    dateTime: dateTime.toISOString(),
                                    videoId: slot.videoId,
                                    videoTitle,
                                    isAvailable: !slot.videoId,
                                };
                            })
                        );

                        const availableSlots = slotsWithTitles.filter(s => s.isAvailable).length;
                        const assignedSlots = slotsWithTitles.filter(s => !s.isAvailable).length;

                        return {
                            id: doc.id,
                            eventId: data.eventId,
                            eventName: data.eventName,
                            slots: slotsWithTitles,
                            totalSlots: slotsWithTitles.length,
                            availableSlots,
                            assignedSlots,
                            createdAt: toDate(data.createdAt).toISOString(),
                            updatedAt: toDate(data.updatedAt).toISOString(),
                        };
                    })
            );

            // Sort by eventId
            events.sort((a, b) => a.eventId.localeCompare(b.eventId));

            return res.status(200).json(events);
        } catch (error) {
            console.error('Error fetching event slots:', error);
            return res.status(500).json({ error: 'Failed to fetch event slots' });
        }
    }

    // POST: Create or update event slots
    if (req.method === 'POST') {
        const { eventId, eventName, slotsInput, slots: slotsArray } = req.body;

        if (!eventId) {
            return res.status(400).json({ error: 'eventId is required' });
        }

        try {
            const now = new Date();
            let newSlots: TimeSlot[] = [];

            // Parse from text input
            if (slotsInput && typeof slotsInput === 'string') {
                const parsedDates = parseSlotsInput(slotsInput);
                newSlots = parsedDates.map(dateTime => ({
                    dateTime,
                    videoId: null,
                }));
            }

            // Or use pre-parsed array
            if (slotsArray && Array.isArray(slotsArray)) {
                newSlots = slotsArray.map((s: any) => ({
                    dateTime: new Date(s.dateTime || `${s.date}T${s.time}:00`),
                    videoId: s.videoId || null,
                }));
            }

            if (newSlots.length === 0) {
                return res.status(400).json({
                    error: 'No valid slots found. Format: YYYY-MM-DD,HH:mm (one per line)'
                });
            }

            // Check if event already exists
            const existingDoc = await adminDb.collection('eventSlots').doc(eventId).get();

            if (existingDoc.exists) {
                // Merge with existing slots (preserve assigned slots)
                const existingData = existingDoc.data() as EventSlotsDocument;
                const existingSlots = existingData.slots || [];

                // Create a map of existing slots by dateTime
                const existingMap = new Map<string, TimeSlot>();
                for (const slot of existingSlots) {
                    const key = toDate(slot.dateTime).toISOString();
                    existingMap.set(key, slot);
                }

                // Merge new slots (don't overwrite assigned slots)
                for (const newSlot of newSlots) {
                    const key = toDate(newSlot.dateTime).toISOString();
                    if (!existingMap.has(key)) {
                        existingMap.set(key, newSlot);
                    }
                }

                // Convert back to array and sort
                const mergedSlots = Array.from(existingMap.values());
                mergedSlots.sort((a, b) => toDate(a.dateTime).getTime() - toDate(b.dateTime).getTime());

                await adminDb.collection('eventSlots').doc(eventId).update({
                    eventName: eventName || existingData.eventName,
                    slots: mergedSlots,
                    updatedAt: now,
                });

                return res.status(200).json({
                    success: true,
                    message: `Updated event ${eventId} with ${mergedSlots.length} slots (added ${newSlots.length} new)`,
                    totalSlots: mergedSlots.length,
                });
            } else {
                // Create new event slots document
                const eventSlotsDoc: Omit<EventSlotsDocument, 'id'> = {
                    eventId,
                    eventName: eventName || eventId.toUpperCase(),
                    slots: newSlots,
                    createdAt: now,
                    updatedAt: now,
                };

                await adminDb.collection('eventSlots').doc(eventId).set(eventSlotsDoc);

                return res.status(201).json({
                    success: true,
                    message: `Created event ${eventId} with ${newSlots.length} slots`,
                    totalSlots: newSlots.length,
                });
            }
        } catch (error) {
            console.error('Error creating/updating event slots:', error);
            return res.status(500).json({ error: 'Failed to create/update event slots' });
        }
    }

    // PUT: Update event (name, edit slots)
    if (req.method === 'PUT') {
        const { eventId, eventName, slots: updatedSlots } = req.body;

        if (!eventId) {
            return res.status(400).json({ error: 'eventId is required' });
        }

        try {
            const docRef = adminDb.collection('eventSlots').doc(eventId);
            const doc = await docRef.get();

            if (!doc.exists) {
                return res.status(404).json({ error: 'Event not found' });
            }

            const updates: any = {
                updatedAt: new Date(),
            };

            if (eventName !== undefined) {
                updates.eventName = eventName;
            }

            if (updatedSlots && Array.isArray(updatedSlots)) {
                updates.slots = updatedSlots.map((s: any) => ({
                    dateTime: new Date(s.dateTime),
                    videoId: s.videoId || null,
                }));
            }

            await docRef.update(updates);

            return res.status(200).json({
                success: true,
                message: 'Event updated successfully',
            });
        } catch (error) {
            console.error('Error updating event:', error);
            return res.status(500).json({ error: 'Failed to update event' });
        }
    }

    // PATCH: Assign video to slot
    if (req.method === 'PATCH') {
        const { eventId, slotDateTime, videoId } = req.body;

        if (!eventId || !slotDateTime) {
            return res.status(400).json({ error: 'eventId and slotDateTime are required' });
        }

        try {
            const docRef = adminDb.collection('eventSlots').doc(eventId);
            const doc = await docRef.get();

            if (!doc.exists) {
                return res.status(404).json({ error: 'Event not found' });
            }

            const data = doc.data() as EventSlotsDocument;
            const targetDateTime = new Date(slotDateTime).toISOString();

            // Find and update the slot
            let found = false;
            const updatedSlots = data.slots.map(slot => {
                const slotDateTime = toDate(slot.dateTime).toISOString();
                if (slotDateTime === targetDateTime) {
                    found = true;
                    return {
                        ...slot,
                        videoId: videoId || null,
                    };
                }
                return slot;
            });

            if (!found) {
                return res.status(404).json({ error: 'Slot not found' });
            }

            await docRef.update({
                slots: updatedSlots,
                updatedAt: new Date(),
            });

            return res.status(200).json({
                success: true,
                message: videoId ? 'Video assigned to slot' : 'Slot cleared',
            });
        } catch (error) {
            console.error('Error assigning slot:', error);
            return res.status(500).json({ error: 'Failed to assign slot' });
        }
    }

    // DELETE: Delete event or specific slots
    if (req.method === 'DELETE') {
        const { eventId, slotDateTimes } = req.body;

        if (!eventId) {
            return res.status(400).json({ error: 'eventId is required' });
        }

        try {
            const docRef = adminDb.collection('eventSlots').doc(eventId);
            const doc = await docRef.get();

            if (!doc.exists) {
                return res.status(404).json({ error: 'Event not found' });
            }

            // If slotDateTimes provided, delete specific slots
            if (slotDateTimes && Array.isArray(slotDateTimes) && slotDateTimes.length > 0) {
                const data = doc.data() as EventSlotsDocument;
                const targetDateTimes = new Set(slotDateTimes.map((dt: string) => new Date(dt).toISOString()));

                const remainingSlots = data.slots.filter(slot => {
                    const slotDateTime = toDate(slot.dateTime).toISOString();
                    return !targetDateTimes.has(slotDateTime);
                });

                await docRef.update({
                    slots: remainingSlots,
                    updatedAt: new Date(),
                });

                return res.status(200).json({
                    success: true,
                    message: `Deleted ${slotDateTimes.length} slots`,
                    remainingSlots: remainingSlots.length,
                });
            }

            // Otherwise soft-delete entire event
            await docRef.update({
                isDeleted: true,
                deletedAt: new Date(),
                deletedBy: user.id || user.discordId || 'admin',
                updatedAt: new Date(),
            });

            return res.status(200).json({
                success: true,
                message: 'Event soft-deleted',
            });
        } catch (error) {
            console.error('Error deleting:', error);
            return res.status(500).json({ error: 'Failed to delete' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
