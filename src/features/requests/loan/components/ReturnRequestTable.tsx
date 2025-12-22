
import React from 'react';
import { AssetReturn, AssetReturnStatus } from '../../../../types';
import { InboxIcon } from '../../../../components/icons/InboxIcon';
import { EyeIcon } from '../../../../components/icons/EyeIcon';

export const getReturnStatusClass = (status: AssetReturnStatus) => {
    switch (status) {
        case AssetReturnStatus.PENDING_APPROVAL: return 'bg-warning-light text-warning-text';
        case AssetReturnStatus.APPROVED: return 'bg-success-light text-success-text';
        case AssetReturnStatus.REJECTED: return 'bg-danger-light text-danger-text';
        default: return 'bg-gray-100 text-gray-800';
    }
};

interface ReturnRequestTableProps { 
    returns: AssetReturn[];
    onDetailClick: (ret: AssetReturn) => void;
}

export const ReturnRequestTable: React.FC<ReturnRequestTableProps> = ({ returns, onDetailClick }) => (
    <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
                <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500">No. Dokumen / Tgl Kembali</th>
                <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500">Aset yang Dikembalikan</th>
                <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500">Pihak Terlibat</th>
                <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500">Kondisi</th>
                <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500">Status</th>
                <th className="relative px-6 py-3"><span className="sr-only">Aksi</span></th>
            </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
            {returns.length > 0 ? returns.map(ret => (
                <tr key={ret.id} onClick={() => onDetailClick(ret)} className="cursor-pointer hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-semibold text-gray-900">{ret.docNumber}</div><div className="text-xs text-gray-500">{new Date(ret.returnDate).toLocaleDateString('id-ID')}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{ret.assetName}</div><div className="text-xs text-gray-500 font-mono">{ret.assetId}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{ret.returnedBy}</div><div className="text-xs text-gray-500">ke {ret.receivedBy}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{ret.returnedCondition}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getReturnStatusClass(ret.status)}`}>
                            {ret.status}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-right"><button className="p-2 text-gray-500 rounded-full hover:bg-info-light hover:text-info-text"><EyeIcon className="w-5 h-5"/></button></td>
                </tr>
            )) : (
                <tr><td colSpan={6} className="py-12 text-center text-gray-500"><InboxIcon className="w-12 h-12 mx-auto text-gray-300" /><p className="mt-2 font-semibold">Tidak ada data pengembalian.</p></td></tr>
            )}
        </tbody>
    </table>
);
