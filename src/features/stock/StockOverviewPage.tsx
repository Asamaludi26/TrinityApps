
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Asset, User, PreviewData, Page, AssetStatus } from '../../types';
import { useSortableData, SortConfig } from '../../hooks/useSortableData';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { SearchIcon } from '../../components/icons/SearchIcon';
import { InboxIcon } from '../../components/icons/InboxIcon';
import { SortIcon } from '../../components/icons/SortIcon';
import { SortAscIcon } from '../../components/icons/SortAscIcon';
import { SortDescIcon } from '../../components/icons/SortDescIcon';
import { FilterIcon } from '../../components/icons/FilterIcon';
import { CloseIcon } from '../../components/icons/CloseIcon';
import { WrenchIcon } from '../../components/icons/WrenchIcon';
import { EyeIcon } from '../../components/icons/EyeIcon';
import { exportToCSV } from '../../utils/csvExporter';
import { ExportIcon } from '../../components/icons/ExportIcon';
import { SummaryCard } from '../dashboard/components/SummaryCard';
import { ArchiveBoxIcon } from '../../components/icons/ArchiveBoxIcon';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { getStatusClass } from '../assetRegistration/RegistrationPage';
import ReportDamageModal from './components/ReportDamageModal';

// Stores
import { useAssetStore } from '../../stores/useAssetStore';
import { useNotification } from '../../providers/NotificationProvider';

interface StockOverviewPageProps {
    currentUser: User;
    setActivePage: (page: Page, filters?: any) => void;
    onShowPreview: (data: PreviewData) => void;
    initialFilters?: any;
    onClearInitialFilters: () => void;
    onReportDamage: (asset: Asset) => void; 
}

const SortableHeader: React.FC<{
    children: React.ReactNode;
    columnKey: keyof Asset;
    sortConfig: SortConfig<Asset> | null;
    requestSort: (key: keyof Asset) => void;
}> = ({ children, columnKey, sortConfig, requestSort }) => {
    const isSorted = sortConfig?.key === columnKey;
    const direction = isSorted ? sortConfig.direction : undefined;
    const getSortIcon = () => {
        if (!isSorted) return <SortIcon className="w-4 h-4 text-gray-400" />;
        if (direction === 'ascending') return <SortAscIcon className="w-4 h-4 text-tm-accent" />;
        return <SortDescIcon className="w-4 h-4 text-tm-accent" />;
    };
    return (
        <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500 cursor-pointer group" onClick={() => requestSort(columnKey)}>
            <div className="flex items-center space-x-1">
                <span>{children}</span>
                <span className="opacity-50 group-hover:opacity-100">{getSortIcon()}</span>
            </div>
        </th>
    );
};

const StockOverviewPage: React.FC<StockOverviewPageProps> = ({ currentUser, setActivePage, onShowPreview, initialFilters, onClearInitialFilters }) => {
    const assets = useAssetStore((state) => state.assets);
    const updateAsset = useAssetStore((state) => state.updateAsset);
    const assetCategories = useAssetStore((state) => state.categories);
    const addNotification = useNotification();

    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Filters
    const initialFilterState = { category: '', brand: '', lowStockOnly: false, outOfStockOnly: false, status: '' };
    const [filters, setFilters] = useState(initialFilterState);
    const [tempFilters, setTempFilters] = useState(filters);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const filterPanelRef = useRef<HTMLDivElement>(null);

    // Modals
    const [assetToReportDamage, setAssetToReportDamage] = useState<Asset | null>(null);

    useEffect(() => {
        if (initialFilters) {
            setFilters(prev => ({ ...prev, ...initialFilters }));
            setTempFilters(prev => ({ ...prev, ...initialFilters }));
            onClearInitialFilters();
        }
    }, [initialFilters, onClearInitialFilters]);

    // Click outside filter panel
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
                setIsFilterPanelOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => { document.removeEventListener("mousedown", handleClickOutside); };
    }, [filterPanelRef]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.category) count++;
        if (filters.brand) count++;
        if (filters.status) count++;
        if (filters.lowStockOnly) count++;
        if (filters.outOfStockOnly) count++;
        return count;
    }, [filters]);

    const handleResetFilters = () => {
        setFilters(initialFilterState);
        setTempFilters(initialFilterState);
        setIsFilterPanelOpen(false);
    };

    const handleApplyFilters = () => {
        setFilters(tempFilters);
        setIsFilterPanelOpen(false);
    };

    const handleRemoveFilter = (key: keyof typeof filters) => {
        setFilters(prev => {
            if (key === 'lowStockOnly' || key === 'outOfStockOnly') {
                return { ...prev, [key]: false };
            }
            return { ...prev, [key]: '' };
        });
        setTempFilters(prev => {
             if (key === 'lowStockOnly' || key === 'outOfStockOnly') {
                return { ...prev, [key]: false };
            }
            return { ...prev, [key]: '' };
        });
    };

    // Derived Data
    const filteredAssets = useMemo(() => {
        return assets.filter(asset => {
            const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  asset.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  (asset.serialNumber && asset.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()));
            
            if (!matchesSearch) return false;

            if (filters.category && asset.category !== filters.category) return false;
            if (filters.brand && asset.brand !== filters.brand) return false;
            if (filters.status && asset.status !== filters.status) return false;
            
            if (filters.outOfStockOnly) {
                 return asset.status === AssetStatus.IN_STORAGE;
            }

            return true;
        });
    }, [assets, searchQuery, filters]);

    const { items: sortedAssets, requestSort, sortConfig } = useSortableData<Asset>(filteredAssets, { key: 'registrationDate', direction: 'descending' });

    // Pagination Calculation
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    const paginatedAssets = useMemo(() => {
        return sortedAssets.slice(startIndex, endIndex);
    }, [sortedAssets, startIndex, endIndex]);

    const totalPages = Math.ceil(sortedAssets.length / itemsPerPage);

    // Actions
    const handleReportDamageSubmit = async (asset: Asset, condition: any, description: string, attachments: any[]) => {
        const newLog = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            user: currentUser.name,
            action: 'Kerusakan Dilaporkan',
            details: `Kondisi: ${condition}, deskripsi: "${description}"`
        };
        
        await updateAsset(asset.id, {
            status: AssetStatus.DAMAGED,
            condition: condition,
            activityLog: [...(asset.activityLog || []), newLog],
            attachments: [...(asset.attachments || []), ...attachments]
        });
        
        addNotification(`Laporan kerusakan untuk ${asset.name} berhasil dikirim.`, 'success');
        setAssetToReportDamage(null);
    };

    const uniqueBrands = useMemo(() => [...new Set(assets.map(a => a.brand))], [assets]);
    const uniqueCategories = useMemo(() => assetCategories.map(c => c.name), [assetCategories]);

    const stockSummary = useMemo(() => {
        const inStorage = assets.filter(a => a.status === AssetStatus.IN_STORAGE).length;
        const inUse = assets.filter(a => a.status === AssetStatus.IN_USE).length;
        const damaged = assets.filter(a => a.status === AssetStatus.DAMAGED).length;
        const totalValue = assets.reduce((sum, a) => sum + (a.purchasePrice || 0), 0);
        return { inStorage, inUse, damaged, totalValue };
    }, [assets]);

    useEffect(() => { setCurrentPage(1); }, [searchQuery, filters, itemsPerPage]);

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                <h1 className="text-3xl font-bold text-tm-dark">Inventori Aset</h1>
                <div className="flex items-center space-x-2">
                    <button onClick={() => exportToCSV(sortedAssets, 'inventori_aset.csv')} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border rounded-lg shadow-sm hover:bg-gray-50">
                        <ExportIcon className="w-4 h-4"/> Export CSV
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-5 mb-6 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryCard title="Aset Disimpan" value={stockSummary.inStorage} icon={ArchiveBoxIcon} color="blue" onClick={() => { const s = AssetStatus.IN_STORAGE; setFilters(f => ({...f, status: s})); setTempFilters(f => ({...f, status: s})); }} isActive={filters.status === AssetStatus.IN_STORAGE} />
                <SummaryCard title="Aset Digunakan" value={stockSummary.inUse} icon={ArchiveBoxIcon} color="green" onClick={() => { const s = AssetStatus.IN_USE; setFilters(f => ({...f, status: s})); setTempFilters(f => ({...f, status: s})); }} isActive={filters.status === AssetStatus.IN_USE} />
                <SummaryCard title="Aset Rusak" value={stockSummary.damaged} icon={WrenchIcon} color="red" onClick={() => { const s = AssetStatus.DAMAGED; setFilters(f => ({...f, status: s})); setTempFilters(f => ({...f, status: s})); }} isActive={filters.status === AssetStatus.DAMAGED} />
                <SummaryCard title="Total Valuasi" value={`Rp ${(stockSummary.totalValue / 1000000).toFixed(0)} Jt`} icon={ArchiveBoxIcon} color="purple" />
            </div>

            <div className="p-4 mb-4 bg-white border border-gray-200/80 rounded-xl shadow-md">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><SearchIcon className="w-5 h-5 text-gray-400" /></div>
                        <input type="text" placeholder="Cari nama, ID, serial number..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-10 py-2 pl-10 pr-4 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-tm-accent focus:border-tm-accent" />
                    </div>
                    <div className="relative" ref={filterPanelRef}>
                        <button
                            onClick={() => { setTempFilters(filters); setIsFilterPanelOpen(p => !p); }}
                            className={`inline-flex items-center justify-center gap-2 w-full h-10 px-4 text-sm font-semibold transition-all duration-200 border rounded-lg shadow-sm sm:w-auto 
                                ${activeFilterCount > 0 ? 'bg-tm-light border-tm-accent text-tm-primary' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}
                            `}
                        >
                            <FilterIcon className="w-4 h-4" /> <span>Filter</span> {activeFilterCount > 0 && <span className="px-2 py-0.5 text-xs font-bold text-white rounded-full bg-tm-primary">{activeFilterCount}</span>}
                        </button>
                        {isFilterPanelOpen && (
                            <div className="absolute right-0 z-30 w-72 mt-2 origin-top-right bg-white border border-gray-200 rounded-xl shadow-lg">
                                <div className="flex items-center justify-between p-4 border-b">
                                    <h3 className="text-lg font-semibold text-gray-800">Filter Aset</h3>
                                    <button onClick={() => setIsFilterPanelOpen(false)} className="p-1 text-gray-400 rounded-full hover:bg-gray-100"><CloseIcon className="w-5 h-5"/></button>
                                </div>
                                <div className="p-4 space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Kategori</label>
                                        <CustomSelect 
                                            // FIX: Explicitly cast values to string
                                            options={[{ value: '', label: 'Semua' }, ...uniqueCategories.map(c => ({ value: String(c), label: String(c) }))]} 
                                            value={tempFilters.category} 
                                            onChange={v => setTempFilters(f => ({ ...f, category: v }))} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Brand</label>
                                        <CustomSelect 
                                            // FIX: Explicitly cast values to string
                                            options={[{ value: '', label: 'Semua' }, ...uniqueBrands.map(b => ({ value: String(b), label: String(b) }))]} 
                                            value={tempFilters.brand} 
                                            onChange={v => setTempFilters(f => ({ ...f, brand: v }))} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                                        <CustomSelect 
                                            // FIX: Explicitly cast values to string
                                            options={[{ value: '', label: 'Semua' }, ...Object.values(AssetStatus).map((s) => ({ value: String(s), label: String(s) }))]} 
                                            value={tempFilters.status} 
                                            onChange={v => setTempFilters(f => ({ ...f, status: v }))} 
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-gray-50 border-t">
                                    <button onClick={handleResetFilters} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Reset</button>
                                    <button onClick={handleApplyFilters} className="px-4 py-2 text-sm font-semibold text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover">Terapkan</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Active Filter Chips */}
                {activeFilterCount > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 animate-fade-in-up mt-3">
                         {filters.category && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-full">
                                Kategori: <span className="font-bold">{filters.category}</span>
                                <button onClick={() => handleRemoveFilter('category')} className="p-0.5 ml-1 rounded-full hover:bg-blue-200 text-blue-500"><CloseIcon className="w-3 h-3" /></button>
                            </span>
                        )}
                        {filters.brand && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-100 rounded-full">
                                Brand: <span className="font-bold">{filters.brand}</span>
                                <button onClick={() => handleRemoveFilter('brand')} className="p-0.5 ml-1 rounded-full hover:bg-purple-200 text-purple-500"><CloseIcon className="w-3 h-3" /></button>
                            </span>
                        )}
                        {filters.status && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-100 rounded-full">
                                Status: <span className="font-bold">{filters.status}</span>
                                <button onClick={() => handleRemoveFilter('status')} className="p-0.5 ml-1 rounded-full hover:bg-green-200 text-green-500"><CloseIcon className="w-3 h-3" /></button>
                            </span>
                        )}
                         {filters.lowStockOnly && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-full">
                                Filter: <span className="font-bold">Stok Menipis</span>
                                <button onClick={() => handleRemoveFilter('lowStockOnly')} className="p-0.5 ml-1 rounded-full hover:bg-amber-200 text-amber-500"><CloseIcon className="w-3 h-3" /></button>
                            </span>
                        )}
                         {filters.outOfStockOnly && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-100 rounded-full">
                                Filter: <span className="font-bold">Stok Habis</span>
                                <button onClick={() => handleRemoveFilter('outOfStockOnly')} className="p-0.5 ml-1 rounded-full hover:bg-red-200 text-red-500"><CloseIcon className="w-3 h-3" /></button>
                            </span>
                        )}
                        <button onClick={handleResetFilters} className="text-xs text-gray-500 hover:text-red-600 hover:underline px-2 py-1">Hapus Semua</button>
                    </div>
                )}
            </div>

            <div className="overflow-hidden bg-white border border-gray-200/80 rounded-xl shadow-md">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <SortableHeader columnKey="name" sortConfig={sortConfig} requestSort={requestSort}>Nama Aset</SortableHeader>
                                <SortableHeader columnKey="id" sortConfig={sortConfig} requestSort={requestSort}>ID & SN</SortableHeader>
                                <SortableHeader columnKey="category" sortConfig={sortConfig} requestSort={requestSort}>Kategori & Brand</SortableHeader>
                                <SortableHeader columnKey="status" sortConfig={sortConfig} requestSort={requestSort}>Status</SortableHeader>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Aksi</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedAssets.length > 0 ? (
                                paginatedAssets.map(asset => (
                                    <tr key={asset.id} onClick={() => onShowPreview({ type: 'asset', id: asset.id })} className="cursor-pointer hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-semibold text-gray-900">{asset.name}</div>
                                            <div className="text-xs text-gray-500">{asset.type}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-mono text-gray-600">{asset.id}</div>
                                            {asset.serialNumber && <div className="text-xs text-gray-500 font-mono">SN: {asset.serialNumber}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{asset.category}</div>
                                            <div className="text-xs text-gray-500">{asset.brand}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(asset.status)}`}>{asset.status}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button onClick={(e) => { e.stopPropagation(); onShowPreview({ type: 'asset', id: asset.id }); }} className="text-gray-400 hover:text-tm-primary"><EyeIcon className="w-5 h-5"/></button>
                                                {asset.status !== AssetStatus.DAMAGED && asset.status !== AssetStatus.DECOMMISSIONED && (
                                                    <button onClick={(e) => { e.stopPropagation(); setAssetToReportDamage(asset); }} className="text-gray-400 hover:text-amber-500" title="Lapor Kerusakan"><WrenchIcon className="w-5 h-5"/></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500"><InboxIcon className="w-12 h-12 mx-auto text-gray-300"/><p className="mt-2 font-medium">Tidak ada aset ditemukan.</p></td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <PaginationControls currentPage={currentPage} totalPages={totalPages} totalItems={sortedAssets.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} startIndex={startIndex} endIndex={endIndex} />
            </div>

            {/* Modals */}
            <ReportDamageModal 
                isOpen={!!assetToReportDamage} 
                onClose={() => setAssetToReportDamage(null)} 
                asset={assetToReportDamage} 
                onSubmit={handleReportDamageSubmit} 
            />
        </div>
    );
};

export default StockOverviewPage;
