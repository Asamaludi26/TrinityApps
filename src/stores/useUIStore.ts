
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Page } from '../types';
import { WAMessagePayload } from '../services/whatsappIntegration'; // Import tipe payload

interface UIState {
  activePage: Page;
  isPageLoading: boolean;
  sidebarOpen: boolean;
  pageInitialState: any;
  highlightedItemId: string | null;
  
  // WA Simulation State
  waModalOpen: boolean;
  waModalData: WAMessagePayload | null;

  // Actions
  setActivePage: (page: Page, initialState?: any) => void;
  setPageLoading: (isLoading: boolean) => void;
  toggleSidebar: (isOpen?: boolean) => void;
  clearPageInitialState: () => void;
  setHighlightOnReturn: (itemId: string) => void;
  clearHighlightOnReturn: () => void;
  
  // WA Actions
  openWAModal: (data: WAMessagePayload) => void;
  closeWAModal: () => void;

  resetUIState: () => void;
}

const initialState = {
  activePage: 'dashboard' as Page,
  isPageLoading: false,
  sidebarOpen: false,
  pageInitialState: null,
  highlightedItemId: null,
  waModalOpen: false,
  waModalData: null,
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      ...initialState,

      setActivePage: (page, initialState = null) => set({ 
        activePage: page, 
        pageInitialState: initialState,
        sidebarOpen: false 
      }),

      setPageLoading: (isLoading) => set({ isPageLoading: isLoading }),

      toggleSidebar: (isOpen) => set((state) => ({ 
        sidebarOpen: isOpen !== undefined ? isOpen : !state.sidebarOpen 
      })),

      clearPageInitialState: () => set({ pageInitialState: null }),

      setHighlightOnReturn: (itemId: string) => set({ highlightedItemId: itemId }),
      
      clearHighlightOnReturn: () => set({ highlightedItemId: null }),

      // WA Actions
      openWAModal: (data) => set({ waModalOpen: true, waModalData: data }),
      closeWAModal: () => set({ waModalOpen: false, waModalData: null }),

      resetUIState: () => set(initialState),
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        activePage: state.activePage, 
        pageInitialState: state.pageInitialState 
      }),
    }
  )
);
