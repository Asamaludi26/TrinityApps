
import React, { useState, useEffect, useMemo } from 'react';
// FIX: Add AssetCondition to imports to resolve type error on line 230.
import { Page, User, LoanRequest, LoanRequestStatus, ItemStatus, AssetStatus, Handover, AssetCategory, LoanItem, ParsedScanResult, AssetReturn, AssetReturnStatus, AssetCondition } from '../../../types';
import { useNotification } from '../../../providers/NotificationProvider';
import Modal from '../../../components/ui/Modal';
import { generateDocumentNumber } from '../../../utils/documentNumberGenerator';

// Components
import { LoanRequestForm } from './components/LoanRequestForm';
import LoanRequestDetailPage from './LoanRequestDetailPage';
import { LoanRequestListView } from './components/LoanRequestListView';
import { ReturnRequestListView } from './components/ReturnRequestListView';

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
    const approveLoanRequest = useRequestStore((state) => state.approveLoanRequest); 
    const fetchRequests = useRequestStore((state) => state.fetchRequests);

    const assets = useAssetStore((state) => state.assets);
    const assetCategories = useAssetStore((state) => state.categories);
    const fetchAssets = useAssetStore((state) => state.fetchAssets);
    
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
    
    // UI States managed here for Actions
    const [isLoading, setIsLoading] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

    const addNotificationUI = useNotification();

    // Highlight Logic
    useEffect(() => {
        if (highlightedItemId) {
            setHighlightedId(highlightedItemId);
            // Switch to the correct tab if highlighting a return
            if (highlightedItemId.startsWith('RET-')) {
                setActiveTab('returns');
            }
            clearHighlightOnReturn();
            
            const element = document.getElementById(`request-row-${highlightedItemId}`);
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });

            const timer = setTimeout(() => {
                setHighlightedId(null);
            }, 4000); // Highlight duration: 4 seconds

            return () => clearTimeout(timer);
        }
    }, [highlightedItemId, clearHighlightOnReturn]);

    // Deep Linking via Filters
    useEffect(() => {
        if (initialFilters?.openDetailForId) {
            if (initialFilters.openDetailForId.startsWith('LREQ-')) {
                const request = loanRequests.find(req => req.id === initialFilters.openDetailForId);
                if (request) {
                    setSelectedRequest(request);
                    setView('detail');
                }
            }
        }
    }, [initialFilters, loanRequests]);


    // --- ACTION HANDLERS ---

    const handleCreateRequest = async (data: { loanItems: LoanItem[]; notes: string; }) => {
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
            await approveLoanRequest(request.id, {
                approver: currentUser.name,
                approvalDate: new Date().toISOString(),
                assignedAssetIds: result.assignedAssetIds,
                itemStatuses: result.itemStatuses
            });
            
            const updatedReq = useRequestStore.getState().loanRequests.find(r => r.id === request.id);
            if (updatedReq) setSelectedRequest(updatedReq);
            
            const allStatuses = Object.values(result.itemStatuses).map((s: any) => s.status);
            const allRejected = allStatuses.every(s => s === 'rejected');
            
            if (allRejected) {
                addNotificationUI(`Request pinjam ${request.id} telah ditolak sepenuhnya.`, 'warning');
            } else {
                addNotificationUI(`Request pinjam ${request.id} disetujui. Aset telah dialokasikan.`, 'success');
            }
        } catch (e: any) {
            console.error(e);
            addNotificationUI(e.message || 'Gagal memperbarui request.', 'error');
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
                onInitiateHandoverFromLoan={onInitiateHandoverFromLoan} 
                isLoading={isLoading}
                setIsGlobalScannerOpen={setIsGlobalScannerOpen}
                setScanContext={setScanContext}
                setFormScanCallback={setFormScanCallback}
                setActivePage={setActivePage} 
                 />;
        }
        
        // REFACTORED LIST VIEW WITH TABS
        return (
            <div className="p-4 sm:p-6 md:p-8">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                    <h1 className="text-3xl font-bold text-tm-dark">Request Peminjaman & Pengembalian</h1>
                    <button onClick={() => setView('form')} className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover">
                        Buat Request Pinjam
                    </button>
                </div>
                
                <div className="mb-6 border-b border-gray-200">
                    <nav className="flex -mb-px space-x-6" aria-label="Tabs">
                        <button onClick={() => setActiveTab('loans')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'loans' ? 'border-tm-primary text-tm-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Request Peminjaman</button>
                        <button onClick={() => setActiveTab('returns')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'returns' ? 'border-tm-primary text-tm-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Request Pengembalian</button>
                    </nav>
                </div>

                {activeTab === 'loans' ? (
                    <LoanRequestListView 
                        currentUser={currentUser}
                        loanRequests={loanRequests}
                        divisions={divisions}
                        setActivePage={setActivePage}
                        onDetailClick={(req) => { setSelectedRequest(req); setView('detail'); }}
                        highlightedId={highlightedId}
                    />
                ) : (
                    <ReturnRequestListView 
                        currentUser={currentUser}
                        returns={returns}
                        divisions={divisions}
                        onDetailClick={(ret) => setActivePage('return-detail', { returnId: ret.id })}
                    />
                )}
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
