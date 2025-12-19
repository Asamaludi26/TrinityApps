import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '../types';
import * as api from '../services/api';
import { useUIStore } from './useUIStore';

interface AuthState {
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, pass: string) => Promise<User>;
  logout: () => void;
  updateCurrentUser: (user: User) => void;
  checkSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      isLoading: false,
      error: null,

      login: async (email, pass) => {
        set({ isLoading: true, error: null });
        try {
          const user = await api.loginUser(email, pass);
          set({ currentUser: user, isLoading: false });
          return user;
        } catch (err: any) {
          set({ error: err.message || 'Login failed', isLoading: false });
          throw err;
        }
      },

      logout: () => {
        set({ currentUser: null });
        localStorage.removeItem('currentUser'); // Cleanup legacy
        
        // Reset UI state on logout to prevent session bleed
        useUIStore.getState().resetUIState();
      },

      updateCurrentUser: (user) => {
        set({ currentUser: user });
      },

      checkSession: () => {
        // Logic untuk re-hydrate atau validasi session jika perlu
        const stored = localStorage.getItem('currentUser');
        if (stored) {
            try {
                set({ currentUser: JSON.parse(stored) });
            } catch(e) {
                console.error("Failed to parse stored user", e);
            }
        }
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ currentUser: state.currentUser }), // Hanya persist currentUser
    }
  )
);