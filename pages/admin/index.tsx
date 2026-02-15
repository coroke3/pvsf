// Admin Dashboard Index
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers, faVideo, faCalendarAlt, faSpinner, faCog,
  faChartLine, faArrowRight, faTrash, faDatabase
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
      stat: stats?.slotCount
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
      title: 'データ管理',
      description: 'エクスポート・インポート・バックアップ復元',
      icon: faDatabase,
      href: '/admin/backup',
      color: '#06b6d4',
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

          {/* Stats Overview */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-icon" style={{ color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)' }}>
                <FontAwesomeIcon icon={faVideo} />
              </div>
              <div className="stat-info">
                <span className="stat-value">
                  {isLoadingStats ? <FontAwesomeIcon icon={faSpinner} spin size="sm" /> : stats?.videoCount.toLocaleString() ?? '-'}
                </span>
                <span className="stat-label">登録動画</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' }}>
                <FontAwesomeIcon icon={faCalendarAlt} />
              </div>
              <div className="stat-info">
                <span className="stat-value">
                  {isLoadingStats ? <FontAwesomeIcon icon={faSpinner} spin size="sm" /> : stats?.slotCount.toLocaleString() ?? '-'}
                </span>
                <span className="stat-label">登録枠数</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)' }}>
                <FontAwesomeIcon icon={faUsers} />
              </div>
              <div className="stat-info">
                <span className="stat-value">
                  {isLoadingStats ? <FontAwesomeIcon icon={faSpinner} spin size="sm" /> : stats?.userCount.toLocaleString() ?? '-'}
                </span>
                <span className="stat-label">ユーザー</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)' }}>
                <FontAwesomeIcon icon={faChartLine} />
              </div>
              <div className="stat-info">
                <span className="stat-value status-online" style={{ fontSize: '1.2rem', marginTop: '0.3rem' }}>稼働中</span>
                <span className="stat-label">システム</span>
              </div>
            </div>
          </div>

          {/* Tools grid */}
          <h2 className="section-title">管理ツール</h2>
          <div className="tools-grid">
            {adminTools.map((tool, index) => (
              <Link href={tool.href} key={index} className="tool-card" style={{ borderLeft: `4px solid ${tool.color}` }}>
                <div className="tool-icon" style={{ backgroundColor: `${tool.color}20`, color: tool.color }}>
                  <FontAwesomeIcon icon={tool.icon} />
                </div>
                <div className="tool-info">
                  <h3>
                    {tool.title}
                    {tool.stat !== null && tool.stat !== undefined && (
                      <span className="tool-stat-badge">{tool.stat}</span>
                    )}
                  </h3>
                  <p>{tool.description}</p>
                </div>
                <FontAwesomeIcon icon={faArrowRight} className="tool-arrow" />
              </Link>
            ))}
          </div>

          {/* System status */}
          <div className="card" style={{ marginTop: '2rem' }}>
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
          margin-bottom: 2rem;
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
          border: 2px solid var(--c-primary);
        }

        .user-card-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .user-card-name {
          font-weight: 600;
          font-size: 1.1rem;
          color: var(--c-text);
        }

        .badge {
            background: var(--c-primary);
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: bold;
        }

        /* Stats Row */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2.5rem;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          transition: transform 0.2s ease;
        }
        
        .stat-card:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.05);
        }

        .stat-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .stat-info {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: #fff;
          line-height: 1.2;
        }

        .stat-label {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 0.25rem;
        }

        .section-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 1rem;
          padding-left: 0.5rem;
          border-left: 4px solid var(--c-primary);
        }

        .tools-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2.5rem;
        }

        .tool-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          transition: all 0.2s ease;
          text-decoration: none;
          color: inherit;
        }

        .tool-card:hover {
          background: rgba(255, 255, 255, 0.06);
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.2);
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
          flex-shrink: 0;
        }

        .tool-info {
          flex: 1;
          min-width: 0;
        }

        .tool-info h3 {
          margin: 0 0 0.5rem;
          font-size: 1.1rem;
          font-weight: 600;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .tool-stat-badge {
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
            font-size: 0.75rem;
            padding: 2px 8px;
            border-radius: 10px;
            font-weight: normal;
        }

        .tool-info p {
          margin: 0;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.5);
          line-height: 1.4;
        }

        .tool-arrow {
          color: rgba(255, 255, 255, 0.3);
          opacity: 0.5;
          transform: translateX(-4px);
          transition: all 0.2s ease;
        }

        .status-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }

        .status-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
        }

        .status-label {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .status-value {
          font-size: 1rem;
          color: #fff;
          font-weight: 600;
        }

        .status-online {
          color: #10b981;
        }
      `}</style>
    </>
  );
}
