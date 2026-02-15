// User Service - Client-side Firestore access for Cloudflare Pages compatibility
// Provides user profile and settings operations without API routes
import { db } from '@/libs/firebase';
import {
    doc, getDoc, updateDoc, serverTimestamp, setDoc
} from 'firebase/firestore';
import type { UserDocument, XidClaim } from '@/types/user';

// Interface for user settings
export interface UserSettings {
    // Add future settings here
}

// Interface for public user data
export interface PublicUserData {
    id: string;
    discordId: string;
    discordUsername?: string;
    discordAvatar?: string;
    role?: string;
    xidClaims: XidClaim[];
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

        await updateDoc(userRef, {
            ...settings,
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

/**
 * Request XID claim (申請)
 * Adds a new pending XID claim to the user's claims array
 */
export async function requestXidClaim(
    discordId: string,
    xid: string
): Promise<{ success: boolean; message: string }> {
    try {
        const userRef = doc(db, 'users', discordId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            return { success: false, message: 'ユーザーが見つかりません' };
        }

        const data = userSnap.data();
        const existingClaims: XidClaim[] = data.xidClaims || [];

        // Normalize XID (remove @ if present)
        const normalizedXid = xid.replace(/^@/, '').trim();
        const xidLower = normalizedXid.toLowerCase();

        // Check if already claimed by this user
        const existingClaim = existingClaims.find(
            c => c.xid.toLowerCase() === xidLower
        );
        if (existingClaim) {
            if (existingClaim.status === 'approved') {
                return { success: false, message: 'このXIDは既に承認済みです' };
            }
            if (existingClaim.status === 'pending') {
                return { success: false, message: 'このXIDは申請中です' };
            }
        }

        // Add new claim
        const newClaim: XidClaim = {
            xid: normalizedXid,
            status: 'pending',
            requestedAt: new Date(),
        };

        await updateDoc(userRef, {
            xidClaims: [...existingClaims, newClaim],
            updatedAt: serverTimestamp(),
        });

        return { success: true, message: 'XID申請を受け付けました' };
    } catch (error) {
        console.error('Failed to request XID claim:', error);
        throw error;
    }
}

/**
 * Process XID claim (運営承認/却下)
 */
export async function processXidClaim(
    discordId: string,
    xid: string,
    action: 'approve' | 'reject',
    processedBy: string
): Promise<{ success: boolean; message: string }> {
    try {
        const userRef = doc(db, 'users', discordId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            return { success: false, message: 'ユーザーが見つかりません' };
        }

        const data = userSnap.data();
        const claims: XidClaim[] = data.xidClaims || [];
        const xidLower = xid.toLowerCase();

        const claimIndex = claims.findIndex(
            c => c.xid.toLowerCase() === xidLower && c.status === 'pending'
        );

        if (claimIndex === -1) {
            return { success: false, message: '保留中の申請が見つかりません' };
        }

        // Update claim status
        claims[claimIndex] = {
            ...claims[claimIndex],
            status: action === 'approve' ? 'approved' : 'rejected',
            processedAt: new Date(),
            processedBy,
        };

        await updateDoc(userRef, {
            xidClaims: claims,
            updatedAt: serverTimestamp(),
        });

        return {
            success: true,
            message: action === 'approve' ? 'XIDを承認しました' : 'XIDを却下しました',
        };
    } catch (error) {
        console.error('Failed to process XID claim:', error);
        throw error;
    }
}

/**
 * Get XID claims for a user
 */
export async function getXidClaimsForUser(discordId: string): Promise<XidClaim[]> {
    try {
        const userData = await getUserData(discordId);
        return userData?.xidClaims || [];
    } catch (error) {
        console.error('Failed to get XID claims:', error);
        return [];
    }
}

/**
 * Check if XID matches any videos' tlink and auto-match if found
 * This is used when a user logs in with the same XID as a video's tlink
 */
export async function checkAutoMatchXid(
    discordId: string,
    xid: string
): Promise<{ matched: boolean; videoCount: number }> {
    try {
        // Import dynamically to avoid circular dependency
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        
        const xidLower = xid.toLowerCase();
        const videosRef = collection(db, 'videos');
        const q = query(videosRef, where('authorXidLower', '==', xidLower));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return { matched: false, videoCount: 0 };
        }

        // Auto-approve the XID if it matches existing videos
        const userRef = doc(db, 'users', discordId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const data = userSnap.data();
            const existingClaims: XidClaim[] = data.xidClaims || [];
            
            // Check if not already claimed
            const existingClaim = existingClaims.find(
                c => c.xid.toLowerCase() === xidLower
            );
            
            if (!existingClaim) {
                // Add as pending (needs manual approval for security)
                const newClaim: XidClaim = {
                    xid: xid.replace(/^@/, ''),
                    status: 'pending',
                    requestedAt: new Date(),
                };

                await updateDoc(userRef, {
                    xidClaims: [...existingClaims, newClaim],
                    updatedAt: serverTimestamp(),
                });
            }
        }

        return { matched: true, videoCount: snapshot.size };
    } catch (error) {
        console.error('Failed to check auto-match XID:', error);
        return { matched: false, videoCount: 0 };
    }
}

/**
 * Get all pending XID claims (for admin)
 */
export async function getAllPendingXidClaims(): Promise<{
    discordId: string;
    discordUsername: string;
    claim: XidClaim;
}[]> {
    try {
        const { collection, getDocs } = await import('firebase/firestore');
        
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        
        const pendingClaims: {
            discordId: string;
            discordUsername: string;
            claim: XidClaim;
        }[] = [];

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const claims: XidClaim[] = data.xidClaims || [];
            
            claims.forEach(claim => {
                if (claim.status === 'pending') {
                    pendingClaims.push({
                        discordId: docSnap.id,
                        discordUsername: data.discordUsername || '',
                        claim,
                    });
                }
            });
        });

        return pendingClaims;
    } catch (error) {
        console.error('Failed to get all pending XID claims:', error);
        return [];
    }
}

/**
 * Check if a user can edit a video based on their approved XIDs
 */
export function canUserEditByXid(
    userXids: string[],
    videoAuthorXid: string,
    videoMembers?: { xid: string; editApproved?: boolean }[]
): boolean {
    const normalizedUserXids = userXids.map(x => x.toLowerCase());
    const authorXidLower = videoAuthorXid.toLowerCase();

    // Check if user is the author
    if (normalizedUserXids.includes(authorXidLower)) {
        return true;
    }

    // Check if user is a member with edit permission
    if (videoMembers) {
        for (const member of videoMembers) {
            if (
                member.xid &&
                normalizedUserXids.includes(member.xid.toLowerCase()) &&
                member.editApproved
            ) {
                return true;
            }
        }
    }

    return false;
}
