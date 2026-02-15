import { useState } from 'react';
import { ROLE_OPTIONS } from './schema';

interface ParsedMember {
  name: string;
  xid: string;
  role: string;
  editApproved: boolean;
}

interface MemberParserProps {
  onParsed: (members: ParsedMember[]) => void;
}

/**
 * Member bulk input/parse component
 * Supports:
 * - Comma-separated: "名前, @ID"
 * - Space-separated: "名前 @ID"
 * - Tab-separated (spreadsheet paste): "名前\tID" (columns: Name, ID per row)
 * - Multi-column spreadsheet: columns = User, ID; rows = each member
 */
export const MemberParser = ({ onParsed }: MemberParserProps) => {
  const [input, setInput] = useState('');
  const [defaultRole, setDefaultRole] = useState('');

  const handleParse = () => {
    const lines = input.split(/\r\n|\n|\r/);
    const parsed: ParsedMember[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Tab-separated (spreadsheet paste)
      if (trimmed.includes('\t')) {
        const parts = trimmed.split('\t').map(s => s.trim());
        const name = parts[0] || '';
        const xid = (parts[1] || '').replace(/^@/, '');
        if (name) {
          parsed.push({ name, xid, role: defaultRole, editApproved: false });
        }
        continue;
      }

      // Comma-separated: "名前, @ID"
      if (trimmed.includes(',')) {
        const [name, xid] = trimmed.split(',').map(s => s.trim());
        parsed.push({
          name: name || '',
          xid: (xid || '').replace(/^@/, ''),
          role: defaultRole,
          editApproved: false,
        });
        continue;
      }

      // Space-separated: "名前 @ID"
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2 && parts[parts.length - 1].startsWith('@')) {
        const xid = parts.pop()!.replace(/^@/, '');
        const name = parts.join(' ');
        parsed.push({ name, xid, role: defaultRole, editApproved: false });
        continue;
      }

      // Name only
      parsed.push({ name: trimmed, xid: '', role: defaultRole, editApproved: false });
    }

    if (parsed.length > 0) {
      onParsed(parsed);
      setInput('');
    }
  };

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-gray-50 border-gray-200">
      <div>
        <h4 className="text-sm font-semibold text-gray-700">メンバー一括追加</h4>
        <p className="text-xs text-gray-500 mt-1">
          スプレッドシートからコピー&amp;ペースト可能です。対応形式:
        </p>
        <ul className="text-xs text-gray-500 list-disc ml-4 mt-1">
          <li>タブ区切り（スプレッドシート）: 名前[TAB]ID</li>
          <li>カンマ区切り: 名前, @ID</li>
          <li>スペース区切り: 名前 @ID</li>
        </ul>
      </div>

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-xs text-gray-600 mb-1">デフォルト役職</label>
          <select
            value={defaultRole}
            onChange={e => setDefaultRole(e.target.value)}
            className="w-full p-1.5 border rounded text-sm"
          >
            <option value="">指定なし</option>
            {ROLE_OPTIONS.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
      </div>

      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={`太郎\t@taro\n花子\t@hanako\nまたは\n太郎, @taro\n花子, @hanako`}
        className="w-full min-h-[120px] p-2 border rounded-md text-sm font-mono"
      />

      <button
        type="button"
        onClick={handleParse}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
      >
        解析してリストに追加
      </button>
    </div>
  );
};
