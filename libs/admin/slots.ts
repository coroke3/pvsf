import { db } from '@/libs/firebase'; // Assuming client SDK
import { 
  collection, 
  writeBatch, 
  doc, 
  Timestamp, 
  getDocs,
  query,
  where
} from 'firebase/firestore';
import type { SlotDocument } from '@/types/firestore';

/**
 * Bulk create slots for an event
 */
interface BulkCreateOptions {
  eventId: string;
  startDate: Date;
  count: number; // Number of slots to generate
  durationMinutes: number; // Duration of each slot
  intervalMinutes: number; // Break between slots
  startHour: number; // e.g. 21 for 21:00
  startMinute: number; // e.g. 0
}

export const bulkCreateSlots = async (options: BulkCreateOptions) => {
  const { eventId, startDate, count, durationMinutes, intervalMinutes, startHour, startMinute } = options;
  const batch = writeBatch(db);
  const slotsRef = collection(db, `events/${eventId}/slots`);

  let currentStartTime = new Date(startDate);
  currentStartTime.setHours(startHour, startMinute, 0, 0);

  for (let i = 0; i < count; i++) {
    // Calculate End Time
    const endTime = new Date(currentStartTime.getTime() + durationMinutes * 60000); // ms

    // Create Slot ID (e.g., 2026-02-10_2100)
    // Ensure unique if multiple slots have same time? Maybe add index.
    // For simplicity here using simple readable ID.
    const dateStr = currentStartTime.toISOString().split('T')[0];
    const timeStr = currentStartTime.toTimeString().slice(0, 5).replace(':', '');
    const slotId = `${dateStr}_${timeStr}`;
    
    const slotDocRef = doc(slotsRef, slotId);

    const newSlot: SlotDocument = {
      id: slotId,
      eventId,
      startTime: Timestamp.fromDate(currentStartTime),
      endTime: Timestamp.fromDate(endTime),
      capacity: 1,
      reservedCount: 0,
      isLocked: false,
    };

    batch.set(slotDocRef, newSlot, { merge: true });

    // Prepare for next slot (End Time + Interval)
    currentStartTime = new Date(endTime.getTime() + intervalMinutes * 60000);
  }

  await batch.commit();
};

/**
 * Fetch slots for an event
 */
export const fetchSlots = async (eventId: string) => {
  const q = query(collection(db, `events/${eventId}/slots`));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as SlotDocument);
};

/**
 * Update slot lock status
 */
export const toggleSlotLock = async (eventId: string, slotId: string, isLocked: boolean) => {
    // Implementation for single update
    // ...
};
