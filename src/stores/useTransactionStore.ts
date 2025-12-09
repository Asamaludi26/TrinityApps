




import { create } from 'zustand';
import { Handover, Dismantle, Maintenance, Installation } from '../types';
import * as api from '../services/api';
import { useNotificationStore } from './useNotificationStore';
import { useMasterDataStore } from './useMasterDataStore';

interface TransactionState {
  handovers: Handover[];
  dismantles: Dismantle[];
  maintenances: Maintenance[];
  installations: Installation[];
  isLoading: boolean;

  // Actions
  fetchTransactions: () => Promise<void>;

  // Handover
  addHandover: (handover: Handover) => Promise<void>;
  deleteHandover: (id: string) => Promise<void>;

  // Dismantle
  addDismantle: (dismantle: Dismantle) => Promise<void>;
  updateDismantle: (id: string, data: Partial<Dismantle>) => Promise<void>;
  deleteDismantle: (id: string) => Promise<void>;

  // Maintenance
  addMaintenance: (maintenance: Maintenance) => Promise<void>;
  updateMaintenance: (id: string, data: Partial<Maintenance>) => Promise<void>;
  deleteMaintenance: (id: string) => Promise<void>;

  // Installation
  addInstallation: (installation: Installation) => Promise<void>;
  deleteInstallation: (id: string) => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  handovers: [],
  dismantles: [],
  maintenances: [],
  installations: [],
  isLoading: false,

  fetchTransactions: async () => {
    set({ isLoading: true });
    try {
      const data = await api.fetchAllData();
      set({ 
        handovers: data.handovers,
        dismantles: data.dismantles,
        maintenances: data.maintenances,
        installations: data.installations,
        isLoading: false 
      });
    } catch (error) {
      console.error("Failed to fetch transactions", error);
      set({ isLoading: false });
    }
  },

  // --- HANDOVERS ---
  addHandover: async (handover) => {
    const current = get().handovers;
    const updated = [handover, ...current];
    await api.updateData('app_handovers', updated);
    set({ handovers: updated });

    // --- NOTIFICATION LOGIC ---
    const addSystemNotification = useNotificationStore.getState().addSystemNotification;
    const users = useMasterDataStore.getState().users;
    const recipient = users.find(u => u.name === handover.penerima);
    if (recipient) {
        addSystemNotification({
            recipientId: recipient.id,
            actorName: handover.menyerahkan,
            type: 'ASSET_HANDED_OVER',
            referenceId: handover.id,
            message: `menyerahkan ${handover.items.length} aset baru kepada Anda.`
        });
    }
    // --- END NOTIFICATION LOGIC ---
  },
  
  deleteHandover: async (id) => {
      const current = get().handovers;
      const updated = current.filter(h => h.id !== id);
      await api.updateData('app_handovers', updated);
      set({ handovers: updated });
  },

  // --- DISMANTLES ---
  addDismantle: async (dismantle) => {
    const current = get().dismantles;
    const updated = [dismantle, ...current];
    await api.updateData('app_dismantles', updated);
    set({ dismantles: updated });
  },

  updateDismantle: async (id, data) => {
    const current = get().dismantles;
    const updated = current.map(d => d.id === id ? { ...d, ...data } : d);
    await api.updateData('app_dismantles', updated);
    set({ dismantles: updated });
  },

  deleteDismantle: async (id) => {
      const current = get().dismantles;
      const updated = current.filter(d => d.id !== id);
      await api.updateData('app_dismantles', updated);
      set({ dismantles: updated });
  },

  // --- MAINTENANCES ---
  addMaintenance: async (maintenance) => {
    const current = get().maintenances;
    const updated = [maintenance, ...current];
    await api.updateData('app_maintenances', updated);
    set({ maintenances: updated });
  },

  updateMaintenance: async (id, data) => {
    const current = get().maintenances;
    const updated = current.map(m => m.id === id ? { ...m, ...data } : m);
    await api.updateData('app_maintenances', updated);
    set({ maintenances: updated });
  },

  deleteMaintenance: async (id) => {
      const current = get().maintenances;
      const updated = current.filter(m => m.id !== id);
      await api.updateData('app_maintenances', updated);
      set({ maintenances: updated });
  },

  // --- INSTALLATIONS ---
  addInstallation: async (installation) => {
    const current = get().installations;
    const updated = [installation, ...current];
    await api.updateData('app_installations', updated);
    set({ installations: updated });
  },

  deleteInstallation: async (id) => {
      const current = get().installations;
      const updated = current.filter(i => i.id !== id);
      await api.updateData('app_installations', updated);
      set({ installations: updated });
  }
}));