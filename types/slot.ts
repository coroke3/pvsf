// Type definitions for Registration Slot data
import type { SoftDeleteFields } from './common';

/**
 * Single time slot within an event
 */
export interface TimeSlot {
    dateTime: Date | string;
    videoId: string | null; // null if unassigned
    videoTitle?: string;    // Populated when fetching
}

/**
 * Event slots document - contains all slots for one event
 */
export interface EventSlotsDocument extends SoftDeleteFields {
    id: string;
    eventId: string;        // Unique event identifier (e.g., "pvsf12")
    eventName: string;      // Display name (e.g., "PVSF12")
    slots: TimeSlot[];      // Array of time slots
    createdAt: Date;
    updatedAt: Date;
}

/**
 * API response for event slots
 */
export interface EventSlotsApiResponse {
    id: string;
    eventId: string;
    eventName: string;
    slots: {
        dateTime: string;
        videoId: string | null;
        videoTitle?: string;
        isAvailable: boolean;
    }[];
    totalSlots: number;
    availableSlots: number;
    assignedSlots: number;
    createdAt: string;
    updatedAt: string;
}

/**
 * Single slot for public API (user-facing)
 */
export interface PublicSlot {
    eventId: string;
    eventName: string;
    dateTime: string;
    isAvailable: boolean;
}

// Legacy types for backward compatibility
export interface RegistrationSlot {
    id: string;
    eventId: string;
    dateTime: Date;
    videoId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface SlotDocument {
    id: string;
    eventId: string;
    dateTime: Date;
    videoId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface SlotAssignment {
    videoId: string;
    slotIds: string[];
}

export interface SlotFormData {
    eventId: string;
    slots: { date: string; time: string }[];
}

export interface ParsedSlotInput {
    date: string;
    time: string;
}

export interface SlotApiResponse {
    id: string;
    eventId: string;
    dateTime: string;
    videoId: string | null;
    videoTitle?: string;
    isAvailable: boolean;
}
