// Dynamic Member Input Form Component
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faGripVertical } from '@fortawesome/free-solid-svg-icons';
import type { VideoMember } from '@/types/video';

interface MemberFormProps {
    members: VideoMember[];
    onChange: (members: VideoMember[]) => void;
    disabled?: boolean;
}

export default function MemberForm({ members, onChange, disabled = false }: MemberFormProps) {
    const addMember = () => {
        onChange([...members, { name: '', xid: '', role: '' }]);
    };

    const removeMember = (index: number) => {
        const newMembers = members.filter((_, i) => i !== index);
        onChange(newMembers);
    };

    const updateMember = (index: number, field: keyof VideoMember, value: string) => {
        const newMembers = [...members];
        newMembers[index] = { ...newMembers[index], [field]: value };
        onChange(newMembers);
    };

    return (
        <div className="member-form">
            <div className="member-header">
                <h4>メンバー情報</h4>
                <button
                    type="button"
                    className="add-member-btn"
                    onClick={addMember}
                    disabled={disabled}
                >
                    <FontAwesomeIcon icon={faPlus} />
                    メンバー追加
                </button>
            </div>

            {members.length === 0 ? (
                <p className="no-members">メンバーが登録されていません</p>
            ) : (
                <div className="member-list">
                    {members.map((member, index) => (
                        <div key={index} className="member-row">
                            <div className="member-drag">
                                <FontAwesomeIcon icon={faGripVertical} />
                            </div>

                            <div className="member-fields">
                                <div className="field-group">
                                    <label>名前</label>
                                    <input
                                        type="text"
                                        value={member.name}
                                        onChange={(e) => updateMember(index, 'name', e.target.value)}
                                        placeholder="表示名"
                                        disabled={disabled}
                                    />
                                </div>

                                <div className="field-group">
                                    <label>X ID</label>
                                    <div className="xid-input">
                                        <span className="prefix">@</span>
                                        <input
                                            type="text"
                                            value={member.xid}
                                            onChange={(e) => updateMember(index, 'xid', e.target.value.replace('@', ''))}
                                            placeholder="username"
                                            disabled={disabled}
                                        />
                                    </div>
                                </div>

                                <div className="field-group role-field">
                                    <label>役職 (任意)</label>
                                    <input
                                        type="text"
                                        value={member.role}
                                        onChange={(e) => updateMember(index, 'role', e.target.value)}
                                        placeholder="例: Movie, Illust"
                                        disabled={disabled}
                                    />
                                </div>
                            </div>

                            <button
                                type="button"
                                className="remove-member-btn"
                                onClick={() => removeMember(index)}
                                disabled={disabled}
                                aria-label="メンバーを削除"
                            >
                                <FontAwesomeIcon icon={faTrash} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <style jsx>{`
        .member-form {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .member-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .member-header h4 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
        }

        .add-member-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #5865F2;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .add-member-btn:hover:not(:disabled) {
          background: #4752C4;
        }

        .add-member-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .no-members {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.875rem;
          text-align: center;
          padding: 2rem;
        }

        .member-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .member-row {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
        }

        .member-drag {
          color: rgba(255, 255, 255, 0.3);
          cursor: grab;
          padding: 0.5rem 0;
        }

        .member-fields {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 0.75rem;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .field-group label {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .field-group input {
          padding: 0.5rem 0.75rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid transparent;
          border-radius: 6px;
          color: white;
          font-size: 0.875rem;
          transition: border-color 0.2s ease;
        }

        .field-group input:focus {
          outline: none;
          border-color: #5865F2;
        }

        .field-group input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .xid-input {
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          overflow: hidden;
        }

        .xid-input .prefix {
          padding: 0.5rem 0 0.5rem 0.75rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .xid-input input {
          background: transparent;
          padding-left: 0.25rem;
        }

        .remove-member-btn {
          padding: 0.5rem;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .remove-member-btn:hover:not(:disabled) {
          color: #ef4444;
        }

        @media screen and (max-width: 768px) {
          .member-fields {
            grid-template-columns: 1fr;
          }
          
          .role-field {
            grid-column: 1;
          }
        }
      `}</style>
        </div>
    );
}
