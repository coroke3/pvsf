import React, { useState, useRef } from 'react';
import Head from 'next/head';
import { useAuth } from '@/contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faDownload, faUpload, faSpinner, faCheck, faTimes,
    faDatabase, faVideo, faUsers, faCalendarAlt,
    faExclamationTriangle, faFileImport, faShieldAlt,
    faCloudUploadAlt
} from '@fortawesome/free-solid-svg-icons';
import Footer from '@/components/Footer';

type ExportType = 'all' | 'videos' | 'users';
type RestoreMode = 'merge' | 'overwrite';
type Status = 'idle' | 'loading' | 'success' | 'error';
type TabId = 'export' | 'restore' | 'legacy';

export default function AdminBackupPage() {
    const { isAdmin, isLoading } = useAuth();
    const [activeTab, setActiveTab] = useState<TabId>('export');

    // Export state
    const [exportType, setExportType] = useState<ExportType>('all');
    const [exportStatus, setExportStatus] = useState<Status>('idle');
    const [exportMessage, setExportMessage] = useState('');

    // Restore state
    const [restoreFile, setRestoreFile] = useState<File | null>(null);
    const [restoreMode, setRestoreMode] = useState<RestoreMode>('merge');
    const [restoreStatus, setRestoreStatus] = useState<Status>('idle');
    const [restoreMessage, setRestoreMessage] = useState('');
    const [restoreResult, setRestoreResult] = useState<any>(null);
    const [isDryRun, setIsDryRun] = useState(true);
    const [filePreview, setFilePreview] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Legacy import state
    const [videoJson, setVideoJson] = useState('');
    const [userJson, setUserJson] = useState('');
    const [videoStatus, setVideoStatus] = useState<Status>('idle');
    const [userStatus, setUserStatus] = useState<Status>('idle');
    const [videoMessage, setVideoMessage] = useState('');
    const [userMessage, setUserMessage] = useState('');

    // Export handler
    const handleExport = async () => {
        setExportStatus('loading');
        setExportMessage('データをエクスポート中...');

        try {
            const res = await fetch(`/api/admin/export?type=${exportType}`);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Export failed');
            }

            const data = await res.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pvsf_backup_${exportType}_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            const counts = [];
            if (data.videosCount !== undefined) counts.push(`動画: ${data.videosCount}件`);
            if (data.usersCount !== undefined) counts.push(`ユーザー: ${data.usersCount}件`);
            if (data.eventsCount !== undefined) counts.push(`イベント: ${data.eventsCount}件`);

            setExportStatus('success');
            setExportMessage(`エクスポート完了 (${counts.join(', ')})`);
        } catch (err: any) {
            setExportStatus('error');
            setExportMessage(err.message || 'エクスポートに失敗しました');
        }
    };

    // File select handler
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setRestoreFile(file);
        setRestoreResult(null);
        setRestoreStatus('idle');
        setRestoreMessage('');

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            const preview: any = {
                version: data.version || '不明',
                exportedAt: data.exportedAt || '不明',
            };
            if (data.videos) preview.videosCount = data.videos.length;
            if (data.users) preview.usersCount = data.users.length;
            if (data.events) preview.eventsCount = data.events.length;

            if (Array.isArray(data)) {
                preview.isArray = true;
                preview.count = data.length;
            }

            setFilePreview(preview);
        } catch {
            setFilePreview({ error: 'JSONの解析に失敗しました' });
        }
    };

    // Restore handler
    const handleRestore = async () => {
        if (!restoreFile) return;

        setRestoreStatus('loading');
        setRestoreMessage(isDryRun ? 'ドライラン実行中...' : 'データを復元中...');

        try {
            const text = await restoreFile.text();
            const parsed = JSON.parse(text);

            let type: string;
            let data: any;

            if (parsed.videos || parsed.users || parsed.events) {
                type = 'all';
                data = parsed;
            } else if (Array.isArray(parsed)) {
                type = exportType === 'all' ? 'videos' : exportType;
                data = parsed;
            } else {
                throw new Error('不正なバックアップ形式です');
            }

            const res = await fetch('/api/admin/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, data, mode: restoreMode, dryRun: isDryRun }),
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || '復元に失敗しました');
            }

            setRestoreResult(result);
            setRestoreStatus('success');

            if (isDryRun) {
                setRestoreMessage('ドライラン完了 — 実際のデータは変更されていません');
            } else {
                setRestoreMessage('復元完了');
            }
        } catch (err: any) {
            setRestoreStatus('error');
            setRestoreMessage(err.message || '復元に失敗しました');
        }
    };

    // Legacy import handler
    const handleLegacyImport = async (type: 'videos' | 'users', jsonStr: string, setStatus: (s: Status) => void, setMsg: (m: string) => void) => {
        try {
            setStatus('loading');
            setMsg('JSONを解析中...');

            let data;
            try {
                data = JSON.parse(jsonStr);
            } catch {
                throw new Error('JSON形式が不正です。入力を確認してください。');
            }

            if (!Array.isArray(data)) {
                throw new Error('データはJSON配列である必要があります。');
            }

            setMsg(`${data.length}件の${type === 'videos' ? '動画' : 'ユーザー'}をインポート中...`);

            const res = await fetch('/api/admin/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, data }),
            });

            const result = await res.json();

            if (res.ok) {
                setStatus('success');
                setMsg(`${result.imported}件の${type === 'videos' ? '動画' : 'ユーザー'}をインポートしました。`);
            } else {
                throw new Error(result.error || 'インポートに失敗しました');
            }
        } catch (err: any) {
            setStatus('error');
            setMsg(err.message || '不明なエラーが発生しました');
        }
    };

    if (isLoading) return <div className="page-container">Loading...</div>;
    if (!isAdmin) return <div className="page-container">Access Denied</div>;

    const tabs = [
        { id: 'export' as TabId, label: 'エクスポート', icon: faDownload },
        { id: 'restore' as TabId, label: '復元', icon: faUpload },
        { id: 'legacy' as TabId, label: '旧形式インポート', icon: faCloudUploadAlt },
    ];

    return (
        <>
            <Head>
                <title>データ管理 - PVSF Admin</title>
            </Head>

            <div className="page-container">
                <div className="backup-container">
                    <h1><FontAwesomeIcon icon={faDatabase} /> データ管理</h1>
                    <p className="help-text">
                        データのエクスポート・インポート・復元を行います。
                    </p>

                    {/* Tab Navigation */}
                    <div className="tab-nav">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <FontAwesomeIcon icon={tab.icon} /> {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* === EXPORT TAB === */}
                    {activeTab === 'export' && (
                        <div className="backup-section">
                            <h2><FontAwesomeIcon icon={faDownload} /> エクスポート</h2>
                            <p>現在のデータベースの内部データをJSONファイルとしてダウンロードします。全フィールドが保存されます。</p>

                            <div className="type-selector">
                                <label className={`type-option ${exportType === 'all' ? 'active' : ''}`}>
                                    <input type="radio" name="exportType" value="all" checked={exportType === 'all'} onChange={() => setExportType('all')} />
                                    <FontAwesomeIcon icon={faDatabase} />
                                    <span>全データ</span>
                                </label>
                                <label className={`type-option ${exportType === 'videos' ? 'active' : ''}`}>
                                    <input type="radio" name="exportType" value="videos" checked={exportType === 'videos'} onChange={() => setExportType('videos')} />
                                    <FontAwesomeIcon icon={faVideo} />
                                    <span>動画のみ</span>
                                </label>
                                <label className={`type-option ${exportType === 'users' ? 'active' : ''}`}>
                                    <input type="radio" name="exportType" value="users" checked={exportType === 'users'} onChange={() => setExportType('users')} />
                                    <FontAwesomeIcon icon={faUsers} />
                                    <span>ユーザーのみ</span>
                                </label>
                            </div>

                            <button onClick={handleExport} disabled={exportStatus === 'loading'} className="btn btn-primary">
                                {exportStatus === 'loading' ? (
                                    <><FontAwesomeIcon icon={faSpinner} spin /> エクスポート中...</>
                                ) : (
                                    <><FontAwesomeIcon icon={faDownload} /> エクスポート</>
                                )}
                            </button>

                            {exportMessage && (
                                <div className={`status-msg ${exportStatus}`}>
                                    <FontAwesomeIcon icon={exportStatus === 'success' ? faCheck : exportStatus === 'error' ? faTimes : faSpinner} />
                                    {' '}{exportMessage}
                                </div>
                            )}
                        </div>
                    )}

                    {/* === RESTORE TAB === */}
                    {activeTab === 'restore' && (
                        <div className="backup-section">
                            <h2><FontAwesomeIcon icon={faUpload} /> 復元</h2>
                            <p>エクスポートしたJSONファイルからデータを復元します。</p>

                            {/* File Input */}
                            <div className="file-input-area">
                                <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileSelect} className="file-input" />
                                <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
                                    <FontAwesomeIcon icon={faFileImport} /> ファイルを選択
                                </button>
                                {restoreFile && (
                                    <span className="file-name">{restoreFile.name} ({(restoreFile.size / 1024).toFixed(1)} KB)</span>
                                )}
                            </div>

                            {/* File Preview */}
                            {filePreview && !filePreview.error && (
                                <div className="file-preview">
                                    <h3>ファイル内容</h3>
                                    <div className="preview-grid">
                                        {filePreview.exportedAt && filePreview.exportedAt !== '不明' && (
                                            <div className="preview-item">
                                                <span className="preview-label">エクスポート日時</span>
                                                <span className="preview-value">{new Date(filePreview.exportedAt).toLocaleString('ja-JP')}</span>
                                            </div>
                                        )}
                                        {filePreview.videosCount !== undefined && (
                                            <div className="preview-item">
                                                <FontAwesomeIcon icon={faVideo} />
                                                <span className="preview-value">{filePreview.videosCount} 動画</span>
                                            </div>
                                        )}
                                        {filePreview.usersCount !== undefined && (
                                            <div className="preview-item">
                                                <FontAwesomeIcon icon={faUsers} />
                                                <span className="preview-value">{filePreview.usersCount} ユーザー</span>
                                            </div>
                                        )}
                                        {filePreview.eventsCount !== undefined && (
                                            <div className="preview-item">
                                                <FontAwesomeIcon icon={faCalendarAlt} />
                                                <span className="preview-value">{filePreview.eventsCount} イベント</span>
                                            </div>
                                        )}
                                        {filePreview.isArray && (
                                            <div className="preview-item">
                                                <span className="preview-value">{filePreview.count} レコード（配列形式）</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {filePreview?.error && (
                                <div className="status-msg error">
                                    <FontAwesomeIcon icon={faTimes} /> {filePreview.error}
                                </div>
                            )}

                            {/* Restore Options */}
                            {restoreFile && !filePreview?.error && (
                                <div className="restore-options">
                                    <div className="option-group">
                                        <h3>復元モード</h3>
                                        <div className="mode-selector">
                                            <label className={`mode-option ${restoreMode === 'merge' ? 'active' : ''}`}>
                                                <input type="radio" name="restoreMode" value="merge" checked={restoreMode === 'merge'} onChange={() => setRestoreMode('merge')} />
                                                <div>
                                                    <strong>マージ</strong>
                                                    <p>既存データを保持しつつ、バックアップのデータで上書き・追加</p>
                                                </div>
                                            </label>
                                            <label className={`mode-option ${restoreMode === 'overwrite' ? 'active' : ''}`}>
                                                <input type="radio" name="restoreMode" value="overwrite" checked={restoreMode === 'overwrite'} onChange={() => setRestoreMode('overwrite')} />
                                                <div>
                                                    <strong>上書き</strong>
                                                    <p>ドキュメントを完全にバックアップの内容で置き換え</p>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="option-group">
                                        <label className="checkbox-option">
                                            <input type="checkbox" checked={isDryRun} onChange={(e) => setIsDryRun(e.target.checked)} />
                                            <div>
                                                <strong><FontAwesomeIcon icon={faShieldAlt} /> ドライラン</strong>
                                                <p>実際のデータを変更せず、処理結果のみ確認</p>
                                            </div>
                                        </label>
                                    </div>

                                    {!isDryRun && (
                                        <div className="warning-banner">
                                            <FontAwesomeIcon icon={faExclamationTriangle} />
                                            <span>ドライランがOFFです。実行すると実際のデータが{restoreMode === 'overwrite' ? '上書き' : '更新'}されます。</span>
                                        </div>
                                    )}

                                    <button onClick={handleRestore} disabled={restoreStatus === 'loading'} className={`btn ${isDryRun ? 'btn-secondary' : 'btn-danger'}`}>
                                        {restoreStatus === 'loading' ? (
                                            <><FontAwesomeIcon icon={faSpinner} spin /> 処理中...</>
                                        ) : isDryRun ? (
                                            <><FontAwesomeIcon icon={faShieldAlt} /> ドライラン実行</>
                                        ) : (
                                            <><FontAwesomeIcon icon={faUpload} /> 復元実行</>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* Restore Result */}
                            {restoreMessage && (
                                <div className={`status-msg ${restoreStatus}`}>
                                    <FontAwesomeIcon icon={restoreStatus === 'success' ? faCheck : restoreStatus === 'error' ? faTimes : faSpinner} />
                                    {' '}{restoreMessage}
                                </div>
                            )}

                            {restoreResult && (
                                <div className="restore-result">
                                    <h3>処理結果</h3>
                                    {restoreResult.videos && (
                                        <div className="result-row">
                                            <FontAwesomeIcon icon={faVideo} /> 動画:
                                            {' '}{restoreResult.videos.imported}件 インポート
                                            {restoreResult.videos.skipped > 0 && ` / ${restoreResult.videos.skipped}件 スキップ`}
                                            {restoreResult.videos.errors > 0 && ` / ${restoreResult.videos.errors}件 エラー`}
                                        </div>
                                    )}
                                    {restoreResult.users && (
                                        <div className="result-row">
                                            <FontAwesomeIcon icon={faUsers} /> ユーザー:
                                            {' '}{restoreResult.users.imported}件 インポート
                                            {restoreResult.users.skipped > 0 && ` / ${restoreResult.users.skipped}件 スキップ`}
                                            {restoreResult.users.errors > 0 && ` / ${restoreResult.users.errors}件 エラー`}
                                        </div>
                                    )}
                                    {restoreResult.events && (
                                        <div className="result-row">
                                            <FontAwesomeIcon icon={faCalendarAlt} /> イベント:
                                            {' '}{restoreResult.events.imported}件 インポート
                                            {restoreResult.events.skipped > 0 && ` / ${restoreResult.events.skipped}件 スキップ`}
                                            {restoreResult.events.errors > 0 && ` / ${restoreResult.events.errors}件 エラー`}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* === LEGACY IMPORT TAB === */}
                    {activeTab === 'legacy' && (
                        <div className="backup-section">
                            <h2><FontAwesomeIcon icon={faCloudUploadAlt} /> 旧形式インポート</h2>
                            <p>旧形式のCSV/JSONデータ（<code>videos_data</code> / <code>google_data</code>）を変換してインポートします。</p>

                            {/* Video Import */}
                            <div className="legacy-section">
                                <h3><FontAwesomeIcon icon={faVideo} /> 動画データ</h3>
                                <p className="sub-help">旧形式の動画JSONを貼り付けてください。</p>
                                <textarea
                                    className="json-input"
                                    value={videoJson}
                                    onChange={(e) => setVideoJson(e.target.value)}
                                    placeholder={`[
  {
    "title": "Example Video",
    "ylink": "https://youtu.be/..."
  }
]`}
                                    rows={8}
                                />
                                <div className="action-row">
                                    <button
                                        onClick={() => handleLegacyImport('videos', videoJson, setVideoStatus, setVideoMessage)}
                                        disabled={videoStatus === 'loading' || !videoJson.trim()}
                                        className="btn btn-primary"
                                    >
                                        {videoStatus === 'loading' ? (
                                            <><FontAwesomeIcon icon={faSpinner} spin /> インポート中...</>
                                        ) : (
                                            <><FontAwesomeIcon icon={faUpload} /> 動画をインポート</>
                                        )}
                                    </button>
                                    {videoMessage && (
                                        <span className={`inline-status ${videoStatus}`}>
                                            <FontAwesomeIcon icon={videoStatus === 'success' ? faCheck : videoStatus === 'error' ? faTimes : faSpinner} />
                                            {' '}{videoMessage}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <hr className="inner-divider" />

                            {/* User Import */}
                            <div className="legacy-section">
                                <h3><FontAwesomeIcon icon={faUsers} /> ユーザーデータ</h3>
                                <p className="sub-help">旧形式のユーザーJSONを貼り付けてください。</p>
                                <textarea
                                    className="json-input"
                                    value={userJson}
                                    onChange={(e) => setUserJson(e.target.value)}
                                    placeholder='[ { "username": "...", "icon": "..." }, ... ]'
                                    rows={8}
                                />
                                <div className="action-row">
                                    <button
                                        onClick={() => handleLegacyImport('users', userJson, setUserStatus, setUserMessage)}
                                        disabled={userStatus === 'loading' || !userJson.trim()}
                                        className="btn btn-primary"
                                    >
                                        {userStatus === 'loading' ? (
                                            <><FontAwesomeIcon icon={faSpinner} spin /> インポート中...</>
                                        ) : (
                                            <><FontAwesomeIcon icon={faUpload} /> ユーザーをインポート</>
                                        )}
                                    </button>
                                    {userMessage && (
                                        <span className={`inline-status ${userStatus}`}>
                                            <FontAwesomeIcon icon={userStatus === 'success' ? faCheck : userStatus === 'error' ? faTimes : faSpinner} />
                                            {' '}{userMessage}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Footer />

            <style jsx>{`
                .backup-container {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 2rem;
                }
                .backup-container h1 {
                    margin-bottom: 0.5rem;
                }
                .help-text {
                    color: var(--c-text-light, #aaa);
                    margin-bottom: 1.5rem;
                }
                .tab-nav {
                    display: flex;
                    gap: 0;
                    margin-bottom: 1.5rem;
                    border-bottom: 1px solid var(--c-muted, #334155);
                }
                .tab-btn {
                    background: transparent;
                    border: none;
                    color: var(--c-text-light, #aaa);
                    padding: 0.75rem 1.25rem;
                    cursor: pointer;
                    font-size: 0.9rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    border-bottom: 2px solid transparent;
                    transition: all 0.2s;
                    margin-bottom: -1px;
                }
                .tab-btn:hover {
                    color: var(--c-text, #fff);
                }
                .tab-btn.active {
                    color: var(--c-primary, #FF80AB);
                    border-bottom-color: var(--c-primary, #FF80AB);
                }
                .backup-section {
                    background: var(--c-surface, #1e293b);
                    padding: 1.5rem;
                    border-radius: 12px;
                    margin-bottom: 1.5rem;
                    border: 1px solid var(--c-muted, #334155);
                }
                .backup-section h2 {
                    margin-top: 0;
                    margin-bottom: 0.5rem;
                }
                .backup-section p {
                    color: var(--c-text-light, #aaa);
                    margin-bottom: 1rem;
                }
                .type-selector, .mode-selector {
                    display: flex;
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                    flex-wrap: wrap;
                }
                .type-option, .mode-option {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.6rem 1rem;
                    border-radius: 8px;
                    border: 1px solid var(--c-muted, #334155);
                    cursor: pointer;
                    transition: all 0.2s;
                    background: transparent;
                }
                .type-option input, .mode-option input {
                    display: none;
                }
                .type-option.active, .mode-option.active {
                    border-color: var(--c-primary, #FF80AB);
                    background: rgba(255, 128, 171, 0.1);
                    color: var(--c-primary, #FF80AB);
                }
                .mode-option {
                    flex: 1;
                    min-width: 200px;
                }
                .mode-option div {
                    display: flex;
                    flex-direction: column;
                }
                .mode-option p {
                    font-size: 0.8rem;
                    margin: 0.25rem 0 0;
                    color: var(--c-text-light, #aaa) !important;
                }
                .btn {
                    padding: 0.6rem 1.2rem;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    transition: all 0.2s;
                }
                .btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .btn-primary {
                    background: var(--c-primary, #FF80AB);
                    color: #000;
                }
                .btn-primary:hover:not(:disabled) {
                    filter: brightness(1.1);
                }
                .btn-secondary {
                    background: var(--c-muted, #334155);
                    color: var(--c-text, #fff);
                }
                .btn-secondary:hover:not(:disabled) {
                    filter: brightness(1.2);
                }
                .btn-danger {
                    background: #ef4444;
                    color: #fff;
                }
                .btn-danger:hover:not(:disabled) {
                    background: #dc2626;
                }
                .status-msg {
                    margin-top: 1rem;
                    padding: 0.6rem 1rem;
                    border-radius: 8px;
                    font-size: 0.9rem;
                }
                .status-msg.success {
                    background: rgba(74, 222, 128, 0.1);
                    color: #4ade80;
                    border: 1px solid rgba(74, 222, 128, 0.3);
                }
                .status-msg.error {
                    background: rgba(248, 113, 113, 0.1);
                    color: #f87171;
                    border: 1px solid rgba(248, 113, 113, 0.3);
                }
                .status-msg.loading {
                    background: rgba(100, 181, 246, 0.1);
                    color: #64b5f6;
                    border: 1px solid rgba(100, 181, 246, 0.3);
                }
                .file-input-area {
                    margin-bottom: 1rem;
                }
                .file-input {
                    display: none;
                }
                .file-name {
                    margin-left: 0.75rem;
                    color: var(--c-text-light, #aaa);
                    font-size: 0.85rem;
                }
                .file-preview {
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 8px;
                    padding: 1rem;
                    margin-bottom: 1rem;
                }
                .file-preview h3 {
                    margin-top: 0;
                    margin-bottom: 0.75rem;
                    font-size: 0.9rem;
                }
                .preview-grid {
                    display: flex;
                    gap: 1rem;
                    flex-wrap: wrap;
                }
                .preview-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.9rem;
                }
                .preview-label {
                    color: var(--c-text-light, #aaa);
                }
                .restore-options {
                    margin-top: 1rem;
                }
                .option-group {
                    margin-bottom: 1rem;
                }
                .option-group h3 {
                    font-size: 0.9rem;
                    margin-bottom: 0.5rem;
                }
                .checkbox-option {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.75rem;
                    padding: 0.6rem 1rem;
                    border-radius: 8px;
                    border: 1px solid var(--c-muted, #334155);
                    cursor: pointer;
                }
                .checkbox-option input {
                    margin-top: 0.3rem;
                }
                .checkbox-option p {
                    font-size: 0.8rem;
                    margin: 0.25rem 0 0 !important;
                }
                .warning-banner {
                    background: rgba(251, 146, 52, 0.15);
                    border: 1px solid rgba(251, 146, 52, 0.4);
                    color: #fb9234;
                    padding: 0.6rem 1rem;
                    border-radius: 8px;
                    margin-bottom: 1rem;
                    font-size: 0.85rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .restore-result {
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 8px;
                    padding: 1rem;
                    margin-top: 1rem;
                }
                .restore-result h3 {
                    margin-top: 0;
                    margin-bottom: 0.75rem;
                    font-size: 0.9rem;
                }
                .result-row {
                    padding: 0.4rem 0;
                    font-size: 0.9rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                /* Legacy Import */
                .legacy-section {
                    margin-bottom: 1rem;
                }
                .legacy-section h3 {
                    margin-top: 0;
                    margin-bottom: 0.25rem;
                }
                .sub-help {
                    font-size: 0.85rem;
                    color: var(--c-text-light, #aaa) !important;
                    margin-bottom: 0.5rem !important;
                }
                .json-input {
                    width: 100%;
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid var(--c-muted, #334155);
                    color: var(--c-text, #fff);
                    padding: 0.75rem;
                    font-family: monospace;
                    font-size: 0.85rem;
                    border-radius: 8px;
                    margin-bottom: 0.75rem;
                    resize: vertical;
                    box-sizing: border-box;
                }
                .action-row {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    flex-wrap: wrap;
                }
                .inline-status {
                    font-size: 0.85rem;
                }
                .inline-status.success { color: #4ade80; }
                .inline-status.error { color: #f87171; }
                .inline-status.loading { color: #64b5f6; }
                .inner-divider {
                    border: 0;
                    border-top: 1px solid var(--c-muted, #334155);
                    margin: 1.5rem 0;
                }
            `}</style>
        </>
    );
}
