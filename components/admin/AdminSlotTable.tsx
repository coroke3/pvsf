import { useMemo } from 'react';
import { 
  useReactTable, 
  getCoreRowModel, 
  getSortedRowModel,
  flexRender,
  ColumnDef 
} from '@tanstack/react-table';
import type { SlotDocument } from '@/types/firestore';
import { Button } from '@/components/ui/button';

interface Props {
  data: SlotDocument[];
  onDelete: (id: string) => void;
}

export const AdminSlotTable = ({ data, onDelete }: Props) => {
  const columns = useMemo<ColumnDef<SlotDocument>[]>(() => [
    {
      accessorKey: 'id',
      header: 'ID',
    },
    {
      id: 'time',
      header: 'Time',
      accessorFn: (row) => {
          // Convert Timestamp to readable time
          if (!row.startTime) return '-';
          const date = row.startTime.toDate ? row.startTime.toDate() : new Date(row.startTime as any);
          return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
      }
    },
    {
      accessorKey: 'reservedBy.userName',
      header: 'Reserved By',
      cell: info => info.getValue() || <span className="text-gray-400">Empty</span>
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: info => (
        <Button variant="destructive" size="sm" onClick={() => onDelete(info.row.original.id)}>
            削除
        </Button>
      )
    }
  ], [onDelete]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="rounded-md border">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-100 border-b">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="px-4 py-3 font-medium">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="border-b hover:bg-gray-50">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-4 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
