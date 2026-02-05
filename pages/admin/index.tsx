// Admin Dashboard Index
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUpload, faUsers, faVideo, faCalendarAlt, faSpinner, faCog,
  faChartLine, faArrowRight, faTrash
} from '@fortawesome/free-solid-svg-icons';
import Footer from '@/components/Footer';

interface DashboardStats {
  videoCount: number;
  userCount: number;
  slotCount: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { isAdmin, isLoading, isAuthenticated, user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Redirect if not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, isAdmin, router]);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!isAdmin) return;

      setIsLoadingStats(true);
      try {
        const res = await fetch('/api/admin/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        } else {
          // Fallback or error handling
          console.error('Failed to fetch stats');
          setStats({
            videoCount: 0,
            userCount: 0,
            slotCount: 0
          });
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchStats();
  }, [isAdmin]);

  if (isLoading) {
    return (
      <div className="admin-page">
        <div className="loading-container">
          <FontAwesomeIcon icon={faSpinner} spin size="2x" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  const adminTools = [
    {
      title: '動画管理',
      description: '登録済みの動画の編集・削除・承認',
      icon: faVideo,
      href: '/admin/videos',
      color: '#8b5cf6',
      stat: stats?.videoCount
    },
    {
      title: '登録枠管理',
      description: 'イベントの登録枠を作成・管理',
      icon: faCalendarAlt,
      href: '/admin/slots',
      color: '#f59e0b',
      stat: null
    },
    {
      title: 'ユーザー管理',
      description: 'ユーザー一覧とXID申請の承認・却下',
      icon: faUsers,
      href: '/admin/users',
      color: '#3b82f6',
      stat: stats?.userCount
    },
    {
      title: '削除済みデータ',
      description: 'ソフトデリートされたデータの復元・完全削除',
      icon: faTrash,
      href: '/admin/deleted',
      color: '#ef4444',
      stat: null
    },
    {
      title: 'データインポート',
      description: 'CSV/JSONから動画データを一括登録',
      icon: faUpload,
      href: '/admin/import',
      color: '#10b981',
      stat: null
    },
  ];

  return (
    <>
      <Head>
        <title>管理画面 - PVSF Admin</title>
      </Head>

      <div className="admin-page">
        <div className="admin-header">
          <h1><FontAwesomeIcon icon={faCog} /> Admin Dashboard</h1>
          <p>PVSF 管理画面</p>
        </div>

        <div className="admin-content">
          {/* User info card */}
          <div className="card user-card">
            <div className="user-card-content">
              {user?.image && (
                <Image
                  src={user.image}
                  alt={user.name || 'User'}
                  width={40}
                  height={40}
                  className="user-card-avatar"
                  unoptimized
                />
              )}
              <div className="user-card-info">
                <span className="user-card-name">{user?.name}</span>
                <span className="badge">ADMIN</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          {!isLoadingStats && stats && (
            <div className="stats-row">
              <div className="stat-card">
                <FontAwesomeIcon icon={faVideo} className="stat-icon" />
                <div className="stat-info">
                  <span className="stat-value">{stats.videoCount}</span>
                  <span className="stat-label">登録動画</span>
                </div>
              </div>
              <div className="stat-card">
                <FontAwesomeIcon icon={faUsers} className="stat-icon" />
                <div className="stat-info">
                  <span className="stat-value">{stats.userCount}</span>
                  <span className="stat-label">ユーザー</span>
                </div>
              </div>
              <div className="stat-card">
                <FontAwesomeIcon icon={faChartLine} className="stat-icon" />
                <div className="stat-info">
                  <span className="stat-value status-online">稼働中</span>
                  <span className="stat-label">システム</span>
                </div>
              </div>
            </div>
          )}

          {/* Tools grid */}
          <h2 className="section-title">管理ツール</h2>
          <div className="tools-grid">
            {adminTools.map((tool, index) => (
              <Link href={tool.href} key={index} className="tool-card">
                <div className="tool-icon" style={{ backgroundColor: tool.color }}>
                  <FontAwesomeIcon icon={tool.icon} />
                </div>
                <div className="tool-info">
                  <h3>{tool.title}</h3>
                  <p>{tool.description}</p>
                  {tool.stat !== null && tool.stat !== undefined && (
                    <span className="tool-stat">{tool.stat} 件</span>
                  )}
                </div>
                <div className="tool-arrow">
                  <FontAwesomeIcon icon={faArrowRight} />
                </div>
              </Link>
            ))}
          </div>

          {/* System status */}
          <div className="card">
            <h2>System Info</h2>
            <div className="status-grid">
              <div className="status-item">
                <span className="status-label">Environment</span>
                <span className="status-value">{process.env.NODE_ENV}</span>
              </div>
              <div className="status-item">
                <span className="status-label">Database</span>
                <span className="status-value status-online">Firestore</span>
              </div>
              <div className="status-item">
                <span className="status-label">Auth Provider</span>
                <span className="status-value">Discord OAuth</span>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>

      <style jsx>{`
        .user-card {
          margin-bottom: 1.5rem;
        }

        .user-card-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .user-card-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(100, 255, 218, 0.3);
        }

        .user-card-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .user-card-name {
          font-weight: 600;
          font-size: 1.1rem;
        }

        /* Stats Row */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
        }

        .stat-card :global(.stat-icon) {
          font-size: 1.5rem;
          color: var(--accent-primary);
          opacity: 0.8;
        }

        .stat-info {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #fff;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #8892b0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .section-title {
          font-size: 1rem;
          font-weight: 600;
          color: #8892b0;
          margin-bottom: 1rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border: none;
          padding: 0;
        }

        .tools-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .tool-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          transition: all 0.2s ease;
          text-decoration: none;
          color: inherit;
        }

        .tool-card:hover {
          background: rgba(255, 255, 255, 0.05);
          transform: translateX(4px);
          border-color: rgba(255, 255, 255, 0.12);
        }

        .tool-card:hover .tool-arrow {
          opacity: 1;
          transform: translateX(0);
        }

        .tool-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          font-size: 1.25rem;
          color: white;
          flex-shrink: 0;
        }

        .tool-info {
          flex: 1;
          min-width: 0;
        }

        .tool-info h3 {
          margin: 0 0 0.25rem;
          font-size: 1rem;
          font-weight: 600;
          color: #fff;
          border: none;
          padding: 0;
        }

        .tool-info p {
          margin: 0;
          font-size: 0.8rem;
          color: #6b7280;
          line-height: 1.4;
        }

        .tool-stat {
          display: inline-block;
          margin-top: 0.5rem;
          padding: 0.25rem 0.5rem;
          background: rgba(100, 255, 218, 0.1);
          border-radius: 4px;
          font-size: 0.7rem;
          color: var(--accent-primary);
          font-weight: 500;
        }

        .tool-arrow {
          color: var(--accent-primary);
          opacity: 0;
          transform: translateX(-8px);
          transition: all 0.2s ease;
        }

        .status-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 0.75rem;
        }

        .status-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
        }

        .status-label {
          font-size: 0.7rem;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .status-value {
          font-size: 0.875rem;
          color: #fff;
          font-weight: 500;
        }

        .status-online {
          color: #4ade80;
        }

        @media screen and (max-width: 768px) {
          .stats-row {
            grid-template-columns: 1fr;
          }

          .tools-grid {
            grid-template-columns: 1fr;
          }

          .status-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media screen and (max-width: 480px) {
          .status-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
