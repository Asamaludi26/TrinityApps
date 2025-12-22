
import React from 'react';
import { LoanRequest, LoanRequestStatus } from '../../../../types';
import { SortConfig } from '../../../../hooks/useSortableData';
import { SortIcon } from '../../../../components/icons/SortIcon';
import { SortAscIcon } from '../../../../components/icons/SortAscIcon';
import { SortDescIcon } from '../../../../components/icons/SortDescIcon';
import { EyeIcon } from '../../../../components/icons/EyeIcon';
import { InboxIcon } from '../../../../components/icons/InboxIcon';
import { useLongPress } from '../../../../hooks/useLongPress';

export const getStatusClass = (status: LoanRequestStatus) => {
    switch (status) {
        case LoanRequestStatus.PENDING: return 'bg-warning-light text-warning-text';
        case LoanRequestStatus.APPROVED: return 'bg-sky-100 text-sky-700';
        case LoanRequestStatus.ON_LOAN: return 'bg-info-light text-info-text';
        case LoanRequestStatus.RETURNED: return 'bg-success-light text-success-text';
        case LoanRequestStatus.REJECTED: return 'bg-danger-light text-danger-text';
        case LoanRequestStatus.OVERDUE: return 'bg-red-200 text-red-800 font-bold';
        case LoanRequestStatus.AWAITING_RETURN: return 'bg-blue-100 text-blue-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const SortableHeader: React.FC<{
    children: React.ReactNode;
    columnKey: keyof LoanRequest;
    sortConfig: SortConfig<LoanRequest> | null;
    requestSort: (key: keyof LoanRequest) => void;
}> = ({ children, columnKey, sortConfig, requestSort }) => {
    const isSorted = sortConfig?.key === columnKey;
    const direction = isSorted ? sortConfig.direction : undefined;
    const getSortIcon = () => {
        if (!isSorted) return <SortIcon className="w-4 h-4 text-gray-400" />;
        if (direction === 'ascending') return <SortAscIcon className="w-4 h-4 text-tm-accent" />;
        return <SortDescIcon className="w-4 h-4 text-tm-accent" />;
    };
    return (
        <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500 cursor-pointer hover:bg-gray-100" onClick={() => requestSort(columnKey)}>
            <div className="flex items-center space-x-1 group">
                <span>{children}</span>
                <span className="opacity-50 group-hover:opacity-100">{getSortIcon()}</span>
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
    // Note: Long press handlers usually need bulk select mode active to be useful, 
    // keeping structure compatible with other tables if you add bulk select later.
    const longPressHandlers = useLongPress(() => {}, 500); 

    return (
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                    <SortableHeader columnKey="id" sortConfig={sortConfig} requestSort={requestSort}>ID / Tgl Request</SortableHeader>
                    <SortableHeader columnKey="requester" sortConfig={sortConfig} requestSort={requestSort}>Pemohon</SortableHeader>
                    <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500">Detail Permintaan</th>
                    <SortableHeader columnKey="status" sortConfig={sortConfig} requestSort={requestSort}>Status</SortableHeader>
                    <th className="relative px-6 py-3"><span className="sr-only">Aksi</span></th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {requests.length > 0 ? requests.map(req => (
                    <tr 
                      key={req.id} 
                      id={`request-row-${req.id}`}
                      onClick={() => onDetailClick(req)} 
                      {...longPressHandlers}
                      className={`cursor-pointer transition-colors ${req.id === highlightedId ? 'bg-amber-100 animate-pulse-slow' : 'hover:bg-gray-50'}`}
                    >
                        <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-semibold text-gray-900">{req.id}</div><div className="text-xs text-gray-500">{new Date(req.requestDate).toLocaleDateString('id-ID')}</div></td>
                        <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{req.requester}</div><div className="text-xs text-gray-500">{req.division}</div></td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                            <div className="font-medium text-gray-800">{req.items.length} jenis item</div>
                            <div className="text-xs truncate text-gray-500 max-w-[200px]" title={req.items.map(i => i.itemName).join(', ')}>
                                {req.items.map(i => i.itemName).join(', ')}
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusClass(req.status)}`}>{req.status}</span></td>
                        <td className="px-6 py-4 text-sm font-medium text-right"><button className="p-2 text-gray-500 rounded-full hover:bg-info-light hover:text-info-text"><EyeIcon className="w-5 h-5"/></button></td>
                    </tr>
                )) : (
                    <tr><td colSpan={5} className="py-12 text-center text-gray-500"><InboxIcon className="w-12 h-12 mx-auto text-gray-300" /><p className="mt-2 font-semibold">Tidak ada data.</p></td></tr>
                )}
            </tbody>
        </table>
    );
};
