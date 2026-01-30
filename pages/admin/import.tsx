// Admin Data Import Page
import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faUpload, faCheck, faTimes, faSpinner, faArrowLeft,
    faFileAlt, faVideo, faUser, faMusic, faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import Footer from '@/components/Footer';
import Link from 'next/link';

interface ImportResult {
    success: number;
    failed: number;
    errors: string[];
}

export default function AdminImportPage() {
    const router = useRouter();
    const { isAdmin, isLoading, isAuthenticated } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<any[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState('');

    // Redirect if not admin
    useEffect(() => {
        if (!isLoading && (!isAuthenticated || !isAdmin)) {
            router.push('/');
        }
    }, [isLoading, isAuthenticated, isAdmin, router]);

    if (!isAuthenticated || !isAdmin) {
        return null;
    }

    // Parse CSV/TSV line handling quoted fields
    const parseCSVLine = (line: string, delimiter: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    // Escaped quote
                    current += '"';
                    i++;
                } else {
                    // Toggle quote mode
                    inQuotes = !inQuotes;
                }
            } else if (char === delimiter && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setError('');
        setResult(null);

        try {
            const text = await selectedFile.text();
            let data: any[];

            // Try to parse as JSON first
            try {
                data = JSON.parse(text);
                if (!Array.isArray(data)) {
                    throw new Error('Data must be an array');
                }
            } catch {
                // Try CSV/TSV format
                const lines = text.split(/\r?\n/).filter(line => line.trim());
                if (lines.length < 2) {
                    throw new Error('Invalid file format: ヘッダーとデータが必要です');
                }

                // Detect delimiter (tab or comma)
                const firstLine = lines[0];
                const delimiter = firstLine.includes('\t') ? '\t' : ',';
                
                const headers = parseCSVLine(firstLine, delimiter);
                
                data = lines.slice(1).map((line, lineIndex) => {
                    const values = parseCSVLine(line, delimiter);
                    const obj: any = {};
                    headers.forEach((header, i) => {
                        // Remove BOM and clean header
                        const cleanHeader = header.replace(/^\uFEFF/, '').trim();
                        obj[cleanHeader] = values[i] || '';
                    });
                    return obj;
                }).filter(obj => {
                    // Filter out empty rows
                    return Object.values(obj).some(v => v !== '');
                });
            }

            if (data.length === 0) {
                throw new Error('インポートするデータがありません');
            }

            // Show all items
            setPreview(data);

        } catch (err: any) {
            setError(err.message || 'ファイルの読み込みに失敗しました');
            setPreview([]);
        }
    };

    const handleImport = async () => {
        if (!file || preview.length === 0) return;

        setIsImporting(true);
        setError('');
        setResult(null);

        try {
            // Use the already parsed preview data instead of re-parsing
            const res = await fetch('/api/admin/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videos: preview }),
            });

            const resultData = await res.json();

            if (!res.ok) {
                throw new Error(resultData.error || 'インポートに失敗しました');
            }

            setResult(resultData);
            setFile(null);
            setPreview([]);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsImporting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="loading-container">
                <FontAwesomeIcon icon={faSpinner} spin size="2x" />
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>データインポート - PVSF Admin</title>
            </Head>

            <div className="admin-page">
                <div className="admin-header">
                    <Link href="/admin" className="back-link">
                        <FontAwesomeIcon icon={faArrowLeft} /> 管理画面に戻る
                    </Link>
                    <h1><FontAwesomeIcon icon={faUpload} /> データインポート</h1>
                    <p>動画データをFirestoreに一括インポートします。JSON / CSV / TSV形式に対応。</p>
                </div>

                <div className="admin-content">
                    <div className="card">

                    {/* File Upload Area */}
                    <div
                        className="upload-area"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json,.csv,.tsv,.txt"
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                        />
                        <FontAwesomeIcon icon={faUpload} size="2x" />
                        <p>クリックしてファイルを選択</p>
                        <p className="upload-hint">JSON / CSV / TSV 形式に対応</p>
                    </div>

                    {/* Selected File */}
                    {file && (
                        <div className="selected-file">
                            <span>📄 {file.name}</span>
                            <span className="file-size">
                                ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                        </div>
                    )}

                    {/* Preview */}
                    {preview.length > 0 && (
                        <div className="preview-section">
                            <div className="preview-header">
                                <h3><FontAwesomeIcon icon={faFileAlt} /> プレビュー</h3>
                                <span className="preview-count">{preview.length}件</span>
                            </div>
                            
                            {/* Field Summary */}
                            <div className="field-summary">
                                <span className="field-summary-label">検出されたフィールド:</span>
                                <div className="field-tags">
                                    {Object.keys(preview[0] || {}).slice(0, 12).map(key => (
                                        <span key={key} className="field-tag">{key}</span>
                                    ))}
                                    {Object.keys(preview[0] || {}).length > 12 && (
                                        <span className="field-tag field-tag-more">+{Object.keys(preview[0] || {}).length - 12}</span>
                                    )}
                                </div>
                            </div>

                            <div className="preview-cards">
                                {preview.slice(0, 20).map((item, index) => {
                                    // Extract YouTube ID for thumbnail
                                    const ytMatch = item.ylink?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
                                    const ytId = ytMatch ? ytMatch[1] : null;

                                    // Count filled optional fields
                                    const hasListen = !!item.listen;
                                    const hasEpisode = !!item.episode;
                                    const hasEnd = !!item.end;
                                    const hasBefore = !!item.beforecomment;
                                    const hasAfter = !!item.aftercomment;
                                    const hasMusic = !!item.music;
                                    const hasCredit = !!item.credit;
                                    const hasSoft = !!item.soft;

                                    return (
                                        <div key={index} className="preview-card">
                                            <div className="preview-card-header">
                                                {ytId ? (
                                                    <img 
                                                        src={`https://i.ytimg.com/vi/${ytId}/mqdefault.jpg`}
                                                        alt=""
                                                        className="preview-thumb"
                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <div className="preview-thumb-placeholder">
                                                        <FontAwesomeIcon icon={faVideo} />
                                                    </div>
                                                )}
                                                <div className="preview-card-title">
                                                    <span className="preview-index">#{index + 1}</span>
                                                    <h4>{item.title || '(タイトルなし)'}</h4>
                                                </div>
                                            </div>
                                            <div className="preview-card-body">
                                                <div className="preview-row">
                                                    <FontAwesomeIcon icon={faUser} className="row-icon" />
                                                    <span>{item.creator || '-'}</span>
                                                    {item.tlink && <span className="sub-text">@{item.tlink}</span>}
                                                </div>
                                                {hasMusic && (
                                                    <div className="preview-row">
                                                        <FontAwesomeIcon icon={faMusic} className="row-icon" />
                                                        <span className="truncate">{item.music}</span>
                                                        {hasCredit && <span className="sub-text">/ {item.credit}</span>}
                                                    </div>
                                                )}
                                                <div className="preview-row">
                                                    <FontAwesomeIcon icon={faInfoCircle} className="row-icon" />
                                                    <span>{item.type || '-'} / {item.type2 || '-'}</span>
                                                    {item.eventid && <span className="event-badge">{item.eventid}</span>}
                                                </div>
                                            </div>
                                            <div className="preview-card-footer">
                                                <div className="data-badges">
                                                    {hasSoft && <span className="badge badge-sm badge-info">{item.soft}</span>}
                                                    {hasBefore && <span className="badge badge-sm">前コメ</span>}
                                                    {hasAfter && <span className="badge badge-sm">後コメ</span>}
                                                    {hasListen && <span className="badge badge-sm">聞</span>}
                                                    {hasEpisode && <span className="badge badge-sm">話</span>}
                                                    {hasEnd && <span className="badge badge-sm">終</span>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {preview.length > 20 && (
                                <p className="preview-more">他 {preview.length - 20}件...</p>
                            )}
                        </div>
                    )}

                    {/* Import Button */}
                    {file && preview.length > 0 && (
                        <button
                            className="import-btn"
                            onClick={handleImport}
                            disabled={isImporting}
                        >
                            {isImporting ? (
                                <>
                                    <FontAwesomeIcon icon={faSpinner} spin />
                                    インポート中...
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faUpload} />
                                    インポート実行
                                </>
                            )}
                        </button>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="message error">
                            <FontAwesomeIcon icon={faTimes} />
                            {error}
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div className="message success">
                            <FontAwesomeIcon icon={faCheck} />
                            インポート完了: {result.success}件成功, {result.failed}件失敗
                            {result.errors.length > 0 && (
                                <ul className="error-list">
                                    {result.errors.slice(0, 5).map((err, i) => (
                                        <li key={i}>{err}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                    </div>
                </div>

                <Footer />
            </div>

            <style jsx>{`
                .back-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: #8892b0;
                    text-decoration: none;
                    font-size: 0.9rem;
                    margin-bottom: 1rem;
                    transition: color 0.2s;
                }

                .back-link:hover {
                    color: #64ffda;
                }

                .upload-area {
                    border: 2px dashed rgba(255, 255, 255, 0.2);
                    border-radius: 16px;
                    padding: 3rem;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    background: rgba(0, 0, 0, 0.1);
                }

                .upload-area:hover {
                    border-color: #64ffda;
                    background: rgba(100, 255, 218, 0.05);
                }

                .upload-area :global(svg) {
                    color: #64ffda;
                    opacity: 0.7;
                }

                .upload-area p {
                    margin: 1rem 0 0;
                    color: #ccd6f6;
                }

                .upload-hint {
                    font-size: 0.8rem;
                    color: rgba(255, 255, 255, 0.4);
                }

                .selected-file {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 1rem 1.25rem;
                    background: rgba(100, 255, 218, 0.08);
                    border: 1px solid rgba(100, 255, 218, 0.2);
                    border-radius: 10px;
                    margin-top: 1.5rem;
                }

                .file-size {
                    color: rgba(255, 255, 255, 0.5);
                    font-size: 0.875rem;
                }

                /* Preview Section */
                .preview-section {
                    margin-top: 2rem;
                }

                .preview-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 1rem;
                }

                .preview-header h3 {
                    margin: 0;
                    font-size: 1rem;
                    font-weight: 600;
                    border: none;
                    padding: 0;
                    color: #fff;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .preview-header h3 :global(svg) {
                    color: #64ffda;
                }

                .preview-count {
                    background: rgba(100, 255, 218, 0.1);
                    color: #64ffda;
                    padding: 0.25rem 0.75rem;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: 600;
                }

                .field-summary {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.75rem;
                    padding: 1rem;
                    background: rgba(255, 255, 255, 0.02);
                    border-radius: 10px;
                    margin-bottom: 1.5rem;
                    flex-wrap: wrap;
                }

                .field-summary-label {
                    color: #8892b0;
                    font-size: 0.8rem;
                    white-space: nowrap;
                }

                .field-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.375rem;
                }

                .field-tag {
                    padding: 0.2rem 0.5rem;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                    font-size: 0.7rem;
                    color: #9ca3af;
                    font-family: monospace;
                }

                .field-tag-more {
                    background: rgba(100, 255, 218, 0.1);
                    border-color: rgba(100, 255, 218, 0.2);
                    color: #64ffda;
                }

                /* Preview Cards */
                .preview-cards {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 1rem;
                    max-height: 600px;
                    overflow-y: auto;
                    padding-right: 0.5rem;
                }

                .preview-card {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    border-radius: 12px;
                    overflow: hidden;
                    transition: all 0.2s ease;
                }

                .preview-card:hover {
                    border-color: rgba(255, 255, 255, 0.12);
                    background: rgba(255, 255, 255, 0.03);
                }

                .preview-card-header {
                    display: flex;
                    gap: 0.75rem;
                    padding: 0.75rem;
                    background: rgba(0, 0, 0, 0.2);
                }

                .preview-thumb {
                    width: 80px;
                    height: 45px;
                    object-fit: cover;
                    border-radius: 6px;
                    flex-shrink: 0;
                }

                .preview-thumb-placeholder {
                    width: 80px;
                    height: 45px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: rgba(255, 255, 255, 0.2);
                    flex-shrink: 0;
                }

                .preview-card-title {
                    flex: 1;
                    min-width: 0;
                }

                .preview-index {
                    font-size: 0.65rem;
                    color: #64ffda;
                    font-weight: 600;
                }

                .preview-card-title h4 {
                    margin: 0.25rem 0 0;
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #fff;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .preview-card-body {
                    padding: 0.75rem;
                }

                .preview-row {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.8rem;
                    color: #9ca3af;
                    margin-bottom: 0.5rem;
                }

                .preview-row:last-child {
                    margin-bottom: 0;
                }

                .preview-row :global(.row-icon) {
                    width: 14px;
                    color: #64ffda;
                    opacity: 0.6;
                }

                .sub-text {
                    color: rgba(255, 255, 255, 0.4);
                    font-size: 0.75rem;
                }

                .truncate {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 150px;
                }

                .event-badge {
                    margin-left: auto;
                    padding: 0.15rem 0.4rem;
                    background: rgba(139, 92, 246, 0.15);
                    color: #a78bfa;
                    border-radius: 4px;
                    font-size: 0.65rem;
                    font-weight: 600;
                }

                .preview-card-footer {
                    padding: 0.5rem 0.75rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                }

                .data-badges {
                    display: flex;
                    gap: 0.25rem;
                    flex-wrap: wrap;
                }

                .badge-sm {
                    padding: 0.15rem 0.4rem;
                    font-size: 0.6rem;
                    background: rgba(100, 255, 218, 0.1);
                    color: #64ffda;
                    border-radius: 4px;
                }

                .badge-info {
                    background: rgba(59, 130, 246, 0.15);
                    color: #60a5fa;
                }

                .preview-more {
                    text-align: center;
                    color: #6b7280;
                    font-size: 0.85rem;
                    margin-top: 1rem;
                }

                /* Import Button */
                .import-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    width: 100%;
                    padding: 1.125rem;
                    margin-top: 2rem;
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
                }

                .import-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
                }

                .import-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }

                /* Messages */
                .message {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.75rem;
                    padding: 1.25rem;
                    border-radius: 12px;
                    margin-top: 1.5rem;
                }

                .message.error {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    color: #f87171;
                }

                .message.success {
                    background: rgba(16, 185, 129, 0.1);
                    border: 1px solid rgba(16, 185, 129, 0.2);
                    color: #4ade80;
                    flex-direction: column;
                }

                .error-list {
                    margin: 0.75rem 0 0 1.5rem;
                    padding: 0;
                    font-size: 0.8rem;
                    color: rgba(255, 255, 255, 0.6);
                }

                @media (max-width: 768px) {
                    .preview-cards {
                        grid-template-columns: 1fr;
                    }

                    .field-summary {
                        flex-direction: column;
                    }
                }
            `}</style>
        </>
    );
}
