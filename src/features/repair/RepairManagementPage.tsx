import React, { useMemo, useState, useEffect } from 'react';
import { Asset, User, AssetStatus, PreviewData } from '../../types';
import { useSortableData, SortConfig } from '../../hooks/useSortableData';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { SearchIcon } from '../../components/icons/SearchIcon';
import { InboxIcon } from '../../components/icons/InboxIcon';
import { SortIcon } from '../../components/icons/SortIcon';
import { SortAscIcon } from '../../components/icons/SortAscIcon';
import { SortDescIcon } from '../../components/icons/SortDescIcon';
import { getStatusClass } from '../assetRegistration/RegistrationPage';
import { WrenchIcon } from '../../components/icons/WrenchIcon';
import { SpinnerIcon } from '../../components/icons/SpinnerIcon';
import { ClickableLink } from '../../components/ui/ClickableLink';
import { BsTools, BsTruck } from 'react-icons/bs';
import { SummaryCard } from '../dashboard/components/SummaryCard';

// Stores
import { useAssetStore } from '../../stores/useAssetStore';
import { useMasterDataStore } from '../../stores/useMasterDataStore';

interface RepairManagementPageProps {
    currentUser: User;
    onShowPreview: (data: PreviewData) => void;
    onStartRepair: (asset: Asset) => void;
    onAddProgressUpdate: (asset: Asset) => void;
    onReceiveFromRepair: (asset: Asset) => void;
    onCompleteRepair: (asset: Asset) => void;
    onDecommission: (asset: Asset) => void;
}

type RepairAsset = Asset & {
    reporter?: string;
    reportDate?: string;
    technician?: string;
    vendor?: string;
    estimatedDate?: string;
};

const SortableHeader: React.FC<{
    children: React.ReactNode;
    columnKey: keyof RepairAsset;
    sortConfig: SortConfig<RepairAsset> | null;
    requestSort: (key: keyof RepairAsset) => void;
}> = ({ children, columnKey, sortConfig, requestSort }) => {
    const isSorted = sortConfig?.key === columnKey;
    const direction = isSorted ? sortConfig.direction : undefined;

    const getSortIcon = () => {
        if (!isSorted) return <SortIcon className="w-4 h-4 text-gray-400" />;
        if (direction === 'ascending') return <SortAscIcon className="w-4 h-4 text-tm-accent" />;
        return <SortDescIcon className="w-4 h-4 text-tm-accent" />;
    };

    return (
        <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500">
            <button onClick={() => requestSort(columnKey)} className="flex items-center space-x-1 group">
                <span>{children}</span>
                <span className="opacity-50 group-hover:opacity-100">{getSortIcon()}</span>
            </button>
        </th>
    );
};

const RepairManagementPage: React.FC<RepairManagementPageProps> = ({ onShowPreview, onStartRepair, onAddProgressUpdate, onReceiveFromRepair, onCompleteRepair, onDecommission }) => {
    const assets = useAssetStore((state) => state.assets);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const repairAssets = useMemo<RepairAsset[]>(() => {
        return assets
            .filter(a => [AssetStatus.DAMAGED, AssetStatus.UNDER_REPAIR, AssetStatus.OUT_FOR_REPAIR].includes(a.status))
            .map(asset => {
                const reportLog = [...(asset.activityLog || [])].reverse().find(log => log.action === 'Kerusakan Dilaporkan');
                const startLog = [...(asset.activityLog || [])].reverse().find(log => log.action === 'Proses Perbaikan Dimulai');

                const technician = startLog?.details.match(/oleh (.*?)\./)?.[1] || undefined;
                const vendor = startLog?.details.match(/ke (.*?)\s\(/)?.[1] || undefined;
                const estimatedDate = startLog?.details.match(/(?:selesai|kembali): (.*?)\./)?.[1] || undefined;

                return {
                    ...asset,
                    reporter: reportLog?.user,
                    reportDate: reportLog?.timestamp,
                    technician,
                    vendor,
                    estimatedDate
                };
            });
    }, [assets]);

    const filteredAssets = useMemo(() => {
        return repairAssets.filter(asset => {
            const searchLower = searchQuery.toLowerCase();
            return (
                asset.name.toLowerCase().includes(searchLower) ||
                asset.id.toLowerCase().includes(searchLower) ||
                (asset.reporter && asset.reporter.toLowerCase().includes(searchLower)) ||
                (asset.technician && asset.technician.toLowerCase().includes(searchLower)) ||
                (asset.vendor && asset.vendor.toLowerCase().includes(searchLower))
            );
        });
    }, [repairAssets, searchQuery]);
    
    const { items: sortedAssets, requestSort, sortConfig } = useSortableData(filteredAssets, { key: 'reportDate', direction: 'descending' });

    const totalItems = sortedAssets.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedAssets = sortedAssets.slice(startIndex, startIndex + itemsPerPage);
    
    const summary = useMemo(() => ({
        waiting: repairAssets.filter(a => a.status === AssetStatus.DAMAGED).length,
        inProgress: repairAssets.filter(a => a.status === AssetStatus.UNDER_REPAIR).length,
        external: repairAssets.filter(a => a.status === AssetStatus.OUT_FOR_REPAIR).length,
    }), [repairAssets]);

    useEffect(() => { setCurrentPage(1); }, [searchQuery, itemsPerPage]);

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <h1 className="text-3xl font-bold text-tm-dark mb-6">Manajemen Perbaikan Aset</h1>

             <div className="grid grid-cols-1 gap-5 mb-6 sm:grid-cols-2 lg:grid-cols-3">
                <SummaryCard title="Menunggu Aksi" value={summary.waiting} icon={WrenchIcon} color="amber" />
                <SummaryCard title="Sedang Dikerjakan" value={summary.inProgress} icon={BsTools} color="blue" />
                <SummaryCard title="Perbaikan Eksternal" value={summary.external} icon={BsTruck} color="purple" />
            </div>

            <div className="p-4 mb-4 bg-white border border-gray-200/80 rounded-xl shadow-md">
                <div className="relative">
                    <SearchIcon className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 top-1/2 left-3" />
                    <input type="text" placeholder="Cari aset, pelapor, teknisi, vendor..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-10 py-2 pl-10 pr-4 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-tm-accent focus:border-tm-accent" />
                </div>
            </div>

            <div className="overflow-hidden bg-white border border-gray-200/80 rounded-xl shadow-md">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <SortableHeader columnKey="name" sortConfig={sortConfig} requestSort={requestSort}>Aset</SortableHeader>
                                <SortableHeader columnKey="status" sortConfig={sortConfig} requestSort={requestSort}>Status</SortableHeader>
                                <SortableHeader columnKey="reporter" sortConfig={sortConfig} requestSort={requestSort}>Pelapor & Tanggal</SortableHeader>
                                <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500">Penanggung Jawab</th>
                                <SortableHeader columnKey="estimatedDate" sortConfig={sortConfig} requestSort={requestSort}>Estimasi Selesai</SortableHeader>
                                <th className="relative px-6 py-3"><span className="sr-only">Aksi</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedAssets.length > 0 ? paginatedAssets.map(asset => (
                                <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <ClickableLink onClick={() => onShowPreview({ type: 'asset', id: asset.id })}>
                                            <p className="text-sm font-semibold text-gray-900">{asset.name}</p>
                                        </ClickableLink>
                                        <p className="text-xs text-gray-500 font-mono">{asset.id}</p>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusClass(asset.status)}`}>{asset.status}</span></td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <p className="text-sm font-medium text-gray-800">{asset.reporter || 'N/A'}</p>
                                        <p className="text-xs text-gray-500">{asset.reportDate ? new Date(asset.reportDate).toLocaleDateString('id-ID') : 'N/A'}</p>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-800 whitespace-nowrap">{asset.technician || asset.vendor || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-800 whitespace-nowrap">{asset.estimatedDate || '-'}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                                        {asset.status === AssetStatus.DAMAGED && (
                                            <button onClick={() => onStartRepair(asset)} className="px-3 py-1.5 text-xs font-semibold text-white bg-tm-primary rounded-md shadow-sm hover:bg-tm-primary-hover">Mulai Perbaikan</button>
                                        )}
                                        {asset.status === AssetStatus.UNDER_REPAIR && (
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => onAddProgressUpdate(asset)} className="px-3 py-1.5 text-xs font-semibold text-tm-primary bg-blue-100 rounded-md hover:bg-blue-200">Update</button>
                                                <button onClick={() => onCompleteRepair(asset)} className="px-3 py-1.5 text-xs font-semibold text-white bg-success rounded-md shadow-sm hover:bg-green-700">Selesaikan</button>
                                            </div>
                                        )}
                                        {asset.status === AssetStatus.OUT_FOR_REPAIR && (
                                             <div className="flex items-center gap-2">
                                                <button onClick={() => onAddProgressUpdate(asset)} className="px-3 py-1.5 text-xs font-semibold text-tm-primary bg-blue-100 rounded-md hover:bg-blue-200">Update</button>
                                                <button onClick={() => onReceiveFromRepair(asset)} className="px-3 py-1.5 text-xs font-semibold text-white bg-success rounded-md shadow-sm hover:bg-green-700">Terima Aset</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} className="py-12 text-center text-gray-500">
                                    <InboxIcon className="w-12 h-12 mx-auto text-gray-300" />
                                    <p className="mt-2 font-semibold">Tidak ada aset yang perlu diperbaiki.</p>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {totalItems > 0 && <PaginationControls currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} startIndex={startIndex} endIndex={startIndex + paginatedAssets.length} />}
            </div>
        </div>
    );
};

export default RepairManagementPage;