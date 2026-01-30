// Admin User Management Page
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDiscord } from '@fortawesome/free-brands-svg-icons';
import { faCheck, faTimes, faSpinner, faSearch, faArrowLeft, faTrash, faKeyboard, faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import Footer from '@/components/Footer';
import Link from 'next/link';

interface AdminUser {
    id: string; // Document ID (usually Discord ID)
    discordId: string;
    discordUsername: string;
    discordAvatar: string | null;
    role: string;
    xidClaims: {
        xid: string;
        status: string;
        requestedAt: string;
    }[];
    createdAt: string;
}

export default function AdminUsers() {
    const router = useRouter();
    const { isAdmin, isLoading: authLoading, isAuthenticated } = useAuth();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, pending, admin
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && (!isAuthenticated || !isAdmin)) {
            router.push('/');
            return;
        }

        if (isAdmin) {
            fetchUsers();
        }
    }, [authLoading, isAuthenticated, isAdmin, router]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users || []);
            }
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClaimAction = async (userId: string, xid: string, action: 'approve' | 'reject' | 'revoke') => {
        setProcessingId(`${userId}-${xid}`);
        try {
            const res = await fetch('/api/admin/xid-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, xid, action }),
            });

            if (res.ok) {
                // Update local state
                setUsers(prev => prev.map(user => {
                    if (user.id !== userId) return user;

                    // If revoke, remove the claim
                    if (action === 'revoke') {
                        return {
                            ...user,
                            xidClaims: user.xidClaims.filter(c => c.xid !== xid)
                        };
                    }

                    return {
                        ...user,
                        xidClaims: user.xidClaims.map(claim => {
                            if (claim.xid === xid) {
                                return { ...claim, status: action === 'approve' ? 'approved' : 'rejected' };
                            }
                            return claim;
                        })
                    };
                }));
            } else {
                alert('Action failed');
            }
        } catch (error) {
            console.error('Action error', error);
            alert('Action error');
        } finally {
            setProcessingId(null);
        }
    };

    const filteredUsers = users.filter(user => {
        if (filter === 'pending') {
            return user.xidClaims?.some(c => c.status === 'pending');
        }
        if (filter === 'admin') {
            return user.role === 'admin';
        }
        return true;
    });

    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [showShortcuts, setShowShortcuts] = useState(false);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input (if we add search later)
            if ((e.target as HTMLElement).tagName === 'INPUT') return;

            if (e.key === '?') {
                setShowShortcuts(true);
            }
            if (e.key === 'Escape') {
                setShowShortcuts(false);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === '?') {
                setShowShortcuts(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // ... (Navigation useEffect remains same, not including here to keep chunk focused if possible, but tool requires contiguous... I'll just skip to the render part) ...
    // Wait, replace_file_content needs contiguous block. I'll replace the first useEffect and then do another call for the render part? No, I can do it in chunks if I use multi_replace. Or just replace the whole file content section.
    // Let's replace the Logic part first, then the Render part.
    // Actually, I'll use multi_replace_file_content since I need to touch useEffect, JSX, and CSS.
    // But wait, the previous failure was "target content not found". I probably messed up the context.
    // I will try to replace the whole bottom section starting from the shortcuts render.

    // Changing strategy: using multi_replace_file_content for precision.
    // But first let me cancel this thought and use the tool correctly.
    // I'll restart the thought process to just use multi_replace.


    useEffect(() => {
        const handleNavigation = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).tagName === 'INPUT') return;

            if (e.key === 'j') {
                // Next user
                const currentIndex = filteredUsers.findIndex(u => u.id === selectedUserId);
                if (currentIndex < filteredUsers.length - 1) {
                    setSelectedUserId(filteredUsers[currentIndex + 1].id);
                    // Scroll into view
                    document.getElementById(filteredUsers[currentIndex + 1].id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else if (filteredUsers.length > 0 && currentIndex === -1) {
                    setSelectedUserId(filteredUsers[0].id);
                }
            } else if (e.key === 'k') {
                // Prev user
                const currentIndex = filteredUsers.findIndex(u => u.id === selectedUserId);
                if (currentIndex > 0) {
                    setSelectedUserId(filteredUsers[currentIndex - 1].id);
                    document.getElementById(filteredUsers[currentIndex - 1].id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            } else if (e.key === 'a') {
                // Approve first pending claim of selected user
                if (selectedUserId) {
                    const user = filteredUsers.find(u => u.id === selectedUserId);
                    const pendingClaim = user?.xidClaims?.find(c => c.status === 'pending');
                    if (user && pendingClaim) {
                        handleClaimAction(user.id, pendingClaim.xid, 'approve');
                    }
                }
            } else if (e.key === 'r') {
                // Reject first pending claim of selected user
                if (selectedUserId) {
                    const user = filteredUsers.find(u => u.id === selectedUserId);
                    const pendingClaim = user?.xidClaims?.find(c => c.status === 'pending');
                    if (user && pendingClaim) {
                        handleClaimAction(user.id, pendingClaim.xid, 'reject');
                    }
                }
            }
        };

        window.addEventListener('keydown', handleNavigation);
        return () => window.removeEventListener('keydown', handleNavigation);
    }, [filteredUsers, selectedUserId]);


    if (authLoading || (loading && users.length === 0)) {
        return (
            <div className="loading-container">
                <FontAwesomeIcon icon={faSpinner} spin size="2x" />
            </div>
        );
    }

    if (!isAdmin) return null;

    return (
        <>
            <Head>
                <title>ユーザー管理 - PVSF Admin</title>
            </Head>

            <div className="content">
                <div className="admin-container">
                    <div className="admin-header">
                        <div className="header-left">
                            <Link href="/admin" className="back-link">
                                <FontAwesomeIcon icon={faArrowLeft} />
                            </Link>
                            <h2>User Management</h2>
                            <button className="help-icon" onClick={() => setShowShortcuts(!showShortcuts)}>
                                <FontAwesomeIcon icon={faQuestionCircle} />
                            </button>
                        </div>
                        <div className="filters">
                            <button
                                className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                                onClick={() => setFilter('all')}
                            >
                                全て
                            </button>
                            <button
                                className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
                                onClick={() => setFilter('pending')}
                            >
                                申請あり
                                {users.some(u => u.xidClaims?.some(c => c.status === 'pending')) && (
                                    <span className="dot"></span>
                                )}
                            </button>
                            <button
                                className={`filter-btn ${filter === 'admin' ? 'active' : ''}`}
                                onClick={() => setFilter('admin')}
                            >
                                管理者
                            </button>
                        </div>
                    </div>

                    <div className="users-list">
                        {filteredUsers.map(user => (
                            <div
                                key={user.id}
                                id={user.id}
                                className={`user-card ${selectedUserId === user.id ? 'selected' : ''}`}
                                onClick={() => setSelectedUserId(user.id)}
                            >
                                <div className="user-main">
                                    <div className="user-identity">
                                        {user.discordAvatar ? (
                                            <img src={user.discordAvatar} alt="" className="avatar" />
                                        ) : (
                                            <div className="avatar placeholder"><FontAwesomeIcon icon={faDiscord} /></div>
                                        )}
                                        <div className="info">
                                            <div className="name-row">
                                                <span className="name">{user.discordUsername || 'Unknown User'}</span>
                                                {user.role === 'admin' && <span className="badge admin">ADMIN</span>}
                                            </div>
                                            <span className="id">ID: {user.id}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* XID Claims Section */}
                                {user.xidClaims && user.xidClaims.length > 0 && (
                                    <div className="claims-section">
                                        <h4>XID 連携</h4>
                                        <div className="claims-list">
                                            {user.xidClaims.map((claim, idx) => (
                                                <div key={idx} className={`claim-item ${claim.status}`}>
                                                    <span className="xid">@{claim.xid}</span>
                                                    <div className="actions">
                                                        {claim.status === 'pending' ? (
                                                            <>
                                                                <button
                                                                    className="btn approve"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleClaimAction(user.id, claim.xid, 'approve');
                                                                    }}
                                                                    disabled={!!processingId}
                                                                    title="承認 (A)"
                                                                >
                                                                    {processingId === `${user.id}-${claim.xid}` ? '...' : <FontAwesomeIcon icon={faCheck} />}
                                                                </button>
                                                                <button
                                                                    className="btn reject"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleClaimAction(user.id, claim.xid, 'reject');
                                                                    }}
                                                                    disabled={!!processingId}
                                                                    title="却下 (R)"
                                                                >
                                                                    {processingId === `${user.id}-${claim.xid}` ? '...' : <FontAwesomeIcon icon={faTimes} />}
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className={`status-badge ${claim.status}`}>
                                                                    {claim.status.toUpperCase()}
                                                                </span>
                                                                <button
                                                                    className="btn revoke"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (confirm('本当にこの連携を取り消しますか？')) {
                                                                            handleClaimAction(user.id, claim.xid, 'revoke');
                                                                        }
                                                                    }}
                                                                    disabled={!!processingId}
                                                                    title="連携解除"
                                                                >
                                                                    <FontAwesomeIcon icon={faTrash} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                <Footer />

                {showShortcuts && (
                    <div className="shortcuts-overlay" onClick={() => setShowShortcuts(false)}>
                        <div className="shortcuts-card" onClick={e => e.stopPropagation()}>
                            <h3><FontAwesomeIcon icon={faKeyboard} className="icon-gap" /> キーボードショートカット</h3>
                            <div className="shortcut-list">
                                <div className="shortcut-item"><kbd>J</kbd> <span>次のユーザーへ</span></div>
                                <div className="shortcut-item"><kbd>K</kbd> <span>前のユーザーへ</span></div>
                                <div className="shortcut-item"><kbd>A</kbd> <span>承認 (申請中)</span></div>
                                <div className="shortcut-item"><kbd>R</kbd> <span>却下 (申請中)</span></div>
                                <div className="shortcut-item"><kbd>?</kbd> <span>ヘルプ表示 (ホールド)</span></div>
                                <div className="shortcut-item"><kbd>Esc</kbd> <span>閉じる</span></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                .loading-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                }

                .admin-container {
                    max-width: 1000px;
                    margin: 0 auto;
                    padding: 2rem 1rem;
                }

                .admin-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                    flex-wrap: wrap;
                    gap: 1rem;
                }

                .header-left {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .back-link {
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.1);
                    color: white;
                    transition: background 0.2s;
                }
                .back-link:hover {
                    background: rgba(255,255,255,0.2);
                }

                .filters {
                    display: flex;
                    gap: 0.5rem;
                }

                .filter-btn {
                    position: relative;
                    padding: 0.5rem 1rem;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 6px;
                    color: rgba(255,255,255,0.7);
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .filter-btn.active {
                    background: #5865F2;
                    color: white;
                    border-color: #5865F2;
                }

                .users-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .user-card {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 8px;
                    padding: 1rem;
                }

                .user-main {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                }

                .user-identity {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .avatar {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    object-fit: cover;
                }

                .avatar.placeholder {
                    background: #5865F2;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 1.5rem;
                }

                .info {
                    display: flex;
                    flex-direction: column;
                }

                .name-row {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .name {
                    font-weight: bold;
                    font-size: 1.1rem;
                }

                .badge.admin {
                    background: #ef4444;
                    color: white;
                    font-size: 0.7rem;
                    padding: 0.1rem 0.4rem;
                    border-radius: 4px;
                }

                .id {
                    font-size: 0.75rem;
                    color: rgba(255,255,255,0.4);
                }

                .claims-section {
                    background: rgba(0,0,0,0.2);
                    padding: 0.75rem;
                    border-radius: 6px;
                }

                .claims-section h4 {
                    margin: 0 0 0.5rem;
                    font-size: 0.8rem;
                    color: rgba(255,255,255,0.5);
                }

                .claim-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.5rem;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                }
                .claim-item:last-child {
                    border-bottom: none;
                }

                .claim-item.pending {
                    background: rgba(245, 158, 11, 0.1);
                }

                .xid {
                    font-family: monospace;
                    font-size: 1rem;
                }

                .actions {
                    display: flex;
                    gap: 0.5rem;
                    align-items: center;
                }

                .btn {
                    width: 32px;
                    height: 32px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: opacity 0.2s;
                }
                .btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .btn.approve {
                    background: #10b981;
                    color: white;
                }
                .btn.reject {
                    background: #ef4444;
                    color: white;
                }

                .status-badge {
                    font-size: 0.75rem;
                    font-weight: bold;
                    padding: 0.2rem 0.5rem;
                    border-radius: 4px;
                }
                .status-badge.approved { color: #10b981; background: rgba(16, 185, 129, 0.1); }
                .status-badge.rejected { color: #ef4444; background: rgba(239, 68, 68, 0.1); }

                .dot {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    background: #f59e0b;
                    border-radius: 50%;
                    margin-left: 0.5rem;
                }

                .help-icon {
                    background: none;
                    border: none;
                    color: rgba(255,255,255,0.5);
                    cursor: pointer;
                    font-size: 1.25rem;
                    transition: color 0.2s;
                }
                .help-icon:hover {
                    color: white;
                }

                .user-card {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 8px;
                    padding: 1rem;
                    transition: all 0.2s;
                    cursor: pointer;
                }

                .user-card.selected {
                    background: rgba(88, 101, 242, 0.1);
                    border-color: #5865F2;
                    box-shadow: 0 0 10px rgba(88, 101, 242, 0.2);
                }

                .btn.revoke {
                    background: none;
                    color: rgba(255,255,255,0.4);
                }
                .btn.revoke:hover {
                    color: #ef4444;
                    background: rgba(239, 68, 68, 0.1);
                }

                .shortcuts-overlay {
                    position: fixed;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    left: 0;
                    background: rgba(0,0,0,0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    animation: fadeIn 0.2s;
                    backdrop-filter: blur(4px);
                }

                .shortcuts-card {
                    background: #1a1a1a;
                    border-radius: 12px;
                    padding: 2rem;
                    border: 1px solid #333;
                    min-width: 320px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                }

                .shortcuts-card h3 {
                    margin-top: 0;
                    margin-bottom: 1.5rem;
                    display: flex;
                    align-items: center;
                    color: #fff;
                    font-size: 1.2rem;
                    border-bottom: 2px solid #5865F2; /* H3 horizontal line */
                    padding-bottom: 0.5rem;
                }
                
                /* Icon spacing fix */
                :global(.icon-gap) {
                    margin-right: 0.75rem;
                    color: #5865F2;
                }

                .shortcut-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .shortcut-item {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    color: rgba(255,255,255,0.9);
                }

                kbd {
                    background: #2b2d31;
                    border: 1px solid #444;
                    border-bottom-width: 3px;
                    border-radius: 4px;
                    padding: 0.2rem 0.6rem;
                    font-family: monospace;
                    font-weight: bold;
                    min-width: 2rem;
                    text-align: center;
                    color: #fff;
                    font-size: 0.9rem;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </>
    );
}
