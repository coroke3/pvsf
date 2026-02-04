// Slot Service - Client-side Firestore access for Cloudflare Pages compatibility
// Provides slot listing and reservation without API routes
import { db } from '@/libs/firebase';
import {
    collection, query, where, getDocs, getDoc, doc,
    updateDoc, serverTimestamp, Timestamp
} from 'firebase/firestore';
import type { EventSlotsDocument, TimeSlot, PublicSlot } from '@/types/slot';

// Interface for event summary
export interface EventSummary {
    eventId: string;
    eventName: string;
    availableCount: number;
    totalCount: number;
}

// Interface for slot filters
export interface SlotFilters {
    eventId?: string;
    includeAssigned?: boolean;
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
 * Get all events with slot counts
 */
export async function getEventList(): Promise<EventSummary[]> {
    try {
        const eventsRef = collection(db, 'eventSlots');
        const snapshot = await getDocs(eventsRef);

        const events: EventSummary[] = [];

        snapshot.docs.forEach(docSnap => {
            const data = docSnap.data() as EventSlotsDocument;

            // Skip deleted events
            if (data.isDeleted) return;

            const slots = data.slots || [];
            const availableSlots = slots.filter(s => !s.videoId);

            events.push({
                eventId: data.eventId,
                eventName: data.eventName,
                availableCount: availableSlots.length,
                totalCount: slots.length,
            });
        });

        // Sort by eventId
        events.sort((a, b) => a.eventId.localeCompare(b.eventId));

        return events;
    } catch (error) {
        console.error('Failed to get event list:', error);
        throw error;
    }
}

/**
 * Get available slots (optionally filtered by event)
 */
export async function getAvailableSlots(filters: SlotFilters = {}): Promise<PublicSlot[]> {
    try {
        const eventsRef = collection(db, 'eventSlots');
        const snapshot = await getDocs(eventsRef);

        const allSlots: PublicSlot[] = [];

        snapshot.docs.forEach(docSnap => {
            const data = docSnap.data() as EventSlotsDocument;

            // Skip deleted events
            if (data.isDeleted) return;

            // Filter by eventId if specified
            if (filters.eventId && data.eventId !== filters.eventId) return;

            const slots = data.slots || [];

            slots.forEach(slot => {
                if (!filters.includeAssigned && slot.videoId) {
                    return;
                }

                allSlots.push({
                    eventId: data.eventId,
                    eventName: data.eventName,
                    dateTime: toDate(slot.dateTime).toISOString(),
                    isAvailable: !slot.videoId,
                });
            });
        });

        // Sort by dateTime
        allSlots.sort((a, b) =>
            new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
        );

        return allSlots;
    } catch (error) {
        console.error('Failed to get available slots:', error);
        throw error;
    }
}

/**
 * Get slots for a specific event with full details
 */
export async function getEventSlots(eventId: string): Promise<TimeSlot[]> {
    try {
        const eventsRef = collection(db, 'eventSlots');
        const q = query(eventsRef, where('eventId', '==', eventId));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return [];
        }

        const data = snapshot.docs[0].data() as EventSlotsDocument;

        // Skip deleted events
        if (data.isDeleted) {
            return [];
        }

        return (data.slots || []).map(slot => ({
            ...slot,
            dateTime: toDate(slot.dateTime),
        }));
    } catch (error) {
        console.error('Failed to get event slots:', error);
        throw error;
    }
}

/**
 * Reserve a slot for a video
 */
export async function reserveSlot(
    eventId: string,
    slotDateTime: string,
    videoId: string,
    videoTitle: string
): Promise<void> {
    try {
        // Find the event document
        const eventsRef = collection(db, 'eventSlots');
        const q = query(eventsRef, where('eventId', '==', eventId));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            throw new Error('Event not found');
        }

        const docSnap = snapshot.docs[0];
        const docRef = doc(db, 'eventSlots', docSnap.id);
        const data = docSnap.data() as EventSlotsDocument;

        const targetTime = new Date(slotDateTime).getTime();

        // Find the slot index
        const slotIndex = data.slots.findIndex(slot => {
            const slotTime = toDate(slot.dateTime).getTime();
            return Math.abs(slotTime - targetTime) < 60000; // Within 1 minute
        });

        if (slotIndex === -1) {
            throw new Error('Slot not found');
        }

        const slot = data.slots[slotIndex];

        if (slot.videoId) {
            throw new Error('Slot already assigned');
        }

        // Update the slot
        const updatedSlots = [...data.slots];
        updatedSlots[slotIndex] = {
            ...slot,
            videoId,
            videoTitle,
        };

        await updateDoc(docRef, {
            slots: updatedSlots,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Failed to reserve slot:', error);
        throw error;
    }
}

/**
 * Release a slot reservation
 */
export async function releaseSlot(eventId: string, slotDateTime: string): Promise<void> {
    try {
        // Find the event document
        const eventsRef = collection(db, 'eventSlots');
        const q = query(eventsRef, where('eventId', '==', eventId));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            throw new Error('Event not found');
        }

        const docSnap = snapshot.docs[0];
        const docRef = doc(db, 'eventSlots', docSnap.id);
        const data = docSnap.data() as EventSlotsDocument;

        const targetTime = new Date(slotDateTime).getTime();

        // Find the slot index
        const slotIndex = data.slots.findIndex(slot => {
            const slotTime = toDate(slot.dateTime).getTime();
            return Math.abs(slotTime - targetTime) < 60000;
        });

        if (slotIndex === -1) {
            throw new Error('Slot not found');
        }

        // Update the slot
        const updatedSlots = [...data.slots];
        updatedSlots[slotIndex] = {
            ...updatedSlots[slotIndex],
            videoId: null,
            videoTitle: undefined,
        };

        await updateDoc(docRef, {
            slots: updatedSlots,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Failed to release slot:', error);
        throw error;
    }
}

/**
 * Check if a slot is available
 */
export async function isSlotAvailable(eventId: string, slotDateTime: string): Promise<boolean> {
    try {
        const slots = await getEventSlots(eventId);
        const targetTime = new Date(slotDateTime).getTime();

        const slot = slots.find(s => {
            const slotTime = toDate(s.dateTime).getTime();
            return Math.abs(slotTime - targetTime) < 60000;
        });

        if (!slot) return false;
        return !slot.videoId;
    } catch (error) {
        console.error('Failed to check slot availability:', error);
        return false;
    }
}
