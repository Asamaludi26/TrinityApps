
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Page, User, LoanRequest, LoanRequestStatus, ItemStatus, AssetStatus, Handover, AssetCategory, LoanItem, ParsedScanResult, AssetReturnStatus } from '../../../types';
import { useSortableData } from '../../../hooks/useSortableData';
import { useNotification } from '../../../providers/NotificationProvider';
import { PaginationControls } from '../../../components/ui/PaginationControls';
import Modal from '../../../components/ui/Modal';
import { SearchIcon } from '../../../components/icons/SearchIcon';
import { FilterIcon } from '../../../components/icons/FilterIcon';
import { CloseIcon } from '../../../components/icons/CloseIcon';
import { ExportIcon } from '../../../components/icons/ExportIcon'; // Added ExportIcon
import { CustomSelect } from '../../../components/ui/CustomSelect';
import LoanRequestDetailPage from './LoanRequestDetailPage';
import { generateDocumentNumber } from '../../../utils/documentNumberGenerator';
import { exportToCSV } from '../../../utils/csvExporter'; // Added csvExporter

// Components
import { LoanRequestForm } from './components/LoanRequestForm';
import { LoanRequestTable } from './components/LoanRequestTable';
import { ReturnRequestTable } from './components/ReturnRequestTable';
import { ExportLoanRequestModal } from './components/ExportLoanRequestModal'; // Added ExportModal
import DatePicker from '../../../components/ui/DatePicker';

// Stores
import { useRequestStore } from '../../../stores/useRequestStore';
import { useAssetStore } from '../../../stores/useAssetStore';
import { useTransactionStore } from '../../../stores/useTransactionStore';
import { useMasterDataStore } from '../../../stores/useMasterDataStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useNotificationStore } from '../../../stores/useNotificationStore';
import { useUIStore } from '../../../stores/useUIStore';

interface LoanRequestPageProps {
    currentUser: User; // Optional via store
    setActivePage: (page: Page, filters?: any) => void;
    onShowPreview: (data: any) => void;
    onInitiateHandoverFromLoan: (loanRequest: LoanRequest) => void;
    assetCategories: AssetCategory[]; // Optional via store
    setIsGlobalScannerOpen: (isOpen: boolean) => void;
    setScanContext: (context: 'global' | 'form') => void;
    setFormScanCallback: (callback: ((data: ParsedScanResult) => void) | null) => void;
    initialFilters?: any;

    // Legacy props (ignored)
    loanRequests?: any;
    setLoanRequests?: any;
    returns?: any;
    assets?: any;
    setAssets?: any;
    users?: any;
    divisions?: any;
    handovers?: any;
    setHandovers?: any;
    addNotification?: any;
}

const LoanRequestPage: React.FC<LoanRequestPageProps> = (props) => {
    const { currentUser: propUser, onShowPreview, onInitiateHandoverFromLoan, setIsGlobalScannerOpen, setScanContext, setFormScanCallback, initialFilters, setActivePage } = props;
    
    // Store Hooks
    const loanRequests = useRequestStore((state) => state.loanRequests);
    const returns = useRequestStore((state) => state.returns);
    const addLoanRequest = useRequestStore((state) => state.addLoanRequest);
    const updateLoanRequest = useRequestStore((state) => state.updateLoanRequest);
    const fetchRequests = useRequestStore((state) => state.fetchRequests);

    const assets = useAssetStore((state) => state.assets);
    const assetCategories = useAssetStore((state) => state.categories);
    const updateAsset = useAssetStore((state) => state.updateAsset);
    const fetchAssets = useAssetStore((state) => state.fetchAssets);

    const handovers = useTransactionStore((state) => state.handovers);
    const addHandover = useTransactionStore((state) => state.addHandover);
    
    const users = useMasterDataStore((state) => state.users);
    const divisions = useMasterDataStore((state) => state.divisions);
    const addAppNotification = useNotificationStore((state) => state.addSystemNotification);
    
    const storeUser = useAuthStore((state) => state.currentUser);
    const currentUser = storeUser || propUser;
    
    // UI Store for highlight
    const highlightedItemId = useUIStore((state) => state.highlightedItemId);
    const clearHighlightOnReturn = useUIStore((state) => state.clearHighlightOnReturn);
    const [highlightedId, setHighlightedId] = useState<string | null>(null);

    // Initial Data Fetch
    useEffect(() => {
        if (loanRequests.length === 0) fetchRequests();
        if (assets.length === 0) fetchAssets();
    }, []);

    const [view, setView] = useState<'list' | 'form' | 'detail'>('list');
    const [activeTab, setActiveTab] = useState<'loans' | 'returns'>('loans');
    const [selectedRequest, setSelectedRequest] = useState<LoanRequest | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isExportModalOpen, setIsExportModalOpen] = useState(false); // New Export Modal State
    
    // Filter State (Improved)
    const initialFilterState = { status: '', division: '', startDate: null as Date | null, endDate: null as Date | null };
    const [filters, setFilters] = useState(initialFilterState);
    const [tempFilters, setTempFilters] = useState(filters);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const filterPanelRef = useRef<HTMLDivElement>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isLoading, setIsLoading] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

    const addNotificationUI = useNotification();

    // Close Filter Panel on Click Outside
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
        setFilters((prev) => ({ ...prev, [key]: key.includes('Date') ? null : "" }));
        setTempFilters((prev) => ({ ...prev, [key]: key.includes('Date') ? null : "" }));
    };

    const handleExport = (mappedData: any[], filename: string, extraHeader: any) => {
        exportToCSV(mappedData, filename, extraHeader);
    };

    useEffect(() => {
        if (highlightedItemId) {
            setHighlightedId(highlightedItemId);
            clearHighlightOnReturn();
            
            const element = document.getElementById(`request-row-${highlightedItemId}`);
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });

            const timer = setTimeout(() => {
                setHighlightedId(null);
            }, 4000); // Highlight duration: 4 seconds

            return () => clearTimeout(timer);
        }
    }, [highlightedItemId, clearHighlightOnReturn]);

    useEffect(() => {
        if (initialFilters?.openDetailForId) {
            const request = loanRequests.find(req => req.id === initialFilters.openDetailForId);
            if (request) {
                if (initialFilters.preselectReturnAssetId) {
                    setActivePage('return-form', {
                        loanId: request.id,
                        assetId: initialFilters.preselectReturnAssetId
                    });
                } else {
                    setSelectedRequest(request);
                    setView('detail');
                }
            }
        }
    }, [initialFilters, loanRequests, setActivePage]);

    const filteredRequests = useMemo(() => {
        let tempRequests = [...loanRequests];
        if (!['Admin Logistik', 'Super Admin'].includes(currentUser.role)) {
            tempRequests = tempRequests.filter(req => req.requester === currentUser.name);
        }
        return tempRequests
            .filter(req => {
                const searchLower = searchQuery.toLowerCase();
                return req.id.toLowerCase().includes(searchLower) ||
                       req.requester.toLowerCase().includes(searchLower) ||
                       req.items.some(i => i.itemName.toLowerCase().includes(searchLower));
            })
            .filter(req => {
                if (filters.status && req.status !== filters.status) return false;
                if (filters.division && req.division !== filters.division) return false;
                if (filters.startDate) {
                    const start = new Date(filters.startDate); start.setHours(0,0,0,0);
                    const reqDate = new Date(req.requestDate); reqDate.setHours(0,0,0,0);
                    if (reqDate < start) return false;
                }
                if (filters.endDate) {
                    const end = new Date(filters.endDate); end.setHours(23,59,59,999);
                    const reqDate = new Date(req.requestDate);
                    if (reqDate > end) return false;
                }
                return true;
            });
    }, [loanRequests, currentUser, searchQuery, filters]);

    const { items: sortedRequests, requestSort, sortConfig } = useSortableData(filteredRequests, { key: 'requestDate', direction: 'descending' });

    const totalItems = activeTab === 'loans' ? sortedRequests.length : returns.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedRequests = sortedRequests.slice(startIndex, startIndex + itemsPerPage);
    const paginatedReturns = returns.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => { setCurrentPage(1); }, [searchQuery, filters, itemsPerPage, activeTab]);

    const handleCreateRequest = async (data: { loanItems: LoanItem[]; notes: string; }) => {
        // Wrap in Try-Catch for backend integration readiness
        try {
            const userDivision = divisions.find(d => d.id === currentUser.divisionId)?.name || 'N/A';
            const newRequest: LoanRequest = {
                id: `LREQ-${(loanRequests.length + 1).toString().padStart(3, '0')}`,
                requester: currentUser.name,
                division: userDivision,
                requestDate: new Date().toISOString(),
                status: LoanRequestStatus.PENDING,
                items: data.loanItems,
                notes: data.notes,
            };
            
            await addLoanRequest(newRequest);
            
            const adminRecipients = users.filter(u => u.role === 'Admin Logistik' || u.role === 'Super Admin');
            adminRecipients.forEach(admin => {
                addAppNotification({
                    recipientId: admin.id,
                    actorName: currentUser.name,
                    type: 'REQUEST_CREATED',
                    referenceId: newRequest.id,
                    message: `membuat request pinjam baru.`
                });
            });

            addNotificationUI('Permintaan peminjaman berhasil dibuat.', 'success');
            setView('list');
        } catch (error) {
            addNotificationUI('Gagal membuat permintaan. Silakan coba lagi.', 'error');
            console.error(error);
        }
    };

    const handleAssignAndApprove = async (request: LoanRequest, result: { itemStatuses: any, assignedAssetIds: any }) => {
        setIsLoading(true);
        try {
            const { itemStatuses, assignedAssetIds } = result;
            const allStatuses = Object.values(itemStatuses).map((s: any) => s.status);
            const allRejected = allStatuses.every(s => s === 'rejected');
            const newStatus = allRejected ? LoanRequestStatus.REJECTED : LoanRequestStatus.APPROVED;
            
            const updatedRequest: Partial<LoanRequest> = {
                status: newStatus,
                approver: currentUser.name,
                approvalDate: new Date().toISOString(),
                assignedAssetIds,
                itemStatuses,
                rejectionReason: allRejected ? "Semua item ditolak oleh Admin." : undefined
            };

            await updateLoanRequest(request.id, updatedRequest);
            
            // Reflect update in local view if needed
            const fullUpdated = { ...request, ...updatedRequest };
            setSelectedRequest(fullUpdated as LoanRequest);
            
            if (allRejected) {
                addNotificationUI(`Request pinjam ${request.id} telah ditolak sepenuhnya.`, 'warning');
            } else {
                addNotificationUI(`Request pinjam ${request.id} disetujui dengan revisi/penetapan aset.`, 'success');
            }
        } catch (e) {
            addNotificationUI('Gagal memperbarui request.', 'error');
        } finally {
             setIsLoading(false);
        }
    };

    const handleRejection = async () => {
        if (!selectedRequest || !rejectionReason.trim()) {
            addNotificationUI('Alasan penolakan harus diisi.', 'error');
            return;
        }
        setIsLoading(true);
        try {
            await updateLoanRequest(selectedRequest.id, {
                status: LoanRequestStatus.REJECTED,
                approver: currentUser.name,
                approvalDate: new Date().toISOString(),
                rejectionReason: rejectionReason.trim()
            });
            addNotificationUI(`Request pinjam ${selectedRequest.id} ditolak.`, 'warning');
            setIsRejectModalOpen(false);
            setView('list');
        } finally {
             setIsLoading(false);
        }
    };
    
    const handleConfirmReturn = async (request: LoanRequest, assetIds: string[]) => {
        setIsLoading(true);
        try {
            const currentReturnedIds = request.returnedAssetIds || [];
            const newReturnedIds = [...new Set([...currentReturnedIds, ...assetIds])];

            const allAssignedIds = Object.values(request.assignedAssetIds || {}).flat();
            const isFullyReturned = allAssignedIds.every(id => newReturnedIds.includes(id));

            const now = new Date();
            const handoverDate = new Date(); 
            const handoverDocNumber = generateDocumentNumber('HO-RET', handovers, handoverDate);
            const handoverId = `HO-${String(handovers.length + 1).padStart(3, '0')}`;

            // Generate Handover Item
            const returnedAssets = assets.filter(a => assetIds.includes(a.id));
            const handoverItems = returnedAssets.map(asset => ({
                id: Date.now() + Math.random(),
                assetId: asset.id,
                itemName: asset.name,
                itemTypeBrand: asset.brand,
                conditionNotes: asset.condition || 'Dikembalikan dari Peminjaman',
                quantity: 1,
                checked: true,
            }));

            // Create Handover Record
            const newHandover: Handover = {
                id: handoverId,
                docNumber: handoverDocNumber,
                handoverDate: handoverDate.toISOString().split('T')[0],
                menyerahkan: request.requester, // Peminjam mengembalikan
                penerima: currentUser.name, // Admin menerima
                mengetahui: 'N/A', 
                woRoIntNumber: request.id,
                items: handoverItems,
                status: ItemStatus.COMPLETED,
            };

            await addHandover(newHandover);

            await updateLoanRequest(request.id, { 
                status: isFullyReturned ? LoanRequestStatus.RETURNED : LoanRequestStatus.ON_LOAN, 
                actualReturnDate: isFullyReturned ? now.toISOString() : request.actualReturnDate,
                returnedAssetIds: newReturnedIds
            });

            for (const assetId of assetIds) {
                 await updateAsset(assetId, { status: AssetStatus.IN_STORAGE, currentUser: null, location: 'Gudang Inventori' });
            }
            
            addNotificationUI(isFullyReturned ? `Semua aset untuk ${request.id} telah dikembalikan. Handover #${newHandover.docNumber} dibuat.` : `Aset telah dikembalikan. Handover #${newHandover.docNumber} dibuat.`, 'success');
            
            // UX Improvement: Switch to returns tab if fully returned, or just close modal
            setSelectedRequest(null);
            setView('list');
            setActiveTab('returns'); // Auto-switch to returns tab to show the new record
            
        } catch(e) {
             addNotificationUI('Gagal memproses pengembalian.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInitiateReturn = async (request: LoanRequest) => {
        setIsLoading(true);
        try {
            await updateLoanRequest(request.id, { status: LoanRequestStatus.AWAITING_RETURN });
            
            const logisticAdmins = users.filter(u => u.role === 'Admin Logistik');
            logisticAdmins.forEach(admin => {
                addAppNotification({ 
                    recipientId: admin.id,
                    actorName: currentUser.name,
                    type: 'STATUS_CHANGE', // Generic status change for now
                    referenceId: request.id,
                    message: `memulai pengembalian untuk #${request.id}`
                });
            });
            
            addNotificationUI('Proses pengembalian telah dimulai. Admin akan mengkonfirmasi penerimaan aset.', 'success');
            setSelectedRequest(prev => prev ? ({...prev, status: LoanRequestStatus.AWAITING_RETURN}) : null);
        } finally {
            setIsLoading(false);
        }
    };

    const renderContent = () => {
        if (view === 'form') {
            return (
                 <div className="p-4 sm:p-6 md:p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-3xl font-bold text-tm-dark">Buat Request Peminjaman Aset</h1>
                        <button onClick={() => setView('list')} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Kembali</button>
                    </div>
                    <div className="p-4 sm:p-6 bg-white border border-gray-200/80 rounded-xl shadow-md pb-24">
                        <LoanRequestForm 
                            availableAssets={assets.filter(a => a.status === AssetStatus.IN_STORAGE)} 
                            onSave={handleCreateRequest} 
                            onCancel={() => setView('list')} 
                            currentUser={currentUser} 
                            divisions={divisions}
                        />
                    </div>
                </div>
            );
        }
        if (view === 'detail' && selectedRequest) {
            return <LoanRequestDetailPage 
                loanRequest={selectedRequest} 
                currentUser={currentUser} 
                assets={assets} 
                users={users} 
                divisions={divisions} 
                assetCategories={assetCategories}
                onBackToList={() => { setView('list'); setSelectedRequest(null); }} 
                onShowPreview={onShowPreview} 
                onAssignAndApprove={handleAssignAndApprove} 
                onReject={() => setIsRejectModalOpen(true)} 
                onConfirmReturn={handleConfirmReturn} 
                onInitiateReturn={handleInitiateReturn}
                onInitiateHandoverFromLoan={onInitiateHandoverFromLoan} 
                isLoading={isLoading}
                setIsGlobalScannerOpen={setIsGlobalScannerOpen}
                setScanContext={setScanContext}
                setFormScanCallback={setFormScanCallback}
                 />;
        }
        return (
            <div className="p-4 sm:p-6 md:p-8">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6"><h1 className="text-3xl font-bold text-tm-dark">Request Peminjaman</h1>
                {/* Updated Header Buttons with Export */}
                <div className="flex gap-2">
                    {activeTab === 'loans' && (
                        <button onClick={() => setIsExportModalOpen(true)} className="inline-flex items-center justify-center gap-2 px-4 py-2 border rounded-xl bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 shadow-sm transition-all">
                            <ExportIcon className="w-4 h-4"/> Ekspor
                        </button>
                    )}
                    <button onClick={() => setView('form')} className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover">Buat Request Pinjam</button>
                </div>
                </div>
                
                <div className="mb-6 border-b border-gray-200">
                    <nav className="flex -mb-px space-x-6" aria-label="Tabs">
                        <button onClick={() => setActiveTab('loans')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'loans' ? 'border-tm-primary text-tm-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Request Peminjaman</button>
                        <button onClick={() => setActiveTab('returns')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'returns' ? 'border-tm-primary text-tm-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Request Pengembalian</button>
                    </nav>
                </div>
                
                <div className="p-4 mb-4 bg-white border border-gray-200/80 rounded-xl shadow-md space-y-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative flex-grow">
                            <SearchIcon className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 top-1/2 left-3" />
                            <input type="text" placeholder="Cari ID, pemohon, aset..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-10 py-2 pl-10 pr-4 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-tm-accent focus:border-tm-accent" />
                        </div>
                        {activeTab === 'loans' && (
                            <div className="relative" ref={filterPanelRef}>
                                <button
                                    onClick={() => { setTempFilters(filters); setIsFilterPanelOpen(p => !p); }}
                                    className="inline-flex items-center justify-center gap-2 w-full h-10 px-4 text-sm font-semibold text-gray-700 transition-all duration-200 bg-white border border-gray-300 rounded-lg shadow-sm sm:w-auto hover:bg-gray-50"
                                >
                                    <FilterIcon className="w-4 h-4" /> <span>Filter</span> {activeFilterCount > 0 && <span className="px-2 py-0.5 text-xs font-bold text-white rounded-full bg-tm-primary">{activeFilterCount}</span>}
                                </button>
                                {isFilterPanelOpen && (
                                    <>
                                        <div onClick={() => setIsFilterPanelOpen(false)} className="fixed inset-0 z-20 bg-black/25 sm:hidden" />
                                        <div className="fixed top-32 inset-x-4 z-30 origin-top rounded-xl border border-gray-200 bg-white shadow-lg sm:absolute sm:top-full sm:inset-x-auto sm:right-0 sm:mt-2 sm:w-72">
                                            <div className="flex items-center justify-between p-4 border-b">
                                                <h3 className="text-lg font-semibold text-gray-800">Filter</h3>
                                                <button onClick={() => setIsFilterPanelOpen(false)} className="p-1 text-gray-400 rounded-full hover:bg-gray-100"><CloseIcon className="w-5 h-5"/></button>
                                            </div>
                                            <div className="p-4 space-y-4">
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                                                    <CustomSelect 
                                                        options={[{ value: '', label: 'Semua Status' }, ...Object.values(LoanRequestStatus).map(s => ({ value: s, label: s }))]} 
                                                        value={tempFilters.status} 
                                                        onChange={v => setTempFilters(f => ({ ...f, status: v }))} 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Divisi</label>
                                                    <CustomSelect 
                                                        options={[{ value: '', label: 'Semua Divisi' }, ...divisions.map(d => ({ value: d.name, label: d.name }))]} 
                                                        value={tempFilters.division} 
                                                        onChange={v => setTempFilters(f => ({ ...f, division: v }))} 
                                                    />
                                                </div>
                                                 <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Periode Pengajuan</label>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <DatePicker 
                                                                id="filter-start-date" 
                                                                selectedDate={tempFilters.startDate} 
                                                                onDateChange={(date) => setTempFilters(f => ({ ...f, startDate: date }))} 
                                                            />
                                                        </div>
                                                        <div>
                                                            <DatePicker 
                                                                id="filter-end-date" 
                                                                selectedDate={tempFilters.endDate} 
                                                                onDateChange={(date) => setTempFilters(f => ({ ...f, endDate: date }))} 
                                                            />
                                                        </div>
                                                    </div>
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
                        )}
                    </div>
                    {/* Active Filters Display */}
                    {activeTab === 'loans' && activeFilterCount > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 animate-fade-in-up">
                            {filters.status && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-full">
                                    Status: <span className="font-bold">{filters.status}</span>
                                    <button onClick={() => handleRemoveFilter('status')} className="p-0.5 ml-1 rounded-full hover:bg-blue-200 text-blue-500"><CloseIcon className="w-3 h-3" /></button>
                                </span>
                            )}
                            {filters.division && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-100 rounded-full">
                                    Divisi: <span className="font-bold">{filters.division}</span>
                                    <button onClick={() => handleRemoveFilter('division')} className="p-0.5 ml-1 rounded-full hover:bg-orange-200 text-orange-500"><CloseIcon className="w-3 h-3" /></button>
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
                        {activeTab === 'loans' ? (
                            <LoanRequestTable requests={paginatedRequests} onDetailClick={(req) => { setSelectedRequest(req); setView('detail'); }} sortConfig={sortConfig} requestSort={requestSort} highlightedId={highlightedId} />
                        ) : (
                            <ReturnRequestTable returns={paginatedReturns} onDetailClick={(ret) => setActivePage('return-detail', { returnId: ret.id })} />
                        )}
                    </div>
                    <PaginationControls currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} startIndex={startIndex} endIndex={startIndex + (activeTab === 'loans' ? paginatedRequests.length : paginatedReturns.length)} />
                </div>
            </div>
        );
    };

    return (
        <>
            {renderContent()}
            
            <Modal isOpen={isRejectModalOpen} onClose={() => setIsRejectModalOpen(false)} title="Tolak Permintaan Pinjam">
                <div className="space-y-4"><p className="text-sm text-gray-600">Alasan penolakan untuk <strong className="font-semibold">{selectedRequest?.id}</strong>.</p><textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={3} className="w-full text-sm border-gray-300 rounded-md focus:ring-tm-accent focus:border-tm-accent " placeholder="Contoh: Aset tidak tersedia..."></textarea></div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t"><button onClick={() => setIsRejectModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button><button onClick={handleRejection} disabled={isLoading || !rejectionReason.trim()} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-danger rounded-lg shadow-sm hover:bg-red-700">Konfirmasi Tolak</button></div>
            </Modal>

            {isExportModalOpen && (
                <ExportLoanRequestModal 
                    isOpen={true} 
                    onClose={() => setIsExportModalOpen(false)} 
                    currentUser={currentUser} 
                    data={sortedRequests} 
                    onConfirmExport={handleExport} 
                />
            )}
        </>
    );
};

export default LoanRequestPage;
