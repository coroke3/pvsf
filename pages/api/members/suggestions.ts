// API endpoint for member suggestions (autocomplete)
// Returns unique XID-name pairs from existing video members data
// Supports fuzzy search with Levenshtein distance similarity
import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/libs/firebase-admin';

interface MemberSuggestion {
    xid: string;
    name: string;
    similarity?: number;
}

interface CachedData {
    suggestions: MemberSuggestion[];
    timestamp: number;
}

// Simple in-memory cache (5 minute TTL)
let cache: CachedData | null = null;
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
        for (let j = 1; j <= s1.length; j++) {
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
 * Calculate similarity percentage
 */
function calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 100;
    const distance = levenshteinDistance(longer, shorter);
    return Math.round((1 - distance / longer.length) * 100);
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { q, mode } = req.query;
    const searchQuery = (q as string)?.toLowerCase().trim().replace(/^@/, '') || '';
    const searchMode = (mode as string) || 'prefix'; // 'prefix' | 'fuzzy'

    try {
        // Check cache
        const now = Date.now();
        if (cache && (now - cache.timestamp) < CACHE_TTL) {
            const filtered = filterSuggestions(cache.suggestions, searchQuery, searchMode);
            return res.status(200).json(filtered);
        }

        // Fetch all videos and extract unique members
        const videosSnapshot = await adminDb
            .collection('videos')
            .where('isDeleted', '!=', true)
            .select('members', 'authorXid', 'authorName', 'author')
            .get();

        const memberMap = new Map<string, MemberSuggestion>();

        videosSnapshot.docs.forEach(doc => {
            const data = doc.data();

            // Add author (new format)
            if (data.author?.xid && data.author?.name) {
                const xidLower = data.author.xid.toLowerCase().replace(/^@/, '');
                const key = `${data.author.name.toLowerCase()}|${xidLower}`;
                if (!memberMap.has(key)) {
                    memberMap.set(key, { xid: xidLower, name: data.author.name });
                }
            }

            // Add author (legacy format)
            if (data.authorXid && data.authorName) {
                const xidLower = data.authorXid.toLowerCase().replace(/^@/, '');
                const key = `${data.authorName.toLowerCase()}|${xidLower}`;
                if (!memberMap.has(key)) {
                    memberMap.set(key, { xid: xidLower, name: data.authorName });
                }
            }

            // Add members
            if (data.members && Array.isArray(data.members)) {
                data.members.forEach((member: { xid?: string; name?: string }) => {
                    if (member.xid && member.name) {
                        const xidLower = member.xid.toLowerCase().replace(/^@/, '');
                        const key = `${member.name.toLowerCase()}|${xidLower}`;
                        if (!memberMap.has(key)) {
                            memberMap.set(key, { xid: xidLower, name: member.name });
                        }
                    }
                });
            }
        });

        // Convert to array
        const suggestions: MemberSuggestion[] = Array.from(memberMap.values())
            .sort((a, b) => a.name.localeCompare(b.name, 'ja'));

        // Update cache
        cache = { suggestions, timestamp: now };

        // Filter and return
        const filtered = filterSuggestions(suggestions, searchQuery, searchMode);
        return res.status(200).json(filtered);

    } catch (error) {
        console.error('Error fetching member suggestions:', error);
        return res.status(500).json({ error: 'Failed to fetch member suggestions' });
    }
}

function filterSuggestions(
    suggestions: MemberSuggestion[],
    query: string,
    mode: string
): MemberSuggestion[] {
    if (!query) {
        return suggestions.slice(0, 100);
    }

    if (mode === 'fuzzy') {
        // Fuzzy search with Levenshtein distance
        const results = suggestions
            .map(s => {
                const nameSimilarity = calculateSimilarity(s.name.toLowerCase(), query);
                const xidSimilarity = calculateSimilarity(s.xid, query);
                const maxSimilarity = Math.max(nameSimilarity, xidSimilarity);
                return { ...s, similarity: maxSimilarity };
            })
            .filter(s => s.similarity > 30)
            .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
            .slice(0, 20);

        return results;
    }

    // Prefix/contains search (default)
    return suggestions
        .filter(s =>
            s.xid.includes(query) ||
            s.name.toLowerCase().includes(query)
        )
        .slice(0, 20);
}
