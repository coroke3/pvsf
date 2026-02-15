// Member Service - Client-side Firestore access for Cloudflare Pages compatibility
// Provides member XID-name suggestions without API routes
import { db } from '@/libs/firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, arrayUnion, serverTimestamp, limit, orderBy } from 'firebase/firestore';

export interface MemberSuggestion {
    xid: string;
    name: string;
    source?: 'video' | 'manual';
    usageCount?: number;
}

interface MemberCacheEntry {
    suggestions: MemberSuggestion[];
    timestamp: number;
}

// Client-side cache (5 minute TTL)
let memberCache: MemberCacheEntry | null = null;
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    const matrix: number[][] = [];

    for (let i = 0; i <= s2.length; i++) matrix[i] = [i];
    for (let j = 0; j <= s1.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= s2.length; i++) {
        for (let j = 0; j <= s1.length; j++) {
            if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[s2.length][s1.length];
}

/**
 * Calculate similarity percentage between two strings
 */
function calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 100;
    const distance = levenshteinDistance(longer, shorter);
    return Math.round((1 - distance / longer.length) * 100);
}

/**
 * Search for member suggestions (client-side, Cloudflare Pages compatible)
 * Uses local cache to minimize Firestore reads
 * @param queryText - Search query
 * @param mode - 'prefix' for traditional search, 'fuzzy' for Levenshtein similarity
 */
export async function searchMembers(
    queryText: string,
    mode: 'prefix' | 'fuzzy' = 'prefix'
): Promise<MemberSuggestion[]> {
    const searchQuery = queryText.toLowerCase().trim().replace(/^@/, '');

    // Get all suggestions (from cache or Firestore)
    const allSuggestions = await getAllMemberSuggestions();

    if (!searchQuery) {
        return allSuggestions.slice(0, 50);
    }

    if (mode === 'fuzzy') {
        // Fuzzy search with Levenshtein similarity
        const results = allSuggestions
            .map(s => {
                const nameSimilarity = calculateSimilarity(s.name.toLowerCase(), searchQuery);
                const xidSimilarity = calculateSimilarity(s.xid.toLowerCase(), searchQuery);
                const maxSimilarity = Math.max(nameSimilarity, xidSimilarity);
                return { ...s, similarity: maxSimilarity };
            })
            .filter(s => s.similarity > 30)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 20);

        return results;
    }

    // Prefix/contains search (default)
    const filtered = allSuggestions.filter(s =>
        s.xid.toLowerCase().includes(searchQuery) ||
        s.name.toLowerCase().includes(searchQuery)
    );

    // Sort by relevance: exact match first, then starts-with, then includes
    filtered.sort((a, b) => {
        const aXidExact = a.xid.toLowerCase() === searchQuery;
        const bXidExact = b.xid.toLowerCase() === searchQuery;
        if (aXidExact !== bXidExact) return aXidExact ? -1 : 1;

        const aNameExact = a.name.toLowerCase() === searchQuery;
        const bNameExact = b.name.toLowerCase() === searchQuery;
        if (aNameExact !== bNameExact) return aNameExact ? -1 : 1;

        const aXidStarts = a.xid.toLowerCase().startsWith(searchQuery);
        const bXidStarts = b.xid.toLowerCase().startsWith(searchQuery);
        if (aXidStarts !== bXidStarts) return aXidStarts ? -1 : 1;

        const aNameStarts = a.name.toLowerCase().startsWith(searchQuery);
        const bNameStarts = b.name.toLowerCase().startsWith(searchQuery);
        if (aNameStarts !== bNameStarts) return aNameStarts ? -1 : 1;

        // Usage count (if available)
        return (b.usageCount || 0) - (a.usageCount || 0);
    });

    return filtered.slice(0, 20);
}


/**
 * Get all member suggestions (from cache or Firestore)
 */
async function getAllMemberSuggestions(): Promise<MemberSuggestion[]> {
    const now = Date.now();

    // Check cache
    if (memberCache && (now - memberCache.timestamp) < CACHE_TTL) {
        return memberCache.suggestions;
    }

    try {
        const memberMap = new Map<string, MemberSuggestion>();

        // 1. Fetch from memberDirectory collection (manual/curated entries)
        try {
            const directoryRef = collection(db, 'memberDirectory');
            const directorySnapshot = await getDocs(query(directoryRef, limit(500)));

            directorySnapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.xid && data.name) {
                    const key = data.xid.toLowerCase();
                    memberMap.set(key, {
                        xid: data.xid,
                        name: data.name,
                        source: 'manual',
                        usageCount: data.usageCount || 0
                    });
                }
            });
        } catch (err) {
            console.warn('memberDirectory fetch failed, using videos only:', err);
        }

        // 2. Fetch from videos collection (extract author + members)
        const videosRef = collection(db, 'videos');
        const videosQuery = query(
            videosRef,
            where('isDeleted', '==', false), // 最適化: != を == false に変更
            limit(500)
        );

        const videosSnapshot = await getDocs(videosQuery);

        videosSnapshot.docs.forEach(document => {
            const data = document.data();

            // Add author
            if (data.authorXid && data.authorName) {
                const key = data.authorXid.toLowerCase();
                if (!memberMap.has(key)) {
                    memberMap.set(key, {
                        xid: data.authorXid,
                        name: data.authorName,
                        source: 'video',
                        usageCount: 1
                    });
                } else {
                    const existing = memberMap.get(key)!;
                    existing.usageCount = (existing.usageCount || 0) + 1;
                }
            }

            // Add members
            if (Array.isArray(data.members)) {
                data.members.forEach((member: { xid?: string; name?: string }) => {
                    if (member.xid && member.name) {
                        const key = member.xid.toLowerCase();
                        if (!memberMap.has(key)) {
                            memberMap.set(key, {
                                xid: member.xid,
                                name: member.name,
                                source: 'video',
                                usageCount: 1
                            });
                        } else {
                            const existing = memberMap.get(key)!;
                            existing.usageCount = (existing.usageCount || 0) + 1;
                        }
                    }
                });
            }
        });

        // Convert to sorted array
        const suggestions = Array.from(memberMap.values())
            .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));

        // Update cache
        memberCache = { suggestions, timestamp: now };

        return suggestions;

    } catch (error) {
        console.error('Failed to fetch member suggestions:', error);
        return memberCache?.suggestions || [];
    }
}

/**
 * Clear the member cache (call after adding new members)
 */
export function clearMemberCache(): void {
    memberCache = null;
}

/**
 * Add/update a member in the memberDirectory (for manual curation)
 */
export async function addToMemberDirectory(xid: string, name: string): Promise<void> {
    try {
        const memberRef = doc(db, 'memberDirectory', xid.toLowerCase());
        await setDoc(memberRef, {
            xid,
            name,
            updatedAt: serverTimestamp()
        }, { merge: true });

        clearMemberCache();
    } catch (error) {
        console.error('Failed to add member to directory:', error);
        throw error;
    }
}

/**
 * Batch add members from video data (increments usage count)
 */
export async function updateMemberUsageFromVideo(
    authorXid: string,
    authorName: string,
    members: { xid: string; name: string }[]
): Promise<void> {
    // This runs in the background to keep memberDirectory updated
    try {
        // Add author
        if (authorXid && authorName) {
            const authorRef = doc(db, 'memberDirectory', authorXid.toLowerCase());
            await setDoc(authorRef, {
                xid: authorXid,
                name: authorName,
                usageCount: 1,
                updatedAt: serverTimestamp()
            }, { merge: true });
        }

        // Add members
        for (const member of members) {
            if (member.xid && member.name) {
                const memberRef = doc(db, 'memberDirectory', member.xid.toLowerCase());
                await setDoc(memberRef, {
                    xid: member.xid,
                    name: member.name,
                    usageCount: 1,
                    updatedAt: serverTimestamp()
                }, { merge: true });
            }
        }

        clearMemberCache();
    } catch (error) {
        console.error('Failed to update member directory:', error);
        // Non-critical, don't throw
    }
}
