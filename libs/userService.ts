// User Service - Client-side Firestore access for Cloudflare Pages compatibility
// Provides user profile and settings operations without API routes
import { db } from '@/libs/firebase';
import {
    doc, getDoc, updateDoc, serverTimestamp, setDoc
} from 'firebase/firestore';
import type { UserDocument, XidClaim } from '@/types/user';

// Interface for user settings
export interface UserSettings {
    defaultIconUrl?: string | null;
}

// Interface for public user data
export interface PublicUserData {
    id: string;
    discordId: string;
    discordUsername?: string;
    discordAvatar?: string;
    role?: string;
    xidClaims: XidClaim[];
    defaultIconUrl?: string | null;
}

/**
 * Get current user data from Firestore
 */
export async function getUserData(discordId: string): Promise<PublicUserData | null> {
    try {
        const userRef = doc(db, 'users', discordId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            return null;
        }

        const data = userSnap.data();
        return {
            id: data.uid || discordId,
            discordId: data.discordId || discordId,
            discordUsername: data.discordUsername,
            discordAvatar: data.discordAvatar,
            role: data.role || 'user',
            xidClaims: data.xidClaims || [],
            defaultIconUrl: data.defaultIconUrl || null,
        };
    } catch (error) {
        console.error('Failed to get user data:', error);
        throw error;
    }
}

/**
 * Update user settings
 */
export async function updateUserSettings(
    discordId: string,
    settings: UserSettings
): Promise<void> {
    try {
        const userRef = doc(db, 'users', discordId);

        // Validate icon URL if provided
        if (settings.defaultIconUrl !== undefined && settings.defaultIconUrl !== null) {
            if (typeof settings.defaultIconUrl !== 'string') {
                throw new Error('Invalid defaultIconUrl format');
            }
            if (settings.defaultIconUrl !== '' &&
                !settings.defaultIconUrl.startsWith('https://firebasestorage.googleapis.com') &&
                !settings.defaultIconUrl.startsWith('gs://')) {
                throw new Error('Invalid icon URL - must be Firebase Storage URL');
            }
        }

        await updateDoc(userRef, {
            defaultIconUrl: settings.defaultIconUrl || null,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Failed to update user settings:', error);
        throw error;
    }
}

/**
 * Create or update user document on login
 */
export async function ensureUserDocument(
    discordId: string,
    userData: {
        discordUsername?: string;
        discordAvatar?: string;
        email?: string;
    }
): Promise<void> {
    try {
        const userRef = doc(db, 'users', discordId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // Create new user document
            await setDoc(userRef, {
                uid: discordId,
                discordId,
                discordUsername: userData.discordUsername || '',
                discordAvatar: userData.discordAvatar || '',
                email: userData.email || '',
                role: 'user',
                roles: ['user'],
                xidClaims: [],
                defaultIconUrl: null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        } else {
            // Update existing user document
            await updateDoc(userRef, {
                discordUsername: userData.discordUsername || userSnap.data().discordUsername,
                discordAvatar: userData.discordAvatar || userSnap.data().discordAvatar,
                updatedAt: serverTimestamp(),
            });
        }
    } catch (error) {
        console.error('Failed to ensure user document:', error);
        throw error;
    }
}

/**
 * Get approved XID list for a user
 */
export function getApprovedXids(xidClaims: XidClaim[]): string[] {
    return xidClaims
        .filter(claim => claim.status === 'approved')
        .map(claim => claim.xid);
}

/**
 * Check if user has a specific role
 */
export async function hasRole(discordId: string, role: string): Promise<boolean> {
    try {
        const userData = await getUserData(discordId);
        if (!userData) return false;

        if (userData.role === role) return true;

        // Check roles array in raw data
        const userRef = doc(db, 'users', discordId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return false;

        const data = userSnap.data();
        return data.roles?.includes(role) || false;
    } catch (error) {
        console.error('Failed to check role:', error);
        return false;
    }
}

/**
 * Check if user is admin
 */
export async function isAdmin(discordId: string): Promise<boolean> {
    return hasRole(discordId, 'admin');
}

/**
 * Check if user is moderator or admin
 */
export async function isModerator(discordId: string): Promise<boolean> {
    const isAdminUser = await hasRole(discordId, 'admin');
    if (isAdminUser) return true;
    return hasRole(discordId, 'moderator');
}
