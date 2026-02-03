// API endpoint for member suggestions (autocomplete)
// Returns unique XID-name pairs from existing video members data
import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/libs/firebase-admin';

interface MemberSuggestion {
    xid: string;
    name: string;
}

interface CachedData {
    suggestions: MemberSuggestion[];
    timestamp: number;
}

// Simple in-memory cache (5 minute TTL)
let cache: CachedData | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { q } = req.query;
    const searchQuery = (q as string)?.toLowerCase().trim() || '';

    try {
        // Check cache
        const now = Date.now();
        if (cache && (now - cache.timestamp) < CACHE_TTL) {
            const filtered = filterSuggestions(cache.suggestions, searchQuery);
            return res.status(200).json(filtered);
        }

        // Fetch all videos and extract unique members
        const videosSnapshot = await adminDb
            .collection('videos')
            .where('isDeleted', '!=', true)
            .select('members', 'authorXid', 'authorName')
            .get();

        const memberMap = new Map<string, string>();

        videosSnapshot.docs.forEach(doc => {
            const data = doc.data();

            // Add author
            if (data.authorXid && data.authorName) {
                const xidLower = data.authorXid.toLowerCase();
                if (!memberMap.has(xidLower) || data.authorName.length > memberMap.get(xidLower)!.length) {
                    memberMap.set(xidLower, data.authorName);
                }
            }

            // Add members
            if (data.members && Array.isArray(data.members)) {
                data.members.forEach((member: { xid?: string; name?: string }) => {
                    if (member.xid && member.name) {
                        const xidLower = member.xid.toLowerCase();
                        if (!memberMap.has(xidLower) || member.name.length > memberMap.get(xidLower)!.length) {
                            memberMap.set(xidLower, member.name);
                        }
                    }
                });
            }
        });

        // Convert to array
        const suggestions: MemberSuggestion[] = Array.from(memberMap.entries())
            .map(([xid, name]) => ({ xid, name }))
            .sort((a, b) => a.name.localeCompare(b.name, 'ja'));

        // Update cache
        cache = { suggestions, timestamp: now };

        // Filter and return
        const filtered = filterSuggestions(suggestions, searchQuery);
        return res.status(200).json(filtered);

    } catch (error) {
        console.error('Error fetching member suggestions:', error);
        return res.status(500).json({ error: 'Failed to fetch member suggestions' });
    }
}

function filterSuggestions(suggestions: MemberSuggestion[], query: string): MemberSuggestion[] {
    if (!query) {
        return suggestions.slice(0, 100); // Return up to 100 suggestions
    }

    return suggestions
        .filter(s =>
            s.xid.includes(query) ||
            s.name.toLowerCase().includes(query)
        )
        .slice(0, 20); // Return up to 20 matched results
}
