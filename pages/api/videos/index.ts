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
 * Convert Firestore VideoDocument to legacy API format
 * Matches the format from https://pvsf-cash.vercel.app/api/videos
 */
/**
 * Safely convert Firestore timestamp or date to Date object
 */
function toSafeDate(value: any): Date {
    if (!value) return new Date();
    if (value instanceof Date) {
        return isNaN(value.getTime()) ? new Date() : value;
    }
    // Firestore Timestamp has toDate() method
    if (typeof value.toDate === 'function') {
        try {
            return value.toDate();
        } catch {
            return new Date();
        }
    }
    // Handle Firestore Timestamp serialized format { _seconds, _nanoseconds }
    if (typeof value._seconds === 'number') {
        return new Date(value._seconds * 1000);
    }
    // Handle { seconds, nanoseconds } format
    if (typeof value.seconds === 'number') {
        return new Date(value.seconds * 1000);
    }
    // Try to parse as date string or number
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function convertToLegacyFormat(doc: VideoDocument): VideoApiResponse {
    // Convert members array to comma-separated strings with proper spacing
    const memberNames = doc.members?.map(m => m.name).join(', ') || '';
    const memberIds = doc.members?.map(m => m.xid).join(', ') || '';

    const startTime = toSafeDate(doc.startTime);
    const timestamp = doc.timestamp ? toSafeDate(doc.timestamp) : null;

    // Convert eventIds array to comma-separated string for legacy format
    const eventIdStr = eventIdsToLegacyFormat(doc.eventIds);

    // Handle movieYear - can be number, string, or "伏せる"
    let movieyear: number;
    if (typeof doc.movieYear === 'number') {
        movieyear = doc.movieYear;
    } else if (typeof doc.movieYear === 'string') {
        const parsed = parseInt(doc.movieYear, 10);
        movieyear = isNaN(parsed) ? 0 : parsed;
    } else {
        movieyear = 0;
    }

    // Build response object matching legacy format exactly
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

    // Add optional fields only if they have values (matching legacy behavior)
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
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // クエリパラメータを取得
        const { eventid, limit: limitParam, all, startAfter: startAfterParam, includeDeleted } = req.query;

        // 最適化: サーバーサイドでフィルタリング（クライアントサイドフィルタリングを削減）
        let videosQuery: FirebaseFirestore.Query = adminDb.collection('videos');

        // isDeleted field might be missing in legacy data, so we cannot use .where('isDeleted', '==', false)

        // eventidでフィルタリング（サーバーサイド）
        if (eventid && typeof eventid === 'string') {
            videosQuery = videosQuery.where('eventIds', 'array-contains', eventid);
        }

        // authorXidでフィルタリング（サーバーサイド）
        const { authorXid } = req.query;
        if (authorXid && typeof authorXid === 'string') {
            if (authorXid.includes(',')) {
                // 複数のXIDがある場合は 'in' 演算子を使用 (最大10個)
                const xids = authorXid.split(',').map(x => x.trim()).filter(Boolean).slice(0, 10);
                if (xids.length > 0) {
                    videosQuery = videosQuery.where('authorXid', 'in', xids);
                }
            } else {
                videosQuery = videosQuery.where('authorXid', '==', authorXid);
            }
        }

        // createdByでフィルタリング (Discord ID)
        const { createdBy } = req.query;
        if (createdBy && typeof createdBy === 'string') {
            videosQuery = videosQuery.where('createdBy', '==', createdBy);
        }

        // memberXidでフィルタリング（メンバーとして参加している作品）
        const { memberXid } = req.query;
        const memberXids: string[] = [];
        if (memberXid && typeof memberXid === 'string') {
            memberXids.push(...memberXid.split(',').map(x => x.trim().toLowerCase()).filter(Boolean));
        }

        // デフォルトで作成日時でソート（最新順）
        videosQuery = videosQuery.orderBy('createdAt', 'desc');

        // limitパラメータの処理
        if (all === 'true' || all === '1') {
            // 全件取得モード: ページネーションを使用して全件取得
            const allVideos: VideoApiResponse[] = [];
            let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
            let hasMore = true;
            const batchSize = 500; // Firestoreの推奨バッチサイズ

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
                    .map(doc => {
                        const data = doc.data() as VideoDocument;
                        return { data, id: doc.id };
                    })
                    .filter(({ data }) => {
                        if (includeDeleted === 'true') return true;
                        return data.isDeleted !== true; // Include false or undefined
                    })
                    .map(({ data, id }) => convertToLegacyFormat({
                        ...data,
                        id,
                    }));

                allVideos.push(...batchVideos);

                if (batchSnapshot.docs.length < batchSize) {
                    hasMore = false;
                } else {
                    lastDoc = batchSnapshot.docs[batchSnapshot.docs.length - 1];
                }
            }

            // 全件取得モードではページネーション情報なし
            return res.status(200).json({
                videos: allVideos,
                pagination: {
                    hasMore: false,
                    lastDocId: null,
                    count: allVideos.length,
                },
            });
        } else {
            // 通常モード: limitパラメータに応じて制限
            const limitValue = limitParam
                ? parseInt(limitParam as string, 10)
                : 15; // デフォルト15件（無限スクロール用）

            // ページネーション: startAfterパラメータがある場合
            if (startAfterParam && typeof startAfterParam === 'string') {
                try {
                    // startAfterパラメータはドキュメントID
                    // ドキュメントを取得してstartAfterに使用
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
            // limitValueが0以下の場合は全件取得（ページネーション使用）
        }

        const videosSnapshot = await videosQuery.get();

        // メモリ内フィルタリング (isDeletedフィールド欠損対応のため)
        let docs = videosSnapshot.docs;
        if (includeDeleted !== 'true') {
            docs = docs.filter(doc => (doc.data() as VideoDocument).isDeleted !== true);
        }

        // memberXidフィルタリング（Firestoreではネストされた配列内フィールドを直接検索できないため、メモリ内で実施）
        if (memberXids.length > 0) {
            docs = docs.filter(doc => {
                const data = doc.data() as VideoDocument;
                if (!data.members || !Array.isArray(data.members)) return false;
                return data.members.some(m => memberXids.includes((m.xid || '').toLowerCase()));
            });
        }

        if (videosSnapshot.empty) {
            // If no data in Firestore, fallback to legacy API
            // This ensures compatibility during migration
            try {
                const legacyRes = await fetch('https://pvsf-cash.vercel.app/api/videos');
                if (legacyRes.ok) {
                    let legacyData = await legacyRes.json();

                    // Filter legacy data manually
                    if (Array.isArray(legacyData)) {
                        // Filter by eventid
                        if (eventid && typeof eventid === 'string') {
                            legacyData = legacyData.filter((v: any) =>
                                v.eventid && v.eventid.split(',').map((e: string) => e.trim()).includes(eventid)
                            );
                        }

                        // Filter by authorXid (tlink)
                        const { authorXid } = req.query;
                        if (authorXid && typeof authorXid === 'string') {
                            if (authorXid.includes(',')) {
                                const xids = authorXid.split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
                                legacyData = legacyData.filter((v: any) =>
                                    v.tlink && xids.includes(v.tlink.toLowerCase())
                                );
                            } else {
                                const targetXid = authorXid.toLowerCase();
                                legacyData = legacyData.filter((v: any) =>
                                    v.tlink && v.tlink.toLowerCase() === targetXid
                                );
                            }
                        }

                        // Sort by date (descending) - assuming 'time' field exists
                        legacyData.sort((a: any, b: any) => {
                            const dateA = new Date(a.time).getTime();
                            const dateB = new Date(b.time).getTime();
                            return dateB - dateA;
                        });
                    }

                    return res.status(200).json(legacyData);
                }
            } catch (legacyError) {
                console.error('Legacy API fallback failed:', legacyError);
            }
            return res.status(200).json([]);
        }

        // Convert Firestore documents to legacy format
        const videos: VideoApiResponse[] = videosSnapshot.docs.map(doc => {
            const data = doc.data() as VideoDocument;
            return convertToLegacyFormat({
                ...data,
                id: doc.id,
            });
        });

        // ページネーション用の情報を追加
        const lastDoc = videosSnapshot.docs.length > 0
            ? videosSnapshot.docs[videosSnapshot.docs.length - 1]
            : null;
        const hasMore = videosSnapshot.docs.length === (limitParam ? parseInt(limitParam as string, 10) : 15);

        // レスポンスにメタデータを追加（無限スクロール用）
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

        // Fallback to legacy API on error
        try {
            const legacyRes = await fetch('https://pvsf-cash.vercel.app/api/videos');
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
