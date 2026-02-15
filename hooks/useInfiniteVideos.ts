// 無限スクロール用のカスタムフック
import { useState, useEffect, useCallback, useRef } from 'react';

interface Video {
    id: string;
    title: string;
    videoUrl: string;
    authorXid: string;
    authorName: string;
    authorIconUrl?: string;
    eventIds: string[];
    startTime: string;
    viewCount: number;
    likeCount: number;
    slotId: string | null;
    privacyStatus: string;
    isDeleted?: boolean;
    createdBy?: string;
}

interface PaginationInfo {
    hasMore: boolean;
    lastDocId: string | null;
    count: number;
}

interface UseInfiniteVideosOptions {
    eventId?: string;
    authorXid?: string;
    memberXid?: string;
    limit?: number;
    enabled?: boolean;
    includeDeleted?: boolean;
    createdBy?: string;
}

interface UseInfiniteVideosReturn {
    videos: Video[];
    isLoading: boolean;
    isLoadingMore: boolean;
    hasMore: boolean;
    error: string | null;
    loadMore: () => Promise<void>;
    refresh: () => Promise<void>;
}

export function useInfiniteVideos(
    options: UseInfiniteVideosOptions = {}
): UseInfiniteVideosReturn {
    const { eventId, authorXid, memberXid, limit = 15, enabled = true, includeDeleted = false, createdBy } = options;

    const [videos, setVideos] = useState<Video[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const lastDocIdRef = useRef<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    const abortControllerRef = useRef<AbortController | null>(null);

    // 動画データをパースする関数
    const parseVideo = (v: any): Video => {
        const eventIds = v.eventid
            ? v.eventid.split(',').map((e: string) => e.trim()).filter(Boolean)
            : [];

        // YouTube IDを抽出
        const extractYouTubeId = (url: string): string | null => {
            if (!url) return null;
            const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            return match ? match[1] : null;
        };

        return {
            id: extractYouTubeId(v.ylink) || v.ylink || v.id || '',
            title: v.title || '',
            videoUrl: v.ylink || '',
            authorXid: v.tlink || '',
            authorName: v.creator || '',
            authorIconUrl: v.icon || undefined,
            eventIds,
            startTime: v.time || '',
            viewCount: parseInt(v.viewCount) || 0,
            likeCount: parseInt(v.likeCount) || 0,
            slotId: null,
            privacyStatus: v.status || 'public',
            createdBy: v.createdBy || undefined,
        };
    };

    // 動画を取得する関数
    const fetchVideos = useCallback(async (isLoadMore: boolean = false) => {
        // 前のリクエストをキャンセル
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        if (!enabled) return;

        try {
            if (isLoadMore) {
                setIsLoadingMore(true);
            } else {
                setIsLoading(true);
            }
            setError(null);

            // API URLを構築
            const params = new URLSearchParams();
            if (eventId) {
                params.append('eventid', eventId);
            }
            if (authorXid) {
                params.append('authorXid', authorXid);
            }
            if (createdBy) {
                params.append('createdBy', createdBy);
            }
            if (memberXid) {
                params.append('memberXid', memberXid);
            }
            if (limit) params.append('limit', limit.toString());
            if (includeDeleted) params.append('includeDeleted', 'true');
            if (isLoadMore && lastDocIdRef.current) {
                params.append('startAfter', lastDocIdRef.current);
            }

            const response = await fetch(`/api/videos?${params.toString()}`, {
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                let message = '動画の取得に失敗しました';
                try {
                    const errBody = await response.json();
                    if (errBody?.error && typeof errBody.error === 'string') {
                        message = errBody.error;
                    } else {
                        message = `${message} (${response.status})`;
                    }
                } catch {
                    message = `${message} (${response.status})`;
                }
                setError(message);
                return;
            }

            const data = await response.json();

            // レスポンス形式の確認（新しい形式か古い形式か）
            let videoList: any[];
            let pagination: PaginationInfo;

            if (data.videos && data.pagination) {
                // 新しい形式（ページネーション情報付き）
                videoList = data.videos;
                pagination = data.pagination;
            } else if (Array.isArray(data)) {
                // 古い形式（配列のみ）- 後方互換性のため
                videoList = data;
                // 古い形式では、最後の動画のIDをlastDocIdとして使用
                // ただし、これは正確ではない可能性があるため、hasMoreはfalseにする
                pagination = {
                    hasMore: false, // 古い形式ではページネーション情報がないため
                    lastDocId: data.length > 0 ? (data[data.length - 1].id || null) : null,
                    count: data.length,
                };
            } else {
                setError('不正なレスポンス形式です');
                return;
            }

            const parsedVideos = videoList.map(parseVideo);

            if (isLoadMore) {
                // 追加読み込み: 既存の動画に追加
                setVideos(prev => [...prev, ...parsedVideos]);
            } else {
                // 初回読み込み: 動画を置き換え
                setVideos(parsedVideos);
            }

            setHasMore(pagination.hasMore);
            lastDocIdRef.current = pagination.lastDocId;
            setIsInitialized(true);

        } catch (err: any) {
            if (err.name === 'AbortError') {
                // リクエストがキャンセルされた場合はエラーにしない
                return;
            }
            console.error('Failed to fetch videos:', err);
            setError(err.message || '動画の取得に失敗しました');
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [eventId, authorXid, memberXid, limit, enabled, includeDeleted, createdBy]);

    // 初回読み込み
    useEffect(() => {
        if (enabled && !isInitialized) {
            lastDocIdRef.current = null; // リセット
            fetchVideos(false);
        }
    }, [enabled, isInitialized, fetchVideos]);

    // もっと読み込む
    const loadMore = useCallback(async () => {
        if (!isLoadingMore && hasMore && enabled) {
            await fetchVideos(true);
        }
    }, [isLoadingMore, hasMore, enabled, fetchVideos]);

    // リフレッシュ
    const refresh = useCallback(async () => {
        lastDocIdRef.current = null;
        setVideos([]);
        setIsInitialized(false);
        await fetchVideos(false);
    }, [fetchVideos]);

    // クリーンアップ
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    return {
        videos,
        isLoading,
        isLoadingMore,
        hasMore,
        error,
        loadMore,
        refresh,
    };
}
