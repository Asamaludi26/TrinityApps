
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Customer, CustomerStatus, Asset, User, PreviewData, Page } from '../../../types';
import { useSortableData } from '../../../hooks/useSortableData';
import { useLongPress } from '../../../hooks/useLongPress';
import { useNotification } from '../../../providers/NotificationProvider';
import { exportToCSV } from '../../../utils/csvExporter';
import { SortIcon } from '../../../components/icons/SortIcon';
import { SortAscIcon } from '../../../components/icons/SortAscIcon';
import { SortDescIcon } from '../../../components/icons/SortDescIcon';
import { SearchIcon } from '../../../components/icons/SearchIcon';
import { CloseIcon } from '../../../components/icons/CloseIcon';
import { Checkbox } from '../../../components/ui/Checkbox';
import { PaginationControls } from '../../../components/ui/PaginationControls';
import Modal from '../../../components/ui/Modal';
import { InboxIcon } from '../../../components/icons/InboxIcon';
import { ExportIcon } from '../../../components/icons/ExportIcon';
import { EyeIcon } from '../../../components/icons/EyeIcon';
import { TrashIcon } from '../../../components/icons/TrashIcon';
import { SpinnerIcon } from '../../../components/icons/SpinnerIcon';
import { PencilIcon } from '../../../components/icons/PencilIcon';
import { ExclamationTriangleIcon } from '../../../components/icons/ExclamationTriangleIcon';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import { UsersIcon } from '../../../components/icons/UsersIcon';
import { FilterIcon } from '../../../components/icons/FilterIcon';
import { CheckIcon } from '../../../components/icons/CheckIcon';
import { SummaryCard } from '../../dashboard/components/SummaryCard';

// Stores
import { useMasterDataStore } from '../../../stores/useMasterDataStore';
import { useAssetStore } from '../../../stores/useAssetStore';

interface CustomerListPageProps {
    currentUser: User;
    // Legacy props kept for signature compatibility
    customers?: Customer[];
    setCustomers?: any;
    assets?: Asset[];
    
    onInitiateDismantle: (asset: Asset) => void;
    onShowPreview: (data: PreviewData) => void;
    setActivePage: (page: Page, filters?: any) => void;
    initialFilters?: any;
}

export const getStatusClass = (status: CustomerStatus) => {
    switch (status) {
        case CustomerStatus.ACTIVE: return 'bg-success-light text-success-text';
        case CustomerStatus.INACTIVE: return 'bg-gray-200 text-gray-800';
        case CustomerStatus.SUSPENDED: return 'bg-warning-light text-warning-text';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const CustomerListPage: React.FC<CustomerListPageProps> = ({ currentUser, onShowPreview, setActivePage, initialFilters }) => {
    // Store Hooks
    const customers = useMasterDataStore((state) => state.customers);
    const deleteCustomer = useMasterDataStore((state) => state.deleteCustomer);
    const updateCustomer = useMasterDataStore((state) => state.updateCustomer);
    const fetchMasterData = useMasterDataStore((state) => state.fetchMasterData);

    const assets = useAssetStore((state) => state.assets);
    const fetchAssets = useAssetStore((state) => state.fetchAssets);

    useEffect(() => {
        if (customers.length === 0) fetchMasterData();
        if (assets.length === 0) fetchAssets();
    }, []);

    const [searchQuery, setSearchQuery] = useState('');
    const initialFilterState = { status: '', servicePackage: '' };
    const [filters, setFilters] = useState(initialFilterState);
    const [tempFilters, setTempFilters] = useState(filters);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const filterPanelRef = useRef<HTMLDivElement>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
    const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
    
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
    const [targetStatus, setTargetStatus] = useState<CustomerStatus>(CustomerStatus.ACTIVE);
    const [isLoading, setIsLoading] = useState(false);

    const addNotification = useNotification();
    
    const { items: sortedCustomers, requestSort, sortConfig } = useSortableData<Customer>(customers, { key: 'name', direction: 'ascending' });

    useEffect(() => {
        if (initialFilters?.openEditFormFor) {
            setActivePage('customer-edit', { customerId: initialFilters.openEditFormFor });
        }
    }, [initialFilters, setActivePage]);

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
        setFilters((prev) => ({ ...prev, [key]: "" }));
        setTempFilters((prev) => ({ ...prev, [key]: "" }));
    };

    // Extract unique service packages for filter options
    const servicePackageOptions = useMemo(() => {
        // Fix: Explicitly type uniquePackages as string array to prevent 'unknown' type inference in CustomSelect options.
        const uniquePackages: string[] = Array.from(new Set(customers.map(c => c.servicePackage).filter(Boolean)));
        return uniquePackages.map(pkg => ({ value: pkg, label: pkg }));
    }, [customers]);

    const summary = useMemo(() => {
        const counts = {
            [CustomerStatus.ACTIVE]: 0,
            [CustomerStatus.INACTIVE]: 0,
            [CustomerStatus.SUSPENDED]: 0,
        };
        customers.forEach(customer => {
            if (counts[customer.status] !== undefined) {
                counts[customer.status]++;
            }
        });
        return {
            active: counts[CustomerStatus.ACTIVE],
            inactive: counts[CustomerStatus.INACTIVE],
            suspended: counts[CustomerStatus.SUSPENDED],
            total: customers.length,
        };
    }, [customers]);

    const filteredCustomers = useMemo(() => {
        return sortedCustomers
            .filter(c => {
                const searchLower = searchQuery.toLowerCase();
                return (
                    c.id.toLowerCase().includes(searchLower) ||
                    c.name.toLowerCase().includes(searchLower) ||
                    c.address.toLowerCase().includes(searchLower)
                );
            })
            .filter(c => {
                const matchStatus = filters.status ? c.status === filters.status : true;
                const matchPackage = filters.servicePackage ? c.servicePackage === filters.servicePackage : true;
                return matchStatus && matchPackage;
            });
    }, [sortedCustomers, searchQuery, filters]);
    
    const totalItems = filteredCustomers.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

    useEffect(() => { setCurrentPage(1); }, [searchQuery, filters, itemsPerPage]);
    
    const { deletableCustomersCount, skippableCustomersCount } = useMemo(() => {
        if (!isBulkDeleteModalOpen) return { deletableCustomersCount: 0, skippableCustomersCount: 0 };
        
        const deletableIds = selectedCustomerIds.filter(id => !assets.some(a => a.currentUser === id));
        return {
            deletableCustomersCount: deletableIds.length,
            skippableCustomersCount: selectedCustomerIds.length - deletableIds.length,
        };
    }, [isBulkDeleteModalOpen, selectedCustomerIds, assets]);
    
    const handleConfirmDelete = async () => {
        if (!customerToDelete) return;

        const hasAssets = assets.some(a => a.currentUser === customerToDelete.id);
        if (hasAssets) {
            addNotification('Pelanggan tidak dapat dihapus karena masih memiliki aset terpasang.', 'error');
            setCustomerToDelete(null);
            return;
        }

        setIsLoading(true);
        try {
            await deleteCustomer(customerToDelete.id);
            addNotification(`Pelanggan ${customerToDelete.name} berhasil dihapus.`, 'success');
        } catch (e) {
            addNotification('Gagal menghapus pelanggan.', 'error');
        } finally {
            setCustomerToDelete(null);
            setIsLoading(false);
        }
    };
    
     const handleBulkDelete = async () => {
        const deletableCustomerIds = selectedCustomerIds.filter(id => !assets.some(a => a.currentUser === id));

        if (deletableCustomerIds.length === 0) {
            addNotification('Tidak ada pelanggan yang dapat dihapus (semua memiliki aset terpasang).', 'error');
            setIsBulkDeleteModalOpen(false);
            return;
        }
        
        setIsLoading(true);
        try {
            for (const id of deletableCustomerIds) {
                await deleteCustomer(id);
            }
            
            let message = `${deletableCustomerIds.length} pelanggan berhasil dihapus.`;
            if (skippableCustomersCount > 0) {
                message += ` ${skippableCustomersCount} pelanggan dilewati karena memiliki aset.`;
            }
            addNotification(message, 'success');

            setIsBulkDeleteModalOpen(false);
            setSelectedCustomerIds([]);
            setIsBulkSelectMode(false);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleBulkStatusChange = async () => {
        setIsLoading(true);
        try {
            for (const id of selectedCustomerIds) {
                await updateCustomer(id, { status: targetStatus });
            }
            addNotification(`${selectedCustomerIds.length} pelanggan diubah statusnya menjadi "${targetStatus}".`, 'success');
            setIsBulkStatusModalOpen(false);
            setSelectedCustomerIds([]);
            setIsBulkSelectMode(false);
        } catch (e) {
            addNotification('Gagal mengubah status pelanggan.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (currentUser.role === 'Staff') {
        return (
            <div className="flex items-center justify-center h-full p-8 text-center">
                <div>
                    <h1 className="text-2xl font-bold text-danger-text">Akses Ditolak</h1>
                    <p className="mt-2 text-gray-600">Anda tidak memiliki izin untuk mengakses halaman ini. Silakan hubungi administrator.</p>
                </div>
            </div>
        );
    }
    
    const longPressHandlers = useLongPress(() => setIsBulkSelectMode(true), 500);

    return (
        <>
             <div className="p-4 sm:p-6 md:p-8">
                <div className="flex flex-col items-start justify-between gap-4 mb-6 md:flex-row md:items-center">
                    <h1 className="text-3xl font-bold text-tm-dark">Daftar Pelanggan</h1>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => exportToCSV(customers, 'daftar_pelanggan.csv')} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border rounded-lg shadow-sm hover:bg-gray-50">
                            <ExportIcon className="w-4 h-4" /> Export CSV
                        </button>
                        <button onClick={() => setActivePage('customer-new')} className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover">
                            Tambah Pelanggan
                        </button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 gap-5 mb-6 sm:grid-cols-2 lg:grid-cols-4">
                    <SummaryCard title="Total Pelanggan" value={summary.total} icon={UsersIcon} color="blue" isActive={filters.status === ''} onClick={() => { const newStatus = ''; setFilters(f => ({ ...f, status: newStatus })); setTempFilters(f => ({ ...f, status: newStatus })); }} />
                    <SummaryCard title="Pelanggan Aktif" value={summary.active} icon={CheckIcon} color="green" isActive={filters.status === CustomerStatus.ACTIVE} onClick={() => { const newStatus = CustomerStatus.ACTIVE; setFilters(f => ({ ...f, status: newStatus })); setTempFilters(f => ({ ...f, status: newStatus })); }} />
                    <SummaryCard title="Pelanggan Suspend" value={summary.suspended} icon={ExclamationTriangleIcon} color="amber" isActive={filters.status === CustomerStatus.SUSPENDED} onClick={() => { const newStatus = CustomerStatus.SUSPENDED; setFilters(f => ({ ...f, status: newStatus })); setTempFilters(f => ({ ...f, status: newStatus })); }} />
                    <SummaryCard title="Pelanggan Tidak Aktif" value={summary.inactive} icon={CloseIcon} color="gray" isActive={filters.status === CustomerStatus.INACTIVE} onClick={() => { const newStatus = CustomerStatus.INACTIVE; setFilters(f => ({ ...f, status: newStatus })); setTempFilters(f => ({ ...f, status: newStatus })); }} />
                </div>

                <div className="p-4 mb-4 bg-white border border-gray-200/80 rounded-xl shadow-md">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative flex-grow">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"> <SearchIcon className="w-5 h-5 text-gray-400" /> </div>
                            <input type="text" placeholder="Cari ID, Nama, Alamat..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-10 py-2 pl-10 pr-4 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-tm-accent focus:border-tm-accent" />
                        </div>
                        <div className="relative" ref={filterPanelRef}>
                           {/* Filter button logic */}
                           <button
                                onClick={() => { setTempFilters(filters); setIsFilterPanelOpen(p => !p); }}
                                className={`inline-flex items-center justify-center gap-2 w-full h-10 px-4 text-sm font-semibold transition-all duration-200 border rounded-lg shadow-sm sm:w-auto 
                                    ${activeFilterCount > 0 ? 'bg-tm-light border-tm-accent text-tm-primary' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}
                                `}
                            >
                                <FilterIcon className="w-4 h-4" /> <span>Filter</span> {activeFilterCount > 0 && <span className="px-2 py-0.5 text-xs font-bold text-white rounded-full bg-tm-primary">{activeFilterCount}</span>}
                            </button>
                            {isFilterPanelOpen && (
                                <>
                                    <div onClick={() => setIsFilterPanelOpen(false)} className="fixed inset-0 z-20 bg-black/25 sm:hidden" />
                                    <div className="fixed top-32 inset-x-4 z-30 origin-top rounded-xl border border-gray-200 bg-white shadow-lg sm:absolute sm:top-full sm:inset-x-auto sm:right-0 sm:mt-2 sm:w-72">
                                        <div className="flex items-center justify-between p-4 border-b">
                                            <h3 className="text-lg font-semibold text-gray-800">Filter Pelanggan</h3>
                                            <button onClick={() => setIsFilterPanelOpen(false)} className="p-1 text-gray-400 rounded-full hover:bg-gray-100"><CloseIcon className="w-5 h-5"/></button>
                                        </div>
                                        <div className="p-4 space-y-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                                                <CustomSelect options={[{value: '', label: 'Semua Status'}, ...Object.values(CustomerStatus).map(s => ({value: s, label: s}))]} value={tempFilters.status} onChange={v => setTempFilters(f => ({...f, status: v}))} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Paket Layanan</label>
                                                <CustomSelect options={[{value: '', label: 'Semua Paket'}, ...servicePackageOptions]} value={tempFilters.servicePackage} onChange={v => setTempFilters(f => ({...f, servicePackage: v}))} />
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

                    {/* Active Filter Chips */}
                    {activeFilterCount > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 animate-fade-in-up mt-3">
                            {filters.status && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-full">
                                    Status: <span className="font-bold">{filters.status}</span>
                                    <button onClick={() => handleRemoveFilter('status')} className="p-0.5 ml-1 rounded-full hover:bg-blue-200 text-blue-500"><CloseIcon className="w-3 h-3" /></button>
                                </span>
                            )}
                            {filters.servicePackage && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-100 rounded-full">
                                    Paket: <span className="font-bold">{filters.servicePackage}</span>
                                    <button onClick={() => handleRemoveFilter('servicePackage')} className="p-0.5 ml-1 rounded-full hover:bg-purple-200 text-purple-500"><CloseIcon className="w-3 h-3" /></button>
                                </span>
                            )}
                            <button onClick={handleResetFilters} className="text-xs text-gray-500 hover:text-red-600 hover:underline px-2 py-1">Hapus Semua</button>
                        </div>
                    )}
                </div>

                {isBulkSelectMode && (
                    <div className="p-4 mb-4 bg-blue-50 border-l-4 border-tm-accent rounded-r-lg">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="text-sm font-medium text-tm-primary">{selectedCustomerIds.length} pelanggan terpilih</span>
                                <div className="h-5 border-l border-gray-300"></div>
                                <button onClick={() => setIsBulkStatusModalOpen(true)} className="px-3 py-1.5 text-sm font-semibold text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200">Ubah Status</button>
                                <button onClick={() => setIsBulkDeleteModalOpen(true)} className="px-3 py-1.5 text-sm font-semibold text-red-600 bg-red-100 rounded-md hover:bg-red-200">Hapus</button>
                            </div>
                            <button onClick={() => { setIsBulkSelectMode(false); setSelectedCustomerIds([]); }} className="px-3 py-1.5 text-sm font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Batal</button>
                        </div>
                    </div>
                )}


                <div className="overflow-hidden bg-white border border-gray-200/80 rounded-xl shadow-md">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="min-w-full divide-y divide-gray-200">
                             <thead className="bg-gray-50">
                                <tr>
                                    {/* FIX: Correctly reference 'c.id' in the bulk select checkbox map handler to avoid 'id' not found error. */}
                                    {isBulkSelectMode && <th className="px-6 py-3"><Checkbox checked={selectedCustomerIds.length > 0 && selectedCustomerIds.length === paginatedCustomers.length} onChange={e => setSelectedCustomerIds(e.target.checked ? paginatedCustomers.map(c => c.id) : [])} /></th>}
                                    <th className="px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500">Pelanggan</th>
                                    <th className="px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500">Kontak</th>
                                    <th className="px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500">Paket</th>
                                    <th className="px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500">Jumlah Aset</th>
                                    <th className="px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500">Status</th>
                                    <th className="relative px-6 py-3"><span className="sr-only">Aksi</span></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {paginatedCustomers.map(customer => {
                                    const assetCount = assets.filter(a => a.currentUser === customer.id).length;
                                    return (
                                    <tr key={customer.id} {...longPressHandlers} onClick={() => isBulkSelectMode ? setSelectedCustomerIds(prev => prev.includes(customer.id) ? prev.filter(id => id !== customer.id) : [...prev, customer.id]) : onShowPreview({ type: 'customer', id: customer.id })} className={`cursor-pointer transition-colors ${selectedCustomerIds.includes(customer.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                                        {isBulkSelectMode && <td className="px-6 py-4" onClick={e => e.stopPropagation()}><Checkbox checked={selectedCustomerIds.includes(customer.id)} onChange={() => setSelectedCustomerIds(prev => prev.includes(customer.id) ? prev.filter(id => id !== customer.id) : [...prev, customer.id])} /></td>}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-semibold text-gray-900">{customer.name}</div>
                                            <div className="text-xs text-gray-500">{customer.id}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-800">{customer.phone}</div>
                                            <div className="text-xs text-gray-500">{customer.address}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-800 font-medium">{customer.servicePackage}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-center text-gray-800 whitespace-nowrap">
                                            {assetCount > 0 ? (
                                                <button onClick={(e) => { e.stopPropagation(); onShowPreview({type: 'customerAssets', id: customer.id})}} className="font-semibold text-tm-primary hover:underline">{assetCount}</button>
                                            ) : (
                                                <span>{assetCount}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap"> <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(customer.status)}`}> {customer.status} </span> </td>
                                        <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button onClick={(e) => { e.stopPropagation(); onShowPreview({ type: 'customer', id: customer.id }); }} className="flex items-center justify-center w-8 h-8 text-gray-500 transition-colors bg-gray-100 rounded-full hover:bg-info-light hover:text-info-text"><EyeIcon className="w-5 h-5" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); setActivePage('customer-edit', { customerId: customer.id }); }} className="flex items-center justify-center w-8 h-8 text-gray-500 transition-colors bg-gray-100 rounded-full hover:bg-yellow-100 hover:text-yellow-600"><PencilIcon className="w-4 h-4" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); setCustomerToDelete(customer); }} className="flex items-center justify-center w-8 h-8 text-gray-500 transition-colors bg-gray-100 rounded-full hover:bg-danger-light hover:text-danger-text"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                    <PaginationControls currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} startIndex={startIndex} endIndex={endIndex} />
                </div>
            </div>

            <Modal isOpen={!!customerToDelete} onClose={() => setCustomerToDelete(null)} title="Konfirmasi Hapus" footerContent={<><button onClick={() => setCustomerToDelete(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button><button onClick={handleConfirmDelete} disabled={isLoading} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-danger rounded-lg shadow-sm hover:bg-red-700">{isLoading && <SpinnerIcon className="w-4 h-4 mr-2"/>}Konfirmasi Hapus</button></>}>
                <p className="text-sm text-gray-600">Anda yakin ingin menghapus <strong>{customerToDelete?.name}</strong>? Aksi ini tidak dapat diurungkan.</p>
            </Modal>

            <Modal isOpen={isBulkDeleteModalOpen} onClose={() => setIsBulkDeleteModalOpen(false)} title="Konfirmasi Hapus Pelanggan Massal" size="md" hideDefaultCloseButton>
                <div className="flex flex-col items-center text-center">
                    <div className="flex items-center justify-center w-12 h-12 mb-4 text-red-600 bg-red-100 rounded-full">
                        <ExclamationTriangleIcon className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800"> Hapus {deletableCustomersCount} Pelanggan? </h3>
                    <p className="mt-2 text-sm text-gray-600"> Anda akan menghapus pelanggan yang dipilih secara permanen. Aksi ini tidak dapat diurungkan. </p>
                    <div className="w-full p-3 mt-4 text-sm text-left bg-gray-50 border rounded-lg">
                        <div className="flex justify-between"> <span className="text-gray-600">Total Pelanggan Dipilih:</span> <span className="font-semibold text-gray-800">{selectedCustomerIds.length}</span> </div>
                        <div className="flex justify-between mt-1 text-green-700"> <span className="font-medium">Akan Dihapus:</span> <span className="font-bold">{deletableCustomersCount}</span> </div>
                        <div className="flex justify-between mt-1 text-amber-700"> <span className="font-medium">Dilewati (memiliki aset):</span> <span className="font-bold">{skippableCustomersCount}</span> </div>
                    </div>
                    {deletableCustomersCount === 0 && skippableCustomersCount > 0 && ( <p className="mt-4 text-sm font-semibold text-red-700"> Tidak ada pelanggan yang dapat dihapus. Semua pelanggan yang dipilih memiliki aset terpasang. </p> )}
                </div>
                 <div className="flex items-center justify-end pt-5 mt-5 space-x-3 border-t">
                    <button type="button" onClick={() => setIsBulkDeleteModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
                    <button type="button" onClick={handleBulkDelete} disabled={isLoading || deletableCustomersCount === 0} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-danger rounded-lg shadow-sm hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed"> {isLoading && <SpinnerIcon className="w-4 h-4 mr-2"/>} Ya, Hapus ({deletableCustomersCount}) Pelanggan </button>
                </div>
            </Modal>

            <Modal isOpen={isBulkStatusModalOpen} onClose={() => setIsBulkStatusModalOpen(false)} title="Ubah Status Pelanggan" footerContent={<><button onClick={() => setIsBulkStatusModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button><button onClick={handleBulkStatusChange} disabled={isLoading} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover">{isLoading && <SpinnerIcon className="w-4 h-4 mr-2"/>}Ubah Status</button></>}>
                <p className="mb-4 text-sm text-gray-600">Pilih status baru untuk <strong>{selectedCustomerIds.length}</strong> pelanggan yang dipilih.</p>
                <CustomSelect
                    options={Object.values(CustomerStatus).map(s => ({ value: s, label: s }))}
                    value={targetStatus}
                    onChange={value => setTargetStatus(value as CustomerStatus)}
                />
            </Modal>
        </>
    );
};

export default CustomerListPage;
