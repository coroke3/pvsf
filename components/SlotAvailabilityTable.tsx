// Slot Availability Table Component
// Displays slots in a table format with dates as rows and times as columns.
// Shows 〇 for available slots, × for occupied slots.
// In 'user' mode, clicking on available slots triggers selection.

import { useMemo } from 'react';

export interface SlotData {
    dateTime: string;
    videoId?: string | null;
    videoTitle?: string;  // For admin view - shows who took the slot
    isAvailable: boolean;
    eventId?: string;
    eventName?: string;
}

interface SlotAvailabilityTableProps {
    slots: SlotData[];
    mode: 'admin' | 'user';
    selectedSlot?: SlotData | null;
    selectedSlots?: SlotData[];  // For multi-slot selection
    onSlotSelect?: (slot: SlotData) => void;
    onMultiSlotSelect?: (slots: SlotData[]) => void;  // For multi-slot selection
    maxSlots?: number;  // Maximum consecutive slots (default: 1)
    showLegend?: boolean;
}

/**
 * Formats date for display (YYYY/MM/DD (weekday))
 */
function formatDateRow(date: Date): string {
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const w = weekdays[date.getDay()];
    return `${y}/${m}/${d} (${w})`;
}

/**
 * Formats time for display (HH:mm)
 */
function formatTimeColumn(date: Date): string {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}

/**
 * Get date key for grouping (YYYY-MM-DD)
 */
function getDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Get time key for grouping (HH:mm)
 */
function getTimeKey(date: Date): string {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}

export default function SlotAvailabilityTable({
    slots,
    mode,
    selectedSlot,
    selectedSlots = [],
    onSlotSelect,
    onMultiSlotSelect,
    maxSlots = 1,
    showLegend = true,
}: SlotAvailabilityTableProps) {
    // Process slots: filter future only, group by date and time
    const { dates, times, slotMap, sortedSlots } = useMemo(() => {
        const now = new Date();

        // Filter future slots only
        const futureSlots = slots.filter(slot => {
            const slotDate = new Date(slot.dateTime);
            return slotDate > now;
        });

        // Get unique dates and times
        const dateSet = new Set<string>();
        const timeSet = new Set<string>();
        const map = new Map<string, SlotData>(); // key: "dateKey|timeKey"

        for (const slot of futureSlots) {
            const date = new Date(slot.dateTime);
            const dateKey = getDateKey(date);
            const timeKey = getTimeKey(date);

            dateSet.add(dateKey);
            timeSet.add(timeKey);
            map.set(`${dateKey}|${timeKey}`, slot);
        }

        // Sort dates and times
        const sortedDates = Array.from(dateSet).sort();
        const sortedTimes = Array.from(timeSet).sort();

        // Create sorted slot list for consecutive checking
        const sorted = futureSlots.sort((a, b) =>
            new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
        );

        return {
            dates: sortedDates,
            times: sortedTimes,
            slotMap: map,
            sortedSlots: sorted,
        };
    }, [slots]);

    // Handle slot click for multi-selection
    const handleSlotClick = (slot: SlotData) => {
        if (mode !== 'user' || !slot.isAvailable) return;

        // Single slot mode
        if (maxSlots === 1) {
            if (onSlotSelect) onSlotSelect(slot);
            return;
        }

        // Multi-slot mode
        if (!onMultiSlotSelect) return;

        const slotTime = new Date(slot.dateTime).getTime();
        const isAlreadySelected = selectedSlots.some(s => s.dateTime === slot.dateTime);

        if (isAlreadySelected) {
            // Deselect: remove this slot and any slots after it
            const slotIndex = selectedSlots.findIndex(s => s.dateTime === slot.dateTime);
            onMultiSlotSelect(selectedSlots.slice(0, slotIndex));
        } else {
            // Select: check if it's consecutive
            if (selectedSlots.length === 0) {
                // First selection
                onMultiSlotSelect([slot]);
            } else if (selectedSlots.length >= maxSlots) {
                // Max reached, replace with new selection
                onMultiSlotSelect([slot]);
            } else {
                // Check if consecutive to last selected slot
                const lastSelected = selectedSlots[selectedSlots.length - 1];
                const lastIndex = sortedSlots.findIndex(s => s.dateTime === lastSelected.dateTime);
                const newIndex = sortedSlots.findIndex(s => s.dateTime === slot.dateTime);

                if (newIndex === lastIndex + 1) {
                    // Consecutive, add to selection
                    onMultiSlotSelect([...selectedSlots, slot]);
                } else {
                    // Not consecutive, start new selection
                    onMultiSlotSelect([slot]);
                }
            }
        }
    };

    // Check if a slot is selected (single or multi)
    const isSelected = (slot: SlotData): boolean => {
        if (selectedSlot && selectedSlot.dateTime === slot.dateTime) return true;
        return selectedSlots.some(s => s.dateTime === slot.dateTime);
    };

    // Get selection order (1, 2, 3) for display
    const getSelectionOrder = (slot: SlotData): number => {
        const index = selectedSlots.findIndex(s => s.dateTime === slot.dateTime);
        return index >= 0 ? index + 1 : 0;
    };

    if (dates.length === 0) {
        return (
            <div className="slot-table-empty">
                利用可能な枠がありません
            </div>
        );
    }

    return (
        <div className="slot-availability-table-container">
            {showLegend && (
                <div className="slot-table-legend">
                    <span className="legend-item available">〇 = 空き</span>
                    <span className="legend-item occupied">× = 埋まり</span>
                    {mode === 'user' && maxSlots === 1 && (
                        <span className="legend-item hint">※ 〇をクリックで選択</span>
                    )}
                    {mode === 'user' && maxSlots > 1 && (
                        <span className="legend-item hint">※ 〇をクリックで選択（連続{maxSlots}枠まで）</span>
                    )}
                </div>
            )}

            <div className="slot-table-wrapper">
                <table className="slot-availability-table">
                    <thead>
                        <tr>
                            <th className="date-header">日付</th>
                            {times.map(time => (
                                <th key={time} className="time-header">{time}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {dates.map(dateKey => {
                            const date = new Date(dateKey + 'T00:00:00');
                            return (
                                <tr key={dateKey}>
                                    <td className="date-cell">{formatDateRow(date)}</td>
                                    {times.map(timeKey => {
                                        const slot = slotMap.get(`${dateKey}|${timeKey}`);

                                        if (!slot) {
                                            // No slot at this date/time
                                            return (
                                                <td key={timeKey} className="slot-cell empty">
                                                    -
                                                </td>
                                            );
                                        }

                                        const isAvailable = slot.isAvailable;
                                        const selected = isSelected(slot);
                                        const clickable = mode === 'user' && isAvailable;
                                        const order = getSelectionOrder(slot);
                                        const orderSymbols = ['', '①', '②', '③'];

                                        // Determine display content
                                        let displayContent: string;
                                        let titleText: string;

                                        if (selected && order > 0) {
                                            displayContent = orderSymbols[order] || `${order}`;
                                            titleText = 'クリックで選択解除';
                                        } else if (isAvailable) {
                                            displayContent = '〇';
                                            titleText = maxSlots > 1
                                                ? `クリックで選択（${selectedSlots.length}/${maxSlots}枠選択中）`
                                                : 'クリックして選択';
                                        } else {
                                            displayContent = '×';
                                            // In admin mode, show videoTitle as tooltip
                                            titleText = mode === 'admin' && slot.videoTitle
                                                ? `予約: ${slot.videoTitle}`
                                                : '予約済み';
                                        }

                                        return (
                                            <td
                                                key={timeKey}
                                                className={`slot-cell ${isAvailable ? 'available' : 'occupied'} ${selected ? 'selected' : ''} ${clickable ? 'clickable' : ''}`}
                                                onClick={() => clickable && handleSlotClick(slot)}
                                                title={titleText}
                                            >
                                                {displayContent}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <style jsx>{`
                .slot-availability-table-container {
                    width: 100%;
                }

                .slot-table-legend {
                    display: flex;
                    gap: 1.5rem;
                    margin-bottom: 1rem;
                    font-size: 0.85rem;
                    color: #8892b0;
                    flex-wrap: wrap;
                }

                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                }

                .legend-item.available {
                    color: #4ade80;
                }

                .legend-item.occupied {
                    color: #f87171;
                }

                .legend-item.hint {
                    color: #64ffda;
                    font-size: 0.8rem;
                }

                .slot-table-wrapper {
                    overflow-x: auto;
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                }

                .slot-availability-table {
                    width: 100%;
                    border-collapse: collapse;
                    min-width: 400px;
                }

                .slot-availability-table th,
                .slot-availability-table td {
                    padding: 0.5rem 0.75rem;
                    text-align: center;
                    border: 1px solid rgba(255, 255, 255, 0.06);
                }

                .slot-availability-table th {
                    background: rgba(255, 255, 255, 0.03);
                    font-weight: 600;
                    font-size: 0.85rem;
                    color: #ccd6f6;
                    position: sticky;
                    top: 0;
                    z-index: 1;
                }

                .date-header {
                    min-width: 140px;
                    text-align: left;
                    position: sticky;
                    left: 0;
                    background: rgba(10, 25, 47, 0.95) !important;
                    z-index: 2;
                }

                .time-header {
                    min-width: 60px;
                    font-variant-numeric: tabular-nums;
                }

                .date-cell {
                    text-align: left;
                    font-size: 0.85rem;
                    color: #ccd6f6;
                    white-space: nowrap;
                    position: sticky;
                    left: 0;
                    background: rgba(10, 25, 47, 0.95);
                    z-index: 1;
                }

                .slot-cell {
                    font-size: 1rem;
                    font-weight: 600;
                    transition: all 0.15s ease;
                }

                .slot-cell.empty {
                    color: rgba(255, 255, 255, 0.2);
                }

                .slot-cell.available {
                    color: #4ade80;
                    background: rgba(34, 197, 94, 0.08);
                }

                .slot-cell.occupied {
                    color: #f87171;
                    background: rgba(239, 68, 68, 0.08);
                }

                .slot-cell.clickable {
                    cursor: pointer;
                }

                .slot-cell.clickable:hover {
                    background: rgba(34, 197, 94, 0.2);
                    transform: scale(1.1);
                }

                .slot-cell.selected {
                    background: rgba(100, 255, 218, 0.25) !important;
                    color: #64ffda !important;
                    box-shadow: inset 0 0 0 2px #64ffda;
                }

                .slot-table-empty {
                    padding: 2rem;
                    text-align: center;
                    color: #8892b0;
                    background: rgba(255, 255, 255, 0.02);
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                }

                @media screen and (max-width: 768px) {
                    .slot-table-legend {
                        flex-direction: column;
                        gap: 0.5rem;
                    }

                    .slot-availability-table th,
                    .slot-availability-table td {
                        padding: 0.375rem 0.5rem;
                        font-size: 0.8rem;
                    }

                    .date-header,
                    .date-cell {
                        min-width: 100px;
                        font-size: 0.75rem;
                    }

                    .time-header {
                        min-width: 45px;
                    }
                }
            `}</style>
        </div>
    );
}
