// Common type definitions

/**
 * Soft delete marker interface
 * All documents that support soft delete should include these fields
 */
export interface SoftDeleteFields {
    /** Whether this document is soft-deleted */
    isDeleted?: boolean;
    /** When the document was soft-deleted */
    deletedAt?: Date | null;
    /** Who deleted the document (user ID or 'system') */
    deletedBy?: string | null;
}

/**
 * Calculate days since deletion
 */
export function getDaysSinceDeleted(deletedAt: Date | any): number {
    if (!deletedAt) return 0;
    
    let date: Date;
    if (deletedAt instanceof Date) {
        date = deletedAt;
    } else if (typeof deletedAt.toDate === 'function') {
        date = deletedAt.toDate();
    } else if (typeof deletedAt._seconds === 'number') {
        date = new Date(deletedAt._seconds * 1000);
    } else {
        date = new Date(deletedAt);
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if soft-deleted document should be permanently deleted (30+ days)
 */
export function shouldPermanentlyDelete(deletedAt: Date | any): boolean {
    return getDaysSinceDeleted(deletedAt) >= 30;
}
