
import React, { useState, useEffect } from 'react';
import { Page, User, LoanRequest, LoanRequestStatus, ItemStatus, AssetStatus, Handover, AssetCategory, LoanItem, ParsedScanResult } from '../../../types';
import { useNotification } from '../../../providers/NotificationProvider';
import Modal from '../../../components/ui/Modal';
import { generateDocumentNumber } from '../../../utils/documentNumberGenerator';

// Components
import { LoanRequestForm } from './components/LoanRequestForm';
import LoanRequestDetailPage from './LoanRequestDetailPage';
import { LoanRequestListView } from './components/LoanRequestListView'; // IMPORTED NEW COMPONENT

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


    // --- ACTION HANDLERS ---

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

            // FIX: Prevent double booking by immediately setting assets to IN_USE/BOOKED
            if (!allRejected && assignedAssetIds) {
                const allAssignedIds = Object.values(assignedAssetIds).flat() as string[];
                // Update assets in parallel
                const assetUpdatePromises = allAssignedIds.map(assetId => 
                    updateAsset(assetId, { 
                        status: AssetStatus.IN_USE,
                        currentUser: request.requester,
                        location: `Dipinjam oleh ${request.requester}`
                    })
                );
                await Promise.all(assetUpdatePromises);
                await fetchAssets(); // Refresh local asset state
            }
            
            // Reflect update in local view if needed
            const fullUpdated = { ...request, ...updatedRequest };
            setSelectedRequest(fullUpdated as LoanRequest);
            
            if (allRejected) {
                addNotificationUI(`Request pinjam ${request.id} telah ditolak sepenuhnya.`, 'warning');
            } else {
                addNotificationUI(`Request pinjam ${request.id} disetujui. Aset telah dialokasikan.`, 'success');
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
            // Check full return based on ALL assigned ids against merged returned IDs
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
                // Preservation Logic:
                // Jika status aset saat ini 'AWAITING_RETURN', kemungkinan besar user sudah mengisi form pengembalian
                // dengan kondisi tertentu. Di backend nanti, kita harus mengambil kondisi tersebut dari dokumen AssetReturn terkait.
                // Untuk Frontend Mock: Kita cek apakah kondisi sudah berubah (misal user set ke rusak di form pengembalian).
                // Jika masih IN_USE, default ke kondisi lama.
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
                // If fully returned, status is RETURNED. If partial, revert to ON_LOAN (active)
                status: isFullyReturned ? LoanRequestStatus.RETURNED : LoanRequestStatus.ON_LOAN, 
                actualReturnDate: isFullyReturned ? now.toISOString() : request.actualReturnDate,
                returnedAssetIds: newReturnedIds
            });

            // Update Asset Statuses (Optimized with Promise.all)
            const updatePromises = assetIds.map(assetId => {
                // Fetch latest state to be sure
                const currentAsset = assets.find(a => a.id === assetId);
                const targetStatus = (currentAsset?.status === AssetStatus.DAMAGED) 
                    ? AssetStatus.DAMAGED 
                    : AssetStatus.IN_STORAGE;

                return updateAsset(assetId, { 
                    status: targetStatus, 
                    currentUser: null, 
                    location: 'Gudang Inventori' 
                });
            });

            await Promise.all(updatePromises);
            
            // Force refresh data
            await fetchRequests();
            await fetchAssets();
            
            addNotificationUI(isFullyReturned ? `Semua aset untuk ${request.id} telah dikembalikan. Handover #${newHandover.docNumber} dibuat.` : `Aset telah dikembalikan. Handover #${newHandover.docNumber} dibuat.`, 'success');
            
            setSelectedRequest(null);
            setView('list');
            // Note: We don't auto-switch tabs here to avoid prop drilling complex state to ListView, 
            // but the user will see the updated list.
            
        } catch(e) {
             addNotificationUI('Gagal memproses pengembalian.', 'error');
             console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInitiateReturn = async (request: LoanRequest) => {
        setIsLoading(true);
        try {
            // 1. Update Loan Request Status
            await updateLoanRequest(request.id, { status: LoanRequestStatus.AWAITING_RETURN });
            
            // 2. CRITICAL: Update ALL assigned assets status to AWAITING_RETURN
            const allAssignedIds = Object.values(request.assignedAssetIds || {}).flat();
            // Filter out already returned assets to avoid re-updating them
            const assetsToUpdate = allAssignedIds.filter(id => !(request.returnedAssetIds || []).includes(id));

            await Promise.all(assetsToUpdate.map(assetId => 
                updateAsset(assetId, { status: AssetStatus.AWAITING_RETURN })
            ));

            // 3. Notify Admins
            const logisticAdmins = users.filter(u => u.role === 'Admin Logistik');
            logisticAdmins.forEach(admin => {
                addAppNotification({ 
                    recipientId: admin.id,
                    actorName: currentUser.name,
                    type: 'STATUS_CHANGE', 
                    referenceId: request.id,
                    message: `memulai pengembalian untuk #${request.id}`
                });
            });
            
            await fetchRequests();
            await fetchAssets();

            addNotificationUI('Proses pengembalian telah dimulai. Admin akan mengkonfirmasi penerimaan aset.', 'success');
            setSelectedRequest(prev => prev ? ({...prev, status: LoanRequestStatus.AWAITING_RETURN}) : null);
        } catch (e) {
            addNotificationUI('Gagal memulai pengembalian.', 'error');
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
                setActivePage={setActivePage} 
                 />;
        }
        
        // --- NEW: CLEAN LIST VIEW RENDER ---
        return (
            <LoanRequestListView 
                currentUser={currentUser}
                loanRequests={loanRequests}
                returns={returns}
                divisions={divisions}
                setActivePage={setActivePage}
                onCreateClick={() => setView('form')}
                onDetailClick={(req) => { setSelectedRequest(req); setView('detail'); }}
                onReturnDetailClick={(ret) => setActivePage('return-detail', { returnId: ret.id })}
                highlightedId={highlightedId}
            />
        );
    };

    return (
        <>
            {renderContent()}
            
            <Modal isOpen={isRejectModalOpen} onClose={() => setIsRejectModalOpen(false)} title="Tolak Permintaan Pinjam">
                <div className="space-y-4"><p className="text-sm text-gray-600">Alasan penolakan untuk <strong className="font-semibold">{selectedRequest?.id}</strong>.</p><textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={3} className="w-full text-sm border-gray-300 rounded-md focus:ring-tm-accent focus:border-tm-accent " placeholder="Contoh: Aset tidak tersedia..."></textarea></div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t"><button onClick={() => setIsRejectModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button><button onClick={handleRejection} disabled={isLoading || !rejectionReason.trim()} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-danger rounded-lg shadow-sm hover:bg-red-700">Konfirmasi Tolak</button></div>
            </Modal>

            {/* Note: Export Modal is now handled inside LoanRequestListView for cleaner code */}
        </>
    );
};

export default LoanRequestPage;
