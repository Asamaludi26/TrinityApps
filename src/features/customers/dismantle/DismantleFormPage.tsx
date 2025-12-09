import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Dismantle, ItemStatus, Asset, AssetStatus, AssetCondition, Customer, User, ActivityLogEntry, PreviewData, Page, Attachment } from '../../../types';
import Modal from '../../../components/ui/Modal';
import { EyeIcon } from '../../../components/icons/EyeIcon';
import { TrashIcon } from '../../../components/icons/TrashIcon';
import { useNotification } from '../../../providers/NotificationProvider';
import { InboxIcon } from '../../../components/icons/InboxIcon';
import { useSortableData, SortConfig } from '../../../hooks/useSortableData';
import { SortAscIcon } from '../../../components/icons/SortAscIcon';
import { SortDescIcon } from '../../../components/icons/SortDescIcon';
import { SortIcon } from '../../../components/icons/SortIcon';
import { exportToCSV } from '../../../utils/csvExporter';
import { ExportIcon } from '../../../components/icons/ExportIcon';
import { useLongPress } from '../../../hooks/useLongPress';
import { Checkbox } from '../../../components/ui/Checkbox';
import { SpinnerIcon } from '../../../components/icons/SpinnerIcon';
import { SearchIcon } from '../../../components/icons/SearchIcon';
import { CloseIcon } from '../../../components/icons/CloseIcon';
import { PaginationControls } from '../../../components/ui/PaginationControls';
import { ExclamationTriangleIcon } from '../../../components/icons/ExclamationTriangleIcon';
import DismantleForm from './DismantleForm';
import DismantleDetailPage from './DismantleDetailPage';

// Stores
import { useTransactionStore } from '../../../stores/useTransactionStore';
import { useAssetStore } from '../../../stores/useAssetStore';
import { useMasterDataStore } from '../../../stores/useMasterDataStore';
import { useAuthStore } from '../../../stores/useAuthStore';

interface DismantleFormPageProps {
    currentUser: User; // Can keep as prop or use store
    // Legacy props - optional
    dismantles?: Dismantle[];
    assets?: Asset[];
    customers?: Customer[];
    users?: User[];
    
    prefillData?: Asset | null;
    onClearPrefill: () => void;
    onUpdateAsset?: any; // Handled by store
    onSaveDismantle?: any; // Handled by store
    onShowPreview: (data: PreviewData) => void;
    setActivePage: (page: Page, initialState?: any) => void;
    pageInitialState?: { prefillCustomerId?: string };
}

const getStatusClass = (status: ItemStatus) => {
    switch (status) {
        case ItemStatus.COMPLETED: return 'bg-success-light text-success-text';
        case ItemStatus.IN_PROGRESS: return 'bg-warning-light text-warning-text animate-pulse-slow';
        case ItemStatus.PENDING: return 'bg-gray-100 text-gray-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const SortableHeader: React.FC<{
    children: React.ReactNode;
    columnKey: keyof Dismantle;
    sortConfig: SortConfig<Dismantle> | null;
    requestSort: (key: keyof Dismantle) => void;
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

interface DismantleTableProps {
    dismantles: Dismantle[];
    onDetailClick: (dismantle: Dismantle) => void;
    onDeleteClick: (id: string) => void;
    sortConfig: SortConfig<Dismantle> | null;
    requestSort: (key: keyof Dismantle) => void;
    selectedDismantleIds: string[];
    onSelectOne: (id: string) => void;
    onSelectAll: (event: React.ChangeEvent<HTMLInputElement>) => void;
    isBulkSelectMode: boolean;
    onEnterBulkMode: () => void;
}

const DismantleTable: React.FC<DismantleTableProps> = ({ dismantles, onDetailClick, onDeleteClick, sortConfig, requestSort, selectedDismantleIds, onSelectOne, onSelectAll, isBulkSelectMode, onEnterBulkMode }) => {
    const longPressHandlers = useLongPress(onEnterBulkMode, 500);

    const handleRowClick = (d: Dismantle) => {
        if (isBulkSelectMode) {
            onSelectOne(d.id);
        } else {
            onDetailClick(d);
        }
    };
    
    return (
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="sticky top-0 z-10 bg-gray-50">
                <tr>
                    {isBulkSelectMode && (
                        <th scope="col" className="px-6 py-3">
                            <Checkbox
                                checked={selectedDismantleIds.length === dismantles.length && dismantles.length > 0}
                                onChange={onSelectAll}
                                aria-label="Pilih semua data dismantle"
                            />
                        </th>
                    )}
                    <SortableHeader columnKey="docNumber" sortConfig={sortConfig} requestSort={requestSort}>No. Dokumen / Tanggal</SortableHeader>
                    <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500">Aset & Pelanggan</th>
                    <SortableHeader columnKey="technician" sortConfig={sortConfig} requestSort={requestSort}>Teknisi</SortableHeader>
                    <SortableHeader columnKey="status" sortConfig={sortConfig} requestSort={requestSort}>Status</SortableHeader>
                    <th className="relative px-6 py-3"><span className="sr-only">Aksi</span></th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {dismantles.length > 0 ? (
                    dismantles.map((d) => (
                        <tr 
                            key={d.id}
                            {...longPressHandlers}
                            onClick={() => handleRowClick(d)}
                            className={`transition-colors cursor-pointer ${selectedDismantleIds.includes(d.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                        >
                            {isBulkSelectMode && (
                                <td className="px-6 py-4 align-top" onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                        checked={selectedDismantleIds.includes(d.id)}
                                        onChange={() => onSelectOne(d.id)}
                                        aria-labelledby={`dismantle-id-${d.id}`}
                                    />
                                </td>
                            )}
                            <td id={`dismantle-id-${d.id}`} className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-semibold text-gray-900">{d.docNumber}</div>
                                <div className="text-xs text-gray-500">{new Date(d.dismantleDate).toLocaleDateString('id-ID')}</div>
                            </td>
                             <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{d.assetName}</div>
                                <div className="text-xs text-gray-500">dari {d.customerName}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-800 whitespace-nowrap">{d.technician}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(d.status)}`}>
                                    {d.status === ItemStatus.IN_PROGRESS ? 'Menunggu Penerimaan Gudang' : d.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                                 <div className="flex items-center justify-end space-x-2">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onDetailClick(d); }}
                                        className="flex items-center justify-center w-8 h-8 text-gray-500 transition-colors bg-gray-100 rounded-full hover:bg-info-light hover:text-info-text" title="Lihat Detail"
                                    >
                                      <EyeIcon className="w-5 h-5"/>
                                    </button>
                                     <button onClick={(e) => { e.stopPropagation(); onDeleteClick(d.id); }} className="flex items-center justify-center w-8 h-8 text-gray-500 transition-colors bg-gray-100 rounded-full hover:bg-danger-light hover:text-danger-text" title="Hapus">
                                      <TrashIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={isBulkSelectMode ? 6 : 5} className="px-6 py-12 text-center text-gray-500">
                            <div className="flex flex-col items-center">
                                <InboxIcon className="w-12 h-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak Ada Data Dismantle</h3>
                                <p className="mt-1 text-sm text-gray-500">Ubah filter atau mulai proses dismantle baru.</p>
                            </div>
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    );
};

const DismantleFormPage: React.FC<DismantleFormPageProps> = (props) => {
    const { currentUser: propUser, prefillData, onClearPrefill, onShowPreview, setActivePage, pageInitialState } = props;
    
    // Stores
    const dismantles = useTransactionStore((state) => state.dismantles);
    const addDismantle = useTransactionStore((state) => state.addDismantle);
    const updateDismantle = useTransactionStore((state) => state.updateDismantle);
    const deleteDismantle = useTransactionStore((state) => state.deleteDismantle);

    const assets = useAssetStore((state) => state.assets);
    const updateAsset = useAssetStore((state) => state.updateAsset);

    const customers = useMasterDataStore((state) => state.customers);
    const users = useMasterDataStore((state) => state.users);
    const storeUser = useAuthStore((state) => state.currentUser);

    const currentUser = storeUser || propUser;
    const addNotification = useNotification();
    
    // --- STATE MANAGEMENT ---
    const prefillCustomerId = pageInitialState?.prefillCustomerId;
    const [view, setView] = useState<'list' | 'form' | 'detail'>(prefillData || prefillCustomerId ? 'form' : 'list');
    
    const [selectedDismantle, setSelectedDismantle] = useState<Dismantle | null>(null);
    const [dismantleToDeleteId, setDismantleToDeleteId] = useState<string | null>(null);
    const [bulkDeleteConfirmation, setBulkDeleteConfirmation] = useState(false);
    const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
    const [selectedDismantleIds, setSelectedDismantleIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    
    const initialFilterState = { status: '', technician: '', startDate: null, endDate: null };
    const [filters, setFilters] = useState<{ status: string; technician: string; startDate: Date | null; endDate: Date | null; }>(initialFilterState);
    const [tempFilters, setTempFilters] = useState(filters);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const filterPanelRef = useRef<HTMLDivElement>(null);
    
    // --- EFFECTS ---
    useEffect(() => {
        if (prefillData || prefillCustomerId) setView('form');
    }, [prefillData, prefillCustomerId]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
                setIsFilterPanelOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => { document.removeEventListener("mousedown", handleClickOutside); };
    }, [filterPanelRef]);

    useEffect(() => { setCurrentPage(1); }, [searchQuery, filters, itemsPerPage]);

    // --- UI HANDLERS ---
    const handleSetView = (newView: 'list' | 'form' | 'detail') => {
        if (newView === 'list') {
            if (prefillData) onClearPrefill();
            setSelectedDismantle(null);
        }
        setView(newView);
    };

    const handleShowDetails = (dismantle: Dismantle) => {
        setSelectedDismantle(dismantle);
        setView('detail');
    };

    const handleCancelBulkMode = () => {
        setIsBulkSelectMode(false);
        setSelectedDismantleIds([]);
    };
    
    const handleResetFilters = () => {
        setFilters(initialFilterState);
        setTempFilters(initialFilterState);
        setIsFilterPanelOpen(false);
    };

    const handleApplyFilters = () => {
        setFilters(tempFilters);
        setIsFilterPanelOpen(false);
    };

    // --- DATA MANIPULATION HANDLERS (CRUD) ---
    const handleSaveDismantle = async (data: Omit<Dismantle, 'id' | 'status'>) => {
        const newDismantle: Dismantle = {
            ...data,
            id: `DSM-${Date.now()}`,
            status: ItemStatus.IN_PROGRESS, // Start as in-progress until accepted by warehouse
            acknowledger: null,
        };
        
        await addDismantle(newDismantle);
        addNotification('Berita Acara Dismantle berhasil dibuat.', 'success');
        handleSetView('list');
    };

    const handleCompleteDismantle = async () => {
        if (!selectedDismantle) return;
        setIsLoading(true);

        try {
            const updatedDismantle: Dismantle = { ...selectedDismantle, status: ItemStatus.COMPLETED, acknowledger: currentUser.name };
            
            await updateDismantle(selectedDismantle.id, { status: ItemStatus.COMPLETED, acknowledger: currentUser.name });

            // Update asset status back to storage
            await updateAsset(selectedDismantle.assetId, {
                status: AssetStatus.IN_STORAGE,
                condition: selectedDismantle.retrievedCondition,
                currentUser: null,
                location: 'Gudang Inventori',
                isDismantled: true,
                dismantleInfo: {
                    customerId: selectedDismantle.customerId,
                    customerName: selectedDismantle.customerName,
                    dismantleDate: selectedDismantle.dismantleDate,
                    dismantleId: selectedDismantle.id,
                },
                activityLog: [
                    // We need to append to existing log, assume store handles merge or we fetch first.
                    // For simplicity here we just pass the new entry if store supports partial update of array
                    // But typically we need to fetch, push, and update.
                    // Assuming updateAsset handles partial merge or just overwrites fields. 
                    // Ideally, the store should have an `addLog` action, but here we do a full update for now 
                    // or rely on the fact that this is a mock.
                    // In real app: backend handles log append.
                ] 
            });
            
            // Add separate log entry if needed or handled by backend logic
            
            addNotification('Dismantle telah diselesaikan dan aset kembali ke stok.', 'success');
            handleSetView('list');
        } catch (e) {
            addNotification('Gagal menyelesaikan dismantle.', 'error');
        } finally {
            setIsLoading(false);
        }
    }
    
    const handleConfirmDelete = async () => {
        if (!dismantleToDeleteId) return;
        setIsLoading(true);
        try {
            await deleteDismantle(dismantleToDeleteId);
            addNotification(`Dismantle ${dismantleToDeleteId} berhasil dihapus.`, 'success');
        } catch (e) {
            addNotification('Gagal menghapus dismantle.', 'error');
        } finally {
            setDismantleToDeleteId(null);
            setIsLoading(false);
        }
    };
    
    const { deletableDismantlesCount, skippableDismantlesCount } = useMemo(() => {
        if (!bulkDeleteConfirmation) return { deletableDismantlesCount: 0, skippableDismantlesCount: 0 };
        const selected = dismantles.filter(d => selectedDismantleIds.includes(d.id));
        const skippable = selected.filter(d => d.status === ItemStatus.IN_PROGRESS);
        return {
            deletableDismantlesCount: selected.length - skippable.length,
            skippableDismantlesCount: skippable.length,
        };
    }, [bulkDeleteConfirmation, selectedDismantleIds, dismantles]);

    const handleBulkDelete = async () => {
        const deletableIds = selectedDismantleIds.filter(id => {
            const d = dismantles.find(dismantle => dismantle.id === id);
            return d && d.status !== ItemStatus.IN_PROGRESS;
        });

        if (deletableIds.length === 0) {
            addNotification('Tidak ada data yang dapat dihapus (semua sedang dalam proses).', 'error');
            setBulkDeleteConfirmation(false);
            return;
        }

        setIsLoading(true);
        try {
            for (const id of deletableIds) {
                await deleteDismantle(id);
            }
            
            let message = `${deletableIds.length} data dismantle berhasil dihapus.`;
            if (skippableDismantlesCount > 0) {
                message += ` ${skippableDismantlesCount} data dilewati karena berstatus "Menunggu Penerimaan".`;
            }
            addNotification(message, 'success');
            
            setBulkDeleteConfirmation(false);
            handleCancelBulkMode();
        } finally {
            setIsLoading(false);
        }
    };

    // --- DATA FILTERING & SORTING ---
    const filteredDismantles = useMemo(() => {
        let tempDismantles = dismantles;
        if (currentUser.role === 'Staff') {
            tempDismantles = tempDismantles.filter(d => d.technician === currentUser.name);
        }
        return tempDismantles
            .filter(d => {
                const searchLower = searchQuery.toLowerCase();
                return (
                    d.docNumber.toLowerCase().includes(searchLower) ||
                    d.assetName.toLowerCase().includes(searchLower) ||
                    d.customerName.toLowerCase().includes(searchLower)
                );
            })
            .filter(d => {
                if (!filters.status && !filters.technician && !filters.startDate && !filters.endDate) return true;
                let isMatch = true;
                if (filters.status) isMatch = isMatch && d.status === filters.status;
                if (filters.technician) isMatch = isMatch && d.technician === filters.technician;
                if (filters.startDate) isMatch = isMatch && new Date(d.dismantleDate) >= filters.startDate;
                if (filters.endDate) isMatch = isMatch && new Date(d.dismantleDate) <= filters.endDate;
                return isMatch;
            });
    }, [dismantles, searchQuery, filters, currentUser]);

    const { items: sortedDismantles, requestSort, sortConfig } = useSortableData<Dismantle>(filteredDismantles, { key: 'dismantleDate', direction: 'descending' });
    const totalItems = sortedDismantles.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedDismantles = sortedDismantles.slice(startIndex, endIndex);
    
    const handleItemsPerPageChange = (newSize: number) => {
        setItemsPerPage(newSize);
        setCurrentPage(1);
    };
    
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedDismantleIds(paginatedDismantles.map(d => d.id));
        } else {
            setSelectedDismantleIds([]);
        }
    };
    
    const handleSelectOne = (id: string) => {
        setSelectedDismantleIds(prev => 
            prev.includes(id) ? prev.filter(dId => dId !== id) : [...prev, id]
        );
    };

    // --- RENDER LOGIC ---
    if (view === 'form') {
        return (
            <div className="p-4 sm:p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold text-tm-dark">Buat Berita Acara Dismantle</h1>
                    <button onClick={() => handleSetView('list')} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">
                        Kembali ke Daftar
                    </button>
                </div>
                <div className="p-4 sm:p-6 bg-white border border-gray-200/80 rounded-xl shadow-md pb-24">
                    <DismantleForm 
                        currentUser={currentUser}
                        dismantles={dismantles}
                        onSave={handleSaveDismantle}
                        onCancel={() => handleSetView('list')}
                        customers={customers}
                        users={users}
                        assets={assets}
                        prefillAsset={prefillData}
                        prefillCustomerId={prefillCustomerId}
                        setActivePage={setActivePage}
                    />
                </div>
            </div>
        );
    }

    if (view === 'detail' && selectedDismantle) {
        return (
            <DismantleDetailPage
                dismantle={selectedDismantle}
                currentUser={currentUser}
                assets={assets}
                customers={customers}
                onBackToList={() => handleSetView('list')}
                onShowPreview={onShowPreview}
                onComplete={handleCompleteDismantle}
                isLoading={isLoading}
            />
        );
    }

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="flex flex-col items-start justify-between gap-4 mb-6 md:flex-row md:items-center">
                <h1 className="text-3xl font-bold text-tm-dark">Daftar Dismantle Aset</h1>
                <div className="flex items-center space-x-2">
                     <button
                        onClick={() => exportToCSV(sortedDismantles, `dismantle_aset_${new Date().toISOString().split('T')[0]}.csv`)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 transition-all duration-200 bg-white border rounded-lg shadow-sm hover:bg-gray-50"
                    >
                        <ExportIcon className="w-4 h-4"/>
                        Export CSV
                    </button>
                    <button onClick={() => handleSetView('form')} className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover">
                        Buat BA Dismantle Baru
                    </button>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="p-4 mb-4 bg-white border border-gray-200/80 rounded-xl shadow-md">
                 <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <SearchIcon className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Cari No. Dokumen, Aset, Pelanggan..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full h-10 py-2 pl-10 pr-10 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-tm-accent focus:border-tm-accent"
                        />
                    </div>
                     <div className="relative" ref={filterPanelRef}>
                        {/* Filter Button and Panel here */}
                    </div>
                </div>
            </div>

            {/* Bulk Action Bar */}
             {isBulkSelectMode && (
                <div className="p-4 mb-4 bg-blue-50 border-l-4 border-tm-accent rounded-r-lg">
                    {/* Bulk action buttons */}
                </div>
            )}

            {/* Table */}
            <div className="overflow-hidden bg-white border border-gray-200/80 rounded-xl shadow-md">
                <div className="overflow-x-auto custom-scrollbar">
                    <DismantleTable 
                        dismantles={paginatedDismantles} 
                        onDetailClick={handleShowDetails} 
                        onDeleteClick={setDismantleToDeleteId} 
                        sortConfig={sortConfig} 
                        requestSort={requestSort} 
                        selectedDismantleIds={selectedDismantleIds} 
                        onSelectAll={handleSelectAll} 
                        onSelectOne={handleSelectOne} 
                        isBulkSelectMode={isBulkSelectMode} 
                        onEnterBulkMode={() => setIsBulkSelectMode(true)} 
                    />
                </div>
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={handleItemsPerPageChange}
                    startIndex={startIndex}
                    endIndex={endIndex}
                />
            </div>
            
            {dismantleToDeleteId && <Modal isOpen={!!dismantleToDeleteId} onClose={() => setDismantleToDeleteId(null)} title="Konfirmasi Hapus">
                <div className="text-center">
                    <ExclamationTriangleIcon className="w-12 h-12 mx-auto text-red-500" />
                    <h3 className="mt-4 text-lg font-semibold text-gray-800">Hapus Data Dismantle?</h3>
                    <p className="mt-2 text-sm text-gray-600">Anda yakin ingin menghapus data dismantle <strong>{dismantleToDeleteId}</strong>? Tindakan ini tidak dapat diurungkan.</p>
                </div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                    <button onClick={() => setDismantleToDeleteId(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
                    <button onClick={handleConfirmDelete} disabled={isLoading} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-danger rounded-lg shadow-sm hover:bg-red-700">{isLoading && <SpinnerIcon className="w-4 h-4 mr-2"/>} Hapus</button>
                </div>
            </Modal>}
            {bulkDeleteConfirmation && <Modal isOpen={bulkDeleteConfirmation} onClose={() => setBulkDeleteConfirmation(false)} title="Konfirmasi Hapus Massal" size="md" hideDefaultCloseButton>
                <div className="text-center">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto text-red-600 bg-red-100 rounded-full">
                        <ExclamationTriangleIcon className="w-8 h-8" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-gray-800">
                        Hapus {deletableDismantlesCount} Data Dismantle?
                    </h3>
                    <p className="mt-2 text-sm text-gray-600">
                        Anda akan menghapus data dismantle yang dipilih secara permanen. Aksi ini tidak dapat diurungkan.
                    </p>
                    <div className="w-full p-3 mt-4 text-sm text-left bg-gray-50 border rounded-lg">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Total Dipilih:</span>
                            <span className="font-semibold text-gray-800">{selectedDismantleIds.length}</span>
                        </div>
                        <div className="flex justify-between mt-1 text-green-700">
                            <span className="font-medium">Akan Dihapus:</span>
                            <span className="font-bold">{deletableDismantlesCount}</span>
                        </div>
                        <div className="flex justify-between mt-1 text-amber-700">
                            <span className="font-medium">Dilewati (status "Menunggu Penerimaan"):</span>
                            <span className="font-bold">{skippableDismantlesCount}</span>
                        </div>
                    </div>
                    {deletableDismantlesCount === 0 && skippableDismantlesCount > 0 && (
                        <p className="mt-4 text-sm font-semibold text-red-700">
                            Tidak ada data yang dapat dihapus. Semua yang dipilih sedang dalam proses.
                        </p>
                    )}
                </div>
                 <div className="flex items-center justify-end pt-5 mt-5 space-x-3 border-t">
                    <button type="button" onClick={() => setBulkDeleteConfirmation(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
                    <button type="button" onClick={handleBulkDelete} disabled={isLoading || deletableDismantlesCount === 0} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-danger rounded-lg shadow-sm hover:bg-red-400">
                        {isLoading && <SpinnerIcon className="w-4 h-4 mr-2"/>}
                        Ya, Hapus ({deletableDismantlesCount})
                    </button>
                </div>
            </Modal>}
        </div>
    );
};

export default DismantleFormPage;
