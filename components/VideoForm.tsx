// Video Registration/Edit Form Component
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faSpinner, faImage } from '@fortawesome/free-solid-svg-icons';
import MemberForm from './MemberForm';
import type { VideoFormData, VideoMember } from '@/types/video';

interface VideoFormProps {
    initialData?: Partial<VideoFormData>;
    onSubmit: (data: VideoFormData) => Promise<void>;
    isEdit?: boolean;
}

const defaultFormData: VideoFormData = {
    videoUrl: '',
    title: '',
    description: '',
    startTime: '',
    eventIds: [],
    authorXid: '',
    authorName: '',
    authorIconUrl: '',
    authorChannelUrl: '',
    music: '',
    credit: '',
    musicUrl: '',
    type: '個人',
    type2: '一般',
    movieYear: '',
    software: '',
    beforeComment: '',
    afterComment: '',
    listen: '',
    episode: '',
    endMessage: '',
    members: [],
    snsPlans: [],
    homepageComment: '',
    link: '',
    agreedToTerms: false,
};

export default function VideoForm({ initialData, onSubmit, isEdit = false }: VideoFormProps) {
    const [formData, setFormData] = useState<VideoFormData>({ ...defaultFormData, ...initialData });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [thumbnailPreview, setThumbnailPreview] = useState('');

    // Extract thumbnail from YouTube URL
    useEffect(() => {
        const videoId = extractYouTubeId(formData.videoUrl);
        if (videoId) {
            setThumbnailPreview(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`);
        } else {
            setThumbnailPreview('');
        }
    }, [formData.videoUrl]);

    const extractYouTubeId = (url: string): string | null => {
        if (!url) return null;
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
        return match ? match[1] : null;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        // Special handling for eventIds (stored as array, edited as comma-separated string)
        if (name === 'eventIds') {
            const eventIds = value.split(',').map(s => s.trim()).filter(Boolean);
            setFormData(prev => ({ ...prev, eventIds }));
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleMembersChange = (members: VideoMember[]) => {
        setFormData(prev => ({ ...prev, members }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            await onSubmit(formData);
        } catch (err: any) {
            setError(err.message || '送信に失敗しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="video-form">
            {/* Basic Info Section */}
            <section className="form-section">
                <h3>基本情報</h3>

                <div className="form-grid">
                    <div className="form-group full-width">
                        <label htmlFor="videoUrl">動画URL *</label>
                        <input
                            type="url"
                            id="videoUrl"
                            name="videoUrl"
                            value={formData.videoUrl}
                            onChange={handleChange}
                            placeholder="https://www.youtube.com/watch?v=..."
                            required
                        />
                    </div>

                    {thumbnailPreview && (
                        <div className="thumbnail-preview full-width">
                            <Image 
                                src={thumbnailPreview} 
                                alt="サムネイルプレビュー"
                                width={640}
                                height={360}
                                unoptimized
                            />
                        </div>
                    )}

                    <div className="form-group full-width">
                        <label htmlFor="title">タイトル *</label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="作品タイトル"
                            required
                        />
                    </div>

                    <div className="form-group full-width">
                        <label htmlFor="description">説明文</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="作品の説明..."
                            rows={4}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="startTime">公開日時</label>
                        <input
                            type="datetime-local"
                            id="startTime"
                            name="startTime"
                            value={formData.startTime}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="eventIds">イベントID（複数ある場合はカンマ区切り）</label>
                        <input
                            type="text"
                            id="eventIds"
                            name="eventIds"
                            value={formData.eventIds.join(', ')}
                            onChange={handleChange}
                            placeholder="例: PVSF2025S または PVSF2024S, PVSF2025S"
                        />
                    </div>
                </div>
            </section>

            {/* Author Info Section */}
            <section className="form-section">
                <h3>投稿者情報</h3>

                <div className="form-grid">
                    <div className="form-group">
                        <label htmlFor="authorName">表示名 *</label>
                        <input
                            type="text"
                            id="authorName"
                            name="authorName"
                            value={formData.authorName}
                            onChange={handleChange}
                            placeholder="投稿者名"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="authorXid">X ID</label>
                        <div className="input-with-prefix">
                            <span>@</span>
                            <input
                                type="text"
                                id="authorXid"
                                name="authorXid"
                                value={formData.authorXid}
                                onChange={handleChange}
                                placeholder="username"
                            />
                        </div>
                    </div>

                    <div className="form-group full-width">
                        <label htmlFor="authorIconUrl">アイコンURL</label>
                        <input
                            type="url"
                            id="authorIconUrl"
                            name="authorIconUrl"
                            value={formData.authorIconUrl}
                            onChange={handleChange}
                            placeholder="https://..."
                        />
                    </div>
                </div>
            </section>

            {/* Metadata Section */}
            <section className="form-section">
                <h3>楽曲・カテゴリ</h3>

                <div className="form-grid">
                    <div className="form-group">
                        <label htmlFor="music">楽曲名</label>
                        <input
                            type="text"
                            id="music"
                            name="music"
                            value={formData.music}
                            onChange={handleChange}
                            placeholder="曲名"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="credit">原曲者</label>
                        <input
                            type="text"
                            id="credit"
                            name="credit"
                            value={formData.credit}
                            onChange={handleChange}
                            placeholder="アーティスト名"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="type">出展形態</label>
                        <select
                            id="type"
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                        >
                            <option value="個人">個人</option>
                            <option value="団体">団体</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="type2">参加形態</label>
                        <select
                            id="type2"
                            name="type2"
                            value={formData.type2}
                            onChange={handleChange}
                        >
                            <option value="個人">個人</option>
                            <option value="複数人">複数人</option>
                        </select>
                    </div>
                </div>
            </section>

            {/* Members Section */}
            <section className="form-section">
                <MemberForm
                    members={formData.members}
                    onChange={handleMembersChange}
                    disabled={isSubmitting}
                />
            </section>

            {/* Error Message */}
            {error && (
                <div className="error-message">{error}</div>
            )}

            {/* Submit Button */}
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? (
                    <>
                        <FontAwesomeIcon icon={faSpinner} spin />
                        送信中...
                    </>
                ) : (
                    <>
                        <FontAwesomeIcon icon={faSave} />
                        {isEdit ? '更新する' : '登録する'}
                    </>
                )}
            </button>

            <style jsx>{`
        .video-form {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .form-section {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .form-section h3 {
          margin: 0 0 1.5rem;
          font-size: 1.125rem;
          font-weight: 600;
          border: none;
          padding: 0;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-group label {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid transparent;
          border-radius: 8px;
          color: white;
          font-size: 1rem;
          transition: border-color 0.2s ease;
        }

        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: #5865F2;
        }

        .form-group input::placeholder,
        .form-group textarea::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .form-group select {
          cursor: pointer;
        }

        .form-group select option {
          background: #1a1a1a;
        }

        .input-with-prefix {
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          overflow: hidden;
        }

        .input-with-prefix span {
          padding: 0.75rem 0 0.75rem 1rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .input-with-prefix input {
          background: transparent;
          padding-left: 0.25rem;
        }

        .thumbnail-preview {
          border-radius: 8px;
          overflow: hidden;
          aspect-ratio: 16/9;
        }

        .thumbnail-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .error-message {
          padding: 1rem;
          background: rgba(239, 68, 68, 0.1);
          border-radius: 8px;
          color: #ef4444;
          text-align: center;
        }

        .submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 1rem 2rem;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1.125rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .submit-btn:hover:not(:disabled) {
          background: #059669;
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media screen and (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }

          .form-group.full-width {
            grid-column: 1;
          }
        }
      `}</style>
        </form>
    );
}
