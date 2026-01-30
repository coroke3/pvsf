// Public slots API - returns available slots for authenticated users
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { adminDb } from '@/libs/firebase-admin';
import type { EventSlotsDocument, PublicSlot } from '@/types/slot';

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
    // GET: List available slots (for authenticated users)
    if (req.method === 'GET') {
        // Require authentication
        const session = await getServerSession(req, res, authOptions);

        if (!session?.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { eventId, listEvents, includeAll } = req.query;
        const showAllSlots = includeAll === 'true';

        try {
            // Fetch all event slots
            const snapshot = await adminDb.collection('eventSlots').get();

            const allEvents: { eventId: string; eventName: string; slots: PublicSlot[] }[] = [];

            for (const doc of snapshot.docs) {
                const data = doc.data() as EventSlotsDocument;

                // Skip deleted events
                if (data.isDeleted) continue;

                // Get slots - either all or only available ones
                const eventSlots: PublicSlot[] = (data.slots || [])
                    .filter(slot => showAllSlots || !slot.videoId)
                    .map(slot => ({
                        eventId: data.eventId,
                        eventName: data.eventName,
                        dateTime: toDate(slot.dateTime).toISOString(),
                        isAvailable: !slot.videoId,
                    }));

                if (eventSlots.length > 0) {
                    allEvents.push({
                        eventId: data.eventId,
                        eventName: data.eventName,
                        slots: eventSlots,
                    });
                }
            }

            // If listEvents is true, return event list
            if (listEvents === 'true') {
                const events = allEvents.map(e => ({
                    eventId: e.eventId,
                    eventName: e.eventName,
                    availableCount: e.slots.length,
                }));
                events.sort((a, b) => a.eventId.localeCompare(b.eventId));
                return res.status(200).json(events);
            }

            // Filter by eventId if provided
            if (eventId && typeof eventId === 'string') {
                const event = allEvents.find(e => e.eventId === eventId);
                if (!event) {
                    return res.status(200).json([]);
                }
                // Sort slots by dateTime
                event.slots.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
                return res.status(200).json(event.slots);
            }

            // Return all available slots from all events
            const allSlots: PublicSlot[] = allEvents.flatMap(e => e.slots);
            allSlots.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

            return res.status(200).json(allSlots);

        } catch (error) {
            console.error('Error fetching slots:', error);
            return res.status(500).json({ error: 'Failed to fetch slots' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
