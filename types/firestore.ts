import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'user';

// Users Collection
export interface UserDocument {
  id: string; // Document ID (Discord ID)
  name: string;
  iconUrl: string;
  role: UserRole;
  xLink?: {
    status: 'none' | 'pending' | 'linked';
    xid?: string;
    linkedAt?: Timestamp;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Events Collection
export interface EventDocument {
  id: string;
  slug: string;
  name: string;
  period: {
    start: Timestamp;
    end: Timestamp;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Slots Sub-collection
export interface SlotDocument {
  id: string;
  eventId: string;
  startTime: Timestamp;
  endTime: Timestamp;
  capacity: number;
  reservedCount: number;
  reservedBy?: {
    userId: string;
    userName: string;
    reservedAt: Timestamp;
  };
  videoId?: string;
  isLocked: boolean;
}

// Videos Collection
export interface VideoDocument {
  id: string;
  title: string;
  videoUrl?: string; // Optional for drafts
  
  // Ownership
  createdBy: string; // Auth ID
  
  // Scheduling
  scheduledAt: Timestamp; // Denormalized time
  eventId?: string;
  slotId?: string;

  // Author Info
  author: {
    name: string;
    xid: string;
    division: 'individual' | 'group' | 'mixed';
  };
  authorXid?: string; // Legacy/Top-level alias for backward compat if needed

  // Members
  members: {
    name: string;
    xid?: string;
    role?: string;
  }[];

  // Content
  music: {
    title: string;
    artist: string;
    url?: string;
  };

  status: 'draft' | 'submitted' | 'published' | 'private' | 'rejected';
  description?: string;
  agreedToTerms: boolean;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  ownerIds?: string[]; // Array of user IDs who can edit
}
