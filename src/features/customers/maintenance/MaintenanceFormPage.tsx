
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Page, Maintenance, User, Customer, Asset, ItemStatus, AssetStatus, ActivityLogEntry, AssetCategory, InstalledMaterial, PreviewData, MaintenanceReplacement } from '../../../types';
import { useSortableData, SortConfig } from '../../../hooks/useSortableData';
import { useNotification } from '../../../providers/NotificationProvider';
import { PaginationControls } from '../../../components/ui/PaginationControls';
import { SearchIcon } from '../../../components/icons/SearchIcon';
import { InboxIcon } from '../../../components/icons/InboxIcon';
import { SortIcon } from '../../../components/icons/SortIcon';
import { SortAscIcon } from '../../../components/icons/SortAscIcon';
import { SortDescIcon } from '../../../components/icons/SortDescIcon';
import { EyeIcon } from '../../../components/icons/EyeIcon';
import MaintenanceForm from './MaintenanceForm';
import MaintenanceDetailPage from './MaintenanceDetailPage';
import { generateDocumentNumber } from '../../../utils/documentNumberGenerator';
import { FilterIcon } from '../../../components/icons/FilterIcon';
import { CloseIcon } from '../../../components/icons/CloseIcon';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import DatePicker from '../../../components/ui/DatePicker';

// Stores
import { useTransactionStore } from '../../../stores/useTransactionStore';
import { useAssetStore } from '../../../stores/useAssetStore';
import { useMasterDataStore } from '../../../stores/useMasterDataStore';
import { useAuthStore } from '../../../stores/useAuthStore';

interface MaintenanceManagementPageProps {
    currentUser: User; // Optional
    // Legacy props
    maintenances?: Maintenance[];
    customers?: Customer[];
    assets?: Asset[];
    users?: User[];
    assetCategories?: AssetCategory[];
    onSaveMaintenance?: any; // Handled by store
    onUpdateAsset?: any; // Handled by store
    
    setActivePage: (page: Page, filters?: any) => void;
    pageInitialState?: { prefillCustomer?: string; prefillAsset?: string };
    onShowPreview: (data: PreviewData) => void;
}

const getStatusClass = (status: ItemStatus) => {
    switch (status) {
        case ItemStatus.COMPLETED: return 'bg-success-light text-success-text';
        case ItemStatus.IN_PROGRESS: return 'bg-info-light text-info-text';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const SortableHeader: React.FC<{
    children: React.ReactNode;
    columnKey: keyof Maintenance;
    sortConfig: SortConfig<Maintenance> | null;
    requestSort: (key: keyof Maintenance) => void;
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

const MaintenanceTable: React.FC<{
    maintenances: Maintenance[];
    onDetailClick: (maintenance: Maintenance) => void;
    sortConfig: SortConfig<Maintenance> | null;
    requestSort: (key: keyof Maintenance) => void;
}> = ({ maintenances, onDetailClick, sortConfig, requestSort }) => (
    <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
            <tr>
                <SortableHeader columnKey="docNumber" sortConfig={sortConfig} requestSort={requestSort}>No. Dokumen / Tanggal</SortableHeader>
                <SortableHeader columnKey="customerName" sortConfig={sortConfig} requestSort={requestSort}>Pelanggan & Aset</SortableHeader>
                <SortableHeader columnKey="technician" sortConfig={sortConfig} requestSort={requestSort}>Teknisi</SortableHeader>
                <SortableHeader columnKey="status" sortConfig={sortConfig} requestSort={requestSort}>Status</SortableHeader>
                <th className="relative px-6 py-3"><span className="sr-only">Aksi</span></th>
            </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
            {maintenances.map(m => (
                <tr key={m.id} onClick={() => onDetailClick(m)} className="cursor-pointer hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-semibold text-gray-900">{m.docNumber}</div><div className="text-xs text-gray-500">{new Date(m.maintenanceDate).toLocaleDateString('id-ID')}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{m.customerName}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]" title={(m.assets || []).map(a => a.assetName).join(', ')}>
                            {(m.assets || []).map(a => a.assetName).join(', ')}
                        </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800 whitespace-nowrap">{m.technician}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusClass(m.status)}`}>{m.status}</span></td>
                    <td className="px-6 py-4 text-sm font-medium text-right"><button className="p-2 text-gray-500 rounded-full hover:bg-info-light hover:text-info-text"><EyeIcon className="w-5 h-5"/></button></td>
                </tr>
            ))}
        </tbody>
    </table>
);

const MaintenanceFormPage: React.FC<MaintenanceManagementPageProps> = (props) => {
    const { currentUser: propUser, pageInitialState, onShowPreview, setActivePage } = props;
    
    // Stores
    const maintenances = useTransactionStore((state) => state.maintenances);
    const addMaintenance = useTransactionStore((state) => state.addMaintenance);
    const updateMaintenanceStore = useTransactionStore((state) => state.updateMaintenance);
    
    const assets = useAssetStore((state) => state.assets);
    const assetCategories = useAssetStore((state) => state.categories);
    const updateAsset = useAssetStore((state) => state.updateAsset);
    
    const customers = useMasterDataStore((state) => state.customers);
    const updateCustomer = useMasterDataStore((state) => state.updateCustomer);
    
    const users = useMasterDataStore((state) => state.users);
    const storeUser = useAuthStore((state) => state.currentUser);
    const currentUser = storeUser || propUser;
    
    const prefillCustomerId = pageInitialState?.prefillCustomer;
    const prefillAssetId = pageInitialState?.prefillAsset;
    const [view, setView] = useState<'list' | 'form' | 'detail'>(prefillCustomerId || prefillAssetId ? 'form' : 'list');
    
    const [selectedMaintenance, setSelectedMaintenance] = useState<Maintenance | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isLoading, setIsLoading] = useState(false);
    const addNotification = useNotification();
    
    // Filter State
    const initialFilterState = { technician: '', priority: '', startDate: null, endDate: null };
    const [filters, setFilters] = useState<{ technician: string; priority: string; startDate: Date | null; endDate: Date | null; }>(initialFilterState);
    const [tempFilters, setTempFilters] = useState(filters);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const filterPanelRef = useRef<HTMLDivElement>(null);

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
        return Object.values(filters).filter(Boolean).length;
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
        setFilters((prev) => ({ ...prev, [key]: key === 'startDate' || key === 'endDate' ? null : "" }));
        setTempFilters((prev) => ({ ...prev, [key]: key === 'startDate' || key === 'endDate' ? null : "" }));
    };

    const technicianOptions = useMemo(() => {
        // Fix: Explicitly type techNames as string array to prevent 'unknown' type inference in CustomSelect options.
        const techNames: string[] = Array.from(new Set(users.filter(u => u.divisionId === 3).map(u => u.name)));
        return techNames.map(name => ({ value: name, label: name }));
   }, [users]);
   
   const priorityOptions = [
       { value: 'Tinggi', label: 'Tinggi' },
       { value: 'Sedang', label: 'Sedang' },
       { value: 'Rendah', label: 'Rendah' }
   ];


    const filteredMaintenances = useMemo(() => {
        let tempMaintenances = maintenances;
        if (currentUser.role === 'Staff') {
            tempMaintenances = tempMaintenances.filter(m => m.technician === currentUser.name);
        }
        return tempMaintenances
            .filter(m => {
                const searchLower = searchQuery.toLowerCase();
                return m.docNumber.toLowerCase().includes(searchLower) ||
                       m.customerName.toLowerCase().includes(searchLower) ||
                       (m.assets || []).some(a => a.assetName.toLowerCase().includes(searchLower)) ||
                       m.technician.toLowerCase().includes(searchLower);
            })
            .filter(m => {
                let isMatch = true;
                if (filters.technician) isMatch = isMatch && m.technician === filters.technician;
                if (filters.priority) isMatch = isMatch && m.priority === filters.priority;
                if (filters.startDate) {
                    const start = new Date(filters.startDate); start.setHours(0,0,0,0);
                    const mDate = new Date(m.maintenanceDate); mDate.setHours(0,0,0,0);
                    isMatch = isMatch && mDate >= start;
                }
                if (filters.endDate) {
                    const end = new Date(filters.endDate); end.setHours(23,59,59,999);
                    const mDate = new Date(m.maintenanceDate);
                    isMatch = isMatch && mDate <= end;
                }
                return isMatch;
            });
    }, [maintenances, searchQuery, currentUser, filters]);

    const { items: sortedMaintenances, requestSort, sortConfig } = useSortableData<Maintenance>(filteredMaintenances, { key: 'maintenanceDate', direction: 'descending' });
    
    const paginatedMaintenances = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedMaintenances.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedMaintenances, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedMaintenances.length / itemsPerPage);

    const handleSave = async (maintenanceData: Omit<Maintenance, 'id' | 'status' | 'docNumber'>) => {
        setIsLoading(true);
        const newDocNumber = generateDocumentNumber(
          "MNT",
          maintenances,
          new Date(maintenanceData.maintenanceDate)
        );
        
        const newMaintenance: Maintenance = {
          ...maintenanceData,
          id: `MNT-${Date.now()}`,
          docNumber: newDocNumber,
          status: ItemStatus.COMPLETED,
          completedBy: currentUser.name,
          completionDate: new Date().toISOString(),
        };
        
        try {
            await addMaintenance(newMaintenance);

            // 1. Asset Replacement Logic (Aset Tetap)
            if (maintenanceData.replacements && maintenanceData.replacements.length > 0) {
                for (const rep of maintenanceData.replacements) {
                     await updateAsset(rep.oldAssetId, {
                        status: AssetStatus.IN_STORAGE,
                        condition: rep.retrievedAssetCondition,
                        currentUser: null,
                        location: "Gudang Inventori",
                     });
                     
                     await updateAsset(rep.newAssetId, {
                        status: AssetStatus.IN_USE,
                        currentUser: maintenanceData.customerId,
                        location: `Terpasang di: ${maintenanceData.customerName}`,
                     });
                }
            }

            // 2. Prepare Materials to Install (Conversion Logic)
             const materialsToInstall: InstalledMaterial[] = (newMaintenance.materialsUsed || []).map((material) => {
                let unit = "pcs";
                let convertedQuantity = material.quantity;
                let materialFound = false;

                for (const cat of assetCategories) {
                    if (materialFound) break;
                    for (const type of cat.types) {
                        if (type.trackingMethod === "bulk" && type.standardItems?.some((item) => item.name === material.itemName && item.brand === material.brand)) {
                            unit = type.baseUnitOfMeasure || "pcs";
                            if (type.quantityPerUnit) {
                                convertedQuantity = material.quantity * type.quantityPerUnit;
                            }
                            materialFound = true;
                            break;
                        }
                    }
                }
                return {
                    itemName: material.itemName,
                    brand: material.brand,
                    quantity: convertedQuantity,
                    unit: unit,
                    installationDate: newMaintenance.maintenanceDate,
                };
            });

            // 3. Update Stock & Customer Data
            if (materialsToInstall.length > 0) {
                // a. Consume Stock
                for (const mat of materialsToInstall) {
                    // Cari stok yang tersedia
                    const availableStock = assets
                        .filter(a => 
                            a.name === mat.itemName && 
                            a.brand === mat.brand && 
                            a.status === AssetStatus.IN_STORAGE
                        )
                        .sort((a, b) => new Date(a.registrationDate).getTime() - new Date(b.registrationDate).getTime());

                    // Tentukan jumlah consumption (asumsi 1 unit stok mock = 1 unit material)
                    // Note: Untuk kabel yang convert dari Roll ke Meter, ini akan menghabiskan 'Roll' jika quantity > 0.
                    // Idealnya di masa depan: Logic pengurangan partial.
                    const qtyToConsume = Math.min(mat.quantity, availableStock.length);
                    
                    if (qtyToConsume > 0) {
                        const itemsToUpdate = availableStock.slice(0, qtyToConsume);
                        for (const item of itemsToUpdate) {
                             await updateAsset(item.id, {
                                status: AssetStatus.IN_USE,
                                currentUser: maintenanceData.customerId,
                                location: `Terpasang di: ${maintenanceData.customerName}`,
                                activityLog: [] 
                            });
                        }
                    }
                }

                // b. Update Customer Record
                const customer = customers.find(c => c.id === newMaintenance.customerId);
                if (customer) {
                    const existingMaterials = customer.installedMaterials || [];
                    const updatedMaterials = [...existingMaterials];

                    materialsToInstall.forEach((newMat) => {
                        const existingMatIndex = updatedMaterials.findIndex(
                          (em) => em.itemName === newMat.itemName && em.brand === newMat.brand
                        );
                        if (existingMatIndex > -1) {
                          updatedMaterials[existingMatIndex] = {
                            ...updatedMaterials[existingMatIndex],
                            quantity: updatedMaterials[existingMatIndex].quantity + newMat.quantity,
                          };
                        } else {
                          updatedMaterials.push(newMat);
                        }
                    });
                    await updateCustomer(customer.id, { installedMaterials: updatedMaterials });
                }
            }

            addNotification(`Laporan maintenance ${newDocNumber} berhasil dibuat.`, "success");
            setView('list');

        } catch (error) {
            addNotification('Gagal menyimpan laporan maintenance.', 'error');
        } finally {
             setIsLoading(false);
        }
    };

    const handleComplete = async () => {
        if (!selectedMaintenance) return;
        setIsLoading(true);
        try {
            const updatedMaintenance: Partial<Maintenance> = {
                status: ItemStatus.COMPLETED,
                completedBy: currentUser.name,
                completionDate: new Date().toISOString(),
            };
            
            await updateMaintenanceStore(selectedMaintenance.id, updatedMaintenance);
            
            addNotification('Laporan maintenance telah diselesaikan.', 'success');
            setView('list');
            setSelectedMaintenance(null);
        } catch (e) {
            addNotification('Gagal menyelesaikan maintenance.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (view === 'form') {
        return (
            <div className="p-4 sm:p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold text-tm-dark">Buat Laporan Maintenance</h1>
                    <button onClick={() => setView('list')} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Kembali</button>
                </div>
                <div className="p-4 sm:p-6 bg-white border border-gray-200/80 rounded-xl shadow-md pb-24">
                    <MaintenanceForm 
                        currentUser={currentUser}
                        customers={customers}
                        assets={assets}
                        users={users}
                        maintenances={maintenances}
                        assetCategories={assetCategories}
                        onSave={handleSave}
                        onCancel={() => setView('list')}
                        isLoading={isLoading}
                        prefillCustomerId={prefillCustomerId}
                        prefillAssetId={prefillAssetId}
                    />
                </div>
            </div>
        );
    }
    
    if (view === 'detail' && selectedMaintenance) {
        return (
            <MaintenanceDetailPage
                maintenance={selectedMaintenance}
                onBackToList={() => { setView('list'); setSelectedMaintenance(null); }}
                onComplete={handleComplete}
                isLoading={isLoading}
                currentUser={currentUser}
                assets={assets}
                onShowPreview={onShowPreview}
            />
        );
    }

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                <h1 className="text-3xl font-bold text-tm-dark">Manajemen Maintenance</h1>
                <button onClick={() => setView('form')} className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover">Buat Laporan Baru</button>
            </div>
            <div className="p-4 mb-4 bg-white border border-gray-200/80 rounded-xl shadow-md">
                <div className="flex flex-wrap items-center gap-4">
                     <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"> <SearchIcon className="w-5 h-5 text-gray-400" /> </div>
                        <input type="text" placeholder="Cari No. Dokumen, Pelanggan, Aset..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-10 py-2 pl-10 pr-4 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-tm-accent focus:border-tm-accent" />
                    </div>
                    <div className="relative" ref={filterPanelRef}>
                        <button
                            onClick={() => { setTempFilters(filters); setIsFilterPanelOpen(p => !p); }}
                            className={`inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-semibold transition-all duration-200 border rounded-lg shadow-sm sm:w-auto 
                                ${activeFilterCount > 0 ? 'bg-tm-light border-tm-accent text-tm-primary' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}
                            `}
                        >
                            <FilterIcon className="w-4 h-4" /> <span>Filter</span> {activeFilterCount > 0 && <span className="px-1.5 py-0.5 text-[10px] font-bold text-white rounded-full bg-tm-primary">{activeFilterCount}</span>}
                        </button>
                        {isFilterPanelOpen && (
                            <>
                                <div onClick={() => setIsFilterPanelOpen(false)} className="fixed inset-0 z-20 bg-black/25 sm:hidden" />
                                <div className="fixed top-32 inset-x-4 z-30 origin-top rounded-xl border border-gray-200 bg-white shadow-lg sm:absolute sm:top-full sm:inset-x-auto sm:right-0 sm:mt-2 sm:w-72">
                                    <div className="flex items-center justify-between p-4 border-b">
                                        <h3 className="text-lg font-semibold text-gray-800">Filter Maintenance</h3>
                                        <button onClick={() => setIsFilterPanelOpen(false)} className="p-1 text-gray-400 rounded-full hover:bg-gray-100"><CloseIcon className="w-5 h-5"/></button>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Teknisi</label>
                                            <CustomSelect options={[{value: '', label: 'Semua Teknisi'}, ...technicianOptions]} value={tempFilters.technician} onChange={v => setTempFilters(f => ({...f, technician: v}))} />
                                        </div>
                                         <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Prioritas</label>
                                            <CustomSelect options={[{value: '', label: 'Semua Prioritas'}, ...priorityOptions]} value={tempFilters.priority} onChange={v => setTempFilters(f => ({...f, priority: v}))} />
                                        </div>
                                         <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Tanggal Mulai</label>
                                            <DatePicker id="filterStartDate" selectedDate={tempFilters.startDate} onDateChange={date => setTempFilters(f => ({...f, startDate: date}))} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Tanggal Akhir</label>
                                            <DatePicker id="filterEndDate" selectedDate={tempFilters.endDate} onDateChange={date => setTempFilters(f => ({...f, endDate: date}))} />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 border-t">
                                        <button onClick={handleResetFilters} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Reset</button>
                                        <button onClick={handleApplyFilters} className="px-4 py-2 text-sm font-semibold text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover">Terapkan</button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* ACTIVE FILTER CHIPS */}
                {activeFilterCount > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 animate-fade-in-up mt-3">
                        {filters.technician && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-full">
                                Teknisi: <span className="font-bold">{filters.technician}</span>
                                <button onClick={() => handleRemoveFilter('technician')} className="p-0.5 ml-1 rounded-full hover:bg-blue-200 text-blue-500"><CloseIcon className="w-3 h-3" /></button>
                            </span>
                        )}
                        {filters.priority && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-full">
                                Prioritas: <span className="font-bold">{filters.priority}</span>
                                <button onClick={() => handleRemoveFilter('priority')} className="p-0.5 ml-1 rounded-full hover:bg-amber-200 text-amber-500"><CloseIcon className="w-3 h-3" /></button>
                            </span>
                        )}
                        {(filters.startDate || filters.endDate) && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-100 rounded-full">
                                Tanggal: <span className="font-bold">{filters.startDate ? new Date(filters.startDate).toLocaleDateString('id-ID') : '...'} - {filters.endDate ? new Date(filters.endDate).toLocaleDateString('id-ID') : '...'}</span>
                                <button onClick={() => { handleRemoveFilter('startDate'); handleRemoveFilter('endDate'); }} className="p-0.5 ml-1 rounded-full hover:bg-purple-200 text-purple-500"><CloseIcon className="w-3 h-3" /></button>
                            </span>
                        )}
                         <button onClick={handleResetFilters} className="text-xs text-gray-500 hover:text-red-600 hover:underline px-2 py-1">Hapus Semua</button>
                    </div>
                )}
            </div>
            
            <div className="overflow-hidden bg-white border border-gray-200/80 rounded-xl shadow-md">
                <div className="overflow-x-auto custom-scrollbar">
                    {paginatedMaintenances.length > 0 ? (
                        <MaintenanceTable maintenances={paginatedMaintenances} onDetailClick={(m) => { setSelectedMaintenance(m); setView('detail'); }} sortConfig={sortConfig} requestSort={requestSort} />
                    ) : (
                        <div className="py-12 text-center text-gray-500"><InboxIcon className="w-12 h-12 mx-auto text-gray-300" /><p className="mt-2 font-semibold">Tidak ada data maintenance.</p></div>
                    )}
                </div>
                {sortedMaintenances.length > 0 && <PaginationControls currentPage={currentPage} totalPages={totalPages} totalItems={sortedMaintenances.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} startIndex={(currentPage - 1) * itemsPerPage} endIndex={(currentPage - 1) * itemsPerPage + paginatedMaintenances.length} />}
            </div>
        </div>
    );
};

export default MaintenanceFormPage;
