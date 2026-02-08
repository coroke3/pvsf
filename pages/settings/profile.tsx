import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function ProfileSettings() {
  const { data: session } = useSession();
  const [xid, setXid] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLink = async () => {
    if (!xid) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/link-x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xid }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('申請を受け付けました。過去データが見つかった場合、編集権限が付与されます。');
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (e) {
      setMessage('Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  if (!session) return <div>Please login</div>;

  return (
    <div className="container mx-auto p-8 max-w-md">
      <Card>
        <CardHeader>
            <CardTitle>プロフィール設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-1">X (Twitter) ID</label>
                <div className="flex gap-2">
                    <Input 
                        placeholder="@username" 
                        value={xid} 
                        onChange={e => setXid(e.target.value)} 
                    />
                    <Button onClick={handleLink} disabled={loading}>
                        {loading ? '処理中...' : '連携'}
                    </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    ※過去のイベントに参加したIDを入力すると、過去作品の編集権限が自動的に付与されます。
                </p>
                {message && <p className="text-sm mt-4 font-semibold text-blue-600">{message}</p>}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
