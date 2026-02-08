import { useState } from 'react';

// メンバー一括入力・解析コンポーネント
export const MemberParser = ({ onParsed }: { onParsed: (members: { name: string; xid: string }[]) => void }) => {
  const [input, setInput] = useState('');

  const handleParse = () => {
    const lines = input.split(/\r\n|\n|\r/);
    const parsed = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        
        // カンマ区切り: 「名前, @ID」
        if (trimmed.includes(',')) {
            const [name, xid] = trimmed.split(',').map(s => s.trim());
            return { name, xid: xid?.replace('@', '') || '' };
        }
        
        // スペース区切り: 「名前 @ID」
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2 && parts[parts.length-1].startsWith('@')) {
             const xid = parts.pop()?.replace('@', '') || '';
             const name = parts.join(' ');
             return { name, xid };
        }
        
        // IDなしの場合
        return { name: trimmed, xid: '' };
    }).filter((item): item is { name: string; xid: string } => item !== null);

    onParsed(parsed);
    setInput('');
  };

  return (
    <div className="space-y-4 p-4 border rounded bg-gray-50 border-gray-200">
      <div>
        <h4 className="text-sm font-semibold text-gray-700">メンバー一括追加</h4>
        <p className="text-xs text-gray-500 mb-2">
            「名前, @ID」または「名前 @ID」の形式で貼り付けてください。改行で複数追加できます。
        </p>
      </div>
      <textarea
        value={input} 
        onChange={e => setInput(e.target.value)} 
        placeholder={"太郎 @taro\n花子 @hanako"}
        className="w-full min-h-[100px] p-2 border rounded-md text-sm"
      />
      <button 
        type="button"
        onClick={handleParse} 
        className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
      >
        解析してリストに追加
      </button>
    </div>
  );
};
