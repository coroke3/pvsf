// Admin History Page - View and restore operation logs
import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faHistory, faSpinner, faUndo, faFilter, faTrash,
    faVideo, faUsers, faCalendarAlt, faPlus, faEdit,
    faTimes, faCheck, faChevronLeft, faSearch
} from '@fortawesome/free-solid-svg-icons';
import Footer from '@/components/Footer';

interface OperationLog {
    id: string;
    targetCollection: string;
    targetDocId: string;
    operationType: 'create' | 'update' | 'delete';
    beforeData: Record<string, unknown> | null;
    afterData: Record<string, unknown> | null;
    operatedBy: string;
    timestamp: string;
    expiresAt: string;
    description?: string;
}

export default function AdminHistoryPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    const [logs, setLogs] = useState<OperationLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Filters
    const [collectionFilter, setCollectionFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [docIdFilter, setDocIdFilter] = useState('');

    // Restore state
    const [restoringId, setRestoringId] = useState<string | null>(null);
    const [isPurging, setIsPurging] = useState(false);

    // Detail view
    const [selectedLog, setSelectedLog] = useState<OperationLog | null>(null);

    // Check admin access
    useEffect(() => {
        if (!authLoading && (!isAuthenticated || (user as any)?.role !== 'admin')) {
            router.push('/');
        }
    }, [authLoading, isAuthenticated, user, router]);

    // Fetch logs
    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        setError('');

        try {
            const params = new URLSearchParams();
            if (collectionFilter) params.set('collection', collectionFilter);
            if (typeFilter) params.set('type', typeFilter);
            if (docIdFilter) params.set('docId', docIdFilter);
            params.set('limit', '100');

            const res = await fetch(`/api/admin/history?${params.toString()}`);
            if (!res.ok) {
                throw new Error('Failed to fetch logs');
            }

            const data = await res.json();
            setLogs(data);
        } catch (err) {
            setError('履歴の取得に失敗しました');
        } finally {
            setIsLoading(false);
        }
    }, [collectionFilter, typeFilter, docIdFilter]);

    useEffect(() => {
        if (isAuthenticated && (user as any)?.role === 'admin') {
            fetchLogs();
        }
    }, [isAuthenticated, user, fetchLogs]);

    // Restore from log
    const handleRestore = async (logId: string) => {
        if (!confirm('この操作を復元しますか？')) return;

        setRestoringId(logId);
        setError('');
        setSuccess('');

        try {
            const res = await fetch('/api/admin/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'restore', logId }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Restore failed');
            }

            setSuccess(`復元成功: ${data.restoredDocId}`);
            fetchLogs();
        } catch (err: any) {
            setError(err.message || '復元に失敗しました');
        } finally {
            setRestoringId(null);
        }
    };

    // Purge expired logs
    const handlePurge = async () => {
        if (!confirm('期限切れのログを削除しますか？')) return;

        setIsPurging(true);
        setError('');
        setSuccess('');

        try {
            const res = await fetch('/api/admin/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'purge' }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Purge failed');
            }

            setSuccess(`${data.deletedCount}件の期限切れログを削除しました`);
            fetchLogs();
        } catch (err: any) {
            setError(err.message || '削除に失敗しました');
        } finally {
            setIsPurging(false);
        }
    };

    // Get icon for collection
    const getCollectionIcon = (collection: string) => {
        switch (collection) {
            case 'videos': return faVideo;
            case 'users': return faUsers;
            case 'eventSlots': return faCalendarAlt;
            default: return faHistory;
        }
    };

    // Get icon for operation type
    const getOperationIcon = (type: string) => {
        switch (type) {
            case 'create': return faPlus;
            case 'update': return faEdit;
            case 'delete': return faTrash;
            default: return faHistory;
        }
    };

    // Get operation type class
    const getOperationClass = (type: string) => {
        switch (type) {
            case 'create': return 'op-create';
            case 'update': return 'op-update';
            case 'delete': return 'op-delete';
            default: return '';
        }
    };

    // Format timestamp
    const formatTime = (iso: string) => {
        const date = new Date(iso);
        return date.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (authLoading) {
        return (
            <div className="admin-loading">
                <FontAwesomeIcon icon={faSpinner} spin size="2x" />
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>操作履歴 - 管理画面</title>
            </Head>

            <div className="content">
                <div className="admin-header">
                    <Link href="/admin" className="back-link">
                        <FontAwesomeIcon icon={faChevronLeft} /> 管理画面
                    </Link>
                    <h2><FontAwesomeIcon icon={faHistory} /> 操作履歴</h2>
                </div>

                {/* Filters */}
                <div className="history-filters">
                    <div className="filter-group">
                        <label>コレクション</label>
                        <select
                            value={collectionFilter}
                            onChange={(e) => setCollectionFilter(e.target.value)}
                        >
                            <option value="">すべて</option>
                            <option value="videos">動画</option>
                            <option value="users">ユーザー</option>
                            <option value="eventSlots">枠</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>操作タイプ</label>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="">すべて</option>
                            <option value="create">作成</option>
                            <option value="update">更新</option>
                            <option value="delete">削除</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>ドキュメントID</label>
                        <input
                            type="text"
                            placeholder="検索..."
                            value={docIdFilter}
                            onChange={(e) => setDocIdFilter(e.target.value)}
                        />
                    </div>

                    <button
                        className="btn btn-secondary"
                        onClick={fetchLogs}
                        disabled={isLoading}
                    >
                        <FontAwesomeIcon icon={faSearch} /> 検索
                    </button>

                    <button
                        className="btn btn-danger"
                        onClick={handlePurge}
                        disabled={isPurging}
                    >
                        {isPurging ? (
                            <><FontAwesomeIcon icon={faSpinner} spin /> 削除中...</>
                        ) : (
                            <><FontAwesomeIcon icon={faTrash} /> 期限切れ削除</>
                        )}
                    </button>
                </div>

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

                {/* Logs List */}
                {isLoading ? (
                    <div className="loading-state">
                        <FontAwesomeIcon icon={faSpinner} spin /> 読み込み中...
                    </div>
                ) : logs.length === 0 ? (
                    <div className="empty-state">
                        操作履歴がありません
                    </div>
                ) : (
                    <div className="history-list">
                        {logs.map((log) => (
                            <div
                                key={log.id}
                                className={`history-item ${getOperationClass(log.operationType)}`}
                                onClick={() => setSelectedLog(log)}
                            >
                                <div className="history-icon">
                                    <FontAwesomeIcon icon={getCollectionIcon(log.targetCollection)} />
                                </div>
                                <div className="history-content">
                                    <div className="history-header">
                                        <span className={`operation-badge ${log.operationType}`}>
                                            <FontAwesomeIcon icon={getOperationIcon(log.operationType)} />
                                            {log.operationType === 'create' ? '作成' :
                                                log.operationType === 'update' ? '更新' : '削除'}
                                        </span>
                                        <span className="collection-name">{log.targetCollection}</span>
                                        <code className="doc-id">{log.targetDocId}</code>
                                    </div>
                                    <div className="history-meta">
                                        <span className="timestamp">{formatTime(log.timestamp)}</span>
                                        <span className="operator">by {log.operatedBy}</span>
                                    </div>
                                    {log.description && (
                                        <p className="history-description">{log.description}</p>
                                    )}
                                </div>
                                <div className="history-actions">
                                    {log.operationType !== 'create' && (
                                        <button
                                            className="btn btn-sm btn-restore"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRestore(log.id);
                                            }}
                                            disabled={restoringId === log.id}
                                        >
                                            {restoringId === log.id ? (
                                                <FontAwesomeIcon icon={faSpinner} spin />
                                            ) : (
                                                <><FontAwesomeIcon icon={faUndo} /> 復元</>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Detail Modal */}
                {selectedLog && (
                    <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
                        <div className="modal-content history-detail" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>操作詳細</h3>
                                <button onClick={() => setSelectedLog(null)} className="close-btn">
                                    <FontAwesomeIcon icon={faTimes} />
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="detail-info">
                                    <div className="detail-row">
                                        <span className="label">コレクション:</span>
                                        <span className="value">{selectedLog.targetCollection}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">ドキュメントID:</span>
                                        <code className="value">{selectedLog.targetDocId}</code>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">操作タイプ:</span>
                                        <span className={`operation-badge ${selectedLog.operationType}`}>
                                            {selectedLog.operationType}
                                        </span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">実行者:</span>
                                        <span className="value">{selectedLog.operatedBy}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">日時:</span>
                                        <span className="value">{formatTime(selectedLog.timestamp)}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">有効期限:</span>
                                        <span className="value">{formatTime(selectedLog.expiresAt)}</span>
                                    </div>
                                </div>

                                {selectedLog.beforeData && (
                                    <div className="data-section">
                                        <h4>変更前データ</h4>
                                        <pre>{JSON.stringify(selectedLog.beforeData, null, 2)}</pre>
                                    </div>
                                )}

                                {selectedLog.afterData && (
                                    <div className="data-section">
                                        <h4>変更後データ</h4>
                                        <pre>{JSON.stringify(selectedLog.afterData, null, 2)}</pre>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                {selectedLog.operationType !== 'create' && (
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => handleRestore(selectedLog.id)}
                                        disabled={restoringId === selectedLog.id}
                                    >
                                        <FontAwesomeIcon icon={faUndo} /> 復元
                                    </button>
                                )}
                                <button className="btn btn-secondary" onClick={() => setSelectedLog(null)}>
                                    閉じる
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <Footer />
            </div>

            <style jsx>{`
                .content {
                    padding: 2rem 1rem;
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .admin-header {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 2rem;
                }

                .admin-header h2 {
                    margin: 0;
                    color: var(--c-text);
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .back-link {
                    color: var(--c-muted);
                    text-decoration: none;
                    font-size: 1.1rem;
                    transition: color 0.2s;
                }

                .back-link:hover {
                    color: var(--c-primary);
                }

                .history-filters {
                    display: flex;
                    gap: 1rem;
                    flex-wrap: wrap;
                    padding: 1.5rem;
                    background: var(--bg-surface-2);
                    border: 1px solid var(--border-main);
                    border-radius: 12px;
                    margin-bottom: 2rem;
                    align-items: flex-end;
                }

                .filter-group {
                    flex: 1;
                    min-width: 200px;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .filter-group label {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: var(--c-muted);
                }

                .filter-group select,
                .filter-group input {
                    padding: 0.75rem;
                    border: 1px solid var(--border-main);
                    border-radius: 8px;
                    background: var(--bg-surface-1);
                    color: var(--c-text);
                    font-size: 0.95rem;
                }

                .filter-group select:focus,
                .filter-group input:focus {
                    outline: none;
                    border-color: var(--c-primary);
                }

                .filter-actions {
                    display: flex;
                    gap: 0.75rem;
                }

                .history-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .history-item {
                    display: flex;
                    gap: 1.25rem;
                    padding: 1.25rem;
                    background: var(--bg-surface-2);
                    border: 1px solid var(--border-main);
                    border-radius: 12px;
                    border-left: 4px solid var(--border-main);
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .history-item:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                }

                .history-item.op-create { border-left-color: var(--c-success); }
                .history-item.op-update { border-left-color: var(--c-primary); }
                .history-item.op-delete { border-left-color: var(--c-danger); }

                .history-icon {
                    font-size: 1.5rem;
                    color: var(--c-muted);
                    padding-top: 0.25rem;
                }

                .history-content {
                    flex: 1;
                    min-width: 0;
                }

                .history-header {
                    display: flex;
                    gap: 0.75rem;
                    align-items: center;
                    flex-wrap: wrap;
                    margin-bottom: 0.5rem;
                }

                .operation-badge {
                    font-size: 0.75rem;
                    padding: 0.25rem 0.6rem;
                    border-radius: 9999px;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .operation-badge.create { background: rgba(var(--c-success-rgb), 0.1); color: var(--c-success); }
                .operation-badge.update { background: rgba(var(--c-primary-rgb), 0.1); color: var(--c-primary); }
                .operation-badge.delete { background: rgba(var(--c-danger-rgb), 0.1); color: var(--c-danger); }

                .collection-name {
                    font-weight: 600;
                    color: var(--c-text);
                }

                .doc-id {
                    font-size: 0.8rem;
                    background: var(--bg-surface-1);
                    padding: 0.2rem 0.5rem;
                    border-radius: 4px;
                    font-family: monospace;
                    color: var(--c-muted);
                }

                .history-meta {
                    font-size: 0.85rem;
                    color: var(--c-muted);
                    display: flex;
                    gap: 0.5rem;
                    align-items: center;
                }

                .history-description {
                    margin: 0.5rem 0 0;
                    font-size: 0.95rem;
                    color: var(--c-text);
                    opacity: 0.8;
                }

                .history-actions {
                    display: flex;
                    align-items: center;
                }

                .btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.6rem 1.2rem;
                    border-radius: 8px;
                    border: none;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.9rem;
                }

                .btn-primary {
                    background: var(--c-primary);
                    color: white;
                }

                .btn-secondary {
                    background: var(--bg-surface-1);
                    color: var(--c-text);
                    border: 1px solid var(--border-main);
                }
                .btn-secondary:hover {
                    background: var(--c-surface);
                    border-color: var(--c-primary);
                }

                .btn-danger {
                    background: rgba(var(--c-danger-rgb), 0.1);
                    color: var(--c-danger);
                    border: 1px solid rgba(var(--c-danger-rgb), 0.2);
                }
                .btn-danger:hover {
                    background: var(--c-danger);
                    color: white;
                }

                .btn-restore {
                    background: var(--c-primary);
                    color: white;
                    font-size: 0.8rem;
                    padding: 0.4rem 0.8rem;
                }

                .btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                /* Modal */
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(4px);
                }

                .modal-content {
                    background: var(--bg-surface-2);
                    border: 1px solid var(--border-main);
                    border-radius: 16px;
                    width: 90%;
                    max-width: 700px;
                    max-height: 85vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.5rem;
                    border-bottom: 1px solid var(--border-main);
                }

                .modal-header h3 {
                    margin: 0;
                    color: var(--c-text);
                }

                .close-btn {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: var(--c-muted);
                    transition: color 0.2s;
                }
                .close-btn:hover {
                    color: var(--c-text);
                }

                .modal-body {
                    padding: 1.5rem;
                    overflow-y: auto;
                }

                .detail-info {
                    display: grid;
                    gap: 1rem;
                    margin-bottom: 2rem;
                    background: var(--bg-surface-1);
                    padding: 1.5rem;
                    border-radius: 12px;
                }

                .detail-row {
                    display: flex;
                    gap: 1rem;
                }

                .detail-row .label {
                    color: var(--c-muted);
                    width: 120px;
                    font-weight: 500;
                }

                .detail-row .value {
                    color: var(--c-text);
                    flex: 1;
                    font-family: monospace;
                }

                .data-section {
                    margin-top: 1.5rem;
                }

                .data-section h4 {
                    margin: 0 0 0.75rem;
                    color: var(--c-muted);
                    font-size: 0.9rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .data-section pre {
                    background: #1e1e1e; /* Keep code dark */
                    color: #e0e0e0;
                    padding: 1rem;
                    border-radius: 8px;
                    overflow-x: auto;
                    font-size: 0.85rem;
                    line-height: 1.5;
                    border: 1px solid var(--border-main);
                }

                .modal-footer {
                    padding: 1.5rem;
                    border-top: 1px solid var(--border-main);
                    display: flex;
                    gap: 1rem;
                    justify-content: flex-end;
                }

                .alert {
                    padding: 1rem;
                    border-radius: 8px;
                    margin-bottom: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .alert-error {
                    background: rgba(var(--c-danger-rgb), 0.1);
                    color: var(--c-danger);
                    border: 1px solid rgba(var(--c-danger-rgb), 0.2);
                }

                .alert-success {
                    background: rgba(var(--c-success-rgb), 0.1);
                    color: var(--c-success);
                    border: 1px solid rgba(var(--c-success-rgb), 0.2);
                }

                .loading-state, .empty-state {
                    padding: 3rem;
                    text-align: center;
                    color: var(--c-muted);
                    font-size: 1.1rem;
                }

                @media (max-width: 768px) {
                    .history-filters {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    
                    .filter-actions {
                        margin-top: 1rem;
                    }

                    .detail-row {
                        flex-direction: column;
                        gap: 0.25rem;
                    }
                    
                    .detail-row .label {
                        width: auto;
                        font-size: 0.85rem;
                    }
                }
            `}</style>
        </>
    );
}
