// Type definitions for User data
import type { SoftDeleteFields } from './common';

/**
 * XID claim status
 */
export type XidClaimStatus = 'pending' | 'approved' | 'rejected';

/**
 * XID claim structure
 */
export interface XidClaim {
    xid: string;
    status: XidClaimStatus;
    requestedAt: Date;
    processedAt?: Date;
    processedBy?: string;
}

/**
 * User role
 */
export type UserRole = 'user' | 'admin' | 'moderator';

/**
 * Firestore User Document Schema
 */
export interface UserDocument extends SoftDeleteFields {
    uid: string;

    // Discord info
    discordId: string;
    discordUsername: string;
    discordAvatar: string | null;
    email: string | null;

    // XID Claims
    xidClaims: XidClaim[];

    // Role
    role: UserRole;

    // User Settings
    /** Default icon URL for video registration (Firebase Storage URL) */
    defaultIconUrl?: string | null;

    // System
    createdAt: Date;
    updatedAt: Date;
}

/**
 * User API response format (legacy compatible)
 */
export interface UserApiResponse {
    username: string; // XID
    icon: string;
    viewSum: number;
    likeSum: number;
    videoCount: number;
    scoreSum: number;
    mylink: string[];
}

/**
 * Session user (from NextAuth)
 */
export interface SessionUser {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    discordId?: string;
    role?: UserRole;
    xidClaims?: XidClaim[];
    defaultIconUrl?: string | null;
}
