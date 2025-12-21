
// ... keep imports ...
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Request,
  ItemStatus,
  User,
  Page,
  OrderDetails,
  PurchaseDetails,
  Activity,
} from "../../../types";
import { useNotification } from "../../../providers/NotificationProvider";
import { useSortableData } from "../../../hooks/useSortableData";
import { SearchIcon } from "../../../components/icons/SearchIcon";
import { FilterIcon } from "../../../components/icons/FilterIcon"; // Keep generic imports just in case
import { ExportIcon } from "../../../components/icons/ExportIcon";
import { PaginationControls } from "../../../components/ui/PaginationControls";
import { RequestTable } from "./components/RequestTable";
import { RequestForm } from "./components/RequestForm";
import { RequestReviewModal, AdjustmentData } from "./components/RequestReviewModal";
import { ExportRequestModal } from "./components/ExportRequestModal";
import { RequestFilterBar } from "./components/RequestFilterBar"; // Import the improved FilterBar
import NewRequestDetailPage from "./NewRequestDetailPage";
import Modal from "../../../components/ui/Modal";
import { BellIcon } from "../../../components/icons/BellIcon";
import { useRequestStore } from "../../../stores/useRequestStore";
import { useAssetStore } from "../../../stores/useAssetStore";
import { useMasterDataStore } from "../../../stores/useMasterDataStore";
import { useNotificationStore } from "../../../stores/useNotificationStore";
import { useUIStore } from "../../../stores/useUIStore";
import { exportToCSV } from "../../../utils/csvExporter";
import { BsJournalBookmark, BsArrowRight } from "react-icons/bs";
import { ChevronLeftIcon } from "../../../components/icons/ChevronLeftIcon";
import { ArchiveBoxIcon } from "../../../components/icons/ArchiveBoxIcon"; // Import ArchiveBoxIcon

interface NewRequestPageProps {
  currentUser: User;
  onInitiateRegistration: (request: Request, itemToRegister: any) => void;
  onInitiateHandoverFromRequest: (request: Request) => void;
  onShowPreview: (data: any) => void;
  setActivePage: (page: Page, initialState?: any) => void;
  initialFilters?: any;
  onClearInitialFilters: () => void;
}

const NewRequestPage: React.FC<NewRequestPageProps> = ({
  currentUser,
  onInitiateRegistration,
  onInitiateHandoverFromRequest,
  onShowPreview,
  setActivePage,
  initialFilters,
  onClearInitialFilters,
}) => {
  // Store Hooks
  const { requests, addRequest, updateRequest, deleteRequest } = useRequestStore();
  const { assets, categories } = useAssetStore();
  const { divisions, users } = useMasterDataStore();
  const { notifications, addSystemNotification } = useNotificationStore();
  const { highlightedItemId, clearHighlightOnReturn } = useUIStore();

  // Local UI State
  const [view, setView] = useState<"list" | "form" | "detail">("list");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isBulkApproveModalOpen, setIsBulkApproveModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [hasExistingDraft, setHasExistingDraft] = useState<string | null>(null);
  
  // Staging / Receipt Modal State
  const [stagingRequest, setStagingRequest] = useState<Request | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  // Updated filters state to include dates
  const [filters, setFilters] = useState<{
      status: string;
      division: string;
      orderType: string;
      startDate: Date | null;
      endDate: Date | null;
  }>({ 
      status: "", 
      division: "", 
      orderType: "",
      startDate: null,
      endDate: null
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const addNotificationUI = useNotification();
  const userDraftKey = useMemo(() => `triniti_draft_user_${currentUser.id}`, [currentUser.id]);

  // Logic: Check and sync draft status
  const syncDraftStatus = useCallback(() => {
    const savedDraft = localStorage.getItem(userDraftKey);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.lastSaved) setHasExistingDraft(parsed.lastSaved);
      } catch (e) {
        setHasExistingDraft(null);
      }
    } else {
      setHasExistingDraft(null);
    }
  }, [userDraftKey]);

  useEffect(() => {
    syncDraftStatus();
    window.addEventListener('storage', syncDraftStatus);
    return () => window.removeEventListener('storage', syncDraftStatus);
  }, [view, syncDraftStatus]);

  const selectedRequest = useMemo(() => 
    requests.find(r => r.id === selectedRequestId) || null
  , [requests, selectedRequestId]);

  useEffect(() => {
    if (initialFilters) {
      if (initialFilters.status) setFilters(f => ({ ...f, status: initialFilters.status }));
      if (initialFilters.openDetailForId) {
        setSelectedRequestId(initialFilters.openDetailForId);
        setView("detail");
      }
      onClearInitialFilters();
    }
  }, [initialFilters, onClearInitialFilters]);

  // Logic: Perhitungan Prioritas & Filter
  const filteredRequests = useMemo(() => {
    let result = requests;
    if (currentUser.role === "Staff" || currentUser.role === "Leader") {
      result = result.filter(r => r.requester === currentUser.name);
    }
    
    // Filtering logic
    result = result.filter(req => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !searchQuery || [req.id, req.requester, req.division].some(f => f.toLowerCase().includes(q));
      
      const matchStatus = !filters.status || (filters.status === "awaiting-approval" 
        ? [ItemStatus.PENDING, ItemStatus.LOGISTIC_APPROVED, ItemStatus.AWAITING_CEO_APPROVAL].includes(req.status)
        : req.status === filters.status);
      
      const matchDivision = !filters.division || req.division === filters.division;
      const matchOrderType = !filters.orderType || req.order.type === filters.orderType;

      // Date Logic
      let matchDate = true;
      if (filters.startDate) {
          const start = new Date(filters.startDate); start.setHours(0,0,0,0);
          const reqDate = new Date(req.requestDate); reqDate.setHours(0,0,0,0);
          if (reqDate < start) matchDate = false;
      }
      if (filters.endDate && matchDate) { // optimization
          const end = new Date(filters.endDate); end.setHours(23,59,59,999);
          const reqDate = new Date(req.requestDate);
          if (reqDate > end) matchDate = false;
      }

      return matchSearch && matchStatus && matchDivision && matchOrderType && matchDate;
    });

    // Priority Scoring
    const isAdmin = ["Admin Logistik", "Admin Purchase", "Super Admin"].includes(currentUser.role);
    if (isAdmin) {
      const getPriority = (req: Request) => {
        const hasUnread = notifications.some(n => n.recipientId === currentUser.id && n.referenceId === req.id && !n.isRead);
        if (hasUnread) return 100;
        if (req.order.type === 'Urgent') return 50;
        return 0;
      };
      return [...result].sort((a, b) => getPriority(b) - getPriority(a));
    }
    return result;
  }, [requests, searchQuery, filters, currentUser, notifications]);

  const { items: sortedRequests, requestSort, sortConfig } = useSortableData<Request>(filteredRequests, { key: "requestDate", direction: "descending" });

  const totalPages = Math.ceil(sortedRequests.length / itemsPerPage);

  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedRequests.slice(start, start + itemsPerPage);
  }, [sortedRequests, currentPage, itemsPerPage]);

  // Handlers for Filters
  const handleFilterApply = (newFilters: typeof filters) => {
      setFilters(newFilters);
      setCurrentPage(1);
  }

  const handleFilterReset = () => {
      setFilters({ status: "", division: "", orderType: "", startDate: null, endDate: null });
      setCurrentPage(1);
  }

  // Actions
  const handleBulkAction = async (type: 'approve' | 'delete') => {
    setIsLoading(true);
    try {
      const selected = requests.filter(r => selectedRequestIds.includes(r.id));
      if (type === 'delete') {
        await Promise.all(selected.map(r => deleteRequest(r.id)));
        addNotificationUI(`${selected.length} permintaan berhasil dihapus.`, 'success');
      } else {
        await Promise.all(selected.map(req => {
           if (req.status === ItemStatus.PENDING) return updateRequest(req.id, { status: ItemStatus.LOGISTIC_APPROVED, logisticApprover: currentUser.name, logisticApprovalDate: new Date().toISOString() });
           return Promise.resolve();
        }));
        addNotificationUI(`${selected.length} permintaan berhasil disetujui Logistik.`, 'success');
      }
      setSelectedRequestIds([]);
      setIsBulkSelectMode(false);
      setIsBulkApproveModalOpen(false);
      setIsBulkDeleteModalOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReview = async (adj: Record<number, AdjustmentData>) => {
    if (!selectedRequest) return;
    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const newItemStatuses = { ...(selectedRequest.itemStatuses || {}) };
      let hasAnyApproved = false;
      const revisions: any[] = [];

      Object.entries(adj).forEach(([id, data]) => {
        const itemId = parseInt(id);
        const item = selectedRequest.items.find(i => i.id === itemId);
        if (item) {
          const status = data.approvedQuantity === 0 ? 'rejected' : data.approvedQuantity < item.quantity ? 'partial' : 'approved';
          newItemStatuses[itemId] = { status: status as any, reason: data.reason, approvedQuantity: data.approvedQuantity };
          if (status !== 'approved') {
            revisions.push({ itemName: item.itemName, originalQuantity: item.quantity, approvedQuantity: data.approvedQuantity, reason: data.reason });
          }
          if (data.approvedQuantity > 0) hasAnyApproved = true;
        }
      });

      let nextStatus = selectedRequest.status;
      let extraData: any = {}; // Changed to any to avoid spread error

      if (!hasAnyApproved) {
        nextStatus = ItemStatus.REJECTED;
        extraData = { rejectedBy: currentUser.name, rejectionDate: now, rejectionReason: "Ditolak saat peninjauan." };
      } else {
        if (selectedRequest.status === ItemStatus.PENDING) {
          nextStatus = ItemStatus.LOGISTIC_APPROVED;
          extraData = { logisticApprover: currentUser.name, logisticApprovalDate: now };
        } else if (selectedRequest.status === ItemStatus.AWAITING_CEO_APPROVAL) {
          nextStatus = ItemStatus.APPROVED;
          extraData = { finalApprover: currentUser.name, finalApprovalDate: now };
        }
      }

      const activityLog = revisions.length > 0 
        ? [{ id: Date.now(), author: currentUser.name, timestamp: now, type: 'revision' as const, payload: { revisions } }, ...(selectedRequest.activityLog || [])]
        : selectedRequest.activityLog;

      await updateRequest(selectedRequest.id, { 
        status: nextStatus, 
        itemStatuses: newItemStatuses, 
        activityLog, 
        ...extraData 
      });

      addNotificationUI('Tinjauan berhasil disimpan.', 'success');
      setIsReviewModalOpen(false);
      if (nextStatus === ItemStatus.REJECTED) setView("list");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = (mappedData: any[], filename: string, extraHeader: any) => {
    exportToCSV(mappedData, filename, extraHeader);
  };

  const handleCreateRequest = async (data: { items: any[], order: any }) => {
    setIsLoading(true);
    try {
      const userDivision = divisions.find(d => d.id === currentUser.divisionId)?.name || 'N/A';
      await addRequest({
        requester: currentUser.name,
        division: userDivision,
        requestDate: new Date().toISOString(),
        order: data.order,
        items: data.items,
        totalValue: 0,
        activityLog: []
      });
      addNotificationUI('Permintaan berhasil diajukan.', 'success');
      setView("list");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Logic: Items ready for staging in List View
  const stagingItems = useMemo(() => {
    if (!stagingRequest) return [];
    return stagingRequest.items.filter(item => {
      const status = stagingRequest.itemStatuses?.[item.id];
      if (status?.status === 'rejected') return false;
      const approvedQty = status?.approvedQuantity ?? item.quantity;
      return approvedQty > 0;
    });
  }, [stagingRequest]);

  const handleOpenStaging = (request: Request) => {
    // Check if there are items to register
    const hasItems = request.items.some(i => {
        const status = request.itemStatuses?.[i.id];
        if (status?.status === 'stock_allocated' || status?.status === 'rejected') return false;
        const approvedQty = status?.approvedQuantity ?? i.quantity;
        const registeredQty = request.partiallyRegisteredItems?.[i.id] || 0;
        return registeredQty < approvedQty;
    });

    if (hasItems) {
        setStagingRequest(request);
    } else {
        addNotificationUI('Semua item dalam request ini sudah dicatat atau dialokasikan dari stok.', 'info');
    }
  };

  const handleProceedToRegistration = () => {
    if (!stagingRequest) return;
    
    // Find the first eligible item to register
    const itemToRegister = stagingRequest.items.find(i => {
        const status = stagingRequest.itemStatuses?.[i.id];
        if (status?.status === 'stock_allocated' || status?.status === 'rejected') return false;
        const approvedQty = status?.approvedQuantity ?? i.quantity;
        const registeredQty = stagingRequest.partiallyRegisteredItems?.[i.id] || 0;
        return registeredQty < approvedQty;
    });

    if (itemToRegister) {
        setStagingRequest(null);
        onInitiateRegistration(stagingRequest, itemToRegister);
    } else {
        setStagingRequest(null);
        addNotificationUI('Tidak ada item yang perlu dicatat.', 'info');
    }
  };

  // Rendering
  return (
    <div className="h-full bg-tm-light">
      {view === "form" ? (
        <div className="p-4 sm:p-6 md:p-8">
           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
             <div className="flex items-center gap-4">
               <button 
                  onClick={() => setView("list")} 
                  className="flex items-center justify-center w-10 h-10 bg-white border border-gray-200 rounded-full text-gray-500 hover:text-tm-primary hover:border-tm-primary transition-all shadow-sm"
                  aria-label="Kembali"
               >
                  <ChevronLeftIcon className="w-5 h-5" />
               </button>
               <div>
                 <h1 className="text-2xl sm:text-3xl font-bold text-tm-dark">Permintaan Baru</h1>
                 <p className="text-sm text-gray-500 mt-0.5">Isi formulir untuk mengajukan pengadaan aset.</p>
               </div>
             </div>
             <button onClick={() => setView("list")} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">Batal</button>
           </div>
           
           <div className="p-8 bg-white rounded-2xl shadow-xl border border-gray-200">
             <RequestForm 
                currentUser={currentUser} 
                assets={assets} 
                assetCategories={categories} 
                divisions={divisions} 
                onCreateRequest={handleCreateRequest} 
                onCancel={() => setView("list")}
                prefillItem={initialFilters?.prefillItem}
             />
           </div>
        </div>
      ) : view === "detail" && selectedRequest ? (
        <NewRequestDetailPage 
          request={selectedRequest}
          currentUser={currentUser}
          assets={assets}
          users={users}
          divisions={divisions}
          onBackToList={() => { setView("list"); setSelectedRequestId(null); }}
          onShowPreview={onShowPreview}
          onOpenReviewModal={() => setIsReviewModalOpen(true)}
          onOpenCancellationModal={() => {}}
          onOpenFollowUpModal={() => setIsFollowUpModalOpen(true)}
          onLogisticApproval={(id) => updateRequest(id, { status: ItemStatus.LOGISTIC_APPROVED, logisticApprover: currentUser.name, logisticApprovalDate: new Date().toISOString() })}
          onSubmitForCeoApproval={async (id, data) => {
             const today = new Date().toISOString();
             const purchaseDetails: any = {};
             // Explicit cast to object to avoid spread types error
             Object.entries(data).forEach(([k, v]) => {
                 if (v && typeof v === 'object') {
                    purchaseDetails[Number(k)] = { ...(v as object), filledBy: currentUser.name, fillDate: today };
                 }
             });
             
             // Create activity log for transparency
             const submitActivity: Activity = {
                id: Date.now(),
                author: currentUser.name,
                timestamp: today,
                type: 'status_change',
                payload: { text: 'Mengajukan detail pembelian untuk persetujuan CEO.' }
             };
             
             const updatedActivityLog = [submitActivity, ...(selectedRequest?.activityLog || [])];
             
             await updateRequest(id, { 
                 status: ItemStatus.AWAITING_CEO_APPROVAL, 
                 purchaseDetails,
                 activityLog: updatedActivityLog
             });
             setView("list");
             addNotificationUI('Request berhasil diajukan ke CEO.', 'success');
          }}
          onFinalCeoApproval={(id) => updateRequest(id, { status: ItemStatus.APPROVED, finalApprover: currentUser.name, finalApprovalDate: new Date().toISOString() })}
          onStartProcurement={() => updateRequest(selectedRequest.id, { status: ItemStatus.PURCHASING })}
          onUpdateRequestStatus={(status) => updateRequest(selectedRequest.id, { status })}
          onOpenStaging={() => handleOpenStaging(selectedRequest)}
          onCeoDisposition={(id) => updateRequest(id, { isPrioritizedByCEO: true, ceoDispositionDate: new Date().toISOString() })}
          onAcknowledgeProgressUpdate={() => {
            if (selectedRequest?.progressUpdateRequest) {
                updateRequest(selectedRequest.id, { 
                    progressUpdateRequest: { ...selectedRequest.progressUpdateRequest, isAcknowledged: true }
                });
            }
          }}
          onRequestProgressUpdate={(id) => updateRequest(id, { progressUpdateRequest: { requestedBy: currentUser.name, requestDate: new Date().toISOString(), isAcknowledged: false }})}
          onFollowUpToCeo={() => {}}
          onInitiateHandoverFromRequest={onInitiateHandoverFromRequest}
          isLoading={isLoading}
          assetCategories={categories}
        />
      ) : (
        <div className="p-4 sm:p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-tm-dark">Daftar Permintaan</h1>
              <p className="text-sm text-gray-500 mt-1">Kelola dan pantau seluruh alur pengadaan aset.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setIsExportModalOpen(true)} className="inline-flex items-center justify-center gap-2 px-4 py-2 border rounded-xl bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 shadow-sm transition-all">
                <ExportIcon className="w-4 h-4"/> Ekspor
              </button>
              <button onClick={() => setView("form")} className="px-6 py-2.5 bg-tm-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-tm-primary/30 hover:scale-105 active:scale-95 transition-all">
                Buat Baru
              </button>
            </div>
          </div>

          {hasExistingDraft && (
            <div className="mb-6 p-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-200/50 animate-fade-in-up">
              <div className="bg-white p-4 rounded-[0.9rem] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-tm-primary rounded-xl flex items-center justify-center">
                    <BsJournalBookmark className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Anda memiliki draf pengajuan</h4>
                    <p className="text-xs text-slate-500">Terakhir disimpan: <span className="font-bold text-tm-primary">{hasExistingDraft}</span></p>
                  </div>
                </div>
                <button 
                  onClick={() => setView("form")}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-tm-primary text-white rounded-xl text-xs font-black hover:bg-tm-primary-hover transition-all"
                >
                  LANJUTKAN PENGISIAN <BsArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* New Filter Bar Implementation */}
          <RequestFilterBar 
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filters={filters}
            onFiltersApply={handleFilterApply}
            onFiltersReset={handleFilterReset}
            divisions={divisions}
            isAdmin={["Admin Logistik", "Admin Purchase", "Super Admin"].includes(currentUser.role)}
          />

          {isBulkSelectMode && (
             <div className="p-4 mb-4 bg-blue-600 text-white rounded-2xl shadow-xl flex justify-between items-center animate-fade-in-up">
                <div className="flex items-center gap-6">
                    <span className="text-sm font-bold">{selectedRequestIds.length} Permintaan Dipilih</span>
                    <div className="h-6 w-px bg-white/20"></div>
                    <button onClick={() => setIsBulkApproveModalOpen(true)} className="text-sm font-bold bg-white/20 px-4 py-1.5 rounded-lg hover:bg-white/30">Setujui Logistik</button>
                    <button onClick={() => setIsBulkDeleteModalOpen(true)} className="text-sm font-bold text-red-100 hover:underline">Hapus Permanen</button>
                </div>
                <button onClick={() => { setIsBulkSelectMode(false); setSelectedRequestIds([]); }} className="text-xs font-black opacity-60 hover:opacity-100">TUTUP</button>
             </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <RequestTable 
                requests={paginatedRequests}
                currentUser={currentUser}
                onDetailClick={(r) => { setSelectedRequestId(r.id); setView("detail"); }}
                onDeleteClick={(id) => { setSelectedRequestId(id); setIsBulkDeleteModalOpen(true); }}
                onOpenStaging={handleOpenStaging}
                sortConfig={sortConfig}
                requestSort={requestSort}
                selectedRequestIds={selectedRequestIds}
                onSelectOne={(id) => setSelectedRequestIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                onSelectAll={(e) => setSelectedRequestIds(e.target.checked ? paginatedRequests.map(r => r.id) : [])}
                isBulkSelectMode={isBulkSelectMode}
                onEnterBulkMode={() => setIsBulkSelectMode(true)}
                notifications={notifications}
                onFollowUpClick={(req) => { setSelectedRequestId(req.id); setIsFollowUpModalOpen(true); }}
                highlightedId={highlightedItemId}
              />
            </div>
            <PaginationControls currentPage={currentPage} totalPages={totalPages} totalItems={sortedRequests.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} startIndex={(currentPage-1)*itemsPerPage} endIndex={(currentPage-1)*itemsPerPage + paginatedRequests.length} />
          </div>
        </div>
      )}

      {/* Modals */}
      {isReviewModalOpen && selectedRequest && (
        <RequestReviewModal isOpen={true} onClose={() => setIsReviewModalOpen(false)} request={selectedRequest} onConfirm={handleConfirmReview} isLoading={isLoading} />
      )}

      {isExportModalOpen && (
        <ExportRequestModal isOpen={true} onClose={() => setIsExportModalOpen(false)} currentUser={currentUser} data={sortedRequests} onConfirmExport={handleExport} />
      )}

      {isFollowUpModalOpen && selectedRequest && (
        <Modal isOpen={true} onClose={() => setIsFollowUpModalOpen(false)} title="Kirim Follow Up" size="md">
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-blue-100 text-tm-primary rounded-full flex items-center justify-center mx-auto mb-4"><BellIcon className="w-8 h-8"/></div>
            <p className="text-sm text-gray-600 px-4">Kirim pengingat kepada Admin Logistik untuk segera meninjau permintaan <strong className="text-tm-dark">#{selectedRequest.id}</strong>?</p>
          </div>
          <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
            <button onClick={() => setIsFollowUpModalOpen(false)} className="px-4 py-2 text-sm font-medium">Batal</button>
            <button onClick={async () => {
               setIsLoading(true);
               await updateRequest(selectedRequest.id, { lastFollowUpAt: new Date().toISOString() });
               users.filter(u => u.role === 'Admin Logistik').forEach(admin => {
                  addSystemNotification({ recipientId: admin.id, actorName: currentUser.name, type: 'FOLLOW_UP', referenceId: selectedRequest.id, message: 'meminta follow-up request' });
               });
               addNotificationUI('Notifikasi pengingat terkirim.', 'success');
               setIsLoading(false);
               setIsFollowUpModalOpen(false);
            }} className="px-6 py-2 bg-tm-primary text-white rounded-lg text-sm font-bold shadow-md">Kirim Sekarang</button>
          </div>
        </Modal>
      )}

      {isBulkApproveModalOpen && (
        <Modal isOpen={true} onClose={() => setIsBulkApproveModalOpen(false)} title="Setujui Masal" size="md">
           <div className="p-4"><p className="text-sm text-gray-600">Anda akan memberikan <strong>Persetujuan Logistik</strong> untuk {selectedRequestIds.length} permintaan sekaligus. Lanjutkan?</p></div>
           <div className="flex justify-end gap-3 p-4 border-t">
             <button onClick={() => setIsBulkApproveModalOpen(false)} className="px-4 py-2 text-sm font-medium">Batal</button>
             <button onClick={() => handleBulkAction('approve')} disabled={isLoading} className="px-6 py-2 bg-success text-white rounded-lg text-sm font-bold shadow-md">Ya, Setujui Semua</button>
           </div>
        </Modal>
      )}

      {/* STAGING / RECEIPT CONFIRMATION MODAL */}
      <Modal 
        isOpen={!!stagingRequest} 
        onClose={() => setStagingRequest(null)} 
        title="Penerimaan Barang" 
        size="lg" 
        hideDefaultCloseButton 
        footerContent={
            <div className="flex justify-end gap-3 w-full">
                 <button onClick={() => setStagingRequest(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
                 <button onClick={handleProceedToRegistration} disabled={stagingItems.length === 0} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover disabled:bg-gray-300 disabled:cursor-not-allowed">Lanjut Catat Aset</button>
            </div>
        }
      >
        <div className="space-y-4">
             <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
                <ArchiveBoxIcon className="w-6 h-6 text-tm-primary flex-shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-bold text-tm-primary text-sm">Konfirmasi Penerimaan</h4>
                    <p className="text-sm text-blue-800 mt-1">
                        Berikut adalah daftar item dari request <strong>{stagingRequest?.id}</strong> yang telah disetujui dan siap untuk dicatat ke dalam sistem inventori. Pastikan fisik barang telah diterima.
                    </p>
                </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                            <th className="p-3 w-10 text-center">No</th>
                            <th className="p-3">Nama Barang</th>
                            <th className="p-3">Tipe/Brand</th>
                            <th className="p-3 text-center">Jumlah Diterima</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {stagingItems.length > 0 ? stagingItems.map((item, idx) => {
                            const approvedQty = stagingRequest?.itemStatuses?.[item.id]?.approvedQuantity ?? item.quantity;
                            return (
                                <tr key={item.id} className="hover:bg-slate-50">
                                    <td className="p-3 text-center text-slate-500">{idx + 1}</td>
                                    <td className="p-3 font-semibold text-slate-800">{item.itemName}</td>
                                    <td className="p-3 text-slate-600">{item.itemTypeBrand}</td>
                                    <td className="p-3 text-center font-bold text-tm-primary bg-blue-50/50">{approvedQty} Unit</td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                 <td colSpan={4} className="p-6 text-center text-slate-500 italic">Tidak ada item yang dapat dicatat (Semua item ditolak atau belum disetujui).</td>
                             </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            <p className="text-xs text-slate-500 text-center italic mt-2">
                Klik "Lanjut Catat Aset" untuk mulai memasukkan Nomor Seri dan data detail lainnya.
            </p>
        </div>
      </Modal>
    </div>
  );
};

export default NewRequestPage;
