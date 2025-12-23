
import React from 'react';
import { LoanRequest, LoanRequestStatus } from '../../../../types';
import { SortConfig } from '../../../../hooks/useSortableData';
import { SortIcon } from '../../../../components/icons/SortIcon';
import { SortAscIcon } from '../../../../components/icons/SortAscIcon';
import { SortDescIcon } from '../../../../components/icons/SortDescIcon';
import { EyeIcon } from '../../../../components/icons/EyeIcon';
import { InboxIcon } from '../../../../components/icons/InboxIcon';
import { useLongPress } from '../../../../hooks/useLongPress';
import { BsCalendarEvent, BsThreeDotsVertical } from 'react-icons/bs';

export const getStatusClass = (status: LoanRequestStatus) => {
    switch (status) {
        case LoanRequestStatus.PENDING: return 'bg-amber-50 text-amber-700 border border-amber-200';
        case LoanRequestStatus.APPROVED: return 'bg-sky-50 text-sky-700 border border-sky-200';
        case LoanRequestStatus.ON_LOAN: return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
        case LoanRequestStatus.RETURNED: return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
        case LoanRequestStatus.REJECTED: return 'bg-rose-50 text-rose-700 border border-rose-200';
        case LoanRequestStatus.OVERDUE: return 'bg-red-50 text-red-700 border border-red-200 font-bold';
        case LoanRequestStatus.AWAITING_RETURN: return 'bg-blue-50 text-blue-700 border border-blue-200';
        default: return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
};

const SortableHeader: React.FC<{
    children: React.ReactNode;
    columnKey: keyof LoanRequest;
    sortConfig: SortConfig<LoanRequest> | null;
    requestSort: (key: keyof LoanRequest) => void;
    className?: string;
}> = ({ children, columnKey, sortConfig, requestSort, className }) => {
    const isSorted = sortConfig?.key === columnKey;
    const direction = isSorted ? sortConfig.direction : undefined;
    
    return (
        <th 
            scope="col" 
            className={`px-6 py-4 text-sm font-extrabold uppercase tracking-wider text-slate-700 cursor-pointer group select-none transition-all duration-200 hover:bg-slate-100/80 ${className}`} 
            onClick={() => requestSort(columnKey)}
        >
            <div className="flex items-center gap-2">
                <span className="group-hover:text-slate-900 transition-colors">{children}</span>
                <span className="flex-shrink-0 flex items-center justify-center">
                   {isSorted ? (
                        <span className="text-tm-primary bg-blue-100/50 p-0.5 rounded shadow-sm animate-fade-in-up">
                            {direction === 'ascending' ? <SortAscIcon className="w-4 h-4" /> : <SortDescIcon className="w-4 h-4" />}
                        </span>
                   ) : (
                        <SortIcon className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                   )}
                </span>
            </div>
        </th>
    );
};

interface LoanRequestTableProps {
    requests: LoanRequest[];
    onDetailClick: (req: LoanRequest) => void;
    sortConfig: SortConfig<LoanRequest> | null;
    requestSort: (key: keyof LoanRequest) => void;
    highlightedId: string | null;
}

export const LoanRequestTable: React.FC<LoanRequestTableProps> = ({ requests, onDetailClick, sortConfig, requestSort, highlightedId }) => {
    const longPressHandlers = useLongPress(() => {}, 500); 

    return (
        <table className="min-w-full divide-y divide-slate-100">
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
                <tr>
                    <SortableHeader columnKey="id" sortConfig={sortConfig} requestSort={requestSort}>Info Request</SortableHeader>
                    <SortableHeader columnKey="requester" sortConfig={sortConfig} requestSort={requestSort}>Pemohon</SortableHeader>
                    <th scope="col" className="px-6 py-4 text-sm font-extrabold uppercase tracking-wider text-slate-700 text-left">Detail Barang</th>
                    <SortableHeader columnKey="status" sortConfig={sortConfig} requestSort={requestSort}>Status</SortableHeader>
                    <th className="relative px-6 py-4 w-24 text-right text-sm font-extrabold uppercase tracking-wider text-slate-700">Aksi</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-50">
                {requests.length > 0 ? requests.map(req => {
                    const isHighlighted = req.id === highlightedId;
                    const rowBaseClass = "transition-all duration-200 cursor-pointer group relative border-l-4";
                    
                    let bgClass = "hover:bg-slate-50 bg-white border-l-transparent";
                    
                    // Highlighting Logic
                    if (isHighlighted) {
                        bgClass = "bg-amber-50 border-l-amber-400 animate-pulse-slow";
                    } else if (req.status === LoanRequestStatus.OVERDUE) {
                        bgClass = "hover:bg-red-50/30 border-l-transparent hover:border-l-red-400";
                    } else {
                        bgClass = "hover:bg-slate-50 border-l-transparent hover:border-l-slate-300";
                    }

                    return (
                        <tr 
                          key={req.id} 
                          id={`request-row-${req.id}`}
                          onClick={() => onDetailClick(req)} 
                          {...longPressHandlers}
                          className={`${rowBaseClass} ${bgClass}`}
                        >
                            {/* Column 1: ID & Date */}
                            <td className="px-6 py-5 align-top">
                                <div className="flex flex-col gap-1.5">
                                    {/* Updated Font: Sans-serif, Bold, Slate-700 */}
                                    <span className="text-sm font-bold text-slate-800 group-hover:text-tm-primary transition-colors tracking-tight">
                                        {req.id}
                                    </span>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                        <BsCalendarEvent className="w-3 h-3 text-slate-400" />
                                        <span>{new Date(req.requestDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                </div>
                            </td>

                            {/* Column 2: Requester */}
                            <td className="px-6 py-5 align-middle">
                                <div className="flex flex-col">
                                    <div className="text-sm font-bold text-slate-800">{req.requester}</div>
                                    <div className="text-xs font-medium text-slate-500 mt-0.5">{req.division}</div>
                                </div>
                            </td>

                            {/* Column 3: Items (Modern Box Badge) */}
                            <td className="px-6 py-5 align-middle">
                                <div className="flex items-center gap-3">
                                    {/* Count Box */}
                                    <div className="flex-shrink-0 bg-slate-100 text-slate-600 font-bold px-2.5 py-1.5 rounded-lg text-xs border border-slate-200 shadow-sm flex flex-col items-center min-w-[3rem]">
                                         <span className="text-lg leading-none tracking-tight">{req.items.length}</span>
                                         <span className="text-[8px] uppercase tracking-wide opacity-70">Item</span>
                                    </div>
                                    
                                    {/* Item Text */}
                                    <div className="flex flex-col justify-center">
                                        <div className="text-sm font-semibold text-slate-800 line-clamp-1 max-w-[180px]" title={req.items[0]?.itemName}>
                                            {req.items[0]?.itemName}
                                        </div>
                                        {req.items.length > 1 ? (
                                            <span className="text-xs text-slate-500 font-medium">+ {req.items.length - 1} item lainnya</span>
                                        ) : (
                                            <span className="text-xs text-slate-400 font-medium">{req.items[0]?.brand || 'Generic'}</span>
                                        )}
                                    </div>
                                </div>
                            </td>

                            {/* Column 4: Status */}
                            <td className="px-6 py-5 align-middle">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full shadow-sm ${getStatusClass(req.status)}`}>
                                    {req.status}
                                </span>
                            </td>

                            {/* Column 5: Actions (Hover Reveal - Clean Look) */}
                            <td className="px-6 py-5 align-middle text-right">
                                {/* Desktop: Show on Hover */}
                                <div className="hidden sm:flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onDetailClick(req); }} 
                                        className="p-2 text-slate-400 hover:text-tm-primary hover:bg-blue-50 rounded-full transition-colors" 
                                        title="Lihat Detail"
                                    >
                                        <EyeIcon className="w-5 h-5" />
                                    </button>
                                </div>
                                {/* Mobile: Always show indicator */}
                                <div className="sm:hidden flex justify-end text-slate-300">
                                    <BsThreeDotsVertical className="w-5 h-5" />
                                </div>
                            </td>
                        </tr>
                    );
                }) : (
                    <tr>
                        <td colSpan={5} className="px-6 py-20 text-center">
                            <div className="flex flex-col items-center justify-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                                    <InboxIcon className="w-8 h-8 text-slate-300" />
                                </div>
                                <h3 className="text-base font-bold text-slate-700">Tidak Ada Peminjaman</h3>
                                <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                                    Belum ada data request peminjaman yang sesuai dengan filter Anda.
                                </p>
                            </div>
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    );
};
