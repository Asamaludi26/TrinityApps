
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Page } from '../types';

interface UIState {
  activePage: Page;
  isPageLoading: boolean;
  sidebarOpen: boolean;
  pageInitialState: any;
  highlightedItemId: string | null;
  
  // Actions
  setActivePage: (page: Page, initialState?: any) => void;
  setPageLoading: (isLoading: boolean) => void;
  toggleSidebar: (isOpen?: boolean) => void;
  clearPageInitialState: () => void;
  setHighlightOnReturn: (itemId: string) => void;
  clearHighlightOnReturn: () => void;
  resetUIState: () => void;
}

const initialState = {
  activePage: 'dashboard' as Page,
  isPageLoading: false,
  sidebarOpen: false,
  pageInitialState: null,
  highlightedItemId: null,
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
