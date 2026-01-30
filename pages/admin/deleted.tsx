// Admin Deleted Items Management Page
import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTrash, faUndo, faSpinner, faCheck, faTimes,
    faVideo, faUser, faCalendarAlt, faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import Footer from '@/components/Footer';

interface DeletedItem {
    id: string;
    collection: 'videos' | 'users';
    title?: string;
    name?: string;
    deletedAt: string;
    deletedBy: string;
    daysSinceDeleted: number;
}

export default function AdminDeletedPage() {
    const router = useRouter();
    const { isAdmin, isLoading, isAuthenticated } = useAuth();

    const [items, setItems] = useState<DeletedItem[]>([]);
    const [isLoadingItems, setIsLoadingItems] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Filter state
    const [filterCollection, setFilterCollection] = useState<'all' | 'videos' | 'users'>('all');

    // Action state
    const [actionTarget, setActionTarget] = useState<{ item: DeletedItem; action: 'restore' | 'delete' } | null>(null);
    const [deleteConfirmCount, setDeleteConfirmCount] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (!isLoading && (!isAuthenticated || !isAdmin)) {
            router.push('/');
        }
    }, [isLoading, isAuthenticated, isAdmin, router]);

    const fetchItems = useCallback(async () => {
        setIsLoadingItems(true);
        try {
            const res = await fetch('/api/admin/deleted');
            if (res.ok) {
                const data = await res.json();
                setItems(data.items || []);
            } else {
                setError('削除済みデータの取得に失敗しました');
            }
        } catch (err) {
            setError('データ取得中にエラーが発生しました');
        } finally {
            setIsLoadingItems(false);
        }
    }, []);

    useEffect(() => {
        if (isAdmin) {
            fetchItems();
        }
    }, [isAdmin, fetchItems]);

    const handleRestore = async (item: DeletedItem) => {
        setIsProcessing(true);
        setError('');
        setSuccess('');

        try {
            const res = await fetch('/api/admin/deleted', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    collection: item.collection,
                    id: item.id,
                }),
            });

            if (res.ok) {
                setSuccess(`${item.title || item.name || item.id} を復元しました`);
                fetchItems();
            } else {
                const data = await res.json();
                setError(data.error || '復元に失敗しました');
            }
        } catch (err) {
            setError('復元中にエラーが発生しました');
        } finally {
            setIsProcessing(false);
            setActionTarget(null);
        }
    };

    const handlePermanentDelete = async () => {
        if (!actionTarget) return;

        const newCount = deleteConfirmCount + 1;
        setDeleteConfirmCount(newCount);

        // Need 3 confirmations for permanent delete
        if (newCount < 3) return;

        setIsProcessing(true);
        setError('');
        setSuccess('');

        try {
            const res = await fetch('/api/admin/deleted', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    collection: actionTarget.item.collection,
                    id: actionTarget.item.id,
                    force: true, // Allow deletion before 30 days
                }),
            });

            if (res.ok) {
                setSuccess(`${actionTarget.item.title || actionTarget.item.name || actionTarget.item.id} を完全に削除しました`);
                fetchItems();
            } else {
                const data = await res.json();
                setError(data.error || '削除に失敗しました');
            }
        } catch (err) {
            setError('削除中にエラーが発生しました');
        } finally {
            setIsProcessing(false);
            setActionTarget(null);
            setDeleteConfirmCount(0);
        }
    };

    const filteredItems = items.filter(item => {
        if (filterCollection === 'all') return true;
        return item.collection === filterCollection;
    });

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getCollectionIcon = (collection: string) => {
        switch (collection) {
            case 'videos': return faVideo;
            case 'users': return faUser;
            default: return faTrash;
        }
    };

    const getCollectionLabel = (collection: string) => {
        switch (collection) {
            case 'videos': return '動画';
            case 'users': return 'ユーザー';
            default: return collection;
        }
    };

    const getDaysColor = (days: number) => {
        if (days >= 25) return '#ef4444'; // Red - approaching deletion
        if (days >= 15) return '#f59e0b'; // Yellow - warning
        return '#4ade80'; // Green - safe
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
                <title>削除済みデータ管理 - Admin</title>
            </Head>

            <div className="admin-page">
                <div className="admin-header">
                    <h1><FontAwesomeIcon icon={faTrash} /> 削除済みデータ管理</h1>
                    <p>ソフトデリートされたデータを管理します（30日後に自動削除）</p>
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

                    {/* Filter */}
                    <div className="filter-bar">
                        <button
                            className={`filter-btn ${filterCollection === 'all' ? 'active' : ''}`}
                            onClick={() => setFilterCollection('all')}
                        >
                            すべて ({items.length})
                        </button>
                        <button
                            className={`filter-btn ${filterCollection === 'videos' ? 'active' : ''}`}
                            onClick={() => setFilterCollection('videos')}
                        >
                            <FontAwesomeIcon icon={faVideo} /> 動画 ({items.filter(i => i.collection === 'videos').length})
                        </button>
                        <button
                            className={`filter-btn ${filterCollection === 'users' ? 'active' : ''}`}
                            onClick={() => setFilterCollection('users')}
                        >
                            <FontAwesomeIcon icon={faUser} /> ユーザー ({items.filter(i => i.collection === 'users').length})
                        </button>
                    </div>

                    {/* Items List */}
                    <div className="card">
                        <h2>
                            <FontAwesomeIcon icon={faTrash} /> 削除済み一覧
                            <span className="badge">{filteredItems.length}件</span>
                        </h2>

                        {isLoadingItems ? (
                            <div className="loading">
                                <FontAwesomeIcon icon={faSpinner} spin /> 読み込み中...
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="empty-state">削除済みのデータはありません</div>
                        ) : (
                            <div className="deleted-list">
                                {filteredItems.map(item => (
                                    <div key={`${item.collection}-${item.id}`} className="deleted-item">
                                        <div className="item-icon">
                                            <FontAwesomeIcon icon={getCollectionIcon(item.collection)} />
                                        </div>
                                        <div className="item-info">
                                            <div className="item-title">
                                                {item.title || item.name || item.id}
                                            </div>
                                            <div className="item-meta">
                                                <span className="collection-badge">
                                                    {getCollectionLabel(item.collection)}
                                                </span>
                                                <span className="item-date">
                                                    <FontAwesomeIcon icon={faCalendarAlt} />
                                                    {formatDate(item.deletedAt)}
                                                </span>
                                                <span className="item-by">
                                                    削除者: {item.deletedBy}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="item-days" style={{ color: getDaysColor(item.daysSinceDeleted) }}>
                                            <span className="days-number">{item.daysSinceDeleted}</span>
                                            <span className="days-label">日経過</span>
                                            {item.daysSinceDeleted >= 25 && (
                                                <FontAwesomeIcon icon={faExclamationTriangle} className="warning-icon" />
                                            )}
                                        </div>
                                        <div className="item-actions">
                                            <button
                                                onClick={() => handleRestore(item)}
                                                disabled={isProcessing}
                                                className="btn btn-sm btn-secondary"
                                                title="復元"
                                            >
                                                <FontAwesomeIcon icon={faUndo} /> 復元
                                            </button>
                                            <button
                                                onClick={() => { setActionTarget({ item, action: 'delete' }); setDeleteConfirmCount(0); }}
                                                disabled={isProcessing}
                                                className="btn btn-sm btn-danger"
                                                title="完全削除"
                                            >
                                                <FontAwesomeIcon icon={faTrash} /> 完全削除
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Delete Confirmation Modal */}
                    {actionTarget?.action === 'delete' && (
                        <div className="modal-overlay" onClick={() => { setActionTarget(null); setDeleteConfirmCount(0); }}>
                            <div className="modal delete-modal" onClick={(e) => e.stopPropagation()}>
                                <h2><FontAwesomeIcon icon={faExclamationTriangle} /> 完全削除の確認</h2>
                                
                                <div className="delete-warning severe">
                                    <p><strong>警告:</strong> この操作は取り消せません！</p>
                                    <p>「{actionTarget.item.title || actionTarget.item.name || actionTarget.item.id}」を<br />
                                    データベースから完全に削除しますか？</p>
                                </div>

                                <div className="delete-progress">
                                    <span className={deleteConfirmCount >= 1 ? 'active' : ''}>1回目</span>
                                    <span className={deleteConfirmCount >= 2 ? 'active' : ''}>2回目</span>
                                    <span className={deleteConfirmCount >= 3 ? 'active' : ''}>3回目</span>
                                </div>

                                <div className="modal-actions">
                                    <button 
                                        onClick={() => { setActionTarget(null); setDeleteConfirmCount(0); }} 
                                        className="btn btn-secondary"
                                    >
                                        キャンセル
                                    </button>
                                    <button 
                                        onClick={handlePermanentDelete}
                                        disabled={isProcessing}
                                        className="btn btn-danger"
                                    >
                                        {isProcessing ? (
                                            <><FontAwesomeIcon icon={faSpinner} spin /> 削除中...</>
                                        ) : (
                                            <>完全削除 ({3 - deleteConfirmCount}回クリック)</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Footer />

            <style jsx>{`
                .filter-bar {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 1.5rem;
                    flex-wrap: wrap;
                }

                .filter-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    color: #8892b0;
                    font-size: 0.875rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .filter-btn:hover {
                    background: rgba(255, 255, 255, 0.08);
                    color: #fff;
                }

                .filter-btn.active {
                    background: rgba(100, 255, 218, 0.1);
                    border-color: rgba(100, 255, 218, 0.3);
                    color: #64ffda;
                }

                .deleted-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .deleted-item {
                    display: grid;
                    grid-template-columns: 44px 1fr auto auto;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem;
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    border-radius: 8px;
                    backdrop-filter: blur(10px);
                    transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
                }

                .deleted-item:hover {
                    background: rgba(255, 255, 255, 0.04);
                    border-color: rgba(255, 255, 255, 0.12);
                    transform: translateY(-1px);
                }

                .item-icon {
                    width: 44px;
                    height: 44px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 8px;
                    color: #8892b0;
                }

                .item-info {
                    flex: 1;
                    min-width: 0;
                }

                .item-title {
                    font-weight: 500;
                    color: #fff;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .item-meta {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-top: 0.25rem;
                    font-size: 0.8rem;
                    color: #6b7280;
                    flex-wrap: wrap;
                }

                .collection-badge {
                    padding: 0.125rem 0.5rem;
                    background: rgba(100, 255, 218, 0.1);
                    color: #64ffda;
                    border-radius: 4px;
                    font-size: 0.7rem;
                    border: 1px solid rgba(100, 255, 218, 0.18);
                }

                .item-date {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                }

                .item-days {
                    display: grid;
                    place-items: center;
                    width: 72px;
                    height: 72px;
                    border-radius: 16px;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    text-align: center;
                    position: relative;
                }

                .days-number {
                    font-size: 1.6rem;
                    font-weight: 700;
                    line-height: 1;
                }

                .days-label {
                    font-size: 0.7rem;
                    opacity: 0.8;
                }

                .warning-icon {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    animation: pulse 1s infinite;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

                .item-actions {
                    display: flex;
                    gap: 0.5rem;
                    justify-content: flex-end;
                    flex-wrap: wrap;
                }

                .delete-warning.severe {
                    background: rgba(239, 68, 68, 0.2);
                    border-color: rgba(239, 68, 68, 0.4);
                }

                .delete-warning.severe p {
                    color: #fca5a5;
                }

                .delete-progress {
                    display: flex;
                    justify-content: center;
                    gap: 1rem;
                    margin: 1rem 0;
                }

                .delete-progress span {
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    background: rgba(255, 255, 255, 0.05);
                    color: #6b7280;
                }

                .delete-progress span.active {
                    background: rgba(239, 68, 68, 0.2);
                    color: #f87171;
                }

                @media screen and (max-width: 768px) {
                    .deleted-item {
                        grid-template-columns: 44px 1fr;
                        grid-template-rows: auto auto auto;
                        align-items: start;
                    }

                    .item-days {
                        width: 100%;
                        height: auto;
                        grid-column: 1 / -1;
                        display: flex;
                        flex-direction: row;
                        justify-content: flex-start;
                        gap: 0.5rem;
                        padding: 0.75rem;
                        border-radius: 12px;
                    }

                    .item-actions {
                        grid-column: 1 / -1;
                        justify-content: flex-end;
                        margin-top: 0.25rem;
                    }
                }
            `}</style>
        </>
    );
}
