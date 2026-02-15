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

/**
 * Slot generation configuration
 */
export interface SlotRangeConfig {
    startDate: Date;
    endDate: Date;
    startTime: string;  // "HH:mm" format
    endTime: string;    // "HH:mm" format
    intervalMinutes: number;
}

/**
 * Parse CSV/TSV slot data
 * Expected format: date,time or date\ttime (one slot per line)
 * Example: 2025-08-30,18:00 or 2025-08-30\t18:00
 */
export function parseSlotsCsv(csvContent: string): { dateTime: Date }[] {
    const lines = csvContent.trim().split('\n');
    const slots: { dateTime: Date }[] = [];

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) continue;

        // Support both comma and tab separators
        const parts = trimmedLine.includes('\t')
            ? trimmedLine.split('\t')
            : trimmedLine.split(',');

        if (parts.length >= 2) {
            const dateStr = parts[0].trim();
            const timeStr = parts[1].trim();

            try {
                const dateTime = new Date(`${dateStr}T${timeStr}:00`);
                if (!isNaN(dateTime.getTime())) {
                    slots.push({ dateTime });
                }
            } catch {
                // Skip invalid lines
            }
        } else if (parts.length === 1) {
            // Try parsing as ISO date
            try {
                const dateTime = new Date(parts[0].trim());
                if (!isNaN(dateTime.getTime())) {
                    slots.push({ dateTime });
                }
            } catch {
                // Skip invalid lines
            }
        }
    }

    return slots;
}

/**
 * Generate slots from date range with interval
 * Creates slots for each day between startDate and endDate
 * at the specified time range with the given interval
 */
export function generateSlotsFromRange(config: SlotRangeConfig): { dateTime: Date }[] {
    const { startDate, endDate, startTime, endTime, intervalMinutes } = config;
    const slots: { dateTime: Date }[] = [];

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    // Iterate through each day
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    const lastDate = new Date(endDate);
    lastDate.setHours(23, 59, 59, 999);

    while (currentDate <= lastDate) {
        // Generate slots for this day
        const dayStart = new Date(currentDate);
        dayStart.setHours(startHour, startMinute, 0, 0);

        const dayEnd = new Date(currentDate);
        dayEnd.setHours(endHour, endMinute, 0, 0);

        // Handle overnight slots (endTime < startTime)
        if (endHour < startHour || (endHour === startHour && endMinute < startMinute)) {
            dayEnd.setDate(dayEnd.getDate() + 1);
        }

        let slotTime = new Date(dayStart);
        while (slotTime <= dayEnd) {
            slots.push({ dateTime: new Date(slotTime) });
            slotTime = new Date(slotTime.getTime() + intervalMinutes * 60 * 1000);
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots;
}

/**
 * Create event with slots from CSV/TSV
 */
export async function createEventFromCsv(
    eventId: string,
    eventName: string,
    csvContent: string
): Promise<{ success: boolean; slotCount: number; message?: string }> {
    try {
        const { addDoc, setDoc } = await import('firebase/firestore');
        
        const slots = parseSlotsCsv(csvContent);
        
        if (slots.length === 0) {
            return {
                success: false,
                slotCount: 0,
                message: '有効な枠が見つかりませんでした',
            };
        }

        // Sort slots by dateTime
        slots.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

        // Create the event document
        const eventsRef = collection(db, 'eventSlots');
        const docRef = doc(eventsRef, eventId);

        await setDoc(docRef, {
            id: eventId,
            eventId,
            eventName,
            slots: slots.map(s => ({
                dateTime: s.dateTime,
                videoId: null,
                videoTitle: undefined,
            })),
            isDeleted: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        return {
            success: true,
            slotCount: slots.length,
        };
    } catch (error) {
        console.error('Failed to create event from CSV:', error);
        return {
            success: false,
            slotCount: 0,
            message: error instanceof Error ? error.message : 'エラーが発生しました',
        };
    }
}

/**
 * Create event with slots from date range configuration
 */
export async function createEventFromRange(
    eventId: string,
    eventName: string,
    ranges: SlotRangeConfig[]
): Promise<{ success: boolean; slotCount: number; message?: string }> {
    try {
        const { setDoc } = await import('firebase/firestore');
        
        // Generate all slots from all ranges
        let allSlots: { dateTime: Date }[] = [];
        for (const range of ranges) {
            const rangeSlots = generateSlotsFromRange(range);
            allSlots = allSlots.concat(rangeSlots);
        }

        if (allSlots.length === 0) {
            return {
                success: false,
                slotCount: 0,
                message: '有効な枠が見つかりませんでした',
            };
        }

        // Remove duplicates and sort
        const uniqueSlots = Array.from(
            new Map(allSlots.map(s => [s.dateTime.getTime(), s])).values()
        );
        uniqueSlots.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

        // Create the event document
        const eventsRef = collection(db, 'eventSlots');
        const docRef = doc(eventsRef, eventId);

        await setDoc(docRef, {
            id: eventId,
            eventId,
            eventName,
            slots: uniqueSlots.map(s => ({
                dateTime: s.dateTime,
                videoId: null,
                videoTitle: undefined,
            })),
            isDeleted: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        return {
            success: true,
            slotCount: uniqueSlots.length,
        };
    } catch (error) {
        console.error('Failed to create event from range:', error);
        return {
            success: false,
            slotCount: 0,
            message: error instanceof Error ? error.message : 'エラーが発生しました',
        };
    }
}

/**
 * Validate consecutive slot selection (max 3 slots)
 */
export function validateConsecutiveSlots(
    allSlots: TimeSlot[],
    selectedDateTimes: string[],
    intervalMinutes: number = 5
): { valid: boolean; message?: string } {
    if (selectedDateTimes.length === 0) {
        return { valid: true };
    }

    if (selectedDateTimes.length > 3) {
        return {
            valid: false,
            message: '1作品につき最大3枠までです',
        };
    }

    // Check if selected slots are consecutive
    const selectedTimes = selectedDateTimes
        .map(dt => new Date(dt).getTime())
        .sort((a, b) => a - b);

    const intervalMs = intervalMinutes * 60 * 1000;
    const tolerance = 60 * 1000; // 1 minute tolerance

    for (let i = 1; i < selectedTimes.length; i++) {
        const diff = selectedTimes[i] - selectedTimes[i - 1];
        if (Math.abs(diff - intervalMs) > tolerance) {
            return {
                valid: false,
                message: '選択した枠は連続している必要があります',
            };
        }
    }

    // Check if selected slots are available
    for (const dt of selectedDateTimes) {
        const targetTime = new Date(dt).getTime();
        const slot = allSlots.find(s => {
            const slotTime = toDate(s.dateTime).getTime();
            return Math.abs(slotTime - targetTime) < 60000;
        });

        if (!slot) {
            return {
                valid: false,
                message: '選択した枠が存在しません',
            };
        }

        if (slot.videoId) {
            return {
                valid: false,
                message: '選択した枠は既に予約されています',
            };
        }
    }

    return { valid: true };
}

/**
 * Reserve multiple consecutive slots for a video
 */
export async function reserveConsecutiveSlots(
    eventId: string,
    slotDateTimes: string[],
    videoId: string,
    videoTitle: string
): Promise<{ success: boolean; message?: string }> {
    try {
        // Get current slots
        const slots = await getEventSlots(eventId);
        
        // Validate selection
        const validation = validateConsecutiveSlots(slots, slotDateTimes);
        if (!validation.valid) {
            return { success: false, message: validation.message };
        }

        // Find the event document
        const eventsRef = collection(db, 'eventSlots');
        const q = query(eventsRef, where('eventId', '==', eventId));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return { success: false, message: 'イベントが見つかりません' };
        }

        const docSnap = snapshot.docs[0];
        const docRef = doc(db, 'eventSlots', docSnap.id);
        const data = docSnap.data() as EventSlotsDocument;

        // Update all selected slots
        const updatedSlots = [...data.slots];
        
        for (const dt of slotDateTimes) {
            const targetTime = new Date(dt).getTime();
            const slotIndex = updatedSlots.findIndex(slot => {
                const slotTime = toDate(slot.dateTime).getTime();
                return Math.abs(slotTime - targetTime) < 60000;
            });

            if (slotIndex !== -1) {
                updatedSlots[slotIndex] = {
                    ...updatedSlots[slotIndex],
                    videoId,
                    videoTitle,
                };
            }
        }

        await updateDoc(docRef, {
            slots: updatedSlots,
            updatedAt: serverTimestamp(),
        });

        return { success: true };
    } catch (error) {
        console.error('Failed to reserve consecutive slots:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'エラーが発生しました',
        };
    }
}

/**
 * Add slots to existing event
 */
export async function addSlotsToEvent(
    eventId: string,
    newSlots: { dateTime: Date }[]
): Promise<{ success: boolean; addedCount: number; message?: string }> {
    try {
        const eventsRef = collection(db, 'eventSlots');
        const q = query(eventsRef, where('eventId', '==', eventId));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return { success: false, addedCount: 0, message: 'イベントが見つかりません' };
        }

        const docSnap = snapshot.docs[0];
        const docRef = doc(db, 'eventSlots', docSnap.id);
        const data = docSnap.data() as EventSlotsDocument;

        // Get existing slot times for deduplication
        const existingTimes = new Set(
            data.slots.map(s => toDate(s.dateTime).getTime())
        );

        // Filter out duplicates
        const uniqueNewSlots = newSlots.filter(
            s => !existingTimes.has(s.dateTime.getTime())
        );

        if (uniqueNewSlots.length === 0) {
            return {
                success: true,
                addedCount: 0,
                message: '追加する新しい枠がありません（重複）',
            };
        }

        // Combine and sort
        const allSlots = [
            ...data.slots,
            ...uniqueNewSlots.map(s => ({
                dateTime: s.dateTime,
                videoId: null,
                videoTitle: undefined,
            })),
        ];

        allSlots.sort((a, b) =>
            toDate(a.dateTime).getTime() - toDate(b.dateTime).getTime()
        );

        await updateDoc(docRef, {
            slots: allSlots,
            updatedAt: serverTimestamp(),
        });

        return {
            success: true,
            addedCount: uniqueNewSlots.length,
        };
    } catch (error) {
        console.error('Failed to add slots to event:', error);
        return {
            success: false,
            addedCount: 0,
            message: error instanceof Error ? error.message : 'エラーが発生しました',
        };
    }
}

/**
 * Delete slots from event (only unassigned slots)
 */
export async function deleteSlotsFromEvent(
    eventId: string,
    slotDateTimes: string[]
): Promise<{ success: boolean; deletedCount: number; message?: string }> {
    try {
        const eventsRef = collection(db, 'eventSlots');
        const q = query(eventsRef, where('eventId', '==', eventId));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return { success: false, deletedCount: 0, message: 'イベントが見つかりません' };
        }

        const docSnap = snapshot.docs[0];
        const docRef = doc(db, 'eventSlots', docSnap.id);
        const data = docSnap.data() as EventSlotsDocument;

        const deleteTimes = new Set(
            slotDateTimes.map(dt => new Date(dt).getTime())
        );

        let deletedCount = 0;
        const remainingSlots = data.slots.filter(slot => {
            const slotTime = toDate(slot.dateTime).getTime();
            const shouldDelete = deleteTimes.has(slotTime);

            if (shouldDelete) {
                if (slot.videoId) {
                    // Cannot delete assigned slot
                    return true;
                }
                deletedCount++;
                return false;
            }
            return true;
        });

        await updateDoc(docRef, {
            slots: remainingSlots,
            updatedAt: serverTimestamp(),
        });

        return {
            success: true,
            deletedCount,
        };
    } catch (error) {
        console.error('Failed to delete slots from event:', error);
        return {
            success: false,
            deletedCount: 0,
            message: error instanceof Error ? error.message : 'エラーが発生しました',
        };
    }
}
