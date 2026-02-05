// 無限スクロール検知用のカスタムフック
import { useEffect, useRef, RefObject } from 'react';

interface UseInfiniteScrollOptions {
    onLoadMore: () => void;
    hasMore: boolean;
    isLoading: boolean;
    threshold?: number; // ページ下部から何pxで読み込むか（デフォルト: 200px）
    root?: Element | null; // IntersectionObserverのroot（デフォルト: null = viewport）
}

export function useInfiniteScroll({
    onLoadMore,
    hasMore,
    isLoading,
    threshold = 200,
    root = null,
}: UseInfiniteScrollOptions): RefObject<HTMLDivElement> {
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel || !hasMore || isLoading) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting) {
                    onLoadMore();
                }
            },
            {
                root,
                rootMargin: `${threshold}px`,
                threshold: 0.1,
            }
        );

        observer.observe(sentinel);

        return () => {
            observer.disconnect();
        };
    }, [onLoadMore, hasMore, isLoading, threshold, root]);

    return sentinelRef;
}
