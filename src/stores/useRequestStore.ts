
import { create } from 'zustand';
import { Request, LoanRequest, AssetReturn, ItemStatus, LoanRequestStatus, AssetReturnStatus, RequestItem, AssetStatus, Handover, AssetCondition } from '../types';
import * as api from '../services/api';
import { useNotificationStore } from './useNotificationStore';
import { useUIStore } from './useUIStore'; 
import { useMasterDataStore } from './useMasterDataStore';
import { useAssetStore } from './useAssetStore'; 
import { useTransactionStore } from './useTransactionStore';
import { generateDocumentNumber } from '../utils/documentNumberGenerator';
import { WhatsAppService, sendWhatsAppSimulation, WAMessagePayload } from '../services/whatsappIntegration';
import { useAuthStore } from './useAuthStore';

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
  addReturnBatch: (returnsData: AssetReturn[]) => Promise<void>; 
  updateReturn: (id: string, data: Partial<AssetReturn>) => Promise<void>;
  
  processReturnBatch: (loanRequestId: string, acceptedAssetIds: string[], approverName: string) => Promise<void>;
  submitReturnRequest: (loanRequestId: string, returnItems: { assetId: string, condition: AssetCondition, notes: string }[]) => Promise<void>;
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
     const updatedRequest = await api.approveLoanTransaction(id, payload);
     
     const currentLoans = get().loanRequests;
     const updatedLoans = currentLoans.map(r => r.id === id ? updatedRequest : r);
     set({ loanRequests: updatedLoans });

     await useAssetStore.getState().fetchAssets();

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
  
  addReturnBatch: async (returnsData) => {
      const current = get().returns;
      const updated = [...returnsData, ...current];
      await api.updateData('app_returns', updated);
      set({ returns: updated });
  },

  updateReturn: async (id, data) => {
    const current = get().returns;
    const updated = current.map(r => r.id === id ? { ...r, ...data } : r);
    await api.updateData('app_returns', updated);
    set({ returns: updated });
  },
  
  submitReturnRequest: async (loanRequestId, returnItemsPayload) => {
      const { currentUser } = useAuthStore.getState();
      const { assets, updateAssetBatch } = useAssetStore.getState();
      const { users } = useMasterDataStore.getState();
      const { addSystemNotification } = useNotificationStore.getState();
      const { addReturnBatch, updateLoanRequest, returns } = get();

      const loanRequest = get().loanRequests.find(lr => lr.id === loanRequestId);

      if (!loanRequest || !currentUser) {
          throw new Error("Request atau pengguna tidak ditemukan.");
      }
      
      const today = new Date();
      const returnDocNumber = generateDocumentNumber('RET', returns, today);

      const assetIds = returnItemsPayload.map(item => item.assetId);

      // Create AssetReturn documents
      const newReturns: AssetReturn[] = returnItemsPayload.map(item => {
          const asset = assets.find(a => a.id === item.assetId);
          return {
              id: `RET-ITEM-${item.assetId}-${Date.now()}`,
              docNumber: returnDocNumber,
              returnDate: today.toISOString(),
              loanRequestId: loanRequest.id,
              loanDocNumber: loanRequest.id,
              assetId: item.assetId,
              assetName: asset?.name || 'N/A',
              returnedBy: currentUser.name,
              receivedBy: 'Admin Logistik',
              returnedCondition: item.condition,
              notes: item.notes,
              status: AssetReturnStatus.PENDING_APPROVAL,
          };
      });

      await addReturnBatch(newReturns);
      await updateAssetBatch(assetIds, { status: AssetStatus.AWAITING_RETURN });
      await updateLoanRequest(loanRequest.id, { status: LoanRequestStatus.AWAITING_RETURN });

      // Notify Admins
      const logisticAdmins = users.filter(u => u.role === 'Admin Logistik' || u.role === 'Super Admin');
      logisticAdmins.forEach(admin => {
          addSystemNotification({
              recipientId: admin.id,
              actorName: currentUser.name,
              type: 'STATUS_CHANGE',
              referenceId: returnDocNumber,
              message: `mengajukan pengembalian untuk ${assetIds.length} item. Mohon verifikasi.`
          });
      });

      // Navigate UI
      useUIStore.getState().setActivePage('request-pinjam');
  },

  // CRITICAL FIX: Robust Partial Return Logic
  processReturnBatch: async (loanRequestId, acceptedAssetIds, approverName) => {
      set({ isLoading: true });
      try {
          const now = new Date();
          
          // 1. Fetch Fresh Data to avoid race conditions
          const freshData = await api.fetchAllData();
          
          const currentLoans = freshData.loanRequests;
          const currentReturns = freshData.returns;
          const currentAssets = freshData.assets;
          
          const request = currentLoans.find(r => r.id === loanRequestId);
          if (!request) throw new Error("Loan Request not found");

          // 2. Identify Pending Documents for THIS Loan Request
          const pendingDocs = currentReturns.filter(r => 
              r.loanRequestId === loanRequestId && 
              r.status === AssetReturnStatus.PENDING_APPROVAL
          );

          // 3. Classify based on Selection
          const acceptedDocs = pendingDocs.filter(doc => acceptedAssetIds.includes(doc.assetId));
          const rejectedDocs = pendingDocs.filter(doc => !acceptedAssetIds.includes(doc.assetId));

          // 4. Perform Updates (Immutable)
          
          // A. Update Returns Status
          const updatedReturns = currentReturns.map(doc => {
              if (doc.loanRequestId === loanRequestId && doc.status === AssetReturnStatus.PENDING_APPROVAL) {
                  if (acceptedAssetIds.includes(doc.assetId)) {
                      return { 
                          ...doc, 
                          status: AssetReturnStatus.APPROVED, 
                          approvedBy: approverName, 
                          approvalDate: now.toISOString() 
                      };
                  } else {
                      // Explicitly reject unselected items in this batch
                      return { 
                          ...doc, 
                          status: AssetReturnStatus.REJECTED, 
                          rejectedBy: approverName, 
                          rejectionDate: now.toISOString(), 
                          rejectionReason: "Fisik tidak diterima/tidak dipilih saat verifikasi." 
                      };
                  }
              }
              return doc;
          });

          // B. Update Assets Status
          // - Accepted -> IN_STORAGE
          // - Rejected -> IN_USE (Revert status so user can request again)
          const updatedAssets = currentAssets.map(asset => {
              // Check if this asset is involved in the current transaction
              const isAccepted = acceptedDocs.some(d => d.assetId === asset.id);
              const isRejected = rejectedDocs.some(d => d.assetId === asset.id);

              if (isAccepted) {
                   const targetStatus = (asset.status === AssetStatus.DAMAGED) ? AssetStatus.DAMAGED : AssetStatus.IN_STORAGE;
                   return { 
                       ...asset, 
                       status: targetStatus, 
                       currentUser: null, 
                       location: 'Gudang Inventori' 
                   };
              } 
              
              if (isRejected) {
                   // CRITICAL FIX: Revert status to IN_USE if rejected, so it's not stuck in AWAITING_RETURN
                   return { 
                       ...asset, 
                       status: AssetStatus.IN_USE 
                   };
              }

              return asset;
          });

          // C. Update Loan Request Status
          // Calculate ALL historically returned IDs + NEWLY accepted IDs
          const previouslyReturnedIds = request.returnedAssetIds || [];
          const newAcceptedIds = acceptedDocs.map(d => d.assetId);
          // Use Set to ensure uniqueness
          const finalReturnedIds = [...new Set([...previouslyReturnedIds, ...newAcceptedIds])];

          // Check if ALL assigned assets are now in the returned list
          const allAssignedIds = Object.values(request.assignedAssetIds || {}).flat();
          const isFullyReturned = allAssignedIds.length > 0 && allAssignedIds.every(id => finalReturnedIds.includes(id));
          
          const updatedLoans = currentLoans.map(r => r.id === loanRequestId ? {
              ...r,
              // If fully returned -> RETURNED. 
              // If NOT fully returned (partial rejection or partial request) -> ON_LOAN (Active)
              status: isFullyReturned ? LoanRequestStatus.RETURNED : LoanRequestStatus.ON_LOAN,
              actualReturnDate: isFullyReturned ? now.toISOString() : r.actualReturnDate,
              returnedAssetIds: finalReturnedIds
          } : r);

          // 5. Create Handover (Only for Accepted Items)
          if (acceptedDocs.length > 0) {
              const handoverItems = acceptedDocs.map(doc => ({
                  id: Date.now() + Math.random(),
                  assetId: doc.assetId,
                  itemName: doc.assetName,
                  itemTypeBrand: 'Generic', 
                  conditionNotes: doc.returnedCondition,
                  quantity: 1,
                  checked: true,
              }));

              const newHandover: Handover = {
                  id: `HO-RET-${Date.now()}`,
                  docNumber: generateDocumentNumber('HO-RET', useTransactionStore.getState().handovers, now),
                  handoverDate: now.toISOString().split('T')[0],
                  menyerahkan: request.requester, 
                  penerima: approverName, 
                  mengetahui: 'N/A', 
                  woRoIntNumber: request.id,
                  items: handoverItems,
                  status: ItemStatus.COMPLETED,
              };
              
              await useTransactionStore.getState().addHandover(newHandover);
          }

          // 6. Commit Updates
          await api.updateData('app_returns', updatedReturns);
          await api.updateData('app_assets', updatedAssets);
          await api.updateData('app_loanRequests', updatedLoans);

          // 7. Update Local State
          set({ returns: updatedReturns, loanRequests: updatedLoans });
          useAssetStore.setState({ assets: updatedAssets });

          // 8. Notification
          const notificationStore = useNotificationStore.getState();
          if (acceptedDocs.length > 0) {
              notificationStore.addToast(`Berhasil menerima ${acceptedDocs.length} aset.`, 'success');
          }
          if (rejectedDocs.length > 0) {
              notificationStore.addToast(`${rejectedDocs.length} aset ditolak (status dikembalikan ke 'Dipinjam').`, 'warning');
          }

      } catch (error) {
          console.error("Batch return failed", error);
          useNotificationStore.getState().addToast('Gagal memproses pengembalian.', 'error');
      } finally {
          set({ isLoading: false });
      }
  }
}));
