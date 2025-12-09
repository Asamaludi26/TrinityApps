
import { create } from 'zustand';
import { User, Division, Customer } from '../types';
import * as api from '../services/api';

interface MasterDataState {
  users: User[];
  divisions: Division[];
  customers: Customer[]; // Added customers
  isLoading: boolean;

  // Actions
  fetchMasterData: () => Promise<void>;
  
  // User Actions
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (id: number, data: Partial<User>) => Promise<void>;
  deleteUser: (id: number) => Promise<void>;
  
  // Division Actions
  addDivision: (division: Omit<Division, 'id'>) => Promise<void>;
  updateDivision: (id: number, data: Partial<Division>) => Promise<void>;
  deleteDivision: (id: number) => Promise<void>;

  // Customer Actions
  addCustomer: (customer: Customer) => Promise<void>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
}

export const useMasterDataStore = create<MasterDataState>((set, get) => ({
  users: [],
  divisions: [],
  customers: [],
  isLoading: false,

  fetchMasterData: async () => {
    set({ isLoading: true });
    try {
      const data = await api.fetchAllData();
      set({ 
        users: data.users, 
        divisions: data.divisions, 
        customers: data.customers,
        isLoading: false 
      });
    } catch (error) {
      console.error("Failed to fetch master data", error);
      set({ isLoading: false });
    }
  },

  // --- USERS ---
  addUser: async (userData) => {
    const currentUsers = get().users;
    const newId = Math.max(...currentUsers.map((u) => u.id), 0) + 1;
    const newUser = { ...userData, id: newId };
    
    const updatedUsers = [newUser, ...currentUsers];
    await api.updateData('app_users', updatedUsers);
    set({ users: updatedUsers });
  },

  updateUser: async (id, data) => {
    const currentUsers = get().users;
    const updatedUsers = currentUsers.map((u) => (u.id === id ? { ...u, ...data } : u));
    
    await api.updateData('app_users', updatedUsers);
    set({ users: updatedUsers });
  },

  deleteUser: async (id) => {
    const currentUsers = get().users;
    const updatedUsers = currentUsers.filter(u => u.id !== id);
    
    await api.updateData('app_users', updatedUsers);
    set({ users: updatedUsers });
  },

  // --- DIVISIONS ---
  addDivision: async (divData) => {
    const currentDivs = get().divisions;
    const newId = Math.max(...currentDivs.map((d) => d.id), 0) + 1;
    const newDiv = { ...divData, id: newId };
    
    const updatedDivs = [newDiv, ...currentDivs];
    await api.updateData('app_divisions', updatedDivs);
    set({ divisions: updatedDivs });
  },

  updateDivision: async (id, data) => {
    const currentDivs = get().divisions;
    const updatedDivs = currentDivs.map((d) => (d.id === id ? { ...d, ...data } : d));
    
    await api.updateData('app_divisions', updatedDivs);
    set({ divisions: updatedDivs });
  },

  deleteDivision: async (id) => {
      const currentDivs = get().divisions;
      const updatedDivs = currentDivs.filter(d => d.id !== id);
      await api.updateData('app_divisions', updatedDivs);
      set({ divisions: updatedDivs });
  },

  // --- CUSTOMERS ---
  addCustomer: async (customer) => {
      const current = get().customers;
      const updated = [customer, ...current];
      await api.updateData('app_customers', updated);
      set({ customers: updated });
  },

  updateCustomer: async (id, data) => {
      const current = get().customers;
      const updated = current.map(c => c.id === id ? { ...c, ...data } : c);
      await api.updateData('app_customers', updated);
      set({ customers: updated });
  },

  deleteCustomer: async (id) => {
      const current = get().customers;
      const updated = current.filter(c => c.id !== id);
      await api.updateData('app_customers', updated);
      set({ customers: updated });
  }
}));
