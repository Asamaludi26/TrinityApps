
import { create } from 'zustand';
import { Page } from '../types';

interface UIState {
  activePage: Page;
  sidebarOpen: boolean;
  pageInitialState: any;
  highlightedItemId: string | null;
  
  // Actions
  setActivePage: (page: Page, initialState?: any) => void;
  toggleSidebar: (isOpen?: boolean) => void;
  clearPageInitialState: () => void;
  setHighlightOnReturn: (itemId: string) => void;
  clearHighlightOnReturn: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activePage: 'dashboard',
  sidebarOpen: false,
  pageInitialState: null,
  highlightedItemId: null,

  setActivePage: (page, initialState = null) => set({ 
    activePage: page, 
    pageInitialState: initialState,
    sidebarOpen: false // Auto close sidebar on mobile on navigation
  }),

  toggleSidebar: (isOpen) => set((state) => ({ 
    sidebarOpen: isOpen !== undefined ? isOpen : !state.sidebarOpen 
  })),

  clearPageInitialState: () => set({ pageInitialState: null }),

  setHighlightOnReturn: (itemId: string) => set({ highlightedItemId: itemId }),
  
  clearHighlightOnReturn: () => set({ highlightedItemId: null }),
}));
