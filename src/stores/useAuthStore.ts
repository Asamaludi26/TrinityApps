
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '../types';
import * as api from '../services/api';
import { useUIStore } from './useUIStore';

interface AuthState {
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;
  
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
          // Unified API call handles both Mock and Real endpoints internally
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
        localStorage.removeItem('auth-storage');
        // Clear tokens from localStorage if they exist independently
        useUIStore.getState().resetUIState();
      },

      updateCurrentUser: (user) => {
        set({ currentUser: user });
      },

      checkSession: () => {
        // Logic to validate token expiry could go here
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ currentUser: state.currentUser }), 
    }
  )
);
