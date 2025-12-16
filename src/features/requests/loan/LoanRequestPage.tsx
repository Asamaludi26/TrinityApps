
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Page, User, Asset, Division, LoanRequest, LoanRequestStatus, ItemStatus, AssetStatus, Handover, AssetCategory, Notification, LoanItem, ParsedScanResult, AssetReturn, AssetReturnStatus } from '../../../types';
import { useSortableData, SortConfig } from '../../../hooks/useSortableData';
import { useNotification } from '../../../providers/NotificationProvider';
import { PaginationControls } from '../../../components/ui/PaginationControls';
import Modal from '../../../components/ui/Modal';
import { InboxIcon } from '../../../components/icons/InboxIcon';
import { SearchIcon } from '../../../components/icons/SearchIcon';
import { SortIcon } from '../../../components/icons/SortIcon';
import { SortAscIcon } from '../../../components/icons/SortAscIcon';
import { SortDescIcon } from '../../../components/icons/SortDescIcon';
import { EyeIcon } from '../../../components/icons/EyeIcon';
import { FilterIcon } from '../../../components/icons/FilterIcon';
import { CloseIcon } from '../../../components/icons/CloseIcon';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import LoanRequestForm from './LoanRequestForm';
import LoanRequestDetailPage from './LoanRequestDetailPage';
import { generateDocumentNumber } from '../../../utils/documentNumberGenerator';

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

const getStatusClass = (status: LoanRequestStatus) => {
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

const getReturnStatusClass = (status: AssetReturnStatus) => {
    switch (status) {
        case AssetReturnStatus.PENDING_APPROVAL: return 'bg-warning-light text-warning-text';
        case AssetReturnStatus.APPROVED: return 'bg-success-light text-success-text';
        case AssetReturnStatus.REJECTED: return 'bg-danger-light text-danger-text';
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
        <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500">
            <button onClick={() => requestSort(columnKey)} className="flex items-center space-x-1 group">
                <span>{children}</span>
                <span className="opacity-50 group-hover:opacity-100">{getSortIcon()}</span>
            </button>
        </th>
    );
};

const LoanRequestTable: React.FC<{ 
    requests: LoanRequest[], 
    onDetailClick: (req: LoanRequest) => void, 
    sortConfig: SortConfig<LoanRequest> | null, 
    requestSort: (key: keyof LoanRequest) => void,
    highlightedId: string | null;
}> = ({ requests, onDetailClick, sortConfig, requestSort, highlightedId }) => (
    <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
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

const ReturnRequestTable: React.FC<{ 
    returns: AssetReturn[], 
    onDetailClick: (ret: AssetReturn) => void,
}> = ({ returns, onDetailClick }) => (
    <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
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
    
    // Filter State
    const initialFilterState = { status: '', division: '' };
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
            
            if (selectedRequest && selectedRequest.id === request.id) {
                 // Force refresh selected
                 setSelectedRequest(prev => prev ? ({...prev, status: isFullyReturned ? LoanRequestStatus.RETURNED : LoanRequestStatus.ON_LOAN, returnedAssetIds: newReturnedIds}) : null);
            }
            
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
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6"><h1 className="text-3xl font-bold text-tm-dark">Request Peminjaman</h1><button onClick={() => setView('form')} className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover">Buat Request Pinjam</button></div>
                
                <div className="mb-6 border-b border-gray-200">
                    <nav className="flex -mb-px space-x-6" aria-label="Tabs">
                        <button onClick={() => setActiveTab('loans')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'loans' ? 'border-tm-primary text-tm-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Request Peminjaman</button>
                        <button onClick={() => setActiveTab('returns')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'returns' ? 'border-tm-primary text-tm-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Request Pengembalian</button>
                    </nav>
                </div>
                
                <div className="p-4 mb-4 bg-white border border-gray-200/80 rounded-xl shadow-md">
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
        </>
    );
};

export default LoanRequestPage;
