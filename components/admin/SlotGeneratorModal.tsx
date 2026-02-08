import { useState, ChangeEvent } from 'react';
import { bulkCreateSlots } from '@/libs/admin/slots';

interface Props {
  eventId: string;
  onSuccess: () => void;
}

export const SlotGeneratorModal = ({ eventId, onSuccess }: Props) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // フォーム状態
  const [startDate, setStartDate] = useState(''); // YYYY-MM-DD
  const [startHour, setStartHour] = useState(21);
  const [startMinute, setStartMinute] = useState(0);
  const [count, setCount] = useState(10);
  const [duration, setDuration] = useState(3); // 分
  const [interval, setInterval] = useState(1); // 分

  const handleGenerate = async () => {
    if (!startDate) return;
    setLoading(true);
    try {
      await bulkCreateSlots({
        eventId,
        startDate: new Date(startDate),
        startHour,
        startMinute,
        count,
        durationMinutes: duration,
        intervalMinutes: interval,
      });
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error(error);
      alert('枠の生成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
      >
        一括生成
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 shadow-lg max-w-md w-full relative">
        <button
          onClick={() => setOpen(false)}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-xl"
        >
          ✕
        </button>
        
        <h2 className="text-xl font-bold mb-4">枠の自動生成</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
            <input
              type="date"
              value={startDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">開始時刻</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={startHour}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setStartHour(Number(e.target.value))}
                className="w-20 border border-gray-300 rounded-md px-3 py-2"
                min={0}
                max={23}
              />
              <span>:</span>
              <input
                type="number"
                value={startMinute}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setStartMinute(Number(e.target.value))}
                className="w-20 border border-gray-300 rounded-md px-3 py-2"
                min={0}
                max={59}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">生成数</label>
            <input
              type="number"
              value={count}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setCount(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              min={1}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">1枠の長さ（分）</label>
            <input
              type="number"
              value={duration}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setDuration(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              min={1}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">間隔（分）</label>
            <input
              type="number"
              value={interval}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setInterval(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              min={0}
            />
          </div>
        </div>
        
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || !startDate}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '生成中...' : '生成実行'}
          </button>
        </div>
      </div>
    </div>
  );
};
