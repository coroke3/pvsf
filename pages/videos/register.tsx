// Video Registration Page
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faVideo, faCalendarAlt, faUser, faMusic,
    faSpinner, faCheck, faTimes, faPlus, faImage,
    faTrash, faUpload, faLink, faKeyboard
} from '@fortawesome/free-solid-svg-icons';
import Image from 'next/image';
import Footer from '@/components/Footer';
import SlotAvailabilityTable, { SlotData } from '@/components/SlotAvailabilityTable';

interface Slot {
    eventId: string;
    eventName: string;
    dateTime: string;
    isAvailable: boolean;
}

interface EventOption {
    eventId: string;
    eventName: string;
    availableCount: number;
}

interface Member {
    name: string;
    xid: string;
    role: string;
}

interface SnsPlan {
    platform: string;
    url?: string;
}

const AVAILABLE_ROLES = ['映像', '音楽', 'イラスト', 'CG', 'リリック'];
const AVAILABLE_SNS = ['YouTube', 'X', 'ニコニコ動画', 'bilibili', 'その他'];

export default function VideoRegisterPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading, isAdmin } = useAuth();
    const iconInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [registrationType, setRegistrationType] = useState<'slot' | 'noSlot'>('noSlot');
    const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
    const [selectedSlots, setSelectedSlots] = useState<Slot[]>([]);  // For multi-slot selection (up to 3)
    const [eventIdFilter, setEventIdFilter] = useState('');
    const [availableEvents, setAvailableEvents] = useState<string[]>([]);
    const [preselectSlotDateTime, setPreselectSlotDateTime] = useState<string | null>(null);

    // Video fields
    const [videoUrl, setVideoUrl] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startTime, setStartTime] = useState('');
    const [authorXid, setAuthorXid] = useState('');
    const [authorName, setAuthorName] = useState('');
    const [authorIconUrl, setAuthorIconUrl] = useState('');
    const [authorChannelUrl, setAuthorChannelUrl] = useState('');
    const [music, setMusic] = useState('');
    const [credit, setCredit] = useState('');
    const [musicUrl, setMusicUrl] = useState('');
    const [type, setType] = useState('個人');
    const [type2, setType2] = useState('個人');
    const [movieYear, setMovieYear] = useState('');
    const [movieYearType, setMovieYearType] = useState<'number' | 'text' | 'hidden'>('number');
    const [software, setSoftware] = useState('');
    const [members, setMembers] = useState<Member[]>([]);
    const [snsPlans, setSnsPlans] = useState<SnsPlan[]>([{ platform: 'YouTube', url: '' }]);
    const [homepageComment, setHomepageComment] = useState('');
    const [link, setLink] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    // Retrospective fields
    const [listen, setListen] = useState('');
    const [episode, setEpisode] = useState('');
    const [endMessage, setEndMessage] = useState('');
    const [beforeComment, setBeforeComment] = useState('');
    const [afterComment, setAfterComment] = useState('');

    // Bulk member input
    const [bulkMemberInput, setBulkMemberInput] = useState('');

    // Icon upload
    const [iconPreview, setIconPreview] = useState('');

    const [isCompressingIcon, setIsCompressingIcon] = useState(false);
    const [historyIcons, setHistoryIcons] = useState<string[]>([]);
    const [showIconHistory, setShowIconHistory] = useState(false);

    // UI state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showShortcuts, setShowShortcuts] = useState(false);

    // Get approved XIDs for current user
    const approvedXids = (user?.xidClaims || [])
        .filter((c: any) => c.status === 'approved')
        .map((c: any) => c.xid);

    // Check if startTime is in the future
    const isFutureDate = startTime ? new Date(startTime) > new Date() : false;

    // Redirect if not authenticated
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/');
        }
    }, [isLoading, isAuthenticated, router]);

    // Preselect registration mode / slot from query params
    useEffect(() => {
        if (!router.isReady) return;

        const modeRaw = router.query.mode;
        const mode = Array.isArray(modeRaw) ? modeRaw[0] : modeRaw;

        const slotEventIdRaw = router.query.slotEventId ?? router.query.eventId;
        const slotEventId = Array.isArray(slotEventIdRaw) ? slotEventIdRaw[0] : slotEventIdRaw;

        const slotDateTimeRaw = router.query.slotDateTime;
        const slotDateTime = Array.isArray(slotDateTimeRaw) ? slotDateTimeRaw[0] : slotDateTimeRaw;

        // If slot params are provided, force slot mode
        if (mode === 'slot' || slotEventId || slotDateTime) {
            setRegistrationType('slot');
        } else if (mode === 'noSlot') {
            setRegistrationType('noSlot');
        }

        if (typeof slotEventId === 'string' && slotEventId.trim()) {
            setEventIdFilter(slotEventId.trim());
            setSelectedSlot(null);
        }

        if (typeof slotDateTime === 'string' && slotDateTime.trim()) {
            setPreselectSlotDateTime(slotDateTime.trim());
        }
    }, [
        router.isReady,
        router.query.mode,
        router.query.slotEventId,
        router.query.eventId,
        router.query.slotDateTime
    ]);

    // Fetch available events when slot registration type is selected
    useEffect(() => {
        const fetchEvents = async () => {
            if (registrationType !== 'slot') return;

            try {
                const res = await fetch('/api/slots?listEvents=true');
                if (res.ok) {
                    const data: EventOption[] = await res.json();
                    setAvailableEvents(data.map(e => e.eventId));
                    // Auto-select first event if available and none selected
                    if (data.length > 0 && !eventIdFilter) {
                        setEventIdFilter(data[0].eventId);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch events:', err);
            }
        };

        fetchEvents();
    }, [registrationType, eventIdFilter]);

    // Fetch available slots for selected event
    useEffect(() => {
        const fetchSlots = async () => {
            if (registrationType !== 'slot' || !eventIdFilter) {
                setAvailableSlots([]);
                return;
            }

            setIsLoadingSlots(true);
            try {
                // Fetch all slots (including occupied) for table display
                const res = await fetch(`/api/slots?eventId=${eventIdFilter}&includeAll=true`);
                if (res.ok) {
                    const data = await res.json();
                    setAvailableSlots(data);

                    // If slotDateTime is provided via query, try to preselect it
                    if (preselectSlotDateTime) {
                        try {
                            const targetIso = new Date(preselectSlotDateTime).toISOString();
                            const matched = (data as any[]).find((s: any) => {
                                const sIso = new Date(s.dateTime).toISOString();
                                return sIso === targetIso;
                            });

                            if (matched) {
                                if (matched.isAvailable) {
                                    setSelectedSlot(matched as Slot);
                                } else {
                                    setError('指定された枠は既に使用されています。別の枠を選択してください。');
                                }
                            } else {
                                setError('指定された枠が見つかりませんでした。別の枠を選択してください。');
                            }
                        } catch {
                            setError('枠の指定が不正です。別の枠を選択してください。');
                        } finally {
                            setPreselectSlotDateTime(null);
                        }
                    }
                } else {
                    console.error('Failed to fetch slots:', await res.text());
                    setAvailableSlots([]);
                }
            } catch (err) {
                console.error('Failed to fetch slots:', err);
                setAvailableSlots([]);
            } finally {
                setIsLoadingSlots(false);
            }
        };

        fetchSlots();
    }, [registrationType, eventIdFilter, preselectSlotDateTime]);

    // Set default author XID from approved list
    useEffect(() => {
        if (approvedXids.length > 0 && !authorXid) {
            setAuthorXid(approvedXids[0]);
        }
    }, [approvedXids, authorXid]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

            if (e.key === 'Escape') {
                if (showShortcuts) {
                    setShowShortcuts(false);
                    e.preventDefault();
                }
                return;
            }

            if (isInputFocused) return;

            if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
                e.preventDefault();
                setShowShortcuts(prev => !prev);
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                if (!isSubmitting && agreedToTerms) {
                    e.preventDefault();
                    document.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
                }
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showShortcuts, isSubmitting, agreedToTerms]);

    // Compress and resize image
    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const size = 100; // 100x100
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Canvas context not available'));
                        return;
                    }

                    // Calculate crop dimensions (center crop to square)
                    const minDimension = Math.min(img.width, img.height);
                    const sx = (img.width - minDimension) / 2;
                    const sy = (img.height - minDimension) / 2;

                    ctx.drawImage(img, sx, sy, minDimension, minDimension, 0, 0, size, size);

                    // Convert to base64 with compression
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    resolve(dataUrl);
                };
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target?.result as string;
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    };

    // Handle icon file selection
    const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('画像ファイルを選択してください');
            return;
        }

        setIsCompressingIcon(true);
        setError('');

        try {
            const compressedDataUrl = await compressImage(file);
            setAuthorIconUrl(compressedDataUrl);
            setIconPreview(compressedDataUrl);
            setShowIconHistory(false);
        } catch (err) {
            setError('画像の圧縮に失敗しました');
        } finally {
            setIsCompressingIcon(false);
        }
    };

    // Fetch icon history
    const fetchIconHistory = async () => {
        if (historyIcons.length > 0) {
            setShowIconHistory(!showIconHistory);
            return;
        }

        try {
            const res = await fetch('/api/user/icons');
            if (res.ok) {
                const data = await res.json();
                setHistoryIcons(data.icons || []);
                setShowIconHistory(true);
            }
        } catch (err) {
            console.error('Failed to fetch icon history', err);
        }
    };

    const selectHistoryIcon = (url: string) => {
        setAuthorIconUrl(url);
        setIconPreview(url);
        setShowIconHistory(false);
    };

    // Add member
    const addMember = () => {
        setMembers([...members, { name: '', xid: '', role: '' }]);
    };

    // Remove member
    const removeMember = (index: number) => {
        if (confirm('このメンバーを削除しますか？')) {
            setMembers(members.filter((_, i) => i !== index));
        }
    };

    // Update member
    const updateMember = (index: number, field: keyof Member, value: string) => {
        const updated = [...members];
        updated[index][field] = value;
        setMembers(updated);
    };

    // Parse bulk member input (spreadsheet format: name\txid\trole)
    const parseBulkMembers = () => {
        if (!bulkMemberInput.trim()) return;

        const lines = bulkMemberInput.trim().split('\n');
        const newMembers: Member[] = [];

        for (const line of lines) {
            const parts = line.split(/\t|,/).map(s => s.trim());
            if (parts.length >= 1 && parts[0]) {
                newMembers.push({
                    name: parts[0] || '',
                    xid: parts[1] || '',
                    role: parts[2] || ''
                });
            }
        }

        if (newMembers.length > 0) {
            setMembers([...members, ...newMembers]);
            setBulkMemberInput('');
        }
    };

    // Add SNS plan
    const addSnsPlan = () => {
        setSnsPlans([...snsPlans, { platform: '', url: '' }]);
    };

    // Remove SNS plan
    const removeSnsPlan = (index: number) => {
        setSnsPlans(snsPlans.filter((_, i) => i !== index));
    };

    // Update SNS plan
    const updateSnsPlan = (index: number, field: keyof SnsPlan, value: string) => {
        const updated = [...snsPlans];
        updated[index] = { ...updated[index], [field]: value };
        setSnsPlans(updated);
    };

    // Format slot datetime for display
    const formatSlotDateTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get movieYear value based on type
    const getMovieYearValue = () => {
        if (movieYearType === 'hidden') return '伏せる';
        if (movieYearType === 'text') return movieYear;
        return movieYear ? parseInt(movieYear, 10) : '';
    };

    // Submit form
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!agreedToTerms) {
            setError('規約に同意してください');
            return;
        }

        setIsSubmitting(true);

        try {
            const payload: any = {
                videoUrl,
                title,
                description,
                authorXid,
                authorName,
                authorIconUrl,
                authorChannelUrl,
                music,
                credit,
                musicUrl,
                type,
                type2,
                movieYear: getMovieYearValue(),
                software,
                beforeComment,
                afterComment,
                listen,
                episode,
                endMessage,
                members: members.filter(m => m.name || m.xid),
                snsPlans: snsPlans.filter(s => s.platform),
                homepageComment,
                link,
                agreedToTerms,
                eventIds: eventIdFilter ? [eventIdFilter] : [],
            };

            if (registrationType === 'slot') {
                if (selectedSlots.length === 0) {
                    setError('登録枠を選択してください（連続3枠まで選択可能）');
                    setIsSubmitting(false);
                    return;
                }
                payload.mode = 'slot';
                payload.slotEventId = selectedSlots[0].eventId;
                // Send all selected slot times
                payload.slotDateTimes = selectedSlots.map(s => s.dateTime);
                // Keep backward compatibility with single slot
                payload.slotDateTime = selectedSlots[0].dateTime;
            } else {
                if (!startTime) {
                    setError('公開日時を入力してください');
                    setIsSubmitting(false);
                    return;
                }
                payload.mode = 'noSlot';
                payload.startTime = startTime;
            }

            const res = await fetch('/api/videos/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess('動画を登録しました！');
                // Reset form
                setVideoUrl('');
                setTitle('');
                setDescription('');
                setStartTime('');
                setSelectedSlots([]);
                setSelectedSlot(null);
                setMusic('');
                setCredit('');
                setMusicUrl('');
                setSoftware('');
                setBeforeComment('');
                setAfterComment('');
                setListen('');
                setEpisode('');
                setEndMessage('');
                setMembers([]);
                setSnsPlans([{ platform: 'YouTube', url: '' }]);
                setHomepageComment('');
                setLink('');
                setAgreedToTerms(false);
                setAuthorIconUrl('');
                setIconPreview('');
                setMovieYear('');
            } else {
                setError(data.error || '登録に失敗しました');
            }
        } catch (err) {
            setError('登録中にエラーが発生しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="loading-container">
                <FontAwesomeIcon icon={faSpinner} spin size="2x" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    // Check if user has approved XIDs
    if (approvedXids.length === 0 && !isAdmin) {
        return (
            <>
                <Head>
                    <title>動画登録 - PVSF</title>
                </Head>
                <div className="page-container">
                    <div className="notice-card">
                        <h1>動画登録</h1>
                        <p>動画を登録するには、承認されたXIDが必要です。</p>
                        <p>プロフィールページからXIDの申請を行ってください。</p>
                        <button onClick={() => router.push('/profile')} className="btn btn-primary">
                            プロフィールページへ
                        </button>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Head>
                <title>動画登録 - PVSF</title>
            </Head>

            <div className="page-container">
                <div className="form-container">
                    <h1>
                        <FontAwesomeIcon icon={faVideo} /> 動画登録
                    </h1>

                    {/* Registration Type Selector */}
                    {!success && (
                        <div className="type-selector">
                            <button
                                type="button"
                                className={`type-btn ${registrationType === 'slot' ? 'active' : ''}`}
                                onClick={() => setRegistrationType('slot')}
                            >
                                <FontAwesomeIcon icon={faCalendarAlt} />
                                登録枠を使用（今後の上映会）
                            </button>
                            <button
                                type="button"
                                className={`type-btn ${registrationType === 'noSlot' ? 'active' : ''}`}
                                onClick={() => setRegistrationType('noSlot')}
                            >
                                <FontAwesomeIcon icon={faVideo} />
                                枠なし登録（過去の動画）
                            </button>
                        </div>
                    )}

                    {/* Completion Screen */}
                    {success ? (
                        <div className="completion-screen">
                            <div className="completion-content">
                                <div className="completion-icon">
                                    <FontAwesomeIcon icon={faCheck} />
                                </div>
                                <h2>送信完了！</h2>
                                <p>{success}</p>
                                <p className="completion-note">
                                    登録内容はプロフィールページからいつでも確認・編集できます。
                                </p>
                                <div className="completion-actions">
                                    <button onClick={() => router.push('/profile')} className="btn btn-primary">
                                        プロフィールへ
                                    </button>
                                    <button onClick={() => setSuccess('')} className="btn btn-secondary">
                                        続けて登録する
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Messages */}
                            {error && (
                                <div className="alert alert-error">
                                    <FontAwesomeIcon icon={faTimes} /> {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                {/* Slot Selection */}
                                {registrationType === 'slot' && (
                                    <div className="form-section">
                                        <h2>登録枠を選択</h2>
                                        <div className="form-group">
                                            <label>イベント</label>
                                            {availableEvents.length > 0 ? (
                                                <select
                                                    value={eventIdFilter}
                                                    onChange={(e) => {
                                                        setEventIdFilter(e.target.value);
                                                        setSelectedSlot(null);
                                                    }}
                                                    className="form-input"
                                                >
                                                    {availableEvents.map(event => (
                                                        <option key={event} value={event}>{event}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div className="empty-state small">
                                                    利用可能なイベントがありません
                                                </div>
                                            )}
                                        </div>
                                        {eventIdFilter && (
                                            <div className="slots-table-area">
                                                {isLoadingSlots ? (
                                                    <div className="loading">
                                                        <FontAwesomeIcon icon={faSpinner} spin /> 読み込み中...
                                                    </div>
                                                ) : (
                                                    <SlotAvailabilityTable
                                                        slots={availableSlots}
                                                        mode="user"
                                                        selectedSlots={selectedSlots}
                                                        onMultiSlotSelect={(slots: SlotData[]) => setSelectedSlots(slots as Slot[])}
                                                        maxSlots={3}
                                                    />
                                                )}
                                                {selectedSlots.length > 0 && (
                                                    <div className="selected-slot-info">
                                                        <FontAwesomeIcon icon={faCheck} />
                                                        選択中: {selectedSlots.length}枠
                                                        <span className="slot-times">
                                                            （{selectedSlots.map(s => formatSlotDateTime(s.dateTime)).join(' → ')}）
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Non-slot: Date Selection */}
                                {registrationType === 'noSlot' && (
                                    <div className="form-section">
                                        <h2>公開日時</h2>
                                        <p className="help-text">過去の日時を指定してください</p>
                                        <div className="form-group">
                                            <input
                                                type="datetime-local"
                                                value={startTime}
                                                onChange={(e) => setStartTime(e.target.value)}
                                                max={new Date().toISOString().slice(0, 16)}
                                                className="form-input"
                                                required
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Video Info (Optional for Slot) */}
                                <div className="form-section">
                                    <h2>動画情報</h2>
                                    <div className="form-group">
                                        <label>動画URL {registrationType === 'noSlot' && '*'}</label>
                                        <input
                                            type="url"
                                            value={videoUrl}
                                            onChange={(e) => setVideoUrl(e.target.value)}
                                            placeholder="https://www.youtube.com/watch?v=..."
                                            className="form-input"
                                            required={registrationType === 'noSlot'}
                                        />
                                        <p className="help-text">
                                            {registrationType === 'slot' ? '後からでも入力可能です' : '必須項目です'}
                                        </p>
                                    </div>
                                    <div className="form-group">
                                        <label>タイトル *</label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="作品タイトル（仮でも可）"
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>説明文</label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="form-input"
                                            rows={3}
                                        />
                                    </div>
                                </div>

                        {/* Category Info */}
                        <div className="form-section">
                            <h2>参加区分</h2>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>形態 *</label>
                                    <select
                                        value={type}
                                        onChange={(e) => setType(e.target.value)}
                                        className="form-input"
                                        required
                                    >
                                        <option value="個人">個人</option>
                                        <option value="団体">団体</option>
                                        <option value="混合">混合</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>参加区分 *</label>
                                    <select
                                        value={type2}
                                        onChange={(e) => setType2(e.target.value)}
                                        className="form-input"
                                        required
                                    >
                                        <option value="個人">個人</option>
                                        <option value="複数人">複数人</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Author Info */}
                        <div className="form-section">
                            <h2>
                                <FontAwesomeIcon icon={faUser} /> クリエイター情報
                            </h2>
                            <div className="form-group">
                                <label>投稿者名 *</label>
                                <input
                                    type="text"
                                    value={authorName}
                                    onChange={(e) => setAuthorName(e.target.value)}
                                    className="form-input"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>X ID *</label>
                                <div className="input-with-prefix">
                                    <span>@</span>
                                    <input
                                        type="text"
                                        value={authorXid}
                                        onChange={(e) => setAuthorXid(e.target.value)}
                                        className="form-input"
                                        required
                                        list="approved-xids"
                                        placeholder="承認済みIDを選択 または 新規入力"
                                    />
                                    <datalist id="approved-xids">
                                        {approvedXids.map((xid: string) => (
                                            <option key={xid} value={xid} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>映像歴</label>
                                <div className="movie-year-selector">
                                    <select
                                        value={movieYearType}
                                        onChange={(e) => setMovieYearType(e.target.value as 'number' | 'text' | 'hidden')}
                                        className="form-input movie-year-type"
                                    >
                                        <option value="number">年数で入力</option>
                                        <option value="text">文章で入力</option>
                                        <option value="hidden">伏せる</option>
                                    </select>
                                    {movieYearType !== 'hidden' && (
                                        <input
                                            type={movieYearType === 'number' ? 'number' : 'text'}
                                            value={movieYear}
                                            onChange={(e) => setMovieYear(e.target.value)}
                                            placeholder={movieYearType === 'number' ? '例: 3' : '例: 3年目くらい'}
                                            className="form-input movie-year-input"
                                            min={movieYearType === 'number' ? 0 : undefined}
                                        />
                                    )}
                                </div>
                            </div>
                            <div className="form-group">
                                <label>YouTubeチャンネルURL</label>
                                <input
                                    type="url"
                                    value={authorChannelUrl}
                                    onChange={(e) => setAuthorChannelUrl(e.target.value)}
                                    placeholder="https://www.youtube.com/channel/..."
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>
                                    <FontAwesomeIcon icon={faImage} /> アイコン（100x100に圧縮されます）
                                </label>
                                <div className="icon-upload-area">
                                    <input
                                        ref={iconInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleIconUpload}
                                        className="hidden-input"
                                    />
                                    <div className="icon-preview-container">
                                        {iconPreview ? (
                                            <Image
                                                src={iconPreview}
                                                alt="アイコンプレビュー"
                                                width={72}
                                                height={72}
                                                className="icon-preview"
                                                unoptimized
                                            />
                                        ) : (
                                            <div className="icon-placeholder">
                                                <FontAwesomeIcon icon={faUser} />
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => iconInputRef.current?.click()}
                                        className="btn btn-secondary"
                                        disabled={isCompressingIcon}
                                    >
                                        {isCompressingIcon ? (
                                            <><FontAwesomeIcon icon={faSpinner} spin /> 圧縮中...</>
                                        ) : (
                                            <><FontAwesomeIcon icon={faUpload} /> 画像を選択</>
                                        )}
                                    </button>
                                    {iconPreview && (
                                        <button
                                            type="button"
                                            onClick={() => { setIconPreview(''); setAuthorIconUrl(''); }}
                                            className="btn btn-icon btn-danger"
                                        >
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>



                        {/* Video Info */}
                        <div className="form-section">
                            <h2><FontAwesomeIcon icon={faVideo} /> 動画情報</h2>
                            <div className="form-group">
                                <label>YouTube URL *</label>
                                <input
                                    type="url"
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    className="form-input"
                                    required={registrationType !== 'slot'}
                                />
                                {registrationType === 'slot' && (
                                    <div className="help-text" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                                        ※枠あり登録の場合は、あとから編集で入力できます
                                    </div>
                                )}
                            </div>
                            {/* Thumbnail Preview */}
                            {videoUrl && (() => {
                                const match = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
                                const ytId = match ? match[1] : null;
                                if (!ytId) return null;
                                return (
                                    <div className="thumbnail-preview">
                                        <Image
                                            src={`https://i.ytimg.com/vi/${ytId}/mqdefault.jpg`}
                                            alt="サムネイルプレビュー"
                                            width={480}
                                            height={360}
                                            unoptimized
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    </div>
                                );
                            })()}
                            <div className="form-group">
                                <label>タイトル *</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="form-input"
                                    required
                                />
                            </div>
                        </div>

                        {/* Music Info */}
                        <div className="form-section">
                            <h2>
                                <FontAwesomeIcon icon={faMusic} /> 楽曲情報
                            </h2>
                            <div className="form-group">
                                <label>曲名</label>
                                <input
                                    type="text"
                                    value={music}
                                    onChange={(e) => setMusic(e.target.value)}
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>作曲者（クレジット）</label>
                                <textarea
                                    value={credit}
                                    onChange={(e) => setCredit(e.target.value)}
                                    rows={2}
                                    className="form-textarea"
                                />
                            </div>
                            <div className="form-group">
                                <label>楽曲リンク</label>
                                <input
                                    type="url"
                                    value={musicUrl}
                                    onChange={(e) => setMusicUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="form-input"
                                />
                            </div>
                        </div>

                        {/* Members (Only shown when type2 is '複数人') */}
                        {type2 === '複数人' && (
                            <div className="form-section">
                                <h2>メンバー（複数人の場合）</h2>
                                <div className="help-text">
                                    スプレッドシートからコピー&ペーストできます（名前, XID, 役割 をタブまたはカンマ区切り）
                                </div>
                                <div className="bulk-input-area">
                                    <textarea
                                        value={bulkMemberInput}
                                        onChange={(e) => setBulkMemberInput(e.target.value)}
                                        placeholder="例:&#10;田中太郎&#9;tanaka&#9;映像&#10;鈴木花子&#9;suzuki&#9;イラスト"
                                        rows={3}
                                        className="form-textarea"
                                    />
                                    <button
                                        type="button"
                                        onClick={parseBulkMembers}
                                        className="btn btn-secondary"
                                        disabled={!bulkMemberInput.trim()}
                                    >
                                        <FontAwesomeIcon icon={faPlus} /> 一括追加
                                    </button>
                                </div>
                                <div className="members-list">
                                    {members.map((member, index) => (
                                        <div key={index} className="member-row">
                                            <input
                                                type="text"
                                                value={member.name}
                                                onChange={(e) => updateMember(index, 'name', e.target.value)}
                                                placeholder="名前"
                                                className="form-input"
                                            />
                                            <div className="input-with-prefix small">
                                                <span>@</span>
                                                <input
                                                    type="text"
                                                    value={member.xid}
                                                    onChange={(e) => updateMember(index, 'xid', e.target.value)}
                                                    placeholder="XID"
                                                    className="form-input"
                                                />
                                            </div>
                                            <select
                                                value={member.role}
                                                onChange={(e) => updateMember(index, 'role', e.target.value)}
                                                className="form-input"
                                            >
                                                <option value="">役割を選択</option>
                                                {AVAILABLE_ROLES.map(role => (
                                                    <option key={role} value={role}>{role}</option>
                                                ))}
                                                <option value="その他">その他</option>
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => removeMember(index)}
                                                className="btn btn-icon btn-danger"
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={addMember}
                                    className="btn btn-secondary"
                                >
                                    <FontAwesomeIcon icon={faPlus} /> メンバーを追加
                                </button>
                            </div>
                        )}

                        {/* SNS Upload Plans */}
                        <div className="form-section">
                            <h2>
                                <FontAwesomeIcon icon={faLink} /> アップロード予定SNS
                            </h2>
                            <div className="help-text">
                                アップロードを予定しているSNSを選択してください。後からURLを追加できます。
                            </div>
                            <div className="sns-list">
                                {snsPlans.map((plan, index) => (
                                    <div key={index} className="sns-row">
                                        <select
                                            value={plan.platform}
                                            onChange={(e) => updateSnsPlan(index, 'platform', e.target.value)}
                                            className="form-input"
                                        >
                                            <option value="">SNSを選択</option>
                                            {AVAILABLE_SNS.map(sns => (
                                                <option key={sns} value={sns}>{sns}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="url"
                                            value={plan.url || ''}
                                            onChange={(e) => updateSnsPlan(index, 'url', e.target.value)}
                                            placeholder="URL（あとで入力可）"
                                            className="form-input"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeSnsPlan(index)}
                                            className="btn btn-icon btn-danger"
                                            disabled={snsPlans.length === 1}
                                        >
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={addSnsPlan}
                                className="btn btn-secondary"
                            >
                                <FontAwesomeIcon icon={faPlus} /> SNSを追加
                            </button>
                        </div>

                        {/* Additional Info */}
                        <div className="form-section">
                            <h2>その他情報</h2>
                            <div className="form-group">
                                <label>使用編集ソフト</label>
                                <input
                                    type="text"
                                    value={software}
                                    onChange={(e) => setSoftware(e.target.value)}
                                    placeholder="例: After Effects, Premiere Pro"
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>ホームページ掲載コメント</label>
                                <textarea
                                    value={homepageComment}
                                    onChange={(e) => setHomepageComment(e.target.value)}
                                    rows={3}
                                    className="form-textarea"
                                    placeholder="ホームページに掲載するコメント"
                                />
                            </div>
                            <div className="form-group">
                                <label>関連リンク</label>
                                <input
                                    type="url"
                                    value={link}
                                    onChange={(e) => setLink(e.target.value)}
                                    placeholder="https://..."
                                    className="form-input"
                                />
                            </div>
                        </div>

                        {/* Retrospective Fields - Show for future dates or always editable */}
                        {(isFutureDate || registrationType === 'slot') && (
                            <div className="form-section retrospective-section">
                                <h2>振り返り上映用（後から編集可）</h2>
                                <div className="help-text">
                                    これらのフィールドは上映後に編集できます
                                </div>
                                <div className="form-group">
                                    <label>聞いてほしいこと等</label>
                                    <textarea
                                        value={listen}
                                        onChange={(e) => setListen(e.target.value)}
                                        rows={2}
                                        className="form-textarea"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>最近のエピソード</label>
                                    <textarea
                                        value={episode}
                                        onChange={(e) => setEpisode(e.target.value)}
                                        rows={2}
                                        className="form-textarea"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>最後に</label>
                                    <textarea
                                        value={endMessage}
                                        onChange={(e) => setEndMessage(e.target.value)}
                                        rows={2}
                                        className="form-textarea"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>上映前コメント</label>
                                    <textarea
                                        value={beforeComment}
                                        onChange={(e) => setBeforeComment(e.target.value)}
                                        rows={2}
                                        className="form-textarea"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>上映後コメント</label>
                                    <textarea
                                        value={afterComment}
                                        onChange={(e) => setAfterComment(e.target.value)}
                                        rows={2}
                                        className="form-textarea"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Terms Agreement */}
                        <div className="form-section terms-section">
                            <div className="terms-checkbox">
                                <input
                                    type="checkbox"
                                    id="agreedToTerms"
                                    checked={agreedToTerms}
                                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                                />
                                <label htmlFor="agreedToTerms">
                                    <a href="/terms" target="_blank" rel="noopener noreferrer">
                                        利用規約・ガイドライン
                                    </a>
                                    に同意します *
                                </label>
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="form-actions">
                            <button
                                type="submit"
                                disabled={isSubmitting || !agreedToTerms}
                                className="btn btn-primary btn-lg"
                            >
                                {isSubmitting ? (
                                    <>
                                        <FontAwesomeIcon icon={faSpinner} spin /> 登録中...
                                    </>
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faCheck} /> 動画を登録
                                    </>
                                )}
                            </button>
                            <p className="submit-hint">Ctrl + Enter でも送信できます</p>
                        </div>
                    </form>
                    </>
                    )}
                </div>
            </div>

            {/* Keyboard Shortcuts */}
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
                        <h3><FontAwesomeIcon icon={faKeyboard} /> キーボードショートカット</h3>
                        <div className="shortcuts-list">
                            <div className="shortcut-item">
                                <kbd>Ctrl</kbd> + <kbd>Enter</kbd>
                                <span>フォームを送信</span>
                            </div>
                            <div className="shortcut-item">
                                <kbd>Escape</kbd>
                                <span>モーダルを閉じる</span>
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

            <style jsx>{`
                .page-container {
                    min-height: 100vh;
                    padding: 2rem 1rem;
                    background: var(--bg-main);
                    position: relative;
                    width: calc(100% - 380px);
                    margin-left: 380px;
                    box-sizing: border-box;
                    overflow-x: hidden;
                }

                /* Removed weird gradients as requested */
                .page-container::before {
                    display: none;
                }

                .loading-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    color: var(--accent-primary);
                    width: calc(100% - 380px);
                    margin-left: 380px;
                }

                .form-container {
                    max-width: 720px;
                    margin: 0 auto;
                    position: relative;
                    z-index: 1;
                    width: 100%;
                    box-sizing: border-box;
                    padding: 0 1rem;
                }

                .form-container h1 {
                    font-size: 2.25rem;
                    font-weight: 700;
                    color: var(--text-main);
                    text-align: center;
                    margin-bottom: 0.5rem;
                    font-family: var(--font-title);
                    letter-spacing: -0.02em;
                }

                .form-container h1 :global(svg) {
                    color: var(--accent-primary);
                }

                .notice-card {
                    max-width: 500px;
                    margin: 0 auto;
                    padding: 2.5rem;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 16px;
                    text-align: center;
                    backdrop-filter: blur(10px);
                }

                .notice-card h1 {
                    color: #fff;
                    margin-bottom: 1rem;
                }

                .notice-card p {
                    color: #8892b0;
                    margin-bottom: 1rem;
                    line-height: 1.6;
                }

                .type-selector {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 2rem;
                    padding: 0.5rem;
                    background: rgba(255, 255, 255, 0.02);
                    border-radius: 16px;
                }

                .type-btn {
                    flex: 1;
                    padding: 1.25rem 1rem;
                    background: transparent;
                    border: 2px solid transparent;
                    border-radius: 12px;
                    color: #8892b0;
                    font-size: 0.9rem;
                    font-weight: 500;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .type-btn :global(svg) {
                    font-size: 1.5rem;
                    opacity: 0.7;
                    transition: all 0.3s;
                }

                .type-btn:hover {
                    background: rgba(255, 255, 255, 0.05);
                    color: #fff;
                }

                .type-btn:hover :global(svg) {
                    opacity: 1;
                }

                .type-btn.active {
                    background: rgba(100, 255, 218, 0.1);
                    border-color: rgba(100, 255, 218, 0.5);
                    color: var(--accent-primary);
                    box-shadow: 0 0 20px rgba(100, 255, 218, 0.1);
                }

                .type-btn.active :global(svg) {
                    opacity: 1;
                    color: var(--accent-primary);
                }

                .alert {
                    padding: 1rem 1.25rem;
                    border-radius: 12px;
                    margin-bottom: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    font-size: 0.9rem;
                    animation: slideIn 0.3s ease;
                }

                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .alert-error {
                    background: rgba(239, 68, 68, 0.15);
                    border: 1px solid var(--accent-error);
                    color: var(--accent-error);
                }

                .alert-success {
                    background: rgba(34, 197, 94, 0.15);
                    border: 1px solid var(--accent-primary);
                    color: var(--accent-primary);
                }

                .form-section {
                    background: var(--bg-card);
                    border: 1px solid var(--border-main);
                    border-radius: 16px;
                    padding: 1.75rem;
                    margin-bottom: 1.25rem;
                    backdrop-filter: blur(5px);
                    transition: all 0.3s ease;
                    width: 100%;
                    box-sizing: border-box;
                }

                .form-section:hover {
                    border-color: var(--border-active);
                    background: rgba(255, 255, 255, 0.05);
                }

                .form-section h2 {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: var(--text-main);
                    margin-bottom: 1.25rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding-bottom: 0.75rem;
                    border-bottom: 1px solid var(--border-main);
                    font-family: var(--font-jp);
                }

                .form-section h2 :global(svg) {
                    color: var(--accent-primary);
                    font-size: 1rem;
                }

                .retrospective-section {
                    border-color: rgba(100, 255, 218, 0.3);
                    background: rgba(100, 255, 218, 0.05);
                }

                .retrospective-section h2 {
                    color: var(--accent-primary);
                }

                .help-text {
                    color: var(--text-sub);
                    font-size: 0.8rem;
                    margin-bottom: 1rem;
                    line-height: 1.5;
                }

                .form-group {
                    margin-bottom: 1.25rem;
                    width: 100%;
                    box-sizing: border-box;
                }

                .form-group:last-child {
                    margin-bottom: 0;
                }

                .form-group label {
                    display: block;
                    color: var(--text-sub);
                    font-size: 0.8rem;
                    font-weight: 500;
                    margin-bottom: 0.5rem;
                    letter-spacing: 0.02em;
                }

                .form-input,
                .form-textarea {
                    width: 100%;
                    max-width: 100%;
                    padding: 0.875rem 1rem;
                    background: var(--bg-input);
                    border: 1px solid var(--border-main);
                    border-radius: 10px;
                    color: var(--text-main);
                    font-size: 0.95rem;
                    transition: all 0.2s ease;
                    box-sizing: border-box;
                }

                .form-input::placeholder,
                .form-textarea::placeholder {
                    color: var(--text-muted);
                }

                .form-input:hover,
                .form-textarea:hover {
                    border-color: var(--border-active);
                }

                .form-input:focus,
                .form-textarea:focus {
                    outline: none;
                    border-color: var(--accent-primary);
                    background: var(--bg-surface-2);
                    box-shadow: 0 0 0 3px rgba(100, 255, 218, 0.1);
                }

                .form-textarea {
                    resize: vertical;
                    min-height: 80px;
                }

                .thumbnail-preview {
                    margin-bottom: 1.25rem;
                    border-radius: 12px;
                    overflow: hidden;
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .thumbnail-preview img {
                    width: 100%;
                    max-width: 480px;
                    height: auto;
                    display: block;
                }

                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                    width: 100%;
                    box-sizing: border-box;
                }

                .input-with-prefix {
                    display: flex;
                    align-items: center;
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                    overflow: hidden;
                    transition: all 0.2s ease;
                    width: 100%;
                    max-width: 100%;
                    box-sizing: border-box;
                }

                .input-with-prefix:focus-within {
                    border-color: var(--accent-primary);
                    box-shadow: 0 0 0 3px rgba(100, 255, 218, 0.1);
                }

                .input-with-prefix span {
                    padding: 0.875rem 0 0.875rem 1rem;
                    color: rgba(255, 255, 255, 0.4);
                    font-weight: 500;
                }

                .input-with-prefix input {
                    background: transparent;
                    border: none;
                    padding-left: 0.25rem;
                    flex: 1;
                    min-width: 0;
                    width: 100%;
                    box-sizing: border-box;
                }

                .input-with-prefix input:focus {
                    box-shadow: none;
                }

                .input-with-prefix.small {
                    flex: 1;
                }

                .movie-year-selector {
                    display: flex;
                    gap: 0.75rem;
                    width: 100%;
                    box-sizing: border-box;
                }

                .movie-year-type {
                    width: 150px;
                    flex-shrink: 0;
                    max-width: 100%;
                    box-sizing: border-box;
                }

                .movie-year-input {
                    flex: 1;
                    min-width: 0;
                    box-sizing: border-box;
                }

                .icon-upload-area {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem;
                    background: rgba(0, 0, 0, 0.15);
                    border: 1px dashed rgba(255, 255, 255, 0.15);
                    border-radius: 12px;
                }

                .hidden-input {
                    display: none;
                }

                .icon-preview-container {
                    width: 72px;
                    height: 72px;
                    border-radius: 50%;
                    overflow: hidden;
                    background: rgba(255, 255, 255, 0.05);
                    border: 2px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .icon-preview {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .icon-placeholder {
                    color: rgba(255, 255, 255, 0.2);
                    font-size: 1.75rem;
                }

                .bulk-input-area {
                    display: flex;
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                    align-items: flex-start;
                    width: 100%;
                    box-sizing: border-box;
                }

                .bulk-input-area textarea {
                    flex: 1;
                    font-family: 'Monaco', 'Menlo', monospace;
                    font-size: 0.85rem;
                    width: 100%;
                    max-width: 100%;
                    box-sizing: border-box;
                    min-width: 0;
                }

                .slots-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                    gap: 0.75rem;
                    margin-top: 0.5rem;
                }

                .slot-btn {
                    padding: 1rem;
                    background: rgba(0, 0, 0, 0.2);
                    border: 2px solid rgba(255, 255, 255, 0.08);
                    border-radius: 10px;
                    color: #fff;
                    font-size: 0.85rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-align: center;
                }

                .slot-btn:hover {
                    border-color: rgba(100, 255, 218, 0.3);
                    background: rgba(100, 255, 218, 0.05);
                }

                .slot-btn.selected {
                    border-color: #64ffda;
                    background: rgba(100, 255, 218, 0.1);
                    color: #64ffda;
                    box-shadow: 0 0 15px rgba(100, 255, 218, 0.15);
                }

                .loading,
                .empty-state {
                    padding: 2.5rem;
                    text-align: center;
                    color: #6b7280;
                    font-size: 0.9rem;
                }

                .empty-state.small {
                    padding: 1rem;
                    font-size: 0.85rem;
                }

                .members-list,
                .sns-list {
                    margin-bottom: 1rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .member-row,
                .sns-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr 120px auto;
                    gap: 0.5rem;
                    padding: 0.75rem;
                    background: rgba(0, 0, 0, 0.15);
                    border-radius: 10px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    width: 100%;
                    max-width: 100%;
                    box-sizing: border-box;
                }

                .sns-row {
                    grid-template-columns: 140px 1fr auto;
                }

                .terms-section {
                    background: linear-gradient(135deg, rgba(100, 255, 218, 0.03) 0%, rgba(102, 126, 234, 0.02) 100%);
                    border-color: rgba(100, 255, 218, 0.15);
                }

                .terms-checkbox {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 0.5rem 0;
                }

                .terms-checkbox input[type="checkbox"] {
                    width: 22px;
                    height: 22px;
                    accent-color: #64ffda;
                    cursor: pointer;
                }

                .terms-checkbox label {
                    color: #d1d5db;
                    font-size: 0.95rem;
                    cursor: pointer;
                }

                .terms-checkbox a {
                    color: #64ffda;
                    text-decoration: none;
                    font-weight: 500;
                    transition: all 0.2s;
                }

                .terms-checkbox a:hover {
                    text-decoration: underline;
                }

                .btn {
                    padding: 0.875rem 1.75rem;
                    border: none;
                    border-radius: 10px;
                    font-size: 0.95rem;
                    font-weight: 500;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .btn-primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: #fff;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                }

                .btn-primary:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
                }

                .btn-primary:active:not(:disabled) {
                    transform: translateY(0);
                }

                .btn-primary:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }

                .btn-secondary {
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: #d1d5db;
                }

                .btn-secondary:hover:not(:disabled) {
                    background: rgba(255, 255, 255, 0.12);
                    border-color: rgba(255, 255, 255, 0.2);
                    color: #fff;
                }

                .btn-secondary:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                }

                .btn-icon {
                    padding: 0.625rem;
                    min-width: 38px;
                    height: 38px;
                    justify-content: center;
                    border-radius: 8px;
                }

                .btn-danger {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    color: #f87171;
                }

                .btn-danger:hover:not(:disabled) {
                    background: rgba(239, 68, 68, 0.2);
                    border-color: rgba(239, 68, 68, 0.3);
                }

                .btn-lg {
                    padding: 1.125rem 2.5rem;
                    font-size: 1.1rem;
                    font-weight: 600;
                    border-radius: 12px;
                }

                .form-actions {
                    text-align: center;
                    margin-top: 2.5rem;
                    padding-top: 1.5rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                }

                .submit-hint {
                    color: #6b7280;
                    font-size: 0.8rem;
                    margin-top: 0.75rem;
                }

                /* Keyboard Shortcuts */
                .shortcuts-btn {
                    position: fixed;
                    bottom: 1.5rem;
                    right: 1.5rem;
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background: rgba(10, 10, 15, 0.8);
                    border: 1px solid rgba(100, 255, 218, 0.3);
                    color: #64ffda;
                    cursor: pointer;
                    display: flex;
                    backdrop-filter: blur(10px);
                    align-items: center;
                    justify-content: center;
                    font-size: 1.25rem;
                    transition: all 0.2s ease;
                    z-index: 100;
                }

                .shortcuts-btn:hover {
                    background: rgba(100, 255, 218, 0.15);
                    border-color: rgba(100, 255, 218, 0.5);
                    transform: scale(1.05);
                }

                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.85);
                    backdrop-filter: blur(5px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    animation: fadeIn 0.2s ease;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .modal {
                    background: linear-gradient(135deg, #1a1a2e 0%, #151520 100%);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    padding: 2rem;
                    max-width: 400px;
                    width: 90%;
                    animation: modalSlideIn 0.3s ease;
                }

                @keyframes modalSlideIn {
                    from { opacity: 0; transform: translateY(-20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }

                .modal h3 {
                    color: #fff;
                    margin-bottom: 1.5rem;
                    font-size: 1.1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .modal h3 :global(svg) {
                    color: #64ffda;
                }

                .shortcuts-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    margin-bottom: 1.5rem;
                }

                .shortcut-item {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem;
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }

                .shortcut-item kbd {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 32px;
                    height: 28px;
                    padding: 0 0.625rem;
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    border-radius: 6px;
                    font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
                    font-size: 0.75rem;
                    font-weight: 500;
                    color: #64ffda;
                }

                .shortcut-item span {
                    color: #9ca3af;
                    font-size: 0.875rem;
                }

                /* Responsive */
                @media (max-width: 768px) {
                    .page-container {
                        margin-left: 0;
                        width: 100%;
                        padding: 1rem 0.75rem;
                        overflow-x: hidden;
                    }
                    .loading-container {
                        margin-left: 0;
                        width: 100%;
                    }

                    .form-container {
                        padding: 0 0.5rem;
                    }

                    .form-container h1 {
                        font-size: 1.75rem;
                    }

                    .type-selector {
                        flex-direction: column;
                        gap: 0.75rem;
                    }

                    .type-btn {
                        flex-direction: row;
                        padding: 1rem;
                    }

                    .type-btn :global(svg) {
                        font-size: 1.25rem;
                    }

                    .form-section {
                        padding: 1.25rem;
                        border-radius: 12px;
                        width: 100%;
                        max-width: 100%;
                        box-sizing: border-box;
                    }

                    .form-row {
                        grid-template-columns: 1fr;
                        width: 100%;
                        max-width: 100%;
                        box-sizing: border-box;
                    }

                    .member-row {
                        grid-template-columns: 1fr 1fr;
                        padding: 0.5rem;
                        width: 100%;
                        max-width: 100%;
                        box-sizing: border-box;
                    }

                .member-row .form-input,
                .member-row select {
                    padding: 0.625rem 0.75rem;
                    font-size: 0.875rem;
                    width: 100%;
                    max-width: 100%;
                    box-sizing: border-box;
                }

                    .sns-row {
                        grid-template-columns: 1fr;
                        gap: 0.5rem;
                    }

                    .bulk-input-area {
                        flex-direction: column;
                    }

                    .movie-year-selector {
                        flex-direction: column;
                        gap: 0.5rem;
                        width: 100%;
                        max-width: 100%;
                        box-sizing: border-box;
                    }

                    .movie-year-type {
                        width: 100%;
                        max-width: 100%;
                        box-sizing: border-box;
                    }

                    .icon-upload-area {
                        flex-wrap: wrap;
                    }

                    .btn-lg {
                        width: 100%;
                        justify-content: center;
                    }

                    .shortcuts-btn {
                        bottom: 1rem;
                        right: 1rem;
                        width: 44px;
                        height: 44px;
                    }
                }

                @media (max-width: 480px) {
                    .member-row {
                        grid-template-columns: 1fr;
                        width: 100%;
                        max-width: 100%;
                        box-sizing: border-box;
                    }

                    .slots-grid {
                        grid-template-columns: 1fr 1fr;
                        width: 100%;
                        max-width: 100%;
                        box-sizing: border-box;
                    }

                    .form-input,
                    .form-textarea {
                        font-size: 16px; /* iOSでズームを防ぐ */
                    }
                }
            `}</style>
        </>
    );
}
