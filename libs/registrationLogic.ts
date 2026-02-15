/**
 * Registration business logic
 *
 * Slot-linked works:
 *   - Can be registered regardless of current time
 *   - Slot must be available (not assigned)
 *   - Requires admin approval (isApproved: false initially)
 *
 * Non-slot-linked works:
 *   A) Past event date + linked to a past event → no limit
 *   B) Past event date + NOT linked to an event → max 3 works per XID
 *   - Work limit is counted per XID (not per Discord account)
 */

import { adminDb } from '@/libs/firebase-admin';

export interface RegistrationCheck {
  allowed: boolean;
  reason?: string;
  requiresApproval: boolean;
}

/**
 * Check if a non-slot-linked work can be registered
 */
export async function checkNonSlotRegistration(
  authorXid: string,
  eventIds: string[],
  startTime: Date,
): Promise<RegistrationCheck> {
  const now = new Date();

  // Start time must be in the past
  if (startTime.getTime() > now.getTime()) {
    return {
      allowed: false,
      reason: '枠なし作品は現在日時より前の投稿時間のみ設定できます',
      requiresApproval: false,
    };
  }

  // If linked to a past event → no limit
  if (eventIds.length > 0) {
    return { allowed: true, requiresApproval: false };
  }

  // Not linked to any event → max 3 per XID
  const xidLower = authorXid.toLowerCase();
  const existingSnapshot = await adminDb.collection('videos')
    .where('authorXidLower', '==', xidLower)
    .where('slotId', '==', null) // non-slot-linked
    .get();

  // Count non-deleted, non-event-linked works
  let count = 0;
  existingSnapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.isDeleted !== true) {
      const docEventIds = data.eventIds || [];
      if (docEventIds.length === 0) {
        count++;
      }
    }
  });

  if (count >= 3) {
    return {
      allowed: false,
      reason: `このXID (${authorXid}) はイベント紐付きなしの作品登録上限(3作品)に達しています (現在: ${count}作品)`,
      requiresApproval: false,
    };
  }

  return { allowed: true, requiresApproval: false };
}

/**
 * Check if a slot-linked work can be registered
 */
export async function checkSlotRegistration(
  slotDateTimes: string[],
  slotEventId: string,
): Promise<RegistrationCheck> {
  if (slotDateTimes.length === 0) {
    return {
      allowed: false,
      reason: '枠を1つ以上選択してください',
      requiresApproval: true,
    };
  }

  if (slotDateTimes.length > 3) {
    return {
      allowed: false,
      reason: '枠は最大3つまでです',
      requiresApproval: true,
    };
  }

  // Verify slots exist and are available
  const eventDoc = await adminDb.collection('eventSlots').doc(slotEventId).get();
  if (!eventDoc.exists) {
    return {
      allowed: false,
      reason: '指定されたイベントが見つかりません',
      requiresApproval: true,
    };
  }

  const eventData = eventDoc.data();
  const slots: any[] = eventData?.slots || [];

  for (const dt of slotDateTimes) {
    const slot = slots.find((s: any) => s.dateTime === dt);
    if (!slot) {
      return {
        allowed: false,
        reason: `枠が見つかりません: ${dt}`,
        requiresApproval: true,
      };
    }
    if (slot.assignedVideoId) {
      return {
        allowed: false,
        reason: `枠は既に使用されています: ${new Date(dt).toLocaleString('ja-JP')}`,
        requiresApproval: true,
      };
    }
  }

  // Verify consecutive
  if (slotDateTimes.length > 1) {
    const sorted = [...slotDateTimes].sort();
    const indices = sorted.map(dt => slots.findIndex((s: any) => s.dateTime === dt));

    for (let i = 1; i < indices.length; i++) {
      if (indices[i] !== indices[i - 1] + 1) {
        return {
          allowed: false,
          reason: '枠は連続している必要があります',
          requiresApproval: true,
        };
      }
    }
  }

  return { allowed: true, requiresApproval: true };
}

/**
 * Reserve slots for a video (mark as assigned)
 */
export async function reserveSlots(
  slotEventId: string,
  slotDateTimes: string[],
  videoId: string,
): Promise<void> {
  const eventRef = adminDb.collection('eventSlots').doc(slotEventId);

  await adminDb.runTransaction(async (tx) => {
    const eventDoc = await tx.get(eventRef);
    if (!eventDoc.exists) throw new Error('Event not found');

    const eventData = eventDoc.data()!;
    const slots: any[] = eventData.slots || [];

    for (const dt of slotDateTimes) {
      const slotIndex = slots.findIndex((s: any) => s.dateTime === dt);
      if (slotIndex === -1) throw new Error(`Slot not found: ${dt}`);
      if (slots[slotIndex].assignedVideoId) throw new Error(`Slot already assigned: ${dt}`);
      slots[slotIndex].assignedVideoId = videoId;
    }

    tx.update(eventRef, { slots, updatedAt: new Date() });
  });
}

/**
 * Release slots (unassign) - used when a video is deleted
 */
export async function releaseSlots(
  slotEventId: string,
  videoId: string,
): Promise<void> {
  const eventRef = adminDb.collection('eventSlots').doc(slotEventId);

  await adminDb.runTransaction(async (tx) => {
    const eventDoc = await tx.get(eventRef);
    if (!eventDoc.exists) return;

    const eventData = eventDoc.data()!;
    const slots: any[] = eventData.slots || [];

    let modified = false;
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].assignedVideoId === videoId) {
        slots[i].assignedVideoId = null;
        modified = true;
      }
    }

    if (modified) {
      tx.update(eventRef, { slots, updatedAt: new Date() });
    }
  });
}
