
import React from 'react';
import { AssetReturn, AssetReturnStatus } from '../../../../types';
import { InboxIcon } from '../../../../components/icons/InboxIcon';
import { EyeIcon } from '../../../../components/icons/EyeIcon';
import { SortConfig } from '../../../../hooks/useSortableData';
import { SortIcon } from '../../../../components/icons/SortIcon';
import { SortAscIcon } from '../../../../components/icons/SortAscIcon';
import { SortDescIcon } from '../../../../components/icons/SortDescIcon';
import { BsCalendarEvent, BsThreeDotsVertical, BsBoxSeam } from 'react-icons/bs';
import { useLongPress } from '../../../../hooks/useLongPress';

export const getReturnStatusClass = (status: AssetReturnStatus) => {
    switch (status) {
        case AssetReturnStatus.PENDING_APPROVAL: return 'bg-amber-50 text-amber-700 border border-amber-200';
        case AssetReturnStatus.APPROVED: return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
        case AssetReturnStatus.REJECTED: return 'bg-rose-50 text-rose-700 border border-rose-200';
        default: return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
};

const SortableHeader: React.FC<{
    children: React.ReactNode;
    columnKey: keyof AssetReturn;
    sortConfig: SortConfig<AssetReturn> | null;
    requestSort: (key: keyof AssetReturn) => void;
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

interface ReturnRequestTableProps { 
    returns: AssetReturn[];
    onDetailClick: (ret: AssetReturn) => void;
    sortConfig: SortConfig<AssetReturn> | null;
    requestSort: (key: keyof AssetReturn) => void;
}

export const ReturnRequestTable: React.FC<ReturnRequestTableProps> = ({ returns, onDetailClick, sortConfig, requestSort }) => {
    const longPressHandlers = useLongPress(() => {}, 500);

    return (
        <table className="min-w-full divide-y divide-slate-100">
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
                <tr>
                    <SortableHeader columnKey="docNumber" sortConfig={sortConfig} requestSort={requestSort}>Info Dokumen</SortableHeader>
                    <SortableHeader columnKey="assetName" sortConfig={sortConfig} requestSort={requestSort}>Aset</SortableHeader>
                    <SortableHeader columnKey="returnedBy" sortConfig={sortConfig} requestSort={requestSort}>Pihak Terlibat</SortableHeader>
                    <th scope="col" className="px-6 py-4 text-sm font-extrabold uppercase tracking-wider text-slate-700 text-left">Kondisi</th>
                    <SortableHeader columnKey="status" sortConfig={sortConfig} requestSort={requestSort}>Status</SortableHeader>
                    <th className="relative px-6 py-4 w-24 text-right text-sm font-extrabold uppercase tracking-wider text-slate-700">Aksi</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-50">
                {returns.length > 0 ? returns.map(ret => (
                    <tr 
                        key={ret.id} 
                        onClick={() => onDetailClick(ret)} 
                        {...longPressHandlers}
                        className="transition-all duration-200 cursor-pointer group relative border-l-4 hover:bg-slate-50 bg-white border-l-transparent hover:border-l-slate-300"
                    >
                        {/* Column 1: Doc & Date */}
                        <td className="px-6 py-5 align-top">
                            <div className="flex flex-col gap-1.5">
                                <span className="text-sm font-bold text-slate-800 group-hover:text-tm-primary transition-colors tracking-tight">
                                    {ret.docNumber}
                                </span>
                                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                    <BsCalendarEvent className="w-3 h-3 text-slate-400" />
                                    <span>{new Date(ret.returnDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                </div>
                            </div>
                        </td>

                        {/* Column 2: Asset Info */}
                        <td className="px-6 py-5 align-middle">
                            <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                                    <BsBoxSeam className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-slate-800">{ret.assetName}</div>
                                    <div className="text-xs font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 w-fit mt-0.5">
                                        {ret.assetId}
                                    </div>
                                </div>
                            </div>
                        </td>

                        {/* Column 3: Parties */}
                        <td className="px-6 py-5 align-middle">
                            <div className="flex flex-col">
                                <div className="text-sm font-bold text-slate-800">{ret.returnedBy}</div>
                                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                    <span>ke</span>
                                    <span className="font-medium text-slate-600">{ret.receivedBy}</span>
                                </div>
                            </div>
                        </td>

                        {/* Column 4: Condition */}
                        <td className="px-6 py-5 align-middle">
                            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                {ret.returnedCondition}
                            </span>
                        </td>

                        {/* Column 5: Status */}
                        <td className="px-6 py-5 align-middle">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full shadow-sm ${getReturnStatusClass(ret.status)}`}>
                                {ret.status === AssetReturnStatus.PENDING_APPROVAL ? 'Menunggu' : ret.status}
                            </span>
                        </td>

                        {/* Column 6: Actions */}
                        <td className="px-6 py-5 align-middle text-right">
                            {/* Desktop: Show on Hover */}
                            <div className="hidden sm:flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0">
                                <button 
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
                )) : (
                    <tr>
                        <td colSpan={6} className="px-6 py-20 text-center">
                            <div className="flex flex-col items-center justify-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                                    <InboxIcon className="w-8 h-8 text-slate-300" />
                                </div>
                                <h3 className="text-base font-bold text-slate-700">Tidak Ada Data</h3>
                                <p className="text-sm text-slate-500 mt-1">Belum ada data pengembalian aset.</p>
                            </div>
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    );
};
