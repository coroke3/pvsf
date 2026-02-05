// User Profile Page with XID Claim and My Videos functionality
import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDiscord } from '@fortawesome/free-brands-svg-icons';
import {
  faCheck, faClock, faTimes, faPlus, faVideo,
  faEdit, faSpinner, faEye, faThumbsUp, faExternalLinkAlt,
  faUserCheck, faUserClock, faUsers, faLock, faKeyboard
} from '@fortawesome/free-solid-svg-icons';
import Footer from '@/components/Footer';

// Available role options for members
const ROLE_OPTIONS = ['映像', '音楽', 'イラスト', 'CG', 'リリック'] as const;

interface VideoMember {
  name: string;
  xid: string;
  role: string; // Comma-separated roles
  editApproved?: boolean;
}

interface MyVideo {
  id: string;
  title: string;
  authorXid: string;
  authorName: string;
  eventIds: string[]; // Array of event IDs
  startTime: string;
  viewCount: number;
  likeCount: number;
  privacyStatus: string;
  isAuthor: boolean;
  editApproved: boolean; // For members: whether author approved edit
  members: VideoMember[];
}

interface EditingVideo {
  id: string;
  title: string;
  description: string;
  music: string;
  credit: string;
  software: string;
  beforeComment: string;
  afterComment: string;
  listen: string;
  episode: string;
  endMessage: string;
  members: VideoMember[];
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, refreshUser } = useAuth();
  const [xidInput, setXidInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // My Videos state
  const [myVideos, setMyVideos] = useState<MyVideo[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [editingVideo, setEditingVideo] = useState<EditingVideo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  // Member management
  const [managingVideo, setManagingVideo] = useState<MyVideo | null>(null);
  const [isUpdatingMember, setIsUpdatingMember] = useState<string | null>(null);

  // Bulk member input
  const [bulkMemberInput, setBulkMemberInput] = useState('');
  
  // Keyboard shortcuts
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);

  // Get approved XIDs
  const approvedXids = user?.xidClaims
    ?.filter((claim: any) => claim.status === 'approved')
    .map((claim: any) => claim.xid.toLowerCase()) || [];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      // Escape - close modals
      if (e.key === 'Escape') {
        if (editingVideo) {
          setEditingVideo(null);
          e.preventDefault();
        } else if (managingVideo) {
          setManagingVideo(null);
          e.preventDefault();
        } else if (showShortcuts) {
          setShowShortcuts(false);
          e.preventDefault();
        }
        return;
      }

      // Skip other shortcuts if input is focused
      if (isInputFocused) return;

      // Ctrl/Cmd + S - Save (when editing)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        if (editingVideo && !isEditing) {
          e.preventDefault();
          saveEdit();
        }
        return;
      }

      // ? - Show shortcuts help
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingVideo, managingVideo, showShortcuts, isEditing]);

  // Fetch videos that match user's approved XIDs
  const fetchMyVideos = useCallback(async () => {
    if (approvedXids.length === 0) {
      setMyVideos([]);
      return;
    }

    setIsLoadingVideos(true);
    try {
      const res = await fetch('/api/videos');
      if (res.ok) {
        const data = await res.json();

        // Filter videos where user is author or member
        const filtered = data
          .map((v: any) => {
            const authorXidLower = v.tlink?.toLowerCase() || '';
            const memberIds = v.memberid?.split(', ').map((m: string) => m.toLowerCase().trim()).filter(Boolean) || [];

            const isAuthor = approvedXids.includes(authorXidLower);
            const memberIndex = memberIds.findIndex((mid: string) => approvedXids.includes(mid));
            const isMember = memberIndex !== -1;

            if (isAuthor || isMember) {
              // Parse members from memberid and member strings
              const memberNames = v.member?.split(', ').map((m: string) => m.trim()).filter(Boolean) || [];
              const members: VideoMember[] = memberIds.map((xid: string, idx: number) => ({
                xid,
                name: memberNames[idx] || xid,
                role: '',
                editApproved: false, // Will be fetched from detail API if needed
              }));

              // Parse eventid from legacy format (comma-separated) to array
              const eventIds = v.eventid
                ? v.eventid.split(',').map((e: string) => e.trim()).filter(Boolean)
                : [];

              return {
                id: extractYouTubeId(v.ylink) || v.ylink,
                title: v.title,
                authorXid: v.tlink,
                authorName: v.creator,
                eventIds,
                startTime: v.time,
                viewCount: parseInt(v.viewCount) || 0,
                likeCount: parseInt(v.likeCount) || 0,
                privacyStatus: v.status,
                isAuthor,
                editApproved: isAuthor, // Authors are always approved
                members,
              };
            }
            return null;
          })
          .filter(Boolean) as MyVideo[];

        // Fetch detailed member info for each video (for editApproved status)
        const videosWithDetails = await Promise.all(
          filtered.map(async (video) => {
            try {
              const detailRes = await fetch(`/api/videos/${video.id}`);
              if (detailRes.ok) {
                const detail = await detailRes.json();
                const members = detail.members || [];

                // Check if current user (as member) is approved
                let editApproved = video.isAuthor;
                if (!video.isAuthor) {
                  const userMember = members.find((m: VideoMember) =>
                    approvedXids.includes(m.xid?.toLowerCase())
                  );
                  editApproved = userMember?.editApproved === true;
                }

                return {
                  ...video,
                  editApproved,
                  members: members.map((m: VideoMember) => ({
                    ...m,
                    editApproved: m.editApproved || false,
                  })),
                };
              }
            } catch (err) {
              console.error('Failed to fetch video detail:', err);
            }
            return video;
          })
        );

        setMyVideos(videosWithDetails);
      }
    } catch (err) {
      console.error('Failed to fetch videos:', err);
    } finally {
      setIsLoadingVideos(false);
    }
  }, [approvedXids.join(',')]);

  useEffect(() => {
    if (isAuthenticated && approvedXids.length > 0) {
      fetchMyVideos();
    }
  }, [isAuthenticated, fetchMyVideos]);

  function extractYouTubeId(url: string): string | null {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }

  const handleXidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!xidInput.trim()) return;

    const cleanInput = xidInput.trim().toLowerCase();

    // Client-side duplicate check
    const isDuplicate = user?.xidClaims?.some((claim: any) => claim.xid.toLowerCase() === cleanInput);
    if (isDuplicate) {
      setError('このXIDは既に申請済みです');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/user/xid-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xid: cleanInput }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'XID申請に失敗しました');
      }

      setSuccess('XID申請を送信しました。管理者の承認をお待ちください。');
      setXidInput('');

      // Refresh user data to show new claim immediately
      await refreshUser();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = async (video: MyVideo) => {
    if (!video.editApproved) {
      setEditError('投稿者からの編集承認を待っています。');
      return;
    }

    setEditError('');
    setEditSuccess('');

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
          software: data.software || '',
          beforeComment: data.beforeComment || '',
          afterComment: data.afterComment || '',
          listen: data.listen || '',
          episode: data.episode || '',
          endMessage: data.endMessage || '',
          members: (data.members || []).map((m: VideoMember) => ({
            name: m.name || '',
            xid: m.xid || '',
            role: m.role || '',
            editApproved: m.editApproved || false,
          })),
        });
      } else {
        setEditError('動画情報の取得に失敗しました');
      }
    } catch (err) {
      setEditError('動画情報の取得に失敗しました');
    }
  };

  const saveEdit = async () => {
    if (!editingVideo) return;

    setIsEditing(true);
    setEditError('');
    setEditSuccess('');

    try {
      const res = await fetch(`/api/videos/${editingVideo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingVideo.title,
          description: editingVideo.description,
          music: editingVideo.music,
          credit: editingVideo.credit,
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
        setEditSuccess('動画を更新しました');
        setEditingVideo(null);
        fetchMyVideos();
      } else {
        const data = await res.json();
        setEditError(data.error || '更新に失敗しました');
      }
    } catch (err) {
      setEditError('更新中にエラーが発生しました');
    } finally {
      setIsEditing(false);
    }
  };

  const toggleMemberApproval = async (videoId: string, memberXid: string, currentApproved: boolean) => {
    setIsUpdatingMember(memberXid);

    try {
      const res = await fetch(`/api/videos/${videoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberXid,
          editApproved: !currentApproved,
        })
      });

      if (res.ok) {
        // Update local state
        setMyVideos(prev => prev.map(v => {
          if (v.id === videoId) {
            return {
              ...v,
              members: v.members.map(m =>
                m.xid.toLowerCase() === memberXid.toLowerCase()
                  ? { ...m, editApproved: !currentApproved }
                  : m
              )
            };
          }
          return v;
        }));

        // Update managingVideo if open
        if (managingVideo?.id === videoId) {
          setManagingVideo(prev => prev ? {
            ...prev,
            members: prev.members.map(m =>
              m.xid.toLowerCase() === memberXid.toLowerCase()
                ? { ...m, editApproved: !currentApproved }
                : m
            )
          } : null);
        }
      } else {
        const data = await res.json();
        setEditError(data.error || '更新に失敗しました');
      }
    } catch (err) {
      setEditError('更新中にエラーが発生しました');
    } finally {
      setIsUpdatingMember(null);
    }
  };

  // Parse roles string to array
  const parseRoles = (roleString: string): string[] => {
    if (!roleString) return [];
    return roleString.split(',').map(r => r.trim()).filter(Boolean);
  };

  // Convert roles array to string
  const rolesToString = (roles: string[]): string => {
    return roles.join(', ');
  };

  // Toggle a single role for a member
  const toggleMemberRole = (memberIndex: number, role: string) => {
    if (!editingVideo) return;
    
    const member = editingVideo.members[memberIndex];
    const currentRoles = parseRoles(member.role);
    
    let newRoles: string[];
    if (currentRoles.includes(role)) {
      newRoles = currentRoles.filter(r => r !== role);
    } else {
      newRoles = [...currentRoles, role];
    }
    
    const newMembers = [...editingVideo.members];
    newMembers[memberIndex] = { ...member, role: rolesToString(newRoles) };
    setEditingVideo({ ...editingVideo, members: newMembers });
  };

  // Select all roles for a member
  const selectAllRoles = (memberIndex: number) => {
    if (!editingVideo) return;
    
    const member = editingVideo.members[memberIndex];
    const newMembers = [...editingVideo.members];
    newMembers[memberIndex] = { ...member, role: rolesToString([...ROLE_OPTIONS]) };
    setEditingVideo({ ...editingVideo, members: newMembers });
  };

  // Clear all roles for a member
  const clearAllRoles = (memberIndex: number) => {
    if (!editingVideo) return;
    
    const member = editingVideo.members[memberIndex];
    const newMembers = [...editingVideo.members];
    newMembers[memberIndex] = { ...member, role: '' };
    setEditingVideo({ ...editingVideo, members: newMembers });
  };

  // Add a specific role to ALL members
  const addRoleToAllMembers = (role: string) => {
    if (!editingVideo) return;
    
    const newMembers = editingVideo.members.map(member => {
      const currentRoles = parseRoles(member.role);
      if (!currentRoles.includes(role)) {
        return { ...member, role: rolesToString([...currentRoles, role]) };
      }
      return member;
    });
    setEditingVideo({ ...editingVideo, members: newMembers });
  };

  // Remove a specific role from ALL members
  const removeRoleFromAllMembers = (role: string) => {
    if (!editingVideo) return;
    
    const newMembers = editingVideo.members.map(member => {
      const currentRoles = parseRoles(member.role);
      return { ...member, role: rolesToString(currentRoles.filter(r => r !== role)) };
    });
    setEditingVideo({ ...editingVideo, members: newMembers });
  };

  // Check if all members have a specific role
  const allMembersHaveRole = (role: string): boolean => {
    if (!editingVideo || editingVideo.members.length === 0) return false;
    return editingVideo.members.every(member => parseRoles(member.role).includes(role));
  };

  // Parse bulk member input (spreadsheet format: name<tab>xid or name,xid)
  const parseBulkMembers = () => {
    if (!editingVideo || !bulkMemberInput.trim()) return;
    
    const lines = bulkMemberInput.trim().split('\n');
    const newMembers: VideoMember[] = [];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      // Try tab-separated first, then comma-separated
      let parts = line.split('\t');
      if (parts.length < 2) {
        parts = line.split(',');
      }
      
      const name = parts[0]?.trim() || '';
      let xid = parts[1]?.trim() || '';
      const roleStr = parts[2]?.trim() || '';
      
      // Remove @ prefix if present
      if (xid.startsWith('@')) {
        xid = xid.slice(1);
      }
      
      if (name || xid) {
        newMembers.push({
          name,
          xid,
          role: roleStr,
          editApproved: false,
        });
      }
    }
    
    if (newMembers.length > 0) {
      // Add to existing members (preserving editApproved for existing ones)
      const existingXids = new Set(editingVideo.members.map(m => m.xid.toLowerCase()));
      const uniqueNewMembers = newMembers.filter(m => !existingXids.has(m.xid.toLowerCase()));
      
      setEditingVideo({
        ...editingVideo,
        members: [...editingVideo.members, ...uniqueNewMembers],
      });
      setBulkMemberInput('');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <FontAwesomeIcon icon={faCheck} className="status-icon approved" />;
      case 'pending':
        return <FontAwesomeIcon icon={faClock} className="status-icon pending" />;
      case 'rejected':
        return <FontAwesomeIcon icon={faTimes} className="status-icon rejected" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return '承認済み';
      case 'pending': return '審査中';
      case 'rejected': return '却下';
      default: return status;
    }
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString('ja-JP');
    } catch {
      return isoString;
    }
  };

  // Split videos into authored and participated
  const authoredVideos = myVideos.filter(v => v.isAuthor);
  const participatedVideos = myVideos.filter(v => !v.isAuthor);

  if (isLoading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Head>
        <title>プロフィール - PVSF</title>
        <meta name="description" content="PVSFユーザープロフィール" />
      </Head>

      <div className="content">
        <div className="profile-container">
          <h2>プロフィール</h2>

          {/* User Info Card */}
          <div className="profile-card">
            <div className="profile-header">
              {user?.image ? (
                <Image 
                  src={user.image} 
                  alt={user.name ?? 'Profile'} 
                  width={80}
                  height={80}
                  className="profile-avatar"
                  unoptimized
                />
              ) : (
                <div className="profile-avatar-placeholder">
                  <FontAwesomeIcon icon={faDiscord} />
                </div>
              )}
              <div className="profile-info">
                <h3>{user?.name}</h3>
                <p className="discord-tag">
                  <FontAwesomeIcon icon={faDiscord} />
                  Discord連携済み
                </p>
              </div>
            </div>
          </div>

          {/* New Registration Section */}
          <div className="profile-section">
            <h3><FontAwesomeIcon icon={faPlus} /> 新規登録</h3>
            <p className="section-description">
              次回上映会の「枠」を使って動画を登録できます（枠なし登録も可能です）。
            </p>
            <div className="register-actions">
              <button
                type="button"
                className="register-btn primary"
                onClick={() => router.push('/videos/register?mode=slot')}
              >
                枠を使って登録（今後の上映会）
              </button>
              <button
                type="button"
                className="register-btn"
                onClick={() => router.push('/videos/register?mode=noSlot')}
              >
                枠なし登録（過去の動画）
              </button>
            </div>
          </div>

          {/* XID Claims Section */}
          <div className="profile-section">
            <h3>X (Twitter) ID 連携</h3>
            <p className="section-description">
              あなたのX IDを登録すると、過去の作品との紐付けが可能になります。
            </p>

            {/* Existing Claims */}
            {user?.xidClaims && user.xidClaims.length > 0 && (
              <div className="xid-claims-list">
                {user.xidClaims.map((claim: any, index: number) => (
                  <div key={index} className={`xid-claim-item ${claim.status}`}>
                    <span className="xid-value">@{claim.xid}</span>
                    <div className="xid-status">
                      {getStatusIcon(claim.status)}
                      <span>{getStatusText(claim.status)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* New XID Claim Form */}
            <form onSubmit={handleXidSubmit} className="xid-form">
              <div className="input-group">
                <span className="input-prefix">@</span>
                <input
                  type="text"
                  value={xidInput}
                  onChange={(e) => setXidInput(e.target.value.toLowerCase())}
                  placeholder="X IDを入力"
                  disabled={isSubmitting}
                />
              </div>
              <button type="submit" disabled={isSubmitting || !xidInput.trim()}>
                <FontAwesomeIcon icon={faPlus} />
                申請
              </button>
            </form>

            {error && <p className="error-message">{error}</p>}
            {success && <p className="success-message">{success}</p>}
          </div>

          {/* Edit Messages */}
          {editError && (
            <div className="alert-message error">
              <FontAwesomeIcon icon={faTimes} /> {editError}
            </div>
          )}
          {editSuccess && (
            <div className="alert-message success">
              <FontAwesomeIcon icon={faCheck} /> {editSuccess}
            </div>
          )}

          {/* My Videos Section - Authored */}
          <div className="profile-section">
            <h3><FontAwesomeIcon icon={faVideo} /> 投稿した作品</h3>
            <p className="section-description">
              あなたが投稿した作品です。編集およびメンバーの編集権限管理が可能です。
            </p>

            {approvedXids.length === 0 ? (
              <div className="empty-state">
                承認済みのXIDがありません。
              </div>
            ) : isLoadingVideos ? (
              <div className="loading-state">
                <FontAwesomeIcon icon={faSpinner} spin /> 読み込み中...
              </div>
            ) : authoredVideos.length === 0 ? (
              <div className="empty-state">
                あなたが投稿した作品はありません。
              </div>
            ) : (
              <div className="my-videos-grid">
                {authoredVideos.map((video) => (
                  <div key={video.id} className="my-video-card">
                    <div className="my-video-thumbnail">
                      <Image
                        src={`https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`}
                        alt={video.title || '動画サムネイル'}
                        width={320}
                        height={180}
                        unoptimized
                      />
                      {video.privacyStatus !== 'public' && (
                        <span className="video-status-badge">{video.privacyStatus}</span>
                      )}
                      <a
                        href={`https://www.youtube.com/watch?v=${video.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="video-external-link"
                      >
                        <FontAwesomeIcon icon={faExternalLinkAlt} />
                      </a>
                    </div>
                    <div className="my-video-content">
                      <h4 className="my-video-title">{video.title}</h4>
                      <div className="my-video-role">
                        <span className="role-badge author">投稿者</span>
                      </div>
                      <div className="my-video-meta">
                        {video.eventIds.length > 0 && (
                          <div className="video-events">
                            {video.eventIds.map((eventId, i) => (
                              <span key={i} className="video-event">{eventId}</span>
                            ))}
                          </div>
                        )}
                        <span>{formatDate(video.startTime)}</span>
                      </div>
                      <div className="my-video-stats">
                        <span><FontAwesomeIcon icon={faEye} /> {video.viewCount.toLocaleString()}</span>
                        <span><FontAwesomeIcon icon={faThumbsUp} /> {video.likeCount.toLocaleString()}</span>
                      </div>
                      <div className="video-actions">
                        <button onClick={() => startEdit(video)} className="action-btn edit">
                          <FontAwesomeIcon icon={faEdit} /> 編集
                        </button>
                        {video.members.length > 0 && (
                          <button onClick={() => setManagingVideo(video)} className="action-btn manage">
                            <FontAwesomeIcon icon={faUsers} /> メンバー管理
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Videos Section - Participated */}
          <div className="profile-section">
            <h3><FontAwesomeIcon icon={faUsers} /> 参加した作品</h3>
            <p className="section-description">
              あなたがメンバーとして参加した作品です。投稿者の承認後に編集が可能になります。
            </p>

            {approvedXids.length === 0 ? (
              <div className="empty-state">
                承認済みのXIDがありません。
              </div>
            ) : isLoadingVideos ? (
              <div className="loading-state">
                <FontAwesomeIcon icon={faSpinner} spin /> 読み込み中...
              </div>
            ) : participatedVideos.length === 0 ? (
              <div className="empty-state">
                あなたが参加した作品はありません。
              </div>
            ) : (
              <div className="my-videos-grid">
                {participatedVideos.map((video) => (
                  <div key={video.id} className={`my-video-card ${!video.editApproved ? 'pending-approval' : ''}`}>
                    <div className="my-video-thumbnail">
                      <Image
                        src={`https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`}
                        alt={video.title || '動画サムネイル'}
                        width={320}
                        height={180}
                        unoptimized
                      />
                      {video.privacyStatus !== 'public' && (
                        <span className="video-status-badge">{video.privacyStatus}</span>
                      )}
                      <a
                        href={`https://www.youtube.com/watch?v=${video.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="video-external-link"
                      >
                        <FontAwesomeIcon icon={faExternalLinkAlt} />
                      </a>
                    </div>
                    <div className="my-video-content">
                      <h4 className="my-video-title">{video.title}</h4>
                      <div className="my-video-role">
                        {video.editApproved ? (
                          <span className="role-badge member approved">
                            <FontAwesomeIcon icon={faUserCheck} /> 編集承認済み
                          </span>
                        ) : (
                          <span className="role-badge member pending">
                            <FontAwesomeIcon icon={faUserClock} /> 承認待ち
                          </span>
                        )}
                      </div>
                      <div className="my-video-author">
                        <span>投稿者: {video.authorName}</span>
                        <span className="video-author-xid">@{video.authorXid}</span>
                      </div>
                      <div className="my-video-meta">
                        {video.eventIds.length > 0 && (
                          <div className="video-events">
                            {video.eventIds.map((eventId, i) => (
                              <span key={i} className="video-event">{eventId}</span>
                            ))}
                          </div>
                        )}
                        <span>{formatDate(video.startTime)}</span>
                      </div>
                      <div className="my-video-stats">
                        <span><FontAwesomeIcon icon={faEye} /> {video.viewCount.toLocaleString()}</span>
                        <span><FontAwesomeIcon icon={faThumbsUp} /> {video.likeCount.toLocaleString()}</span>
                      </div>
                      {video.editApproved ? (
                        <button onClick={() => startEdit(video)} className="action-btn edit">
                          <FontAwesomeIcon icon={faEdit} /> 編集
                        </button>
                      ) : (
                        <button disabled className="action-btn disabled">
                          <FontAwesomeIcon icon={faLock} /> 編集には承認が必要
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Edit Modal */}
        {editingVideo && (
          <div className="modal-overlay" onClick={() => setEditingVideo(null)}>
            <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
              <h3>作品を編集</h3>
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
                <label>説明・コメント</label>
                <textarea
                  value={editingVideo.description}
                  onChange={(e) => setEditingVideo({ ...editingVideo, description: e.target.value })}
                  rows={3}
                  className="form-input"
                />
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

              <div className="form-group">
                <label>使用編集ソフト</label>
                <input
                  type="text"
                  value={editingVideo.software}
                  onChange={(e) => setEditingVideo({ ...editingVideo, software: e.target.value })}
                  className="form-input"
                  placeholder="例: AviUtl, Premiere Pro"
                />
              </div>

              <div className="form-group">
                <label>上映前コメント</label>
                <textarea
                  value={editingVideo.beforeComment}
                  onChange={(e) => setEditingVideo({ ...editingVideo, beforeComment: e.target.value })}
                  rows={2}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>上映後コメント</label>
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
              <div className="form-group">
                <label><FontAwesomeIcon icon={faUsers} /> メンバー ({editingVideo.members.length}人)</label>
                
                {/* Bulk Input */}
                <div className="bulk-input-section">
                  <textarea
                    value={bulkMemberInput}
                    onChange={(e) => setBulkMemberInput(e.target.value)}
                    placeholder="スプレッドシートからコピーして一括追加&#10;形式: 名前[Tab]XID または 名前,XID&#10;例:&#10;山田太郎	yamada_taro&#10;鈴木花子	suzuki_hanako"
                    rows={3}
                    className="form-input bulk-textarea"
                  />
                  <button
                    type="button"
                    onClick={parseBulkMembers}
                    disabled={!bulkMemberInput.trim()}
                    className="bulk-add-btn"
                  >
                    <FontAwesomeIcon icon={faPlus} /> 一括追加
                  </button>
                </div>

                {/* Bulk Role Actions - Apply to ALL members */}
                {editingVideo.members.length > 0 && (
                  <div className="bulk-role-section">
                    <div className="bulk-role-label">役職一括設定（全メンバーに適用）:</div>
                    <div className="bulk-role-buttons">
                      {ROLE_OPTIONS.map((role) => {
                        const allHave = allMembersHaveRole(role);
                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => allHave ? removeRoleFromAllMembers(role) : addRoleToAllMembers(role)}
                            className={`bulk-role-btn ${allHave ? 'active' : ''}`}
                          >
                            <span className="bulk-role-checkbox">
                              {allHave ? <FontAwesomeIcon icon={faCheck} /> : null}
                            </span>
                            {role}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Member List */}
                <div className="members-edit-list">
                  {editingVideo.members.map((member, index) => (
                    <div key={index} className="member-edit-item">
                      <div className="member-edit-header">
                        <input
                          type="text"
                          value={member.name}
                          onChange={(e) => {
                            const newMembers = [...editingVideo.members];
                            newMembers[index] = { ...member, name: e.target.value };
                            setEditingVideo({ ...editingVideo, members: newMembers });
                          }}
                          placeholder="名前"
                          className="form-input member-input"
                        />
                        <input
                          type="text"
                          value={member.xid}
                          onChange={(e) => {
                            const newMembers = [...editingVideo.members];
                            newMembers[index] = { ...member, xid: e.target.value };
                            setEditingVideo({ ...editingVideo, members: newMembers });
                          }}
                          placeholder="@XID"
                          className="form-input member-input"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const memberName = member.name || member.xid || `メンバー${index + 1}`;
                            if (confirm(`「${memberName}」を削除しますか？`)) {
                              const newMembers = editingVideo.members.filter((_, i) => i !== index);
                              setEditingVideo({ ...editingVideo, members: newMembers });
                            }
                          }}
                          className="member-remove-btn"
                          title="削除"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </div>
                      
                      {/* Role Checkboxes */}
                      <div className="role-section">
                        <div className="role-checkboxes">
                          {ROLE_OPTIONS.map((role) => {
                            const isChecked = parseRoles(member.role).includes(role);
                            return (
                              <label key={role} className={`role-checkbox ${isChecked ? 'checked' : ''}`}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleMemberRole(index, role)}
                                />
                                <span>{role}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Add Single Member */}
                  <button
                    type="button"
                    onClick={() => {
                      const newMembers = [...editingVideo.members, { name: '', xid: '', role: '', editApproved: false }];
                      setEditingVideo({ ...editingVideo, members: newMembers });
                    }}
                    className="member-add-btn"
                  >
                    <FontAwesomeIcon icon={faPlus} /> メンバーを追加
                  </button>
                </div>
              </div>

              <div className="modal-actions">
                <button onClick={() => setEditingVideo(null)} className="btn-cancel">
                  キャンセル
                </button>
                <button onClick={saveEdit} disabled={isEditing} className="btn-save">
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

        {/* Member Management Modal */}
        {managingVideo && (
          <div className="modal-overlay" onClick={() => setManagingVideo(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3><FontAwesomeIcon icon={faUsers} /> メンバー編集権限の管理</h3>
              <p className="modal-description">
                「{managingVideo.title}」のメンバーに編集権限を付与できます。
              </p>

              {managingVideo.members.length === 0 ? (
                <div className="empty-state">メンバーがいません</div>
              ) : (
                <div className="member-list">
                  {managingVideo.members.map((member) => (
                    <div key={member.xid} className="member-item">
                      <div className="member-info">
                        <span className="member-name">{member.name}</span>
                        <span className="member-xid">@{member.xid}</span>
                      </div>
                      <button
                        onClick={() => toggleMemberApproval(managingVideo.id, member.xid, member.editApproved || false)}
                        disabled={isUpdatingMember === member.xid}
                        className={`approval-btn ${member.editApproved ? 'approved' : 'pending'}`}
                      >
                        {isUpdatingMember === member.xid ? (
                          <FontAwesomeIcon icon={faSpinner} spin />
                        ) : member.editApproved ? (
                          <><FontAwesomeIcon icon={faUserCheck} /> 承認済み</>
                        ) : (
                          <><FontAwesomeIcon icon={faUserClock} /> 未承認</>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="modal-actions">
                <button onClick={() => setManagingVideo(null)} className="btn-cancel" style={{ flex: 1 }}>
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

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
              <h3><FontAwesomeIcon icon={faKeyboard} /> キーボードショートカット</h3>
              <div className="shortcuts-list">
                <div className="shortcut-item">
                  <kbd>Escape</kbd>
                  <span>モーダルを閉じる</span>
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
              <button onClick={() => setShowShortcuts(false)} className="btn-cancel">
                閉じる
              </button>
            </div>
          </div>
        )}

        <Footer />
      </div>

      <style jsx>{`
        .profile-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 50vh;
        }

        .profile-container {
          max-width: 900px;
          margin: 0 auto;
        }

        .profile-card {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .profile-header {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .profile-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
        }

        .profile-avatar-placeholder {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #5865F2;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          color: white;
        }

        .profile-info h3 {
          margin: 0 0 0.5rem;
          font-size: 1.5rem;
          border: none;
          padding: 0;
        }

        .discord-tag {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #5865F2;
          font-size: 0.875rem;
          margin: 0;
        }

        .profile-section {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .profile-section h3 {
          margin: 0 0 0.5rem;
          font-size: 1.25rem;
          border: none;
          padding: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .section-description {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
        }

        .register-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .register-btn {
          padding: 0.85rem 1.1rem;
          border-radius: 10px;
          font-weight: 700;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          color: #ccd6f6;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .register-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.18);
          transform: translateY(-1px);
        }

        .register-btn.primary {
          border: none;
          background: #64ffda;
          color: #0a192f;
        }

        .register-btn.primary:hover {
          background: #4fd1c5;
          transform: translateY(-1px);
        }

        .alert-message {
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .alert-message.error {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .alert-message.success {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .xid-claims-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .xid-claim-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          border-left: 3px solid;
        }

        .xid-claim-item.approved {
          border-left-color: #10b981;
        }

        .xid-claim-item.pending {
          border-left-color: #f59e0b;
        }

        .xid-claim-item.rejected {
          border-left-color: #ef4444;
        }

        .xid-value {
          font-weight: 600;
        }

        .xid-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
        }

        .xid-status :global(.status-icon) {
          font-size: 0.75rem;
        }

        .xid-status :global(.status-icon.approved) {
          color: #10b981;
        }

        .xid-status :global(.status-icon.pending) {
          color: #f59e0b;
        }

        .xid-status :global(.status-icon.rejected) {
          color: #ef4444;
        }

        .xid-form {
          display: flex;
          gap: 0.75rem;
        }

        .input-group {
          flex: 1;
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 0 1rem;
        }

        .input-prefix {
          color: rgba(255, 255, 255, 0.5);
          font-weight: 600;
        }

        .input-group input {
          flex: 1;
          background: none;
          border: none;
          padding: 0.75rem 0.5rem;
          color: white;
          font-size: 1rem;
          outline: none;
        }

        .input-group input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .xid-form button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: #5865F2;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .xid-form button:hover:not(:disabled) {
          background: #4752C4;
        }

        .xid-form button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error-message {
          color: #ef4444;
          font-size: 0.875rem;
          margin-top: 1rem;
        }

        .success-message {
          color: #10b981;
          font-size: 0.875rem;
          margin-top: 1rem;
        }

        /* My Videos Styles */
        .empty-state, .loading-state {
          text-align: center;
          padding: 2rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .my-videos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }

        .my-video-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .my-video-card:hover {
          border-color: rgba(255, 255, 255, 0.12);
          transform: translateY(-2px);
        }

        .my-video-card.pending-approval {
          border-color: rgba(245, 158, 11, 0.3);
        }

        .my-video-thumbnail {
          position: relative;
          aspect-ratio: 16 / 9;
        }

        .my-video-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .video-status-badge {
          position: absolute;
          top: 0.5rem;
          left: 0.5rem;
          padding: 0.2rem 0.5rem;
          background: rgba(239, 68, 68, 0.9);
          color: white;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
        }

        .video-external-link {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border-radius: 50%;
          opacity: 0;
          transition: opacity 0.2s;
          font-size: 0.75rem;
        }

        .my-video-card:hover .video-external-link {
          opacity: 1;
        }

        .my-video-content {
          padding: 1rem;
        }

        .my-video-title {
          font-size: 0.9rem;
          font-weight: 600;
          margin: 0 0 0.5rem;
          color: #fff;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.4;
          border: none;
          padding: 0;
        }

        .my-video-role {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .role-badge {
          padding: 0.2rem 0.6rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
        }

        .role-badge.author {
          background: rgba(100, 255, 218, 0.15);
          color: #64ffda;
        }

        .role-badge.member.approved {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }

        .role-badge.member.pending {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
        }

        .my-video-author {
          display: flex;
          flex-direction: column;
          font-size: 0.8rem;
          color: #ccd6f6;
          margin-bottom: 0.5rem;
        }

        .video-author-xid {
          color: #8892b0;
          font-size: 0.75rem;
        }

        .my-video-meta {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.75rem;
          color: #8892b0;
          margin-bottom: 0.5rem;
        }

        .video-events {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
        }

        .video-event {
          padding: 0.1rem 0.4rem;
          background: rgba(100, 255, 218, 0.1);
          color: #64ffda;
          border-radius: 4px;
          font-size: 0.7rem;
        }

        .my-video-stats {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
          color: #8892b0;
          margin-bottom: 0.75rem;
        }

        .my-video-stats span {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .video-actions {
          display: flex;
          gap: 0.5rem;
        }

        .action-btn {
          flex: 1;
          padding: 0.5rem;
          border-radius: 6px;
          font-size: 0.8rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
          transition: all 0.2s ease;
          border: none;
        }

        .action-btn.edit {
          background: rgba(100, 255, 218, 0.1);
          color: #64ffda;
        }

        .action-btn.edit:hover {
          background: rgba(100, 255, 218, 0.2);
        }

        .action-btn.manage {
          background: rgba(96, 165, 250, 0.1);
          color: #60a5fa;
        }

        .action-btn.manage:hover {
          background: rgba(96, 165, 250, 0.2);
        }

        .action-btn.disabled {
          background: rgba(255, 255, 255, 0.05);
          color: #8892b0;
          cursor: not-allowed;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal {
          background: #1a1a2e;
          border-radius: 12px;
          padding: 1.5rem;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal.modal-large {
          max-width: 650px;
        }

        .modal h3 {
          margin: 0 0 0.5rem;
          font-size: 1.25rem;
          border: none;
          padding: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .modal-description {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          font-size: 0.875rem;
          color: #8892b0;
          margin-bottom: 0.5rem;
        }

        .form-input {
          width: 100%;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #fff;
          font-size: 0.95rem;
        }

        .form-input:focus {
          outline: none;
          border-color: #64ffda;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .modal-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }

        .btn-cancel, .btn-save {
          flex: 1;
          padding: 0.75rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s ease;
        }

        .btn-cancel {
          background: rgba(255, 255, 255, 0.1);
          color: #ccd6f6;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .btn-cancel:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .btn-save {
          background: #64ffda;
          color: #0a192f;
          border: none;
        }

        .btn-save:hover:not(:disabled) {
          background: #4fd1c5;
        }

        .btn-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Member Management Styles */
        .member-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .member-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
        }

        .member-info {
          display: flex;
          flex-direction: column;
        }

        .member-name {
          font-weight: 600;
          color: #ccd6f6;
        }

        .member-xid {
          font-size: 0.8rem;
          color: #8892b0;
        }

        .approval-btn {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.375rem;
          transition: all 0.2s ease;
          border: none;
        }

        .approval-btn.approved {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }

        .approval-btn.approved:hover {
          background: rgba(16, 185, 129, 0.25);
        }

        .approval-btn.pending {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
        }

        .approval-btn.pending:hover {
          background: rgba(245, 158, 11, 0.25);
        }

        .approval-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Bulk Input Styles */
        .bulk-input-section {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
          align-items: flex-start;
        }

        .bulk-textarea {
          flex: 1;
          font-family: monospace;
          font-size: 0.85rem;
          resize: vertical;
        }

        .bulk-add-btn {
          padding: 0.75rem 1rem;
          background: #64ffda;
          color: #0a192f;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.375rem;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .bulk-add-btn:hover:not(:disabled) {
          background: #4fd1c5;
        }

        .bulk-add-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Members Edit Styles */
        .members-edit-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .member-edit-item {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 8px;
          padding: 0.75rem;
        }

        .member-edit-header {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .member-input {
          flex: 1;
        }

        .member-remove-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .member-remove-btn:hover {
          background: rgba(239, 68, 68, 0.2);
        }

        /* Bulk Role Section - Apply to all members */
        .bulk-role-section {
          background: rgba(100, 255, 218, 0.05);
          border: 1px solid rgba(100, 255, 218, 0.15);
          border-radius: 8px;
          padding: 0.75rem;
          margin-bottom: 1rem;
        }

        .bulk-role-label {
          font-size: 0.85rem;
          color: #64ffda;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }

        .bulk-role-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .bulk-role-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.875rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: #ccd6f6;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .bulk-role-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .bulk-role-btn.active {
          background: rgba(100, 255, 218, 0.15);
          border-color: rgba(100, 255, 218, 0.4);
          color: #64ffda;
        }

        .bulk-role-checkbox {
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          font-size: 0.7rem;
        }

        .bulk-role-btn.active .bulk-role-checkbox {
          background: #64ffda;
          color: #0a192f;
        }

        /* Role Styles */
        .role-section {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 6px;
          padding: 0.5rem;
        }

        .role-checkboxes {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
        }

        .role-checkbox {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.625rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.8rem;
          color: #ccd6f6;
        }

        .role-checkbox:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .role-checkbox.checked {
          background: rgba(100, 255, 218, 0.15);
          border-color: rgba(100, 255, 218, 0.3);
          color: #64ffda;
        }

        .role-checkbox input {
          display: none;
        }

        .member-add-btn {
          padding: 0.75rem;
          background: rgba(100, 255, 218, 0.1);
          color: #64ffda;
          border: 1px dashed rgba(100, 255, 218, 0.3);
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s ease;
        }

        .member-add-btn:hover {
          background: rgba(100, 255, 218, 0.15);
          border-color: rgba(100, 255, 218, 0.5);
        }

        @media screen and (max-width: 600px) {
          .register-actions {
            flex-direction: column;
          }

          .register-btn {
            width: 100%;
            justify-content: center;
          }

          .xid-form {
            flex-direction: column;
          }

          .xid-form button {
            justify-content: center;
          }

          .my-videos-grid {
            grid-template-columns: 1fr;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .video-actions {
            flex-direction: column;
          }

          .bulk-input-section {
            flex-direction: column;
          }

          .bulk-add-btn {
            width: 100%;
            justify-content: center;
          }

          .member-edit-header {
            flex-wrap: wrap;
          }

          .member-input {
            flex: 1 1 calc(50% - 0.25rem);
            min-width: 120px;
          }

          .member-remove-btn {
            flex: 0 0 auto;
          }

          .role-checkboxes {
            gap: 0.25rem;
          }

          .role-checkbox {
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
          }
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
          color: #64ffda;
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
          color: #64ffda;
        }

        .shortcut-item span {
          color: #8892b0;
          font-size: 0.9rem;
        }
      `}</style>
    </>
  );
}
