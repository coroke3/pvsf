// Admin Event Slots Management Page
import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCalendarAlt, faPlus, faTrash, faSpinner, faCheck, faTimes,
    faEdit, faClock, faVideo, faChevronDown, faChevronUp, faTable
} from '@fortawesome/free-solid-svg-icons';
import Footer from '@/components/Footer';
import SlotAvailabilityTable from '@/components/SlotAvailabilityTable';

interface TimeSlot {
    dateTime: string;
    videoId: string | null;
    videoTitle?: string;
    isAvailable: boolean;
}

interface EventSlots {
    id: string;
    eventId: string;
    eventName: string;
    slots: TimeSlot[];
    totalSlots: number;
    availableSlots: number;
    assignedSlots: number;
    createdAt: string;
    updatedAt: string;
}

export default function AdminSlotsPage() {
    const router = useRouter();
    const { isAdmin, isLoading, isAuthenticated } = useAuth();

    const [events, setEvents] = useState<EventSlots[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Create form
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newEventId, setNewEventId] = useState('');
    const [newEventName, setNewEventName] = useState('');
    const [newSlotsInput, setNewSlotsInput] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // GUI slot creation
    const [inputMode, setInputMode] = useState<'csv' | 'gui'>('gui');
    const [guiSlotDate, setGuiSlotDate] = useState('');
    const [guiSlotTimes, setGuiSlotTimes] = useState<string[]>(['']);

    // Table view mode
    const [showTableView, setShowTableView] = useState(false);

    // Edit state
    const [editingEvent, setEditingEvent] = useState<EventSlots | null>(null);
    const [editEventName, setEditEventName] = useState('');
    const [editSlotsInput, setEditSlotsInput] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    // Expanded events
    const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<{ eventId: string; type: 'event' | 'slots'; slotDateTimes?: string[] } | null>(null);
    const [deleteConfirmCount, setDeleteConfirmCount] = useState(0);

    useEffect(() => {
        if (!isLoading && (!isAuthenticated || !isAdmin)) {
            router.push('/');
        }
    }, [isLoading, isAuthenticated, isAdmin, router]);

    const fetchEvents = useCallback(async () => {
        setIsLoadingEvents(true);
        try {
            const res = await fetch('/api/admin/event-slots');
            if (res.ok) {
                const data = await res.json();
                setEvents(data);
            } else {
                const err = await res.json();
                setError(err.error || 'イベントの取得に失敗しました');
            }
        } catch (err) {
            setError('イベントの取得中にエラーが発生しました');
        } finally {
            setIsLoadingEvents(false);
        }
    }, []);

    useEffect(() => {
        if (isAdmin) {
            fetchEvents();
        }
    }, [isAdmin, fetchEvents]);

    const handleCreateEvent = async () => {
        if (!newEventId.trim()) {
            setError('イベントIDを入力してください');
            return;
        }

        // Generate slotsInput based on input mode
        let finalSlotsInput = newSlotsInput;

        if (inputMode === 'gui') {
            if (!guiSlotDate) {
                setError('日付を選択してください');
                return;
            }
            const validTimes = guiSlotTimes.filter(t => t.trim());
            if (validTimes.length === 0) {
                setError('時間を1つ以上入力してください');
                return;
            }
            // Generate CSV format from GUI inputs
            finalSlotsInput = validTimes.map(time => `${guiSlotDate},${time}`).join('\n');
        } else {
            if (!newSlotsInput.trim()) {
                setError('枠データを入力してください');
                return;
            }
        }

        setIsCreating(true);
        setError('');
        setSuccess('');

        try {
            const res = await fetch('/api/admin/event-slots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId: newEventId.trim().toLowerCase(),
                    eventName: newEventName.trim() || newEventId.trim().toUpperCase(),
                    slotsInput: finalSlotsInput,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(data.message);
                setNewEventId('');
                setNewEventName('');
                setNewSlotsInput('');
                setGuiSlotDate('');
                setGuiSlotTimes(['']);
                setShowCreateForm(false);
                fetchEvents();
            } else {
                setError(data.error || '作成に失敗しました');
            }
        } catch (err) {
            setError('作成中にエラーが発生しました');
        } finally {
            setIsCreating(false);
        }
    };

    // Add time slot in GUI mode
    const addGuiTimeSlot = () => {
        setGuiSlotTimes([...guiSlotTimes, '']);
    };

    // Remove time slot in GUI mode
    const removeGuiTimeSlot = (index: number) => {
        if (guiSlotTimes.length > 1) {
            setGuiSlotTimes(guiSlotTimes.filter((_, i) => i !== index));
        }
    };

    // Update time slot in GUI mode
    const updateGuiTimeSlot = (index: number, value: string) => {
        const newTimes = [...guiSlotTimes];
        newTimes[index] = value;
        setGuiSlotTimes(newTimes);
    };

    // Bulk patterns state (multiple patterns)
    interface BulkPattern {
        startTime: string;
        endTime: string;
        interval: number;
    }
    const [bulkPatterns, setBulkPatterns] = useState<BulkPattern[]>([
        { startTime: '21:00', endTime: '23:00', interval: 15 }
    ]);

    const addBulkPattern = () => {
        setBulkPatterns([...bulkPatterns, { startTime: '21:00', endTime: '23:00', interval: 15 }]);
    };

    const removeBulkPattern = (index: number) => {
        if (bulkPatterns.length > 1) {
            setBulkPatterns(bulkPatterns.filter((_, i) => i !== index));
        }
    };

    const updateBulkPattern = (index: number, field: keyof BulkPattern, value: string | number) => {
        const newPatterns = [...bulkPatterns];
        newPatterns[index] = { ...newPatterns[index], [field]: value };
        setBulkPatterns(newPatterns);
    };

    const generateBulkSlots = () => {
        const allSlots: string[] = [];

        for (const pattern of bulkPatterns) {
            if (!pattern.startTime || !pattern.endTime || !pattern.interval) continue;

            const start = new Date(`2000-01-01T${pattern.startTime}`);
            const end = new Date(`2000-01-01T${pattern.endTime}`);

            let current = start;
            while (current < end) {
                const timeStr = current.toTimeString().slice(0, 5);
                if (!allSlots.includes(timeStr)) {
                    allSlots.push(timeStr);
                }
                current = new Date(current.getTime() + pattern.interval * 60000);
            }
        }

        // Sort slots by time
        allSlots.sort();

        if (allSlots.length > 0) {
            setGuiSlotTimes(allSlots);
        }
    };

    const startEditEvent = (event: EventSlots) => {
        setEditingEvent(event);
        setEditEventName(event.eventName);
        // Convert slots to editable format
        const slotsText = event.slots
            .map(s => {
                const date = new Date(s.dateTime);
                const dateStr = date.toISOString().split('T')[0];
                const timeStr = date.toTimeString().slice(0, 5);
                return `${dateStr},${timeStr}`;
            })
            .join('\n');
        setEditSlotsInput(slotsText);
    };

    const handleUpdateEvent = async () => {
        if (!editingEvent) return;

        setIsEditing(true);
        setError('');
        setSuccess('');

        try {
            // First update event name if changed
            if (editEventName !== editingEvent.eventName) {
                await fetch('/api/admin/event-slots', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        eventId: editingEvent.eventId,
                        eventName: editEventName,
                    }),
                });
            }

            // Add new slots if input provided
            if (editSlotsInput.trim()) {
                const res = await fetch('/api/admin/event-slots', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        eventId: editingEvent.eventId,
                        slotsInput: editSlotsInput,
                    }),
                });

                if (!res.ok) {
                    const err = await res.json();
                    setError(err.error || '枠の追加に失敗しました');
                    setIsEditing(false);
                    return;
                }
            }

            setSuccess('イベントを更新しました');
            setEditingEvent(null);
            fetchEvents();
        } catch (err) {
            setError('更新中にエラーが発生しました');
        } finally {
            setIsEditing(false);
        }
    };

    const startDelete = (eventId: string, type: 'event' | 'slots', slotDateTimes?: string[]) => {
        setDeleteTarget({ eventId, type, slotDateTimes });
        setDeleteConfirmCount(0);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;

        const newCount = deleteConfirmCount + 1;
        setDeleteConfirmCount(newCount);

        if (newCount < 2) return;

        setError('');
        setSuccess('');

        try {
            const res = await fetch('/api/admin/event-slots', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId: deleteTarget.eventId,
                    slotDateTimes: deleteTarget.type === 'slots' ? deleteTarget.slotDateTimes : undefined,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(data.message);
                fetchEvents();
            } else {
                setError(data.error || '削除に失敗しました');
            }
        } catch (err) {
            setError('削除中にエラーが発生しました');
        } finally {
            setDeleteTarget(null);
            setDeleteConfirmCount(0);
        }
    };

    const toggleExpand = (eventId: string) => {
        setExpandedEvents(prev => {
            const newSet = new Set(prev);
            if (newSet.has(eventId)) {
                newSet.delete(eventId);
            } else {
                newSet.add(eventId);
            }
            return newSet;
        });
    };

    const formatDateTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleString('ja-JP', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatDateForGroup = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            weekday: 'short',
        });
    };

    // Group slots by date
    const groupSlotsByDate = (slots: TimeSlot[]) => {
        const groups: Record<string, TimeSlot[]> = {};
        for (const slot of slots) {
            const dateKey = new Date(slot.dateTime).toDateString();
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(slot);
        }
        return groups;
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
                <title>登録枠管理 - Admin</title>
            </Head>

            <div className="admin-page">
                <div className="admin-header">
                    <h1><FontAwesomeIcon icon={faCalendarAlt} /> 登録枠管理</h1>
                    <p>イベントごとに登録枠を作成・管理します</p>
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

                    {/* Create Event Button */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <button
                            onClick={() => setShowCreateForm(!showCreateForm)}
                            className="btn btn-primary"
                        >
                            <FontAwesomeIcon icon={faPlus} /> 新規イベント作成
                        </button>
                    </div>

                    {/* Create Form */}
                    {showCreateForm && (
                        <div className="card">
                            <h2><FontAwesomeIcon icon={faPlus} /> 新規イベント作成</h2>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>イベントID *</label>
                                    <input
                                        type="text"
                                        value={newEventId}
                                        onChange={(e) => setNewEventId(e.target.value)}
                                        placeholder="例: pvsf12"
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>イベント名</label>
                                    <input
                                        type="text"
                                        value={newEventName}
                                        onChange={(e) => setNewEventName(e.target.value)}
                                        placeholder="例: PVSF12（空欄でIDを使用）"
                                        className="form-input"
                                    />
                                </div>
                            </div>

                            {/* Input Mode Toggle */}
                            <div className="input-mode-toggle">
                                <button
                                    type="button"
                                    className={`mode-btn ${inputMode === 'gui' ? 'active' : ''}`}
                                    onClick={() => setInputMode('gui')}
                                >
                                    <FontAwesomeIcon icon={faCalendarAlt} /> GUI入力
                                </button>
                                <button
                                    type="button"
                                    className={`mode-btn ${inputMode === 'csv' ? 'active' : ''}`}
                                    onClick={() => setInputMode('csv')}
                                >
                                    <FontAwesomeIcon icon={faEdit} /> CSV入力
                                </button>
                            </div>

                            {/* GUI Mode */}
                            {inputMode === 'gui' && (
                                <div className="gui-slot-input">
                                    <div className="form-group">
                                        <label>日付 *</label>
                                        <input
                                            type="date"
                                            value={guiSlotDate}
                                            onChange={(e) => setGuiSlotDate(e.target.value)}
                                            className="form-input"
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>

                                    {/* Bulk Generator UI - Multiple Patterns */}
                                    <div className="bulk-generator card-nested">
                                        <h4><FontAwesomeIcon icon={faClock} /> 一括生成ツール（複数パターン対応）</h4>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--fg-muted)', marginBottom: '1rem' }}>
                                            複数の時間帯パターンを設定し、一括で枠を生成できます
                                        </p>

                                        {bulkPatterns.map((pattern, index) => (
                                            <div key={index} className="bulk-pattern-row" style={{
                                                display: 'flex',
                                                gap: '0.5rem',
                                                alignItems: 'flex-end',
                                                marginBottom: '0.75rem',
                                                padding: '0.75rem',
                                                background: 'var(--bg-secondary)',
                                                borderRadius: '0.5rem'
                                            }}>
                                                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                                                    <label style={{ fontSize: '0.75rem' }}>開始</label>
                                                    <input
                                                        type="time"
                                                        value={pattern.startTime}
                                                        onChange={(e) => updateBulkPattern(index, 'startTime', e.target.value)}
                                                        className="form-input"
                                                    />
                                                </div>
                                                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                                                    <label style={{ fontSize: '0.75rem' }}>終了</label>
                                                    <input
                                                        type="time"
                                                        value={pattern.endTime}
                                                        onChange={(e) => updateBulkPattern(index, 'endTime', e.target.value)}
                                                        className="form-input"
                                                    />
                                                </div>
                                                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                                                    <label style={{ fontSize: '0.75rem' }}>間隔(分)</label>
                                                    <input
                                                        type="number"
                                                        value={pattern.interval}
                                                        onChange={(e) => updateBulkPattern(index, 'interval', Number(e.target.value))}
                                                        className="form-input"
                                                        min="1"
                                                    />
                                                </div>
                                                {bulkPatterns.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeBulkPattern(index)}
                                                        className="btn btn-icon btn-danger"
                                                        title="パターン削除"
                                                    >
                                                        <FontAwesomeIcon icon={faTimes} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}

                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            <button
                                                type="button"
                                                onClick={addBulkPattern}
                                                className="btn btn-outline btn-sm"
                                            >
                                                <FontAwesomeIcon icon={faPlus} /> パターン追加
                                            </button>
                                            <button
                                                type="button"
                                                onClick={generateBulkSlots}
                                                className="btn btn-secondary btn-sm"
                                            >
                                                <FontAwesomeIcon icon={faClock} /> 枠を一括生成
                                            </button>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>時間 *（複数追加可能）</label>
                                        <div className="time-inputs">
                                            {guiSlotTimes.map((time, index) => (
                                                <div key={index} className="time-input-row">
                                                    <input
                                                        type="time"
                                                        value={time}
                                                        onChange={(e) => updateGuiTimeSlot(index, e.target.value)}
                                                        className="form-input"
                                                    />
                                                    {guiSlotTimes.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeGuiTimeSlot(index)}
                                                            className="btn btn-icon btn-danger"
                                                        >
                                                            <FontAwesomeIcon icon={faTimes} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={addGuiTimeSlot}
                                            className="btn btn-secondary btn-sm"
                                            style={{ marginTop: '0.5rem' }}
                                        >
                                            <FontAwesomeIcon icon={faPlus} /> 時間を追加
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* CSV Mode */}
                            {inputMode === 'csv' && (
                                <div className="form-group">
                                    <label>枠データ（CSV/TSV形式）*</label>
                                    <textarea
                                        value={newSlotsInput}
                                        onChange={(e) => setNewSlotsInput(e.target.value)}
                                        placeholder={`形式: YYYY-MM-DD,HH:mm（1行に1枠）\n例:\n2026-03-01,18:00\n2026-03-01,18:06\n2026-03-01,18:12`}
                                        rows={8}
                                        className="form-input"
                                        style={{ fontFamily: 'monospace' }}
                                    />
                                </div>
                            )}

                            <div className="modal-actions" style={{ borderTop: 'none', paddingTop: 0 }}>
                                <button onClick={() => setShowCreateForm(false)} className="btn btn-secondary">
                                    キャンセル
                                </button>
                                <button onClick={handleCreateEvent} disabled={isCreating} className="btn btn-primary">
                                    {isCreating ? (
                                        <><FontAwesomeIcon icon={faSpinner} spin /> 作成中...</>
                                    ) : (
                                        <><FontAwesomeIcon icon={faCheck} /> 作成</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Events List */}
                    <div className="card">
                        <h2><FontAwesomeIcon icon={faCalendarAlt} /> イベント一覧</h2>

                        {isLoadingEvents ? (
                            <div className="loading">
                                <FontAwesomeIcon icon={faSpinner} spin /> 読み込み中...
                            </div>
                        ) : events.length === 0 ? (
                            <div className="empty-state">イベントがありません</div>
                        ) : (
                            <div className="events-list">
                                {events.map(event => (
                                    <div
                                        key={event.id}
                                        className={`event-card ${expandedEvents.has(event.eventId) ? 'expanded' : ''}`}
                                    >
                                        <div
                                            className={`event-header ${expandedEvents.has(event.eventId) ? 'expanded' : ''}`}
                                            onClick={() => toggleExpand(event.eventId)}
                                        >
                                            <div className="event-info">
                                                <h3>{event.eventName}</h3>
                                                <div className="event-sub">
                                                    <span className="event-id">{event.eventId}</span>
                                                    <span className="event-updated">
                                                        更新: {new Date(event.updatedAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="event-stats">
                                                <span className="stat available">
                                                    空き: {event.availableSlots}
                                                </span>
                                                <span className="stat assigned">
                                                    割当: {event.assignedSlots}
                                                </span>
                                                <span className="stat total">
                                                    計: {event.totalSlots}
                                                </span>
                                            </div>
                                            <div className="event-actions">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); startEditEvent(event); }}
                                                    className="btn btn-sm btn-secondary"
                                                >
                                                    <FontAwesomeIcon icon={faEdit} /> 編集
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); startDelete(event.eventId, 'event'); }}
                                                    className="btn btn-sm btn-danger"
                                                >
                                                    <FontAwesomeIcon icon={faTrash} /> 削除
                                                </button>
                                                <FontAwesomeIcon
                                                    icon={expandedEvents.has(event.eventId) ? faChevronUp : faChevronDown}
                                                    className="expand-icon"
                                                />
                                            </div>
                                        </div>

                                        {expandedEvents.has(event.eventId) && (
                                            <div className="event-slots">
                                                <SlotAvailabilityTable
                                                    slots={event.slots.map(s => ({
                                                        dateTime: s.dateTime,
                                                        videoId: s.videoId,
                                                        videoTitle: s.videoTitle,  // Show who took the slot
                                                        isAvailable: s.isAvailable,
                                                    }))}
                                                    mode="admin"
                                                    showLegend={true}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Edit Modal */}
                    {editingEvent && (
                        <div className="modal-overlay" onClick={() => setEditingEvent(null)}>
                            <div className="modal" onClick={(e) => e.stopPropagation()}>
                                <h2><FontAwesomeIcon icon={faEdit} /> イベントを編集: {editingEvent.eventId}</h2>

                                <div className="form-group">
                                    <label>イベント名</label>
                                    <input
                                        type="text"
                                        value={editEventName}
                                        onChange={(e) => setEditEventName(e.target.value)}
                                        className="form-input"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>枠を追加（既存の枠は保持されます）</label>
                                    <textarea
                                        value={editSlotsInput}
                                        onChange={(e) => setEditSlotsInput(e.target.value)}
                                        placeholder={`新しい枠を追加する場合のみ入力\n形式: YYYY-MM-DD,HH:mm`}
                                        rows={6}
                                        className="form-input"
                                        style={{ fontFamily: 'monospace' }}
                                    />
                                </div>

                                <div className="current-slots-info">
                                    <p>現在の枠数: {editingEvent.totalSlots}枠（空き: {editingEvent.availableSlots}, 割当: {editingEvent.assignedSlots}）</p>
                                </div>

                                <div className="modal-actions">
                                    <button onClick={() => setEditingEvent(null)} className="btn btn-secondary">
                                        キャンセル
                                    </button>
                                    <button onClick={handleUpdateEvent} disabled={isEditing} className="btn btn-primary">
                                        {isEditing ? (
                                            <><FontAwesomeIcon icon={faSpinner} spin /> 更新中...</>
                                        ) : (
                                            <><FontAwesomeIcon icon={faCheck} /> 更新</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Delete Confirmation Modal */}
                    {deleteTarget && (
                        <div className="modal-overlay" onClick={() => { setDeleteTarget(null); setDeleteConfirmCount(0); }}>
                            <div className="modal delete-modal" onClick={(e) => e.stopPropagation()}>
                                <h2><FontAwesomeIcon icon={faTrash} /> 削除の確認</h2>

                                <div className="delete-warning">
                                    {deleteTarget.type === 'event' ? (
                                        <p>イベント「{deleteTarget.eventId}」を削除しますか？<br />
                                            この操作は30日後に完全に削除されます。</p>
                                    ) : (
                                        <p>{deleteTarget.slotDateTimes?.length}枠を削除しますか？</p>
                                    )}
                                </div>

                                <div className="delete-progress">
                                    <span className={deleteConfirmCount >= 1 ? 'active' : ''}>1回目</span>
                                    <span className={deleteConfirmCount >= 2 ? 'active' : ''}>2回目</span>
                                </div>

                                <div className="modal-actions">
                                    <button
                                        onClick={() => { setDeleteTarget(null); setDeleteConfirmCount(0); }}
                                        className="btn btn-secondary"
                                    >
                                        キャンセル
                                    </button>
                                    <button
                                        onClick={handleDeleteConfirm}
                                        className="btn btn-danger"
                                    >
                                        削除 ({2 - deleteConfirmCount}回クリック)
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Footer />

            <style jsx>{`
                .events-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .event-card {
                    background: var(--bg-surface-2);
                    border: 1px solid var(--border-main);
                    border-radius: 12px;
                    overflow: hidden;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
                    transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
                }

                .event-card:hover {
                    transform: translateY(-1px);
                    border-color: rgba(255, 255, 255, 0.14);
                    background: var(--bg-surface-1);
                }

                .event-card.expanded {
                    border-color: rgba(100, 255, 218, 0.25);
                }

                .event-header {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem;
                    cursor: pointer;
                    transition: background 0.2s, border-color 0.2s;
                }

                .event-header:hover {
                    background: var(--bg-surface-1);
                }

                .event-header.expanded {
                    background: linear-gradient(
                        90deg,
                        rgba(100, 255, 218, 0.06) 0%,
                        var(--bg-surface-2) 55%,
                        rgba(255, 255, 255, 0.01) 100%
                    );
                }

                .event-info {
                    flex: 1;
                    min-width: 220px;
                }

                .event-info h3 {
                    margin: 0;
                    font-size: 1.1rem;
                    color: var(--c-text);
                }

                .event-sub {
                    display: flex;
                    gap: 0.75rem;
                    flex-wrap: wrap;
                    align-items: center;
                    margin-top: 0.25rem;
                }

                .event-id {
                    font-size: 0.8rem;
                    color: var(--accent-primary);
                }

                .event-updated {
                    font-size: 0.75rem;
                    color: var(--c-muted);
                }

                .event-stats {
                    display: flex;
                    gap: 0.75rem;
                    flex-wrap: wrap;
                }

                .stat {
                    font-size: 0.8rem;
                    padding: 0.25rem 0.6rem;
                    border-radius: 9999px;
                    border: 1px solid var(--border-main);
                    white-space: nowrap;
                }

                .stat.available {
                    background: rgba(34, 197, 94, 0.15);
                    color: #4ade80;
                    border-color: rgba(34, 197, 94, 0.2);
                }

                .stat.assigned {
                    background: rgba(59, 130, 246, 0.15);
                    color: #60a5fa;
                    border-color: rgba(59, 130, 246, 0.2);
                }

                .stat.total {
                    background: var(--bg-surface-1);
                    color: var(--c-text);
                    border-color: rgba(255, 255, 255, 0.12);
                }

                .event-actions {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .expand-icon {
                    color: var(--c-muted);
                    margin-left: 0.5rem;
                    transition: transform 0.2s ease;
                }

                .event-slots {
                    padding: 0 1rem 1rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.06);
                }

                .date-group {
                    margin-top: 1rem;
                }

                .date-group h4 {
                    margin: 0 0 0.5rem;
                    font-size: 0.85rem;
                    color: var(--c-muted);
                }

                .slots-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                    gap: 0.5rem;
                }

                .slot-item {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                    padding: 0.5rem 0.75rem;
                    border-radius: 6px;
                    font-size: 0.85rem;
                    transition: transform 0.12s ease, background 0.12s ease, border-color 0.12s ease;
                }

                .slot-item.available {
                    background: rgba(34, 197, 94, 0.1);
                    border: 1px solid rgba(34, 197, 94, 0.2);
                }

                .slot-item.assigned {
                    background: rgba(59, 130, 246, 0.1);
                    border: 1px solid rgba(59, 130, 246, 0.2);
                }

                .slot-item:hover {
                    transform: translateY(-1px);
                }

                .slot-time {
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                    color: var(--c-text);
                }

                .slot-video {
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                    color: var(--c-muted);
                    font-size: 0.75rem;
                }

                .current-slots-info {
                    padding: 0.75rem;
                    background: var(--bg-surface-1);
                    border-radius: 6px;
                    margin-bottom: 1rem;
                }

                .current-slots-info p {
                    margin: 0;
                    font-size: 0.85rem;
                    color: var(--c-muted);
                }

                .delete-warning {
                    padding: 1rem;
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    border-radius: 8px;
                    margin-bottom: 1rem;
                }

                .delete-warning p {
                    margin: 0;
                    color: #f87171;
                }

                .delete-progress {
                    display: flex;
                    justify-content: center;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }

                .delete-progress span {
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    background: var(--bg-surface-1);
                    color: #6b7280;
                }

                .delete-progress span.active {
                    background: rgba(239, 68, 68, 0.2);
                    color: #f87171;
                }

                @media screen and (max-width: 768px) {
                    .event-header {
                        flex-wrap: wrap;
                    }

                    .event-stats {
                        order: 3;
                        width: 100%;
                        margin-top: 0.5rem;
                    }

                    .event-info {
                        min-width: 100%;
                    }

                    .slots-grid {
                        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                    }
                }

                .input-mode-toggle {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                }

                .input-mode-toggle .mode-btn {
                    flex: 1;
                    padding: 0.75rem 1rem;
                    border: 1px solid var(--border-main);
                    background: var(--bg-surface-2);
                    color: var(--c-muted);
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    font-size: 0.9rem;
                }

                .input-mode-toggle .mode-btn:hover {
                    background: var(--bg-surface-1);
                    border-color: rgba(255, 255, 255, 0.2);
                }

                .input-mode-toggle .mode-btn.active {
                    background: rgba(100, 255, 218, 0.1);
                    border-color: #64ffda;
                    color: #64ffda;
                }

                .gui-slot-input {
                    padding: 1rem;
                    background: var(--bg-surface-2);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    border-radius: 8px;
                    margin-bottom: 1rem;
                }

                .time-inputs {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .time-input-row {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .time-input-row .form-input {
                    flex: 1;
                    max-width: 150px;
                }

                .btn-sm {
                    padding: 0.375rem 0.75rem;
                    font-size: 0.85rem;
                }

                .btn-icon {
                    width: 36px;
                    height: 36px;
                    padding: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .selected-slot-info {
                    margin-top: 1rem;
                    padding: 0.75rem 1rem;
                    background: rgba(100, 255, 218, 0.1);
                    border: 1px solid #64ffda;
                    border-radius: 8px;
                    color: #64ffda;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
            `}</style>
        </>
    );
}
