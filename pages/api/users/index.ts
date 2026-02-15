// Users API endpoint - generates user list from video data (legacy format compatible)
// Faithfully reproduces the logic from 参考資料/users.js
import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/libs/firebase-admin';
import type { VideoDocument, UserApiResponseLegacy } from '@/types/video';
import { extractYouTubeId } from '@/libs/videoConverter';

/**
 * Normalize string for matching (lowercase, trim, remove whitespace/special chars)
 */
function normalizeString(str: string): string {
    if (!str) return '';
    return str.toLowerCase().trim().replace(/[\s\u3000]+/g, '').replace(/[^\w]/g, '');
}

/**
 * Calculate engagement points for a single video
 */
function getVideoEngagementPoints(viewCount: number, likeCount: number, isIndividualWork: boolean): number {
    const adjustedViewCount = viewCount || 0;
    const adjustedLikeCount = likeCount || 0;

    const viewPoints = (adjustedViewCount / 10000) * 200;
    const likePoints = adjustedLikeCount * 5;
    const totalPoints = viewPoints + likePoints;

    if (isIndividualWork) {
        return Math.min(500, totalPoints); // Individual: max 500pt
    } else {
        return Math.min(100, totalPoints); // Collab: max 100pt
    }
}

/**
 * Calculate creator score (matches 参考資料/users.js)
 */
function calculateCreatorScore(
    iylink: string[],
    cylink: string[],
    mylink: string[],
    latestTime: Date | null,
    videoStatsMap: Map<string, { viewCount: number; likeCount: number }>
): number {
    const baseScore = 1000;

    // Works bonus
    const individualWorksBonus = iylink.length * 50;
    const collaborationWorksBonus = cylink.length * 25;
    const worksBonus = individualWorksBonus + collaborationWorksBonus;

    // Time bonus (exponential decay, ~3 years to near 0)
    let timeBonus = 0;
    if (latestTime) {
        const daysSinceLatest = Math.floor((Date.now() - latestTime.getTime()) / (1000 * 60 * 60 * 24));
        timeBonus = Math.max(0, 500 * Math.exp(-daysSinceLatest / 365));
    }

    // Engagement bonus - individual
    let individualEngagementSum = 0;
    iylink.forEach(videoId => {
        const stats = videoStatsMap.get(videoId);
        if (stats) {
            individualEngagementSum += getVideoEngagementPoints(stats.viewCount, stats.likeCount, true);
        }
    });
    const individualDivisor = Math.max(1, iylink.length * 0.3);
    const individualEngagement = individualEngagementSum / individualDivisor;

    // Engagement bonus - collaboration
    let collaborationEngagementSum = 0;
    cylink.forEach(videoId => {
        const stats = videoStatsMap.get(videoId);
        if (stats) {
            collaborationEngagementSum += getVideoEngagementPoints(stats.viewCount, stats.likeCount, false);
        }
    });
    const collaborationDivisor = Math.max(1, cylink.length * 0.3);
    const collaborationEngagement = collaborationEngagementSum / collaborationDivisor;

    const engagementBonus = individualEngagement + collaborationEngagement;

    return Math.round(baseScore + timeBonus + worksBonus + engagementBonus);
}

/**
 * Safely convert Firestore timestamp/date to Date
 */
function toDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value.toDate === 'function') return value.toDate();
    if (typeof value._seconds === 'number') return new Date(value._seconds * 1000);
    if (typeof value === 'string') {
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
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

        // Collect all video data
        interface VideoInfo {
            videoId: string | null;
            tlink: string; // normalized
            tlinkOriginal: string;
            creator: string;
            icon: string | null;
            ychlink: string;
            type: string;
            type2: string;
            eventIds: string[];
            time: Date | null;
            viewCount: number;
            likeCount: number;
            memberNames: string[];
            memberIds: string[]; // normalized
            memberNamesRaw: string[];
            isDeleted: boolean;
        }

        const allVideos: VideoInfo[] = [];
        const videoStatsMap = new Map<string, { viewCount: number; likeCount: number }>();

        videosSnapshot.docs.forEach(doc => {
            const data = doc.data() as VideoDocument;
            if (data.isDeleted === true) return;
            if (data.isApproved === false) return;

            const ytId = extractYouTubeId(data.videoUrl || '');
            const tlink = normalizeString(data.authorXid || '');

            // Build member lists
            const memberIds = (data.members || []).map(m => normalizeString(m.xid || '')).filter(Boolean);
            const memberNames = (data.members || []).map(m => (m.name || '').trim());
            const memberNamesRaw = (data.members || []).map(m => (m.name || '').trim());

            allVideos.push({
                videoId: ytId,
                tlink,
                tlinkOriginal: data.authorXid || '',
                creator: data.authorName || '',
                icon: data.authorIconUrl || null,
                ychlink: data.authorChannelUrl || '',
                type: data.type || '',
                type2: data.type2 || '',
                eventIds: data.eventIds || [],
                time: toDate(data.startTime),
                viewCount: data.viewCount || 0,
                likeCount: data.likeCount || 0,
                memberNames,
                memberIds,
                memberNamesRaw,
                isDeleted: data.isDeleted === true,
            });

            // Collect stats for score calculation
            if (ytId) {
                videoStatsMap.set(ytId, {
                    viewCount: data.viewCount || 0,
                    likeCount: data.likeCount || 0,
                });
            }
        });

        // Step 1: Collect unique tlinks (3+ chars)
        const tlinkList = [...new Set(
            allVideos
                .map(v => v.tlink)
                .filter(t => t.length > 3)
        )].sort();

        // Step 2: Collect memberids that appear 2+ times (3+ chars)
        const memberidCounts: Record<string, number> = {};
        allVideos.forEach(v => {
            v.memberIds.forEach(mid => {
                if (mid.length > 3) {
                    memberidCounts[mid] = (memberidCounts[mid] || 0) + 1;
                }
            });
        });
        const activeMemberidList = Object.keys(memberidCounts)
            .filter(key => memberidCounts[key] >= 2)
            .sort();

        // Step 3: Merge all usernames
        const allUsernames = [...new Set([...tlinkList, ...activeMemberidList])].sort();

        // Step 4: Build user data for each username
        const users: UserApiResponseLegacy[] = allUsernames.map(username => {
            // Find videos where this user is tlink
            const tlinkData = allVideos.filter(v => v.tlink === username);

            // Find videos where this user is in memberid
            const memberidData = allVideos.filter(v =>
                v.memberIds.includes(username)
            );

            // Determine creator name and icon
            let creatorName = '';
            let icon: string | null = null;
            let ychlink = '';
            let latestTime: Date | null = null;

            if (tlinkData.length > 0) {
                // Check for personal (個人) works first
                const personalTlinkData = tlinkData.filter(v =>
                    v.type === '個人' || v.type2 === '個人'
                );

                if (personalTlinkData.length > 0) {
                    // Sort by time desc, use latest
                    const sorted = personalTlinkData.sort((a, b) =>
                        (b.time?.getTime() || 0) - (a.time?.getTime() || 0)
                    );
                    creatorName = sorted[0].creator;
                    icon = sorted[0].icon;
                    ychlink = sorted[0].ychlink;
                    latestTime = sorted[0].time;
                } else {
                    // No personal tlink data - try memberid data for name
                    let foundFromMember = false;

                    if (memberidData.length > 0) {
                        for (const item of memberidData) {
                            const idx = item.memberIds.indexOf(username);
                            if (idx !== -1 && idx < item.memberNamesRaw.length) {
                                creatorName = item.memberNamesRaw[idx];
                                foundFromMember = true;
                                break;
                            }
                        }
                    }

                    if (!foundFromMember) {
                        // Fallback: use any tlink data
                        const sorted = tlinkData.sort((a, b) =>
                            (b.time?.getTime() || 0) - (a.time?.getTime() || 0)
                        );
                        creatorName = sorted[0].creator;
                        ychlink = sorted[0].ychlink;
                        latestTime = sorted[0].time;
                    }

                    // No icon for non-personal data
                    icon = null;
                }
            } else if (memberidData.length > 0) {
                // No tlink data - get name from memberid
                for (const item of memberidData) {
                    const idx = item.memberIds.indexOf(username);
                    if (idx !== -1 && idx < item.memberNamesRaw.length) {
                        creatorName = item.memberNamesRaw[idx];
                        break;
                    }
                }
                icon = null;
            }

            // Find latest time across all data
            if (!latestTime) {
                const allItems = [...tlinkData, ...memberidData];
                const sorted = allItems.filter(v => v.time).sort((a, b) =>
                    (b.time?.getTime() || 0) - (a.time?.getTime() || 0)
                );
                if (sorted.length > 0) latestTime = sorted[0].time;
            }
            if (!ychlink) {
                const item = [...tlinkData, ...memberidData].find(v => v.ychlink);
                if (item) ychlink = item.ychlink;
            }

            // Classify video IDs
            const iylink: string[] = [];
            const cylink: string[] = [];
            const mylink: string[] = [];

            // From tlink (author's own videos)
            tlinkData.forEach(v => {
                if (v.videoId) {
                    // PVSFSummary goes to mylink
                    if (v.eventIds.some(e => e.includes('PVSFSummary'))) {
                        mylink.push(v.videoId);
                    } else {
                        iylink.push(v.videoId);
                    }
                }
            });

            // From memberid (collaboration participation)
            memberidData.forEach(v => {
                if (v.videoId) {
                    if (v.eventIds.some(e => e.includes('PVSFSummary'))) {
                        mylink.push(v.videoId);
                    } else {
                        cylink.push(v.videoId);
                    }
                }
            });

            // Deduplicate
            const uniqueIylink = [...new Set(iylink)];
            const uniqueCylink = [...new Set(cylink)];
            const uniqueMylink = [...new Set(mylink)];

            // Calculate score
            const creatorScore = calculateCreatorScore(
                uniqueIylink,
                uniqueCylink,
                uniqueMylink,
                latestTime,
                videoStatsMap
            );

            return {
                username,
                icon,
                creatorName,
                ychlink,
                iylink: uniqueIylink,
                cylink: uniqueCylink,
                mylink: uniqueMylink,
                creatorScore,
            };
        });

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
