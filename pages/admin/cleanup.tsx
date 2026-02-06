// Admin Cleanup Page - Search and soft delete past events/videos
import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTrash, faSpinner, faCheck, faTimes, faSearch,
    faCalendarAlt, faVideo, faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import Footer from '@/components/Footer';

interface CleanupItem {
    id: string;
    title?: string;
    authorName?: string;
    startTime?: string;
    eventId?: string;
    eventName?: string;
    pastSlots?: number;
    futureSlots?: number;
}

export default function AdminCleanupPage() {
    const router = useRouter();
    const { isAdmin, isLoading, isAuthenticated } = useAuth();

    const [items, setItems] = useState<CleanupItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Search params
    const [beforeDate, setBeforeDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchType, setSearchType] = useState<'videos' | 'events'>('videos');

    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!isLoading && (!isAuthenticated || !isAdmin)) {
            router.push('/');
        }
    }, [isLoading, isAuthenticated, isAdmin, router]);

    const searchItems = useCallback(async () => {
        setIsSearching(true);
        setError('');
        setItems([]);
        setSelectedIds(new Set());

        try {
            const res = await fetch(`/api/admin/cleanup?before=${beforeDate}&type=${searchType}`);
            if (res.ok) {
                const data = await res.json();
                setItems(data.items || []);
            } else {
                const err = await res.json();
                setError(err.error || '検索に失敗しました');
            }
        } catch (err) {
            setError('検索中にエラーが発生しました');
        } finally {
            setIsSearching(false);
        }
    }, [beforeDate, searchType]);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const selectAll = () => {
        if (selectedIds.size === items.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(items.map(i => i.id)));
        }
    };

    const handleSoftDelete = async () => {
        if (selectedIds.size === 0) return;

        const confirmMsg = `${selectedIds.size}件のアイテムをソフト削除しますか？\n\n※この操作は管理者が復元できます。`;
        if (!confirm(confirmMsg)) return;

        setIsDeleting(true);
        setError('');
        setSuccess('');

        try {
            const res = await fetch('/api/admin/cleanup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ids: Array.from(selectedIds),
                    type: searchType,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(data.message);
                setSelectedIds(new Set());
                searchItems(); // Refresh list
            } else {
                setError(data.error || '削除に失敗しました');
            }
        } catch (err) {
            setError('削除中にエラーが発生しました');
        } finally {
            setIsDeleting(false);
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (isLoading || (!isAuthenticated || !isAdmin)) {
        return (
            <div className="admin-page">
                <div className="loading-container">
                    <FontAwesomeIcon icon={faSpinner} spin size="2x" />
                </div>
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>クリーンアップ - Admin</title>
            </Head>

            <div className="admin-page">
                <div className="admin-header">
                    <h1><FontAwesomeIcon icon={faTrash} /> クリーンアップ</h1>
                    <p>過去のイベント・動画を検索してソフト削除します（自動削除なし）</p>
                </div>

                <div className="admin-content">
                    {/* Messages */}
                    {error && (
                        <div className="alert alert-error">
                            <FontAwesomeIcon icon={faTimes} /> {error}
                        </div>
                    )}
                    {success && (
                        <div className="alert alert-success">
                            <FontAwesomeIcon icon={faCheck} /> {success}
                        </div>
                    )}

                    {/* Search Form */}
                    <div className="card">
                        <h2><FontAwesomeIcon icon={faSearch} /> 過去アイテムを検索</h2>
                        <div className="form-row">
                            <div className="form-group">
                                <label>種類</label>
                                <select
                                    value={searchType}
                                    onChange={(e) => setSearchType(e.target.value as 'videos' | 'events')}
                                    className="form-input"
                                >
                                    <option value="videos">動画</option>
                                    <option value="events">イベント枠</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>この日時より前</label>
                                <input
                                    type="date"
                                    value={beforeDate}
                                    onChange={(e) => setBeforeDate(e.target.value)}
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group" style={{ alignSelf: 'flex-end' }}>
                                <button
                                    onClick={searchItems}
                                    disabled={isSearching}
                                    className="btn btn-primary"
                                >
                                    {isSearching ? (
                                        <><FontAwesomeIcon icon={faSpinner} spin /> 検索中...</>
                                    ) : (
                                        <><FontAwesomeIcon icon={faSearch} /> 検索</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Results */}
                    {items.length > 0 && (
                        <div className="card">
                            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2>
                                    <FontAwesomeIcon icon={searchType === 'videos' ? faVideo : faCalendarAlt} />
                                    {' '}検索結果 ({items.length}件)
                                </h2>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={selectAll}
                                        className="btn btn-outline btn-sm"
                                    >
                                        {selectedIds.size === items.length ? '全解除' : '全選択'}
                                    </button>
                                    <button
                                        onClick={handleSoftDelete}
                                        disabled={selectedIds.size === 0 || isDeleting}
                                        className="btn btn-danger btn-sm"
                                    >
                                        {isDeleting ? (
                                            <><FontAwesomeIcon icon={faSpinner} spin /> 削除中...</>
                                        ) : (
                                            <><FontAwesomeIcon icon={faTrash} /> 選択削除 ({selectedIds.size})</>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="cleanup-list">
                                {items.map(item => (
                                    <div
                                        key={item.id}
                                        className={`cleanup-item ${selectedIds.has(item.id) ? 'selected' : ''}`}
                                        onClick={() => toggleSelect(item.id)}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(item.id)}
                                            onChange={() => toggleSelect(item.id)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        {searchType === 'videos' ? (
                                            <div className="item-info">
                                                <strong>{item.title || '(タイトルなし)'}</strong>
                                                <span className="item-meta">
                                                    {item.authorName} | {formatDate(item.startTime)}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="item-info">
                                                <strong>{item.eventName || item.eventId}</strong>
                                                <span className="item-meta">
                                                    過去枠: {item.pastSlots} / 未来枠: {item.futureSlots}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {items.length === 0 && !isSearching && (
                        <div className="card">
                            <div className="empty-state">
                                <FontAwesomeIcon icon={faExclamationTriangle} size="2x" />
                                <p>検索ボタンを押して過去のアイテムを検索してください</p>
                            </div>
                        </div>
                    )}
                </div>

                <Footer />
            </div>

            <style jsx>{`
                .cleanup-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    max-height: 60vh;
                    overflow-y: auto;
                }
                .cleanup-item {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 0.75rem 1rem;
                    background: var(--bg-secondary);
                    border-radius: 0.5rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .cleanup-item:hover {
                    background: var(--bg-hover);
                }
                .cleanup-item.selected {
                    background: var(--accent-soft);
                    border: 1px solid var(--accent);
                }
                .item-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }
                .item-meta {
                    font-size: 0.85rem;
                    color: var(--fg-muted);
                }
                .empty-state {
                    text-align: center;
                    padding: 3rem;
                    color: var(--fg-muted);
                }
                .empty-state svg {
                    margin-bottom: 1rem;
                }
            `}</style>
        </>
    );
}
