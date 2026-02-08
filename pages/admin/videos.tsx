// Admin Videos Management Page
import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faVideo, faSearch, faEdit, faTrash,
    faSpinner, faCheck, faTimes,
    faEye, faThumbsUp, faExternalLinkAlt, faUser, faPlus, faKeyboard,
    faSort, faSortUp, faSortDown, faFilter,
    faTable, faList, faFileExport, faFileCsv, faFileCode, faDownload, faUpload, faTrashRestore
} from '@fortawesome/free-solid-svg-icons';
import Footer from '@/components/Footer';
import type { VideoMember } from '@/types/video';
import { useInfiniteVideos } from '@/hooks/useInfiniteVideos';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

// Role options for member editing
const ROLE_OPTIONS = ['映像', '音楽', 'イラスト', 'CG', 'リリック'];

// Sort options
type SortField = 'title' | 'authorName' | 'startTime' | 'viewCount' | 'likeCount';
type SortOrder = 'asc' | 'desc';

interface Video {
    id: string;
    title: string;
    videoUrl: string;
    authorXid: string;
    authorName: string;
    authorIconUrl?: string;
    eventIds: string[]; // Array of event IDs
    startTime: string;
    viewCount: number;
    likeCount: number;
    slotId: string | null;
    privacyStatus: string;
    isDeleted?: boolean;
}

interface EditingVideo {
    id: string;
    title: string;
    description: string;
    music: string;
    credit: string;
    type: string;
    type2: string;
    authorXid: string;
    authorName: string;
    authorIconUrl: string;
    authorChannelUrl: string;
    eventIds: string[];
    startTime: string;
    musicUrl: string;
    otherSns: string;
    rightType: string;
    software: string;
    beforeComment: string;
    afterComment: string;
    listen: string;
    episode: string;
    endMessage: string;
    members: VideoMember[];
}

export default function AdminVideosPage() {
    const router = useRouter();
    const { isAdmin, isLoading, isAuthenticated } = useAuth();
    const searchInputRef = useRef<HTMLInputElement>(null);

    const [showDeleted, setShowDeleted] = useState(false);
    const [success, setSuccess] = useState(''); // Moved up for use in handler
    const [error, setError] = useState('');     // Moved up for use in handler

    // 無限スクロール用のフック定義の前にハンドラが必要かは微妙だが、refreshVideosを使うなら後で定義する必要がある。
    // しかし showDeleted はフックに渡す必要がある。
    // success/error はハンドラ内で使う。
    // refreshVideos はフックから返る。
    // 循環依存...
    // 解決策: showDeleted だけ先に定義。handleRestore はフックの後で定義（refreshVideosを使うため）。
    // 今回のエラーは `includeDeleted: showDeleted` で showDeleted が未定義だったこと。

    // 無限スクロール用のフック
    const {
        videos: infiniteVideos,
        isLoading: isLoadingVideos,
        isLoadingMore,
        hasMore,
        error: videosError,
        loadMore,
        refresh: refreshVideos,
    } = useInfiniteVideos({
        limit: 15,
        enabled: isAdmin,
        includeDeleted: showDeleted,
    });

    const [videos, setVideos] = useState<Video[]>([]);
    const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
    const [editingVideo, setEditingVideo] = useState<EditingVideo | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    const [showShortcuts, setShowShortcuts] = useState(false);
    const [showEventFilter, setShowEventFilter] = useState(false);

    // Sort state
    const [sortField, setSortField] = useState<SortField>('startTime');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    // View & Export state
    const [viewMode, setViewMode] = useState<'list' | 'table'>('list');
    const [showExportMenu, setShowExportMenu] = useState(false);



    const handleRestore = async (video: Video) => {
        if (!confirm('この動画を復元しますか？')) return;
        try {
            const res = await fetch(`/api/videos/${video.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ restore: true }),
            });
            if (res.ok) {
                setSuccess('動画を復元しました');
                refreshVideos();
            } else {
                setError('復元に失敗しました');
            }
        } catch (err) {
            setError('復元に失敗しました');
        }
    };

    const handleExport = (format: 'json' | 'csv' | 'tsv') => {
        let content = '';
        let mimeType = '';
        let extension = '';

        const dataToExport = filteredVideos.length > 0 ? filteredVideos : videos;

        if (format === 'json') {
            content = JSON.stringify(dataToExport, null, 2);
            mimeType = 'application/json';
            extension = 'json';
        } else if (format === 'csv') {
            const headers = ['id', 'title', 'authorName', 'authorXid', 'eventIds', 'startTime', 'privacyStatus', 'viewCount', 'likeCount'];
            const headerRow = headers.join(',');
            const rows = dataToExport.map(v => {
                return headers.map(h => {
                    const val = v[h as keyof Video];
                    if (Array.isArray(val)) return `"${val.join(',')}"`;
                    return `"${String(val || '').replace(/"/g, '""')}"`;
                }).join(',');
            });
            content = [headerRow, ...rows].join('\n');
            mimeType = 'text/csv';
            extension = 'csv';
        } else if (format === 'tsv') {
            // Internal Schema TSV (Comma separated arrays)
            const headers = ['id', 'title', 'authorName', 'authorXid', 'eventIds', 'startTime', 'privacyStatus', 'viewCount', 'likeCount'];
            const headerRow = headers.join('\t');
            const rows = dataToExport.map(v => {
                return headers.map(h => {
                    const val = v[h as keyof Video];
                    if (Array.isArray(val)) return val.join(',');
                    return String(val || '').replace(/\t/g, '    ').replace(/\n/g, ' ');
                }).join('\t');
            });
            content = [headerRow, ...rows].join('\n');
            mimeType = 'text/tab-separated-values';
            extension = 'tsv';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pvsf_videos_${new Date().toISOString().slice(0, 10)}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setShowExportMenu(false);
    };

    // Bulk member input
    const [bulkMemberInput, setBulkMemberInput] = useState('');

    // 無限スクロール用のセンチネル要素
    const sentinelRef = useInfiniteScroll({
        onLoadMore: loadMore,
        hasMore,
        isLoading: isLoadingMore,
        threshold: 300,
    });

    useEffect(() => {
        if (!isLoading && (!isAuthenticated || !isAdmin)) {
            router.push('/');
        }
    }, [isLoading, isAuthenticated, isAdmin, router]);

    // Parse bulk member input (spreadsheet format: name<tab>xid or name,xid)
    const parseBulkMembers = () => {
        if (!editingVideo || !bulkMemberInput.trim()) return;

        const lines = bulkMemberInput.trim().split('\n');
        const newMembers: VideoMember[] = [];

        for (const line of lines) {
            if (!line.trim()) continue;
            // Support both tab and comma as delimiter
            const parts = line.includes('\t') ? line.split('\t') : line.split(',');
            const name = parts[0]?.trim() || '';
            const xid = parts[1]?.trim() || '';
            const role = parts[2]?.trim() || '';

            if (name || xid) {
                newMembers.push({
                    name,
                    xid,
                    role,
                    editApproved: false
                });
            }
        }

        if (newMembers.length > 0) {
            setEditingVideo({
                ...editingVideo,
                members: [...editingVideo.members, ...newMembers]
            });
            setBulkMemberInput('');
        }
    };

    // Apply role to all members
    const applyRoleToAll = (role: string, checked: boolean) => {
        if (!editingVideo) return;
        const newMembers = editingVideo.members.map(member => {
            const roles = member.role ? member.role.split(',').map(r => r.trim()).filter(Boolean) : [];
            if (checked && !roles.includes(role)) {
                roles.push(role);
            } else if (!checked) {
                const idx = roles.indexOf(role);
                if (idx !== -1) roles.splice(idx, 1);
            }
            return { ...member, role: roles.join(', ') };
        });
        setEditingVideo({ ...editingVideo, members: newMembers });
    };

    // 無限スクロールから取得した動画をvideosステートに反映
    useEffect(() => {
        if (infiniteVideos.length > 0) {
            setVideos(infiniteVideos);
        }
    }, [infiniteVideos]);

    // エラーハンドリング
    useEffect(() => {
        if (videosError) {
            setError(videosError);
        }
    }, [videosError]);

    useEffect(() => {
        let result = videos;

        // Text search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(v =>
                v.title.toLowerCase().includes(query) ||
                v.authorXid.toLowerCase().includes(query) ||
                v.authorName.toLowerCase().includes(query)
            );
        }

        // Event checkbox filter (if any events selected)
        if (selectedEvents.size > 0) {
            result = result.filter(v =>
                v.eventIds.some(eventId => selectedEvents.has(eventId))
            );
        }

        // Sort
        result = [...result].sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case 'title':
                    comparison = (a.title || '').toString().localeCompare((b.title || '').toString(), 'ja');
                    break;
                case 'authorName':
                    comparison = a.authorName.localeCompare(b.authorName, 'ja');
                    break;
                case 'startTime':
                    comparison = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
                    break;
                case 'viewCount':
                    comparison = a.viewCount - b.viewCount;
                    break;
                case 'likeCount':
                    comparison = a.likeCount - b.likeCount;
                    break;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        setFilteredVideos(result);
    }, [videos, searchQuery, selectedEvents, sortField, sortOrder]);

    // Toggle event filter
    const toggleEventFilter = (eventId: string) => {
        setSelectedEvents(prev => {
            const newSet = new Set(prev);
            if (newSet.has(eventId)) {
                newSet.delete(eventId);
            } else {
                newSet.add(eventId);
            }
            return newSet;
        });
    };

    // Toggle sort
    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    // Clear all filters
    const clearFilters = () => {
        setSearchQuery('');
        setSelectedEvents(new Set());
    };

    function extractYouTubeId(url: string): string | null {
        if (!url) return null;
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        return match ? match[1] : null;
    }

    // Safely parse date from various formats
    const parseDate = (value: any): string => {
        if (!value) return '';
        try {
            // Handle Firestore Timestamp
            if (value._seconds !== undefined) {
                const date = new Date(value._seconds * 1000);
                return date.toISOString().slice(0, 16);
            }
            // Handle regular date
            const date = new Date(value);
            if (isNaN(date.getTime())) return '';
            return date.toISOString().slice(0, 16);
        } catch {
            return '';
        }
    };

    const startEdit = async (video: Video) => {
        setError('');
        try {
            const res = await fetch(`/api/videos/${video.id}`);
            if (res.ok) {
                const data = await res.json();
                setEditingVideo({
                    id: video.id,
                    title: data.title || '',
                    description: data.description || '',
                    music: data.music || '',
                    credit: data.credit || '',
                    type: data.type || '',
                    type2: data.type2 || '',
                    authorXid: data.authorXid || '',
                    authorName: data.authorName || '',
                    authorIconUrl: data.authorIconUrl || '',
                    authorChannelUrl: data.authorChannelUrl || '',
                    eventIds: Array.isArray(data.eventIds) ? data.eventIds : [],
                    startTime: parseDate(data.startTime),
                    musicUrl: data.musicUrl || '',
                    otherSns: data.otherSns || '',
                    rightType: data.rightType || '',
                    software: data.software || '',
                    beforeComment: data.beforeComment || '',
                    afterComment: data.afterComment || '',
                    listen: data.listen || '',
                    episode: data.episode || '',
                    endMessage: data.endMessage || '',
                    members: Array.isArray(data.members) ? data.members : [],
                });
            } else {
                const errorData = await res.json();
                setError(errorData.error || '動画情報の取得に失敗しました');
            }
        } catch (err) {
            setError('動画情報の取得に失敗しました');
        }
    };

    const saveEdit = useCallback(async () => {
        if (!editingVideo) return;

        setIsEditing(true);
        setError('');
        setSuccess('');

        try {
            const res = await fetch(`/api/videos/${editingVideo.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: editingVideo.title,
                    description: editingVideo.description,
                    music: editingVideo.music,
                    credit: editingVideo.credit,
                    type: editingVideo.type,
                    type2: editingVideo.type2,
                    authorXid: editingVideo.authorXid,
                    authorName: editingVideo.authorName,
                    authorIconUrl: editingVideo.authorIconUrl,
                    authorChannelUrl: editingVideo.authorChannelUrl,
                    eventIds: editingVideo.eventIds,
                    startTime: editingVideo.startTime ? new Date(editingVideo.startTime) : undefined,
                    musicUrl: editingVideo.musicUrl,
                    otherSns: editingVideo.otherSns,
                    rightType: editingVideo.rightType,
                    software: editingVideo.software,
                    beforeComment: editingVideo.beforeComment,
                    afterComment: editingVideo.afterComment,
                    listen: editingVideo.listen,
                    episode: editingVideo.episode,
                    endMessage: editingVideo.endMessage,
                    members: editingVideo.members,
                })
            });

            if (res.ok) {
                setSuccess('動画を更新しました');
                setEditingVideo(null);
                refreshVideos();
            } else {
                const data = await res.json();
                setError(data.error || '更新に失敗しました');
            }
        } catch (err) {
            setError('更新中にエラーが発生しました');
        } finally {
            setIsEditing(false);
        }
    }, [editingVideo, refreshVideos]);

    // Delete confirmation state (3 confirmations required)
    const [deleteTarget, setDeleteTarget] = useState<Video | null>(null);
    const [deleteConfirmCount, setDeleteConfirmCount] = useState(0);

    const startDeleteProcess = (video: Video) => {
        setDeleteTarget(video);
        setDeleteConfirmCount(0);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;

        const newCount = deleteConfirmCount + 1;
        setDeleteConfirmCount(newCount);

        // Need 3 confirmations
        if (newCount < 3) {
            return;
        }

        // Third confirmation - proceed with delete
        setError('');
        setSuccess('');

        try {
            const res = await fetch(`/api/videos/${deleteTarget.id}`, { method: 'DELETE' });

            if (res.ok) {
                setSuccess('動画を削除しました');
                setDeleteTarget(null);
                setDeleteConfirmCount(0);
                refreshVideos();
            } else {
                const data = await res.json();
                setError(data.error || '削除に失敗しました');
            }
        } catch (err) {
            setError('削除中にエラーが発生しました');
        }
    };

    const cancelDelete = () => {
        setDeleteTarget(null);
        setDeleteConfirmCount(0);
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger shortcuts when typing in inputs
            const target = e.target as HTMLElement;
            const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

            // Escape - close modals
            if (e.key === 'Escape') {
                if (editingVideo) {
                    setEditingVideo(null);
                    e.preventDefault();
                } else if (deleteTarget) {
                    cancelDelete();
                    e.preventDefault();
                } else if (showShortcuts) {
                    setShowShortcuts(false);
                    e.preventDefault();
                } else if (isInputFocused && searchQuery) {
                    setSearchQuery('');
                    (target as HTMLInputElement).blur();
                    e.preventDefault();
                }
                return;
            }

            // Skip other shortcuts if input is focused
            if (isInputFocused) return;

            // / - Focus search
            if (e.key === '/' || (e.key === 'f' && (e.ctrlKey || e.metaKey))) {
                e.preventDefault();
                searchInputRef.current?.focus();
                return;
            }

            // ? - Show shortcuts help
            if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
                e.preventDefault();
                setShowShortcuts(prev => !prev);
                return;
            }

            // Ctrl/Cmd + S - Save (when editing)
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                if (editingVideo && !isEditing) {
                    e.preventDefault();
                    saveEdit();
                }
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [editingVideo, deleteTarget, searchQuery, isEditing, showShortcuts, saveEdit]);

    // Collect all unique events from all videos
    const uniqueEvents = Array.from(new Set(videos.flatMap(v => v.eventIds).filter(Boolean)));

    const formatDate = (isoString: string) => {
        try {
            return new Date(isoString).toLocaleDateString('ja-JP');
        } catch {
            return isoString;
        }
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
                <title>動画管理 - Admin</title>
            </Head>

            <div className="admin-page">
                <div className="admin-header">
                    <h1><FontAwesomeIcon icon={faVideo} /> 動画管理</h1>
                    <p>登録済みの動画を管理します</p>
                </div>

                <div className="admin-content">
                    {/* Search & Filters */}
                    <div className="filters-bar">
                        <div className="search-box">
                            <FontAwesomeIcon icon={faSearch} />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="タイトル、XID、投稿者名で検索 (/)"
                                className="search-input"
                            />
                        </div>
                        <button
                            className={`filter-btn ${showEventFilter ? 'active' : ''} ${selectedEvents.size > 0 ? 'has-filter' : ''}`}
                            onClick={() => setShowEventFilter(!showEventFilter)}
                        >
                            <FontAwesomeIcon icon={faFilter} />
                            イベント
                            {selectedEvents.size > 0 && <span className="filter-count">{selectedEvents.size}</span>}
                        </button>
                        <div className="sort-controls">
                            <span className="sort-label">並び替え:</span>
                            <button
                                className={`sort-btn ${sortField === 'startTime' ? 'active' : ''}`}
                                onClick={() => toggleSort('startTime')}
                            >
                                日時
                                {sortField === 'startTime' && (
                                    <FontAwesomeIcon icon={sortOrder === 'asc' ? faSortUp : faSortDown} />
                                )}
                            </button>
                            <button
                                className={`sort-btn ${sortField === 'title' ? 'active' : ''}`}
                                onClick={() => toggleSort('title')}
                            >
                                タイトル
                                {sortField === 'title' && (
                                    <FontAwesomeIcon icon={sortOrder === 'asc' ? faSortUp : faSortDown} />
                                )}
                            </button>
                            <button
                                className={`sort-btn ${sortField === 'viewCount' ? 'active' : ''}`}
                                onClick={() => toggleSort('viewCount')}
                            >
                                <FontAwesomeIcon icon={faEye} />
                                {sortField === 'viewCount' && (
                                    <FontAwesomeIcon icon={sortOrder === 'asc' ? faSortUp : faSortDown} />
                                )}
                            </button>
                            <button
                                className={`sort-btn ${sortField === 'likeCount' ? 'active' : ''}`}
                                onClick={() => toggleSort('likeCount')}
                            >
                                <FontAwesomeIcon icon={faThumbsUp} />
                                {sortField === 'likeCount' && (
                                    <FontAwesomeIcon icon={sortOrder === 'asc' ? faSortUp : faSortDown} />
                                )}
                            </button>
                        </div>
                        {(searchQuery || selectedEvents.size > 0) && (
                            <button className="clear-filters-btn" onClick={clearFilters}>
                                <FontAwesomeIcon icon={faTimes} /> クリア
                            </button>
                        )}
                    </div>

                    {/* Event Filter Dropdown */}
                    {showEventFilter && (
                        <div className="event-filter-panel">
                            <div className="event-filter-header">
                                <span>イベントで絞り込み</span>
                                <button
                                    className="select-all-btn"
                                    onClick={() => {
                                        if (selectedEvents.size === uniqueEvents.length) {
                                            setSelectedEvents(new Set());
                                        } else {
                                            setSelectedEvents(new Set(uniqueEvents));
                                        }
                                    }}
                                >
                                    {selectedEvents.size === uniqueEvents.length ? '全解除' : '全選択'}
                                </button>
                            </div>
                            <div className="event-checkboxes">
                                {uniqueEvents.map(event => (
                                    <label key={event} className="event-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={selectedEvents.has(event)}
                                            onChange={() => toggleEventFilter(event)}
                                        />
                                        <span className="event-name">{event}</span>
                                        <span className="event-count">
                                            ({videos.filter(v => v.eventIds.includes(event)).length})
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Results count */}
                    <div className="results-info">
                        <span>{filteredVideos.length} / {videos.length} 件</span>
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

                    {/* Edit Modal */}
                    {editingVideo && (
                        <div className="modal-overlay" onClick={() => setEditingVideo(null)}>
                            <div className="modal" onClick={(e) => e.stopPropagation()}>
                                <h2>動画を編集</h2>
                                <div className="form-group">
                                    <label>タイトル</label>
                                    <input
                                        type="text"
                                        value={editingVideo.title}
                                        onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })}
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>説明</label>
                                    <textarea
                                        value={editingVideo.description}
                                        onChange={(e) => setEditingVideo({ ...editingVideo, description: e.target.value })}
                                        rows={3}
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>投稿者XID</label>
                                        <input
                                            type="text"
                                            value={editingVideo.authorXid}
                                            onChange={(e) => setEditingVideo({ ...editingVideo, authorXid: e.target.value })}
                                            className="form-input"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>投稿者名</label>
                                        <input
                                            type="text"
                                            value={editingVideo.authorName}
                                            onChange={(e) => setEditingVideo({ ...editingVideo, authorName: e.target.value })}
                                            className="form-input"
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>楽曲</label>
                                    <input
                                        type="text"
                                        value={editingVideo.music}
                                        onChange={(e) => setEditingVideo({ ...editingVideo, music: e.target.value })}
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>クレジット</label>
                                    <textarea
                                        value={editingVideo.credit}
                                        onChange={(e) => setEditingVideo({ ...editingVideo, credit: e.target.value })}
                                        rows={2}
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>形態</label>
                                        <select
                                            value={editingVideo.type}
                                            onChange={(e) => setEditingVideo({ ...editingVideo, type: e.target.value })}
                                            className="form-input"
                                        >
                                            <option value="">未選択</option>
                                            <option value="個人">個人</option>
                                            <option value="団体">団体</option>
                                            <option value="混合">混合</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>参加区分</label>
                                        <select
                                            value={editingVideo.type2}
                                            onChange={(e) => setEditingVideo({ ...editingVideo, type2: e.target.value })}
                                            className="form-input"
                                        >
                                            <option value="">未選択</option>
                                            <option value="一般">一般</option>
                                            <option value="ビギナー">ビギナー</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Additional Admin Fields */}
                                <div className="form-section-divider">
                                    <span>管理者専用フィールド</span>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>イベントID（カンマ区切り）</label>
                                        <input
                                            type="text"
                                            value={editingVideo.eventIds.join(', ')}
                                            onChange={(e) => {
                                                const eventIds = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                                setEditingVideo({ ...editingVideo, eventIds });
                                            }}
                                            className="form-input"
                                            placeholder="例: PVSF2025S, PVSF2024S"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>公開日時</label>
                                        <input
                                            type="datetime-local"
                                            value={editingVideo.startTime}
                                            onChange={(e) => setEditingVideo({ ...editingVideo, startTime: e.target.value })}
                                            className="form-input"
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>アイコンURL</label>
                                        <input
                                            type="text"
                                            value={editingVideo.authorIconUrl}
                                            onChange={(e) => setEditingVideo({ ...editingVideo, authorIconUrl: e.target.value })}
                                            className="form-input"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>チャンネルURL</label>
                                        <input
                                            type="text"
                                            value={editingVideo.authorChannelUrl}
                                            onChange={(e) => setEditingVideo({ ...editingVideo, authorChannelUrl: e.target.value })}
                                            className="form-input"
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>楽曲URL</label>
                                        <input
                                            type="text"
                                            value={editingVideo.musicUrl}
                                            onChange={(e) => setEditingVideo({ ...editingVideo, musicUrl: e.target.value })}
                                            className="form-input"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>その他SNS</label>
                                        <input
                                            type="text"
                                            value={editingVideo.otherSns}
                                            onChange={(e) => setEditingVideo({ ...editingVideo, otherSns: e.target.value })}
                                            className="form-input"
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>使用ソフト</label>
                                        <input
                                            type="text"
                                            value={editingVideo.software}
                                            onChange={(e) => setEditingVideo({ ...editingVideo, software: e.target.value })}
                                            className="form-input"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>権利タイプ</label>
                                        <input
                                            type="text"
                                            value={editingVideo.rightType}
                                            onChange={(e) => setEditingVideo({ ...editingVideo, rightType: e.target.value })}
                                            className="form-input"
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>前コメント</label>
                                    <textarea
                                        value={editingVideo.beforeComment}
                                        onChange={(e) => setEditingVideo({ ...editingVideo, beforeComment: e.target.value })}
                                        rows={2}
                                        className="form-input"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>後コメント</label>
                                    <textarea
                                        value={editingVideo.afterComment}
                                        onChange={(e) => setEditingVideo({ ...editingVideo, afterComment: e.target.value })}
                                        rows={2}
                                        className="form-input"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>聞いてほしいこと等</label>
                                    <textarea
                                        value={editingVideo.listen}
                                        onChange={(e) => setEditingVideo({ ...editingVideo, listen: e.target.value })}
                                        rows={2}
                                        className="form-input"
                                        placeholder="作品のこだわりポイントなど"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>最近のエピソード</label>
                                    <textarea
                                        value={editingVideo.episode}
                                        onChange={(e) => setEditingVideo({ ...editingVideo, episode: e.target.value })}
                                        rows={2}
                                        className="form-input"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>最後に</label>
                                    <textarea
                                        value={editingVideo.endMessage}
                                        onChange={(e) => setEditingVideo({ ...editingVideo, endMessage: e.target.value })}
                                        rows={2}
                                        className="form-input"
                                    />
                                </div>

                                {/* Members Section */}
                                <div className="form-section-divider">
                                    <span>メンバー ({editingVideo.members.length}人)</span>
                                </div>

                                {/* Bulk Member Input */}
                                <div className="bulk-member-section">
                                    <label>スプレッドシートから一括入力</label>
                                    <textarea
                                        value={bulkMemberInput}
                                        onChange={(e) => setBulkMemberInput(e.target.value)}
                                        placeholder="名前&#9;XID&#9;役職（タブ区切りまたはカンマ区切り）&#10;例:&#10;山田太郎&#9;@yamada&#9;映像&#10;佐藤花子&#9;@sato&#9;音楽"
                                        rows={3}
                                        className="form-input bulk-input"
                                    />
                                    <button
                                        type="button"
                                        onClick={parseBulkMembers}
                                        className="btn btn-secondary btn-sm"
                                        disabled={!bulkMemberInput.trim()}
                                    >
                                        <FontAwesomeIcon icon={faPlus} /> 一括追加
                                    </button>
                                </div>

                                {/* Bulk Role Actions */}
                                {editingVideo.members.length > 0 && (
                                    <div className="bulk-role-section">
                                        <span className="bulk-role-label">全員に役職を設定:</span>
                                        <div className="bulk-role-checkboxes">
                                            {ROLE_OPTIONS.map((role) => {
                                                const allHaveRole = editingVideo.members.every(m =>
                                                    m.role?.split(',').map(r => r.trim()).includes(role)
                                                );
                                                return (
                                                    <label key={role} className="role-checkbox-small">
                                                        <input
                                                            type="checkbox"
                                                            checked={allHaveRole}
                                                            onChange={(e) => applyRoleToAll(role, e.target.checked)}
                                                        />
                                                        <span>{role}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Member List */}
                                <div className="members-list">
                                    {editingVideo.members.map((member, index) => (
                                        <div key={index} className="member-edit-row">
                                            <div className="member-inputs">
                                                <input
                                                    type="text"
                                                    value={member.name}
                                                    onChange={(e) => {
                                                        const newMembers = [...editingVideo.members];
                                                        newMembers[index] = { ...member, name: e.target.value };
                                                        setEditingVideo({ ...editingVideo, members: newMembers });
                                                    }}
                                                    placeholder="名前"
                                                    className="form-input member-name-input"
                                                />
                                                <input
                                                    type="text"
                                                    value={member.xid}
                                                    onChange={(e) => {
                                                        const newMembers = [...editingVideo.members];
                                                        newMembers[index] = { ...member, xid: e.target.value };
                                                        setEditingVideo({ ...editingVideo, members: newMembers });
                                                    }}
                                                    placeholder="XID"
                                                    className="form-input member-xid-input"
                                                />
                                            </div>
                                            <div className="member-roles">
                                                {ROLE_OPTIONS.map((role) => {
                                                    const roles = member.role ? member.role.split(',').map(r => r.trim()) : [];
                                                    const hasRole = roles.includes(role);
                                                    return (
                                                        <label key={role} className="role-checkbox-small">
                                                            <input
                                                                type="checkbox"
                                                                checked={hasRole}
                                                                onChange={(e) => {
                                                                    const newMembers = [...editingVideo.members];
                                                                    let newRoles = roles.filter(r => r !== role);
                                                                    if (e.target.checked) {
                                                                        newRoles.push(role);
                                                                    }
                                                                    newMembers[index] = { ...member, role: newRoles.join(', ') };
                                                                    setEditingVideo({ ...editingVideo, members: newMembers });
                                                                }}
                                                            />
                                                            <span>{role}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                            <div className="member-actions">
                                                <label className="approve-checkbox">
                                                    <input
                                                        type="checkbox"
                                                        checked={member.editApproved || false}
                                                        onChange={(e) => {
                                                            const newMembers = [...editingVideo.members];
                                                            newMembers[index] = { ...member, editApproved: e.target.checked };
                                                            setEditingVideo({ ...editingVideo, members: newMembers });
                                                        }}
                                                    />
                                                    <span>編集可</span>
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const memberName = member.name || member.xid || `メンバー${index + 1}`;
                                                        if (confirm(`「${memberName}」を削除しますか？`)) {
                                                            const newMembers = editingVideo.members.filter((_, i) => i !== index);
                                                            setEditingVideo({ ...editingVideo, members: newMembers });
                                                        }
                                                    }}
                                                    className="btn-icon-danger"
                                                >
                                                    <FontAwesomeIcon icon={faTimes} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingVideo({
                                            ...editingVideo,
                                            members: [...editingVideo.members, { name: '', xid: '', role: '', editApproved: false }]
                                        });
                                    }}
                                    className="btn btn-secondary btn-sm add-member-btn"
                                >
                                    <FontAwesomeIcon icon={faPlus} /> 1人追加
                                </button>

                                <div className="modal-actions">
                                    <button onClick={() => setEditingVideo(null)} className="btn btn-secondary">
                                        キャンセル
                                    </button>
                                    <button onClick={saveEdit} disabled={isEditing} className="btn btn-primary">
                                        {isEditing ? (
                                            <><FontAwesomeIcon icon={faSpinner} spin /> 保存中...</>
                                        ) : (
                                            <><FontAwesomeIcon icon={faCheck} /> 保存</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Delete Confirmation Modal (3 steps) */}
                    {deleteTarget && (
                        <div className="modal-overlay" onClick={cancelDelete}>
                            <div className="modal delete-modal" onClick={(e) => e.stopPropagation()}>
                                <h2><FontAwesomeIcon icon={faTrash} /> 動画を削除</h2>

                                <div className="delete-video-info">
                                    <Image
                                        src={`https://i.ytimg.com/vi/${deleteTarget.id}/mqdefault.jpg`}
                                        alt={deleteTarget.title || '動画サムネイル'}
                                        width={320}
                                        height={180}
                                        className="delete-thumbnail"
                                        unoptimized
                                    />
                                    <div className="delete-video-details">
                                        <strong>{deleteTarget.title}</strong>
                                        <span>@{deleteTarget.authorXid}</span>
                                    </div>
                                </div>

                                <div className="delete-warning">
                                    <p>⚠️ この操作は取り消せません！</p>
                                    <p>本当に削除してよろしいですか？</p>
                                </div>

                                <div className="delete-progress">
                                    <div className="delete-steps">
                                        {[1, 2, 3].map((step) => (
                                            <div
                                                key={step}
                                                className={`delete-step ${deleteConfirmCount >= step ? 'confirmed' : ''}`}
                                            >
                                                {deleteConfirmCount >= step ? <FontAwesomeIcon icon={faCheck} /> : step}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="delete-step-text">
                                        {deleteConfirmCount === 0 && '削除するには「削除する」を3回クリックしてください'}
                                        {deleteConfirmCount === 1 && 'あと2回クリックで削除されます'}
                                        {deleteConfirmCount === 2 && 'あと1回クリックで削除されます！'}
                                    </p>
                                </div>

                                <div className="modal-actions">
                                    <button onClick={cancelDelete} className="btn btn-secondary">
                                        キャンセル
                                    </button>
                                    <button
                                        onClick={handleDeleteConfirm}
                                        className={`btn btn-danger ${deleteConfirmCount >= 2 ? 'final-warning' : ''}`}
                                    >
                                        <FontAwesomeIcon icon={faTrash} />
                                        {deleteConfirmCount >= 2 ? '最終確認: 削除する' : '削除する'}
                                        ({3 - deleteConfirmCount})
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Videos Card Grid */}
                    <div className="card">
                        <div className="card-header">
                            <h2>
                                <FontAwesomeIcon icon={faVideo} /> 動画一覧
                                <span className="badge">{filteredVideos.length}件</span>
                            </h2>
                            <div className="header-actions">
                                <div className="view-toggle">
                                    <button
                                        className={`btn-icon ${viewMode === 'list' ? 'active' : ''}`}
                                        onClick={() => setViewMode('list')}
                                        title="リスト表示"
                                    >
                                        <FontAwesomeIcon icon={faList} />
                                    </button>
                                    <button
                                        className={`btn-icon ${viewMode === 'table' ? 'active' : ''}`}
                                        onClick={() => setViewMode('table')}
                                        title="テーブル表示"
                                    >
                                        <FontAwesomeIcon icon={faTable} />
                                    </button>
                                    <div style={{ width: '1px', height: '24px', background: 'var(--border-main)', margin: '0 4px' }}></div>
                                    <button
                                        className={`btn-icon ${showDeleted ? 'active' : ''}`}
                                        onClick={() => setShowDeleted(!showDeleted)}
                                        title={showDeleted ? "ゴミ箱を隠す" : "ゴミ箱を表示"}
                                        style={showDeleted ? { color: 'var(--c-danger)' } : {}}
                                    >
                                        <FontAwesomeIcon icon={faTrashRestore} />
                                    </button>
                                </div>
                                <div className="action-buttons" style={{ display: 'flex', gap: '0.5rem' }}>
                                    <Link href="/admin/import" className="btn btn-secondary btn-sm" title="データインポート">
                                        <FontAwesomeIcon icon={faUpload} />
                                        <span className="hide-mobile">インポート</span>
                                    </Link>
                                    <div className="export-menu-container">
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => setShowExportMenu(!showExportMenu)}
                                            title="データエクスポート"
                                        >
                                            <FontAwesomeIcon icon={faFileExport} />
                                            <span className="hide-mobile">エクスポート</span>
                                        </button>
                                        {showExportMenu && (
                                            <div className="export-dropdown">
                                                <button onClick={() => handleExport('json')}>
                                                    <FontAwesomeIcon icon={faFileCode} /> JSON
                                                </button>
                                                <button onClick={() => handleExport('csv')}>
                                                    <FontAwesomeIcon icon={faFileCsv} /> CSV
                                                </button>
                                                <button onClick={() => handleExport('tsv')}>
                                                    <FontAwesomeIcon icon={faTable} /> TSV
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {isLoadingVideos && videos.length === 0 ? (
                            <div className="loading">
                                <FontAwesomeIcon icon={faSpinner} spin /> 読み込み中...
                            </div>
                        ) : viewMode === 'table' ? (
                            <div className="video-table-container">
                                <table className="video-table">
                                    <thead>
                                        <tr>
                                            <th>サムネイル</th>
                                            <th onClick={() => { if (sortField === 'title') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); else { setSortField('title'); setSortOrder('asc'); } }} style={{ cursor: 'pointer' }}>
                                                タイトル {sortField === 'title' && <FontAwesomeIcon icon={sortOrder === 'asc' ? faSortUp : faSortDown} />}
                                            </th>
                                            <th onClick={() => { if (sortField === 'authorName') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); else { setSortField('authorName'); setSortOrder('asc'); } }} style={{ cursor: 'pointer' }}>
                                                作者 {sortField === 'authorName' && <FontAwesomeIcon icon={sortOrder === 'asc' ? faSortUp : faSortDown} />}
                                            </th>
                                            <th>イベント</th>
                                            <th onClick={() => { if (sortField === 'startTime') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); else { setSortField('startTime'); setSortOrder('desc'); } }} style={{ cursor: 'pointer' }}>
                                                公開日時 {sortField === 'startTime' && <FontAwesomeIcon icon={sortOrder === 'asc' ? faSortUp : faSortDown} />}
                                            </th>
                                            <th>ステータス</th>
                                            <th>統計</th>
                                            <th>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredVideos.map((video) => (
                                            <tr key={video.id} className={video.isDeleted ? 'deleted-row' : ''} style={video.isDeleted ? { opacity: 0.6, background: 'rgba(255,0,0,0.05)' } : {}}>
                                                <td className="col-thumb">
                                                    <div className="table-thumb">
                                                        <Image
                                                            src={`https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`}
                                                            alt={video.title}
                                                            width={80}
                                                            height={45}
                                                            unoptimized
                                                        />
                                                    </div>
                                                </td>
                                                <td className="col-title" title={video.title}>{video.title}</td>
                                                <td className="col-author">
                                                    <div className="author-cell">
                                                        <span>{video.authorName}</span>
                                                        <span className="muted">@{video.authorXid}</span>
                                                    </div>
                                                </td>
                                                <td className="col-events">
                                                    <div className="events-cell">
                                                        {video.eventIds.map(id => (
                                                            <span key={id} className="event-tag">{id}</span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td>{formatDate(video.startTime)}</td>
                                                <td>
                                                    <span className={`status-badge ${video.privacyStatus}`}>
                                                        {video.privacyStatus}
                                                    </span>
                                                </td>
                                                <td className="col-stats">
                                                    <span title="再生数"><FontAwesomeIcon icon={faEye} /> {video.viewCount}</span>
                                                    <span title="高評価"><FontAwesomeIcon icon={faThumbsUp} /> {video.likeCount}</span>
                                                </td>
                                                <td className="col-actions">
                                                    {video.isDeleted ? (
                                                        <button onClick={() => handleRestore(video)} className="btn-icon" title="復元する" style={{ color: 'var(--c-success)' }}>
                                                            <FontAwesomeIcon icon={faTrashRestore} />
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => startDeleteProcess(video)} className="btn-icon" title="削除">
                                                            <FontAwesomeIcon icon={faTrash} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => startEdit(video)} className="btn-icon" title="編集">
                                                        <FontAwesomeIcon icon={faEdit} />
                                                    </button>
                                                    <a href={`https://youtu.be/${video.id}`} target="_blank" rel="noreferrer" className="btn-icon" title="YouTubeで開く">
                                                        <FontAwesomeIcon icon={faExternalLinkAlt} />
                                                    </a>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <>
                                <div className="video-grid">
                                    {filteredVideos.map((video) => (
                                        <div key={video.id} className={`video-card ${video.isDeleted ? 'deleted' : ''}`} style={video.isDeleted ? { opacity: 0.7, border: '1px solid var(--c-danger)' } : {}}>
                                            <div className="video-card-thumbnail">
                                                <Image
                                                    src={`https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`}
                                                    alt={video.title || '動画サムネイル'}
                                                    width={320}
                                                    height={180}
                                                    unoptimized
                                                />
                                                {video.privacyStatus !== 'public' && (
                                                    <span className="video-card-status">{video.privacyStatus}</span>
                                                )}
                                                <a
                                                    href={`https://www.youtube.com/watch?v=${video.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="video-card-link"
                                                >
                                                    <FontAwesomeIcon icon={faExternalLinkAlt} />
                                                </a>
                                            </div>
                                            <div className="video-card-content">
                                                <h3 className="video-card-title">{video.title}</h3>
                                                <div className="video-card-author">
                                                    {video.authorIconUrl ? (
                                                        <>
                                                            <Image
                                                                src={video.authorIconUrl}
                                                                alt={video.authorName}
                                                                width={24}
                                                                height={24}
                                                                className="author-icon"
                                                                onError={(e) => {
                                                                    const target = e.target as HTMLImageElement;
                                                                    target.style.display = 'none';
                                                                    const fallback = target.nextElementSibling;
                                                                    if (fallback) fallback.classList.remove('hidden');
                                                                }}
                                                                unoptimized // Use unoptimized for external user avatars if domain not configured
                                                            />
                                                            <span className="fallback-icon hidden"><FontAwesomeIcon icon={faUser} /></span>
                                                        </>
                                                    ) : (
                                                        <FontAwesomeIcon icon={faUser} />
                                                    )}
                                                    <span>{video.authorName}</span>
                                                    <span className="video-card-xid">@{video.authorXid}</span>
                                                </div>
                                                <div className="video-card-meta">
                                                    <div className="video-card-events">
                                                        {video.eventIds.map((eventId, i) => (
                                                            <span key={i} className="video-card-event">{eventId}</span>
                                                        ))}
                                                    </div>
                                                    <span className="video-card-date">{formatDate(video.startTime)}</span>
                                                </div>
                                                <div className="video-card-stats">
                                                    <span><FontAwesomeIcon icon={faEye} /> {video.viewCount.toLocaleString()}</span>
                                                    <span><FontAwesomeIcon icon={faThumbsUp} /> {video.likeCount.toLocaleString()}</span>
                                                </div>
                                                <div className="video-card-actions">
                                                    <button onClick={() => startEdit(video)} className="btn btn-sm btn-secondary">
                                                        <FontAwesomeIcon icon={faEdit} /> 編集
                                                    </button>
                                                    {video.isDeleted ? (
                                                        <button onClick={() => handleRestore(video)} className="btn btn-sm btn-success" style={{ background: 'var(--c-success)', color: 'white' }}>
                                                            <FontAwesomeIcon icon={faTrashRestore} /> 復元
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => startDeleteProcess(video)} className="btn btn-sm btn-danger">
                                                            <FontAwesomeIcon icon={faTrash} /> 削除
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* 無限スクロール用のセンチネル要素 */}
                                {hasMore && (
                                    <div ref={sentinelRef} style={{ height: '1px', marginTop: '20px' }}>
                                        {isLoadingMore && (
                                            <div className="loading" style={{ padding: '20px', textAlign: 'center' }}>
                                                <FontAwesomeIcon icon={faSpinner} spin /> さらに読み込み中...
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!hasMore && filteredVideos.length > 0 && (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                                        すべての動画を読み込みました
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Keyboard Shortcuts Help */}
                <button
                    onClick={() => setShowShortcuts(true)}
                    className="shortcuts-btn"
                    title="キーボードショートカット (?)"
                >
                    <FontAwesomeIcon icon={faKeyboard} />
                </button>

                {showShortcuts && (
                    <div className="modal-overlay" onClick={() => setShowShortcuts(false)}>
                        <div className="modal shortcuts-modal" onClick={(e) => e.stopPropagation()}>
                            <h2><FontAwesomeIcon icon={faKeyboard} /> キーボードショートカット</h2>
                            <div className="shortcuts-list">
                                <div className="shortcut-item">
                                    <kbd>/</kbd>
                                    <span>検索にフォーカス</span>
                                </div>
                                <div className="shortcut-item">
                                    <kbd>Escape</kbd>
                                    <span>モーダルを閉じる / 検索をクリア</span>
                                </div>
                                <div className="shortcut-item">
                                    <kbd>Ctrl</kbd> + <kbd>S</kbd>
                                    <span>保存（編集中）</span>
                                </div>
                                <div className="shortcut-item">
                                    <kbd>?</kbd>
                                    <span>このヘルプを表示</span>
                                </div>
                            </div>
                            <button onClick={() => setShowShortcuts(false)} className="btn btn-secondary">
                                閉じる
                            </button>
                        </div>
                    </div>
                )}

                <Footer />
            </div>

            <style jsx>{`
                .header-actions {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                
                .view-toggle {
                    display: flex;
                    background: var(--bg-surface-2);
                    border: 1px solid var(--border-main);
                    border-radius: 6px;
                    padding: 2px;
                }
                
                .view-toggle .btn-icon {
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                    color: var(--c-muted);
                    background: transparent;
                    border: none;
                    cursor: pointer;
                }
                
                .view-toggle .btn-icon.active {
                    background: var(--c-primary);
                    color: white;
                }
                
                .export-menu-container {
                    position: relative;
                }
                
                .export-dropdown {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    margin-top: 0.5rem;
                    background: var(--bg-surface-2);
                    border: 1px solid var(--border-main);
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    z-index: 100;
                    min-width: 150px;
                    overflow: hidden;
                }
                
                .export-dropdown button {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    width: 100%;
                    padding: 0.75rem 1rem;
                    border: none;
                    background: transparent;
                    color: var(--c-text);
                    text-align: left;
                    cursor: pointer;
                    font-size: 0.9rem;
                }
                
                .export-dropdown button:hover {
                    background: var(--c-surface);
                }

                .video-table-container {
                    overflow-x: auto;
                    margin: 0 -1.5rem;
                    padding: 0 1.5rem;
                }

                .video-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.9rem;
                }

                .video-table th, .video-table td {
                    padding: 0.75rem;
                    text-align: left;
                    border-bottom: 1px solid var(--border-main);
                }

                .video-table th {
                    font-weight: 600;
                    color: var(--c-muted);
                    white-space: nowrap;
                }

                .col-thumb { width: 100px; }
                .table-thumb img { border-radius: 4px; }
                
                .col-title { 
                    max-width: 200px; 
                    white-space: nowrap; 
                    overflow: hidden; 
                    text-overflow: ellipsis; 
                    font-weight: 600;
                }

                .author-cell {
                    display: flex;
                    flex-direction: column;
                    line-height: 1.2;
                }
                .author-cell .muted { font-size: 0.8rem; color: var(--c-muted); }

                .events-cell {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.25rem;
                    max-width: 150px;
                }
                
                .event-tag {
                    font-size: 0.75rem;
                    padding: 2px 6px;
                    background: rgba(var(--accent-primary-rgb), 0.1);
                    color: var(--accent-primary);
                    border-radius: 4px;
                }
                
                .status-badge {
                    font-size: 0.75rem;
                    padding: 2px 8px;
                    border-radius: 10px;
                    background: var(--bg-surface-2);
                    border: 1px solid var(--border-main);
                }
                
                .col-stats {
                    white-space: nowrap;
                    color: var(--c-muted);
                }
                .col-stats span { margin-right: 0.75rem; }

                .col-actions {
                    white-space: nowrap;
                }
                .col-actions .btn-icon {
                    margin-right: 0.5rem;
                    color: var(--c-text);
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    padding: 4px;
                }
                .col-actions .btn-icon:hover { color: var(--c-primary); }

                .video-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 1.5rem;
                    padding: 1rem 0;
                }

                .video-card {
                    background: var(--bg-surface-2);
                    border: 1px solid var(--border-main);
                    border-radius: 12px;
                    overflow: hidden;
                    transition: all 0.2s ease;
                }

                .video-card:hover {
                    border-color: var(--border-main);
                    transform: translateY(-2px);
                }

                .video-card-thumbnail {
                    position: relative;
                    aspect-ratio: 16 / 9;
                    overflow: hidden;
                }

                .video-card-thumbnail img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .video-card-status {
                    position: absolute;
                    top: 0.5rem;
                    left: 0.5rem;
                    padding: 0.25rem 0.5rem;
                    background: var(--c-danger); /* Specific red for status */
                    color: var(--c-text-inverted);
                    border-radius: 4px;
                    font-size: 0.7rem;
                    font-weight: 600;
                }

                .video-card-link {
                    position: absolute;
                    top: 0.5rem;
                    right: 0.5rem;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0, 0, 0, 0.7); /* Dark overlay */
                    color: var(--c-text-inverted);
                    border-radius: 50%;
                    opacity: 0;
                    transition: opacity 0.2s;
                }

                .video-card:hover .video-card-link {
                    opacity: 1;
                }

                .video-card-content {
                    padding: 1rem;
                }

                .video-card-title {
                    font-size: 0.95rem;
                    font-weight: 600;
                    margin: 0 0 0.75rem;
                    color: var(--c-text);
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    line-height: 1.4;
                    border: none;
                    padding: 0;
                }

                .video-card-author {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.85rem;
                    color: var(--c-text-light); /* Specific light blue */
                    margin-bottom: 0.5rem;
                }

                .video-card-author .author-icon {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    object-fit: cover;
                }

                .video-card-xid {
                    color: var(--c-muted);
                    font-size: 0.8rem;
                }

                .video-card-meta {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    font-size: 0.8rem;
                    color: var(--c-muted);
                    margin-bottom: 0.75rem;
                }

                .video-card-events {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.25rem;
                }

                .video-card-event {
                    padding: 0.125rem 0.5rem;
                    background: rgba(var(--accent-primary-rgb), 0.1);
                    color: var(--accent-primary);
                    border-radius: 4px;
                    font-size: 0.75rem;
                }

                .video-card-stats {
                    display: flex;
                    gap: 1rem;
                    font-size: 0.8rem;
                    color: var(--c-muted);
                    margin-bottom: 1rem;
                }

                .video-card-stats span {
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                }

                .video-card-actions {
                    display: flex;
                    gap: 0.5rem;
                }

                .video-card-actions .btn {
                    flex: 1;
                    justify-content: center;
                }

                /* Delete Modal Styles */
                .delete-modal {
                    max-width: 450px;
                }

                .delete-video-info {
                    display: flex;
                    gap: 1rem;
                    padding: 1rem;
                    background: var(--bg-surface-1);
                    border-radius: 8px;
                    margin-bottom: 1rem;
                }

                .delete-thumbnail {
                    width: 120px;
                    height: 68px;
                    object-fit: cover;
                    border-radius: 4px;
                }

                .delete-video-details {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .delete-video-details strong {
                    font-size: 0.95rem;
                    color: var(--c-text);
                }

                .delete-video-details span {
                    font-size: 0.85rem;
                    color: var(--c-muted);
                }

                .delete-warning {
                    text-align: center;
                    padding: 1rem;
                    background: rgba(var(--c-danger-rgb), 0.1);
                    border: 1px solid rgba(var(--c-danger-rgb), 0.2);
                    border-radius: 8px;
                    margin-bottom: 1rem;
                }

                .delete-warning p {
                    margin: 0.25rem 0;
                    color: var(--c-danger);
                }

                .delete-progress {
                    text-align: center;
                    margin-bottom: 1.5rem;
                }

                .delete-steps {
                    display: flex;
                    justify-content: center;
                    gap: 0.75rem;
                    margin-bottom: 0.75rem;
                }

                .delete-step {
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    background: rgba(var(--c-text-rgb), 0.1);
                    color: var(--c-muted);
                    font-weight: 600;
                    transition: all 0.3s ease;
                }

                .delete-step.confirmed {
                    background: var(--c-danger);
                    color: var(--c-text-inverted);
                }

                .delete-step-text {
                    color: var(--c-muted);
                    font-size: 0.85rem;
                    margin: 0;
                }

                .btn-danger.final-warning {
                    animation: pulse-danger 0.5s ease infinite;
                }

                @keyframes pulse-danger {
                    0%, 100% { background: var(--c-danger); }
                    50% { background: var(--c-danger-dark); } /* Assuming a darker variant for animation */
                }

                /* Extended Edit Modal Styles */
                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                }

                .form-section-divider {
                    display: flex;
                    align-items: center;
                    margin: 1.5rem 0 1rem;
                    gap: 1rem;
                }

                .form-section-divider::before,
                .form-section-divider::after {
                    content: '';
                    flex: 1;
                    height: 1px;
                    background: var(--border-main);
                }

                .form-section-divider span {
                    font-size: 0.85rem;
                    color: var(--accent-primary);
                    font-weight: 600;
                    white-space: nowrap;
                }

                /* Bulk Member Input Section */
                .bulk-member-section {
                    margin-bottom: 1rem;
                }

                .bulk-member-section label {
                    display: block;
                    color: var(--c-muted);
                    font-size: 0.8rem;
                    margin-bottom: 0.5rem;
                }

                .bulk-input {
                    font-family: monospace;
                    font-size: 0.85rem;
                    margin-bottom: 0.5rem;
                    min-height: 80px;
                }

                /* Bulk Role Section */
                .bulk-role-section {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem;
                    background: rgba(var(--accent-primary-rgb), 0.05);
                    border: 1px solid rgba(var(--accent-primary-rgb), 0.15);
                    border-radius: 8px;
                    margin-bottom: 1rem;
                    flex-wrap: wrap;
                }

                .bulk-role-label {
                    color: var(--accent-primary);
                    font-size: 0.8rem;
                    font-weight: 500;
                }

                .bulk-role-checkboxes {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }

                /* Members List - No scroll */
                .members-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    margin-bottom: 0.75rem;
                }

                .member-edit-row {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 0.75rem;
                    background: var(--bg-surface-1);
                    border: 1px solid var(--border-main);
                    border-radius: 8px;
                    flex-wrap: wrap;
                }

                .member-inputs {
                    display: flex;
                    gap: 0.5rem;
                    flex: 1;
                    min-width: 200px;
                }

                .member-name-input {
                    flex: 1;
                    min-width: 80px;
                }

                .member-xid-input {
                    flex: 0 0 100px;
                }

                .member-roles {
                    display: flex;
                    gap: 0.25rem;
                    flex-wrap: wrap;
                    flex: 1;
                }

                .role-checkbox-small {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    padding: 0.25rem 0.5rem;
                    background: rgba(var(--c-text-rgb), 0.05);
                    border-radius: 4px;
                    font-size: 0.75rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .role-checkbox-small:hover {
                    background: rgba(var(--c-text-rgb), 0.1);
                }

                .role-checkbox-small input {
                    width: 12px;
                    height: 12px;
                }

                .role-checkbox-small input:checked + span {
                    color: var(--accent-primary);
                }

                .member-actions {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .approve-checkbox {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    padding: 0.25rem 0.5rem;
                    background: rgba(var(--c-success-rgb), 0.1);
                    border-radius: 4px;
                    font-size: 0.7rem;
                    cursor: pointer;
                    color: var(--c-success);
                    white-space: nowrap;
                }

                .btn-icon-danger {
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    border-radius: 6px;
                    color: #ef4444;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-icon-danger:hover {
                    background: rgba(239, 68, 68, 0.2);
                }

                .add-member-btn {
                    align-self: flex-start;
                    margin-top: 0.5rem;
                }

                /* Keyboard Shortcuts */
                .shortcuts-btn {
                    position: fixed;
                    bottom: 1.5rem;
                    right: 1.5rem;
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background: rgba(100, 255, 218, 0.1);
                    border: 1px solid rgba(100, 255, 218, 0.3);
                    color: var(--accent-primary);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.25rem;
                    transition: all 0.2s ease;
                    z-index: 100;
                }

                .shortcuts-btn:hover {
                    background: rgba(100, 255, 218, 0.2);
                    transform: scale(1.1);
                }

                .shortcuts-modal {
                    max-width: 400px;
                }

                .shortcuts-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    margin-bottom: 1.5rem;
                }

                .shortcut-item {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.5rem;
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 6px;
                }

                .shortcut-item kbd {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 28px;
                    height: 28px;
                    padding: 0 0.5rem;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 4px;
                    font-family: monospace;
                    font-size: 0.8rem;
                    color: var(--accent-primary);
                }

                .shortcut-item span {
                    color: #8892b0;
                    font-size: 0.9rem;
                }

                @media screen and (max-width: 640px) {
                    .video-grid {
                        grid-template-columns: 1fr;
                    }

                    .form-row {
                        grid-template-columns: 1fr;
                    }

                    .member-edit-row {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .member-name-input,
                    .member-xid-input {
                        flex: 1 1 100%;
                    }

                    .member-roles {
                        justify-content: flex-start;
                    }
                }
            `}</style>
        </>
    );
}
