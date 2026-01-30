// Users API endpoint - generates user list from video data (legacy format compatible)
import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/libs/firebase-admin';
import type { VideoDocument, UserApiResponseLegacy } from '@/types/video';
import { extractYouTubeId } from '@/libs/videoConverter';

interface UserStats {
    username: string;
    icon: string | null;
    creatorName: string;
    ychlink: string;
    iylink: string[];  // Individual videos (type === '個人')
    cylink: string[];  // Collaboration videos (type !== '個人')
    mylink: string[];  // Member participation videos
    creatorScore: number;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get all videos from Firestore
        const videosSnapshot = await adminDb.collection('videos').get();

        if (videosSnapshot.empty) {
            // Fallback to legacy API during migration
            try {
                const legacyRes = await fetch('https://pvsf-cash.vercel.app/api/users');
                if (legacyRes.ok) {
                    const legacyData = await legacyRes.json();
                    return res.status(200).json(legacyData);
                }
            } catch (legacyError) {
                console.error('Legacy API fallback failed:', legacyError);
            }
            return res.status(200).json([]);
        }

        // Build user stats from video data
        const userStatsMap = new Map<string, UserStats>();

        videosSnapshot.docs.forEach(doc => {
            const video = doc.data() as VideoDocument;
            const ytId = extractYouTubeId(video.videoUrl || '');

            // Process author (tlink equivalent)
            if (video.authorXid) {
                const authorXidLower = video.authorXid.toLowerCase();
                const existing = userStatsMap.get(authorXidLower) || {
                    username: authorXidLower,
                    icon: null,
                    creatorName: '',
                    ychlink: '',
                    iylink: [],
                    cylink: [],
                    mylink: [],
                    creatorScore: 0,
                };

                // Update icon and name if not set
                if (!existing.icon && video.authorIconUrl) {
                    existing.icon = video.authorIconUrl;
                }
                if (!existing.creatorName && video.authorName) {
                    existing.creatorName = video.authorName;
                }
                if (!existing.ychlink && video.authorChannelUrl) {
                    existing.ychlink = video.authorChannelUrl;
                }

                // Add video to appropriate list
                if (ytId) {
                    if (video.type === '個人') {
                        existing.iylink.push(ytId);
                    } else {
                        existing.cylink.push(ytId);
                    }
                }

                // Add to score
                existing.creatorScore += video.videoScore || 0;

                userStatsMap.set(authorXidLower, existing);
            }

            // Process members (memberid equivalent)
            if (video.members && Array.isArray(video.members)) {
                video.members.forEach(member => {
                    if (member.xid) {
                        const memberXidLower = member.xid.toLowerCase();

                        // Skip if this is also the author (already counted)
                        if (memberXidLower === video.authorXid?.toLowerCase()) {
                            return;
                        }

                        const existing = userStatsMap.get(memberXidLower) || {
                            username: memberXidLower,
                            icon: null,
                            creatorName: member.name || '',
                            ychlink: '',
                            iylink: [],
                            cylink: [],
                            mylink: [],
                            creatorScore: 0,
                        };

                        // Add to mylink (member participation)
                        if (ytId && !existing.mylink.includes(ytId)) {
                            existing.mylink.push(ytId);
                        }

                        userStatsMap.set(memberXidLower, existing);
                    }
                });
            }
        });

        // Convert map to array
        const users: UserApiResponseLegacy[] = Array.from(userStatsMap.values());

        // Sort by creatorScore descending
        users.sort((a, b) => b.creatorScore - a.creatorScore);

        return res.status(200).json(users);

    } catch (error) {
        console.error('Users API error:', error);

        // Fallback to legacy API
        try {
            const legacyRes = await fetch('https://pvsf-cash.vercel.app/api/users');
            if (legacyRes.ok) {
                const legacyData = await legacyRes.json();
                return res.status(200).json(legacyData);
            }
        } catch (legacyError) {
            console.error('Legacy API fallback failed:', legacyError);
        }

        return res.status(500).json({ error: 'Internal server error' });
    }
}
