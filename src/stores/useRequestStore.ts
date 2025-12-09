
import { create } from 'zustand';
import { Request, LoanRequest, AssetReturn, ItemStatus, LoanRequestStatus, AssetReturnStatus, RequestItem, LoanItem, Activity } from '../types';
import * as api from '../services/api';
import { useNotificationStore } from './useNotificationStore';
import { useMasterDataStore } from './useMasterDataStore';
import { generateDocumentNumber } from '../utils/documentNumberGenerator';

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
  
  // Logic: Registrasi Parsial (memindahkan logika handleCompleteRequestRegistration dari App.tsx)
  updateRequestRegistration: (requestId: string, itemId: number, count: number) => Promise<boolean>;

  // Actions - Loan Requests
  addLoanRequest: (request: LoanRequest) => Promise<void>;
  updateLoanRequest: (id: string, data: Partial<LoanRequest>) => Promise<void>;
  deleteLoanRequest: (id: string) => Promise<void>;

  // Actions - Returns
  addReturn: (returnData: AssetReturn) => Promise<void>;
  updateReturn: (id: string, data: Partial<AssetReturn>) => Promise<void>;
}

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
    const newId = `REQ-${String(current.length + 1).padStart(3, '0')}`;
    const requestDate = new Date(requestData.requestDate);
    // FIX: The `generateDocumentNumber` function now correctly accepts `Request[]` as its second argument.
    const docNumber = generateDocumentNumber('REQ', current, requestDate);
    
    const newRequest: Request = {
        ...requestData,
        id: newId,
        docNumber: docNumber,
        status: ItemStatus.PENDING,
        logisticApprover: null,
        logisticApprovalDate: null,
        finalApprover: null,
        finalApprovalDate: null,
        rejectionReason: null,
        rejectedBy: null,
        rejectionDate: null,
        rejectedByDivision: null
    };

    const updated = [newRequest, ...current];
    await api.updateData('app_requests', updated);
    set({ requests: updated });
  },

  updateRequest: async (id, data) => {
    const current = get().requests;
    const originalRequest = current.find(r => r.id === id);
    const updated = current.map(r => r.id === id ? { ...r, ...data } : r);
    await api.updateData('app_requests', updated);
    set({ requests: updated });
    
    // --- NOTIFICATION LOGIC ---
    if (originalRequest && data.status && data.status !== originalRequest.status) {
        const addSystemNotification = useNotificationStore.getState().addSystemNotification;
        const users = useMasterDataStore.getState().users;
        
        // --- 1. Notify the original requester about their request status change ---
        const recipient = users.find(u => u.name === originalRequest.requester);
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
        
        // --- 2. Notify Admin Purchase when a request is approved by Logistics ---
        if (data.status === ItemStatus.LOGISTIC_APPROVED) {
            const purchaseAdmins = users.filter(u => u.role === 'Admin Purchase');
            const logisticApprover = data.logisticApprover || 'Admin Logistik';

            purchaseAdmins.forEach(admin => {
                addSystemNotification({
                    recipientId: admin.id,
                    actorName: logisticApprover,
                    type: 'REQUEST_LOGISTIC_APPROVED',
                    referenceId: id,
                    message: `telah menyetujui request #${id} yang kini memerlukan proses pembelian.`
                });
            });
        }
    }
    // --- END NOTIFICATION LOGIC ---
  },

  deleteRequest: async (id) => {
    const current = get().requests;
    const updated = current.filter(r => r.id !== id);
    await api.updateData('app_requests', updated);
    set({ requests: updated });
  },

  updateRequestRegistration: async (requestId, itemId, count) => {
    // Logic dipindahkan dari App.tsx: handleCompleteRequestRegistration
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
      const approvedQuantity = updatedRequest.itemStatuses?.[item.id]?.approvedQuantity ?? item.quantity;
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

    // --- NOTIFICATION LOGIC ---
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
    // --- END NOTIFICATION LOGIC ---
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