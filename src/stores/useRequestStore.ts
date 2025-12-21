
import { create } from 'zustand';
import { Request, LoanRequest, AssetReturn, ItemStatus, LoanRequestStatus, AssetReturnStatus, RequestItem, LoanItem, Activity, AssetStatus } from '../types';
import * as api from '../services/api';
import { useNotificationStore } from './useNotificationStore';
import { useUIStore } from './useUIStore'; 
import { useMasterDataStore } from './useMasterDataStore';
import { useAssetStore } from './useAssetStore'; 
import { generateDocumentNumber } from '../utils/documentNumberGenerator';
// Update import
import { WhatsAppService, sendWhatsAppSimulation, WAMessagePayload } from '../services/whatsappIntegration';

interface RequestState {
  requests: Request[];
  loanRequests: LoanRequest[];
  returns: AssetReturn[];
  isLoading: boolean;

  // Actions - General
  fetchRequests: () => Promise<void>;

  // Actions - New Requests
  addRequest: (request: Omit<Request, 'id' | 'status' | 'docNumber' | 'logisticApprover' | 'logisticApprovalDate' | 'finalApprover' | 'finalApprovalDate' | 'rejectionReason' | 'rejectedBy' | 'rejectionDate' | 'rejectedByDivision'>) => Promise<void>;
  updateRequest: (id: string, data: Partial<Request>) => Promise<void>;
  deleteRequest: (id: string) => Promise<void>;
  
  // Logic: Registrasi Parsial
  updateRequestRegistration: (requestId: string, itemId: number, count: number) => Promise<boolean>;

  // Actions - Loan Requests
  addLoanRequest: (request: LoanRequest) => Promise<void>;
  updateLoanRequest: (id: string, data: Partial<LoanRequest>) => Promise<void>;
  deleteLoanRequest: (id: string) => Promise<void>;

  // Actions - Returns
  addReturn: (returnData: AssetReturn) => Promise<void>;
  updateReturn: (id: string, data: Partial<AssetReturn>) => Promise<void>;
}

// Helper untuk menampilkan simulasi notifikasi WA via MODAL
const triggerWAModal = (payload: WAMessagePayload) => {
    // 1. Tampilkan Toast kecil sebagai feedback instan
    useNotificationStore.getState().addToast('Pesan WhatsApp Dibuat', 'success', { duration: 2000 });
    
    // 2. Buka Modal untuk menampilkan isi pesan
    useUIStore.getState().openWAModal(payload);
    
    // 3. Log console tetap ada untuk debugging
    console.log(`%c [WA SIMULATION - ${payload.groupName}] \n${payload.message}`, 'background: #25D366; color: white; padding: 4px; border-radius: 4px;');
};

export const useRequestStore = create<RequestState>((set, get) => ({
  requests: [],
  loanRequests: [],
  returns: [],
  isLoading: false,

  fetchRequests: async () => {
    set({ isLoading: true });
    try {
      const data = await api.fetchAllData();
      set({ 
        requests: data.requests, 
        loanRequests: data.loanRequests, 
        returns: data.returns,
        isLoading: false 
      });
    } catch (error) {
      console.error("Failed to fetch requests", error);
      set({ isLoading: false });
    }
  },

  // --- NEW REQUESTS ---
  addRequest: async (requestData) => {
    const current = get().requests;
    
    // FIX: Gunakan Max ID + 1 untuk mencegah duplikasi jika ada request yang dihapus
    const maxId = current.reduce((max, r) => {
        const idNum = parseInt(r.id.split('-')[1]);
        return !isNaN(idNum) && idNum > max ? idNum : max;
    }, 0);
    const newId = `REQ-${String(maxId + 1).padStart(3, '0')}`;

    const requestDate = new Date(requestData.requestDate);
    const docNumber = generateDocumentNumber('REQ', current, requestDate);
    
    // --- OPTIMIZED LOGIC: O(N) Frequency Map for Stock Check ---
    const allAssets = useAssetStore.getState().assets;
    const inventoryMap = new Map<string, number>();
    
    for (const asset of allAssets) {
        if (asset.status === AssetStatus.IN_STORAGE) {
            const key = `${asset.name.trim()}|${asset.brand.trim()}`.toLowerCase();
            inventoryMap.set(key, (inventoryMap.get(key) || 0) + 1);
        }
    }

    const itemStatuses: Record<number, { status: 'stock_allocated' | 'procurement_needed' | 'approved' | 'rejected' | 'partial'; approvedQuantity: number; reason?: string }> = {};
    let needsProcurement = false;

    requestData.items.forEach(item => {
        const key = `${item.itemName.trim()}|${item.itemTypeBrand.trim()}`.toLowerCase();
        const availableStock = inventoryMap.get(key) || 0;
        const requestedQty = item.quantity;
        
        if (availableStock >= requestedQty) {
            inventoryMap.set(key, availableStock - requestedQty); 
            itemStatuses[item.id] = {
                status: 'stock_allocated',
                approvedQuantity: item.quantity,
                reason: 'Stok tersedia di gudang (Auto-Allocated)'
            };
        } else {
            itemStatuses[item.id] = {
                status: 'procurement_needed',
                approvedQuantity: item.quantity,
                reason: 'Stok tidak mencukupi, masuk antrian pengadaan'
            };
            needsProcurement = true;
        }
    });

    const initialStatus = !needsProcurement ? ItemStatus.AWAITING_HANDOVER : ItemStatus.PENDING;

    const autoApprovalData = !needsProcurement ? {
        logisticApprover: 'System (Auto-Stock)',
        logisticApprovalDate: new Date().toISOString(),
        finalApprover: 'System (Auto-Stock)',
        finalApprovalDate: new Date().toISOString(),
    } : {
        logisticApprover: null,
        logisticApprovalDate: null,
        finalApprover: null,
        finalApprovalDate: null,
    };

    const newRequest: Request = {
        ...requestData,
        id: newId,
        docNumber: docNumber,
        status: initialStatus,
        itemStatuses: itemStatuses,
        ...autoApprovalData,
        rejectionReason: null,
        rejectedBy: null,
        rejectionDate: null,
        rejectedByDivision: null
    };

    const updated = [newRequest, ...current];
    await api.updateData('app_requests', updated);
    set({ requests: updated });

    // --- NOTIFICATION & WA SIMULATION ---
    const addSystemNotification = useNotificationStore.getState().addSystemNotification;
    const users = useMasterDataStore.getState().users;
    
    const logisticAdmins = users.filter(u => u.role === 'Admin Logistik');
    logisticAdmins.forEach(admin => {
        addSystemNotification({
            recipientId: admin.id,
            actorName: requestData.requester,
            type: 'REQUEST_CREATED',
            referenceId: newId,
            message: !needsProcurement 
                ? `membuat request #${newId} (Full Stok - Siap Handover).` 
                : `membuat request #${newId} (Perlu Pengadaan).`
        });
    });

    // TRIGGER WA: NEW REQUEST
    if (initialStatus === ItemStatus.PENDING) {
        const waPayload = WhatsAppService.generateNewRequestPayload(newRequest);
        await sendWhatsAppSimulation(waPayload);
        triggerWAModal(waPayload);
    }
  },

  updateRequest: async (id, data) => {
    const current = get().requests;
    const originalRequest = current.find(r => r.id === id);
    const updated = current.map(r => r.id === id ? { ...r, ...data } : r);
    await api.updateData('app_requests', updated);
    set({ requests: updated });
    
    // --- NOTIFICATION & WA SIMULATION LOGIC ---
    if (originalRequest && data.status && data.status !== originalRequest.status) {
        const updatedReq = updated.find(r => r.id === id)!;
        const addSystemNotification = useNotificationStore.getState().addSystemNotification;
        const users = useMasterDataStore.getState().users;
        const recipient = users.find(u => u.name === originalRequest.requester);
        
        // 1. WA: REJECTED
        if (data.status === ItemStatus.REJECTED) {
             const rejector = data.rejectedBy || 'Admin';
             // FIX: Gunakan updatedReq (data terbaru) agar status yang dikirim ke WA adalah 'Ditolak', bukan 'Pending'
             const waPayload = WhatsAppService.generateRejectionPayload(updatedReq, rejector, data.rejectionReason || '-');
             await sendWhatsAppSimulation(waPayload);
             triggerWAModal(waPayload);
        }

        // 2. WA: LOGISTIC APPROVED
        if (data.status === ItemStatus.LOGISTIC_APPROVED) {
            const approver = data.logisticApprover || 'Admin Logistik';
            const waPayload = WhatsAppService.generateLogisticApprovalPayload(updatedReq, approver);
            await sendWhatsAppSimulation(waPayload);
            triggerWAModal(waPayload);
        }

        // 3. WA: SUBMIT TO CEO (AWAITING CEO)
        if (data.status === ItemStatus.AWAITING_CEO_APPROVAL) {
             const approver = data.logisticApprover || 'Admin Purchase'; // Biasanya Purchase yang submit
             const waPayload = WhatsAppService.generateSubmitToCeoPayload(updatedReq, approver);
             await sendWhatsAppSimulation(waPayload);
             triggerWAModal(waPayload);
        }

        // 4. WA: FINAL APPROVED
        if (data.status === ItemStatus.APPROVED) {
             const approver = data.finalApprover || 'CEO';
             const waPayload = WhatsAppService.generateFinalApprovalPayload(originalRequest, approver);
             await sendWhatsAppSimulation(waPayload);
             triggerWAModal(waPayload);
        }

        // 5. WA: PROCUREMENT PROGRESS (Purchasing & In Delivery)
        if (data.status === ItemStatus.PURCHASING || data.status === ItemStatus.IN_DELIVERY) {
             const waPayload = WhatsAppService.generateProcurementUpdatePayload(updatedReq, data.status);
             await sendWhatsAppSimulation(waPayload);
             triggerWAModal(waPayload);
        }

        // 6. WA: ARRIVED (Barang Tiba)
        if (data.status === ItemStatus.ARRIVED) {
             const waPayload = WhatsAppService.generateItemsArrivedPayload(updatedReq); // Use updatedReq to catch arrivalDate
             await sendWhatsAppSimulation(waPayload);
             triggerWAModal(waPayload);
        }

        // Existing Notification Logic Kept
        if (recipient) {
            const isApproval = [ItemStatus.LOGISTIC_APPROVED, ItemStatus.APPROVED, ItemStatus.AWAITING_CEO_APPROVAL].includes(data.status);
            const isRejection = data.status === ItemStatus.REJECTED;

            if (isApproval || isRejection) {
                const approver = data.rejectedBy || data.logisticApprover || data.finalApprover || 'Admin';
                addSystemNotification({
                    recipientId: recipient.id,
                    actorName: approver,
                    type: isRejection ? 'REQUEST_REJECTED' : 'REQUEST_APPROVED',
                    referenceId: id,
                    message: isRejection ? `menolak request Anda #${id}.` : `menyetujui request Anda #${id}.`
                });
            }
        }
        
        if (data.status === ItemStatus.LOGISTIC_APPROVED) {
            const purchaseAdmins = users.filter(u => u.role === 'Admin Purchase');
            const logisticApprover = data.logisticApprover || 'Admin Logistik';

            purchaseAdmins.forEach(admin => {
                addSystemNotification({
                    recipientId: admin.id,
                    actorName: logisticApprover,
                    type: 'REQUEST_LOGISTIC_APPROVED',
                    referenceId: id,
                    message: `telah menyetujui request #${id}. Item yang stoknya kurang perlu diproses pembelian.`
                });
            });
        }
    }
  },

  deleteRequest: async (id) => {
    const current = get().requests;
    const updated = current.filter(r => r.id !== id);
    await api.updateData('app_requests', updated);
    set({ requests: updated });
  },

  updateRequestRegistration: async (requestId, itemId, count) => {
    const currentRequests = get().requests;
    const requestIndex = currentRequests.findIndex(r => r.id === requestId);
    if (requestIndex === -1) return false;

    const originalRequest = currentRequests[requestIndex];
    const updatedRequest = {
      ...originalRequest,
      partiallyRegisteredItems: {
        ...(originalRequest.partiallyRegisteredItems || {}),
      },
    };

    const currentCount = updatedRequest.partiallyRegisteredItems?.[itemId] || 0;
    const newCount = currentCount + count;
    updatedRequest.partiallyRegisteredItems[itemId] = newCount;

    // Cek apakah semua item sudah terdaftar penuh
    const allItemsRegistered = updatedRequest.items.every((item) => {
      const status = updatedRequest.itemStatuses?.[item.id];
      if (status?.status === 'stock_allocated') return true;
      if (status?.status === 'rejected') return true;

      const approvedQuantity = status?.approvedQuantity ?? item.quantity;
      const registeredCount = updatedRequest.partiallyRegisteredItems?.[item.id] || 0;
      return registeredCount >= approvedQuantity;
    });

    if (allItemsRegistered) {
      updatedRequest.status = ItemStatus.AWAITING_HANDOVER;
    }

    const updatedRequests = [...currentRequests];
    updatedRequests[requestIndex] = updatedRequest;

    await api.updateData('app_requests', updatedRequests);
    set({ requests: updatedRequests });

    return allItemsRegistered;
  },

  // --- LOAN REQUESTS ---
  addLoanRequest: async (request) => {
    const current = get().loanRequests;
    const updated = [request, ...current];
    await api.updateData('app_loanRequests', updated);
    set({ loanRequests: updated });
  },

  updateLoanRequest: async (id, data) => {
    const current = get().loanRequests;
    const originalRequest = current.find(r => r.id === id);
    const updated = current.map(r => r.id === id ? { ...r, ...data } : r);
    await api.updateData('app_loanRequests', updated);
    set({ loanRequests: updated });

    if (originalRequest && data.status && data.status !== originalRequest.status) {
        const addSystemNotification = useNotificationStore.getState().addSystemNotification;
        const users = useMasterDataStore.getState().users;
        const recipient = users.find(u => u.name === originalRequest.requester);
        
        if (recipient && (data.status === LoanRequestStatus.REJECTED || data.status === LoanRequestStatus.APPROVED)) {
            const approver = data.approver || 'Admin';
            const isRejection = data.status === LoanRequestStatus.REJECTED;
            
            addSystemNotification({
                recipientId: recipient.id,
                actorName: approver,
                type: isRejection ? 'REQUEST_REJECTED' : 'REQUEST_APPROVED',
                referenceId: id,
                message: isRejection ? `menolak request pinjam Anda` : `menyetujui request pinjam Anda.`
            });
        }
    }
  },
  
  deleteLoanRequest: async (id) => {
      const current = get().loanRequests;
      const updated = current.filter(r => r.id !== id);
      await api.updateData('app_loanRequests', updated);
      set({ loanRequests: updated });
  },

  // --- RETURNS ---
  addReturn: async (returnData) => {
    const current = get().returns;
    const updated = [returnData, ...current];
    await api.updateData('app_returns', updated);
    set({ returns: updated });
  },

  updateReturn: async (id, data) => {
    const current = get().returns;
    const updated = current.map(r => r.id === id ? { ...r, ...data } : r);
    await api.updateData('app_returns', updated);
    set({ returns: updated });
  }
}));
