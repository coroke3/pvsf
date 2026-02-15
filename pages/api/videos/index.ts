// Videos API endpoint with legacy format compatibility
import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/libs/firebase-admin';
import type { VideoDocument, VideoApiResponse } from '@/types/video';

/**
 * Convert eventIds array to comma-separated string for legacy API
 */
function eventIdsToLegacyFormat(eventIds: string[] | undefined): string {
    if (!eventIds || eventIds.length === 0) return '';
    return eventIds.join(',');
}

/**
 * Safely convert Firestore timestamp or date to Date object
 */
function toSafeDate(value: any): Date {
    if (!value) return new Date();
    if (value instanceof Date) {
        return isNaN(value.getTime()) ? new Date() : value;
    }
    if (typeof value.toDate === 'function') {
        try { return value.toDate(); } catch { return new Date(); }
    }
    if (typeof value._seconds === 'number') {
        return new Date(value._seconds * 1000);
    }
    if (typeof value.seconds === 'number') {
        return new Date(value.seconds * 1000);
    }
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function convertToLegacyFormat(doc: VideoDocument): VideoApiResponse {
    const memberNames = doc.members?.map(m => m.name).join(', ') || '';
    const memberIds = doc.members?.map(m => m.xid).join(', ') || '';

    const startTime = toSafeDate(doc.startTime);
    const timestamp = doc.timestamp ? toSafeDate(doc.timestamp) : null;
    const eventIdStr = eventIdsToLegacyFormat(doc.eventIds);

    let movieyear: number;
    if (typeof doc.movieYear === 'number') {
        movieyear = doc.movieYear;
    } else if (typeof doc.movieYear === 'string') {
        const parsed = parseInt(doc.movieYear, 10);
        movieyear = isNaN(parsed) ? 0 : parsed;
    } else {
        movieyear = 0;
    }

    const response: VideoApiResponse = {
        type1: doc.type || '',
        type2: doc.type2 || '',
        type: doc.type || '',
        creator: doc.authorName || '',
        movieyear,
        tlink: doc.authorXid || '',
        ychlink: doc.authorChannelUrl || '',
        icon: doc.authorIconUrl || '',
        member: memberNames,
        memberid: memberIds,
        data: doc.data || '',
        time: startTime.toISOString(),
        title: doc.title || '',
        music: doc.music || '',
        credit: doc.credit || '',
        ymulink: doc.musicUrl || '',
        ywatch: doc.ywatch || '',
        othersns: doc.otherSns || '',
        righttype: doc.rightType || '',
        comment: doc.description || '',
        ylink: doc.videoUrl || '',
        status: doc.privacyStatus || 'public',
        smallThumbnail: doc.smallThumbnail || '',
        largeThumbnail: doc.largeThumbnail || '',
        viewCount: String(doc.viewCount || 0),
        likeCount: String(doc.likeCount || 0),
        daysSincePublished: doc.daysSincePublished || 0,
        videoScore: doc.videoScore ?? null,
        deterministicScore: doc.deterministicScore ?? null,
        fu: '',
        beforecomment: doc.beforeComment || '',
        aftercomment: doc.afterComment || '',
        soft: doc.software || '',
        listen: doc.listen || '',
        episode: doc.episode || '',
        end: doc.endMessage || '',
        createdBy: doc.createdBy || '',
    };

    if (timestamp) {
        response.timestamp = timestamp.toISOString();
    }
    if (eventIdStr) {
        response.eventid = eventIdStr;
    }

    return response;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const {
            eventid,
            limit: limitParam,
            all,
            startAfter: startAfterParam,
            includeDeleted,
            format,
            authorXid,
            createdBy,
            memberXid,
        } = req.query;

        const isLegacyFormat = format === 'legacy';

        let videosQuery: FirebaseFirestore.Query = adminDb.collection('videos');

        // Filter by eventid
        if (eventid && typeof eventid === 'string') {
            videosQuery = videosQuery.where('eventIds', 'array-contains', eventid);
        }

        // Filter by authorXid (case-insensitive via authorXidLower field)
        const authorXidLowerValues: string[] = [];
        if (authorXid && typeof authorXid === 'string') {
            if (authorXid.includes(',')) {
                const xids = authorXid.split(',').map(x => x.trim().toLowerCase()).filter(Boolean).slice(0, 10);
                if (xids.length > 0) {
                    videosQuery = videosQuery.where('authorXidLower', 'in', xids);
                    authorXidLowerValues.push(...xids);
                }
            } else {
                const xidLower = authorXid.trim().toLowerCase();
                videosQuery = videosQuery.where('authorXidLower', '==', xidLower);
                authorXidLowerValues.push(xidLower);
            }
        }

        // Filter by createdBy
        if (createdBy && typeof createdBy === 'string') {
            videosQuery = videosQuery.where('createdBy', '==', createdBy);
        }

        // memberXid filtering (done in memory)
        const memberXids: string[] = [];
        if (memberXid && typeof memberXid === 'string') {
            memberXids.push(...memberXid.split(',').map(x => x.trim().toLowerCase()).filter(Boolean));
        }

        videosQuery = videosQuery.orderBy('createdAt', 'desc');

        // All mode or legacy format (return all as flat array)
        if (all === 'true' || all === '1' || (isLegacyFormat && !limitParam)) {
            const allVideos: VideoApiResponse[] = [];
            let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
            let hasMore = true;
            const batchSize = 500;

            while (hasMore) {
                let batchQuery: FirebaseFirestore.Query = videosQuery;
                if (lastDoc) {
                    batchQuery = batchQuery.startAfter(lastDoc);
                }
                batchQuery = batchQuery.limit(batchSize);

                const batchSnapshot = await batchQuery.get();

                if (batchSnapshot.empty) {
                    hasMore = false;
                    break;
                }

                const batchVideos = batchSnapshot.docs
                    .map(doc => ({
                        data: doc.data() as VideoDocument,
                        id: doc.id,
                    }))
                    .filter(({ data }) => {
                        // Filter out deleted
                        if (includeDeleted !== 'true' && data.isDeleted === true) return false;
                        // Filter out unapproved (slot-linked)
                        if (data.isApproved === false) return false;
                        // memberXid filter
                        if (memberXids.length > 0) {
                            if (!data.members || !Array.isArray(data.members)) return false;
                            return data.members.some(m => memberXids.includes((m.xid || '').toLowerCase()));
                        }
                        return true;
                    })
                    .map(({ data, id }) => convertToLegacyFormat({ ...data, id }));

                allVideos.push(...batchVideos);

                if (batchSnapshot.docs.length < batchSize) {
                    hasMore = false;
                } else {
                    lastDoc = batchSnapshot.docs[batchSnapshot.docs.length - 1];
                }
            }

            // Sort by time descending (legacy behavior)
            allVideos.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

            // Legacy format: return flat array
            if (isLegacyFormat) {
                return res.status(200).json(allVideos);
            }

            return res.status(200).json({
                videos: allVideos,
                pagination: {
                    hasMore: false,
                    lastDocId: null,
                    count: allVideos.length,
                },
            });
        }

        // Normal paginated mode
        const limitValue = limitParam
            ? parseInt(limitParam as string, 10)
            : 15;

        if (startAfterParam && typeof startAfterParam === 'string') {
            try {
                const docRef = adminDb.collection('videos').doc(startAfterParam);
                const docSnap = await docRef.get();
                if (docSnap.exists) {
                    videosQuery = videosQuery.startAfter(docSnap);
                }
            } catch (err) {
                console.warn('startAfter parameter invalid, ignoring:', err);
            }
        }

        if (limitValue > 0) {
            videosQuery = videosQuery.limit(limitValue);
        }

        const videosSnapshot = await videosQuery.get();

        // Memory filtering
        let docs = videosSnapshot.docs;
        if (includeDeleted !== 'true') {
            docs = docs.filter(doc => (doc.data() as VideoDocument).isDeleted !== true);
        }
        // Filter unapproved
        docs = docs.filter(doc => (doc.data() as VideoDocument).isApproved !== false);

        if (memberXids.length > 0) {
            docs = docs.filter(doc => {
                const data = doc.data() as VideoDocument;
                if (!data.members || !Array.isArray(data.members)) return false;
                return data.members.some(m => memberXids.includes((m.xid || '').toLowerCase()));
            });
        }

        if (docs.length === 0 && !startAfterParam) {
            // Fallback to legacy API during migration
            try {
                const legacyRes = await fetch('https://pvsf-cash.vercel.app/api/videos');
                if (legacyRes.ok) {
                    let legacyData = await legacyRes.json();

                    if (Array.isArray(legacyData)) {
                        if (eventid && typeof eventid === 'string') {
                            legacyData = legacyData.filter((v: any) =>
                                v.eventid && v.eventid.split(',').map((e: string) => e.trim()).includes(eventid)
                            );
                        }
                        if (authorXidLowerValues.length > 0) {
                            legacyData = legacyData.filter((v: any) =>
                                v.tlink && authorXidLowerValues.includes(v.tlink.toLowerCase())
                            );
                        }
                        if (memberXids.length > 0) {
                            legacyData = legacyData.filter((v: any) => {
                                const mids = (v.memberid || '').split(',').map((m: string) => m.trim().toLowerCase()).filter(Boolean);
                                return mids.some((mid: string) => memberXids.includes(mid));
                            });
                        }
                        legacyData.sort((a: any, b: any) =>
                            new Date(b.time).getTime() - new Date(a.time).getTime()
                        );
                    }

                    if (isLegacyFormat) {
                        return res.status(200).json(legacyData);
                    }
                    return res.status(200).json(legacyData);
                }
            } catch (legacyError) {
                console.error('Legacy API fallback failed:', legacyError);
            }

            if (isLegacyFormat) {
                return res.status(200).json([]);
            }
            return res.status(200).json({ videos: [], pagination: { hasMore: false, lastDocId: null, count: 0 } });
        }

        const videos: VideoApiResponse[] = docs.map(doc => {
            const data = doc.data() as VideoDocument;
            return convertToLegacyFormat({ ...data, id: doc.id });
        });

        if (isLegacyFormat) {
            return res.status(200).json(videos);
        }

        const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;
        const hasMore = docs.length === limitValue;

        return res.status(200).json({
            videos,
            pagination: {
                hasMore,
                lastDocId: lastDoc?.id || null,
                count: videos.length,
            },
        });

    } catch (error) {
        console.error('Videos API error:', error);

        // Error fallback: try legacy API but still apply filters
        try {
            const legacyRes = await fetch('https://pvsf-cash.vercel.app/api/videos');
            if (legacyRes.ok) {
                let legacyData = await legacyRes.json();

                if (Array.isArray(legacyData)) {
                    // Apply same filters as normal path
                    const {
                        eventid: fallbackEventId,
                        authorXid: fallbackAuthorXid,
                        memberXid: fallbackMemberXid,
                    } = req.query;

                    if (fallbackEventId && typeof fallbackEventId === 'string') {
                        legacyData = legacyData.filter((v: any) =>
                            v.eventid && v.eventid.split(',').map((e: string) => e.trim()).includes(fallbackEventId)
                        );
                    }
                    if (fallbackAuthorXid && typeof fallbackAuthorXid === 'string') {
                        const targetXids = fallbackAuthorXid.split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
                        if (targetXids.length > 0) {
                            legacyData = legacyData.filter((v: any) =>
                                v.tlink && targetXids.includes(v.tlink.toLowerCase())
                            );
                        }
                    }
                    if (fallbackMemberXid && typeof fallbackMemberXid === 'string') {
                        const targetMemberXids = fallbackMemberXid.split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
                        if (targetMemberXids.length > 0) {
                            legacyData = legacyData.filter((v: any) => {
                                const mids = (v.memberid || '').split(',').map((m: string) => m.trim().toLowerCase()).filter(Boolean);
                                return mids.some((mid: string) => targetMemberXids.includes(mid));
                            });
                        }
                    }

                    legacyData.sort((a: any, b: any) =>
                        new Date(b.time).getTime() - new Date(a.time).getTime()
                    );
                }

                return res.status(200).json(legacyData);
            }
        } catch (legacyError) {
            console.error('Legacy API fallback failed:', legacyError);
        }

        return res.status(500).json({ error: 'Internal server error' });
    }
}
