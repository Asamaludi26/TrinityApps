
import { create } from 'zustand';
import { Request, LoanRequest, AssetReturn, ItemStatus, LoanRequestStatus, AssetReturnStatus, RequestItem, AssetStatus } from '../types';
import * as api from '../services/api';
import { useNotificationStore } from './useNotificationStore';
import { useUIStore } from './useUIStore'; 
import { useMasterDataStore } from './useMasterDataStore';
import { useAssetStore } from './useAssetStore'; 
import { generateDocumentNumber } from '../utils/documentNumberGenerator';
import { WhatsAppService, sendWhatsAppSimulation, WAMessagePayload } from '../services/whatsappIntegration';

interface RequestState {
  requests: Request[];
  loanRequests: LoanRequest[];
  returns: AssetReturn[];
  isLoading: boolean;

  fetchRequests: () => Promise<void>;
  addRequest: (request: Omit<Request, 'id' | 'status' | 'docNumber' | 'logisticApprover' | 'logisticApprovalDate' | 'finalApprover' | 'finalApprovalDate' | 'rejectionReason' | 'rejectedBy' | 'rejectionDate' | 'rejectedByDivision'>) => Promise<void>;
  updateRequest: (id: string, data: Partial<Request>) => Promise<void>;
  deleteRequest: (id: string) => Promise<void>;
  updateRequestRegistration: (requestId: string, itemId: number, count: number) => Promise<boolean>;
  addLoanRequest: (request: LoanRequest) => Promise<void>;
  updateLoanRequest: (id: string, data: Partial<LoanRequest>) => Promise<void>;
  deleteLoanRequest: (id: string) => Promise<void>;
  approveLoanRequest: (id: string, payload: { approver: string, approvalDate: string, assignedAssetIds: any, itemStatuses: any }) => Promise<void>;
  addReturn: (returnData: AssetReturn) => Promise<void>;
  updateReturn: (id: string, data: Partial<AssetReturn>) => Promise<void>;
}

const triggerWAModal = (payload: WAMessagePayload) => {
    useNotificationStore.getState().addToast('Pesan WhatsApp Dibuat', 'success', { duration: 2000 });
    useUIStore.getState().openWAModal(payload);
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
      set({ isLoading: false });
    }
  },

  addRequest: async (requestData) => {
    const current = get().requests;
    const maxId = current.reduce((max, r) => {
        const idNum = parseInt(r.id.split('-')[1]);
        return !isNaN(idNum) && idNum > max ? idNum : max;
    }, 0);
    const newId = `REQ-${String(maxId + 1).padStart(3, '0')}`;
    const requestDate = new Date(requestData.requestDate);
    const docNumber = generateDocumentNumber('REQ', current, requestDate);
    
    const allAssets = useAssetStore.getState().assets;
    const inventoryMap = new Map<string, number>();
    for (const asset of allAssets) {
        if (asset.status === AssetStatus.IN_STORAGE) {
            const key = `${asset.name.trim()}|${asset.brand.trim()}`.toLowerCase();
            inventoryMap.set(key, (inventoryMap.get(key) || 0) + 1);
        }
    }

    const itemStatuses: Record<number, any> = {};
    let needsProcurement = false;

    requestData.items.forEach(item => {
        const key = `${item.itemName.trim()}|${item.itemTypeBrand.trim()}`.toLowerCase();
        const availableStock = inventoryMap.get(key) || 0;
        if (availableStock >= item.quantity) {
            inventoryMap.set(key, availableStock - item.quantity); 
            itemStatuses[item.id] = { status: 'stock_allocated', approvedQuantity: item.quantity, reason: 'Stok tersedia (Auto)' };
        } else {
            itemStatuses[item.id] = { status: 'procurement_needed', approvedQuantity: item.quantity, reason: 'Perlu Pengadaan' };
            needsProcurement = true;
        }
    });

    const initialStatus = !needsProcurement ? ItemStatus.AWAITING_HANDOVER : ItemStatus.PENDING;
    const newRequest: Request = {
        ...requestData,
        id: newId,
        docNumber: docNumber,
        status: initialStatus,
        itemStatuses: itemStatuses,
        rejectionReason: null, rejectedBy: null, rejectionDate: null, rejectedByDivision: null
    };

    const updated = [newRequest, ...current];
    await api.updateData('app_requests', updated);
    set({ requests: updated });

    // Notification Logic (Simplified)
    const addSystemNotification = useNotificationStore.getState().addSystemNotification;
    const logisticAdmins = useMasterDataStore.getState().users.filter(u => u.role === 'Admin Logistik');
    logisticAdmins.forEach(admin => {
        addSystemNotification({
            recipientId: admin.id,
            actorName: requestData.requester,
            type: 'REQUEST_CREATED',
            referenceId: newId,
            message: `membuat request #${newId}.`
        });
    });

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
    
    // NOTE: Detailed WA Logic moved to backend in real implementation
    // Retaining simplified version for prototype visual feedback
    if (originalRequest && data.status && data.status !== originalRequest.status) {
        const updatedReq = updated.find(r => r.id === id)!;
        if (data.status === ItemStatus.LOGISTIC_APPROVED) {
            const waPayload = WhatsAppService.generateLogisticApprovalPayload(updatedReq, data.logisticApprover || 'Admin');
            triggerWAModal(waPayload);
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
    const updatedRequest = { ...originalRequest, partiallyRegisteredItems: { ...(originalRequest.partiallyRegisteredItems || {}) } };
    const currentCount = updatedRequest.partiallyRegisteredItems?.[itemId] || 0;
    updatedRequest.partiallyRegisteredItems[itemId] = currentCount + count;

    const allItemsRegistered = updatedRequest.items.every((item) => {
      const status = updatedRequest.itemStatuses?.[item.id];
      if (status?.status === 'stock_allocated' || status?.status === 'rejected') return true;
      const approvedQuantity = status?.approvedQuantity ?? item.quantity;
      const registeredCount = updatedRequest.partiallyRegisteredItems?.[item.id] || 0;
      return registeredCount >= approvedQuantity;
    });

    if (allItemsRegistered) updatedRequest.status = ItemStatus.AWAITING_HANDOVER;
    
    const updatedRequests = [...currentRequests];
    updatedRequests[requestIndex] = updatedRequest;

    await api.updateData('app_requests', updatedRequests);
    set({ requests: updatedRequests });
    return allItemsRegistered;
  },

  addLoanRequest: async (request) => {
    const current = get().loanRequests;
    const updated = [request, ...current];
    await api.updateData('app_loanRequests', updated);
    set({ loanRequests: updated });
  },

  updateLoanRequest: async (id, data) => {
    const current = get().loanRequests;
    const updated = current.map(r => r.id === id ? { ...r, ...data } : r);
    await api.updateData('app_loanRequests', updated);
    set({ loanRequests: updated });
  },
  
  approveLoanRequest: async (id, payload) => {
     // Using the specialized transactional endpoint
     const updatedRequest = await api.approveLoanTransaction(id, payload);
     
     const currentLoans = get().loanRequests;
     const updatedLoans = currentLoans.map(r => r.id === id ? updatedRequest : r);
     set({ loanRequests: updatedLoans });

     // IMPORTANT: Refresh assets immediately as they were modified
     await useAssetStore.getState().fetchAssets();

     // Notify User
     const recipient = useMasterDataStore.getState().users.find(u => u.name === updatedRequest.requester);
     if (recipient) {
         useNotificationStore.getState().addSystemNotification({
             recipientId: recipient.id,
             actorName: payload.approver,
             type: 'REQUEST_APPROVED',
             referenceId: id,
             message: `menyetujui request pinjam Anda.`
         });
     }
  },
  
  deleteLoanRequest: async (id) => {
      const current = get().loanRequests;
      const updated = current.filter(r => r.id !== id);
      await api.updateData('app_loanRequests', updated);
      set({ loanRequests: updated });
  },

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
