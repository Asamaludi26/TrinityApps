import { create } from 'zustand';
import { 
    Notification, 
    NotificationSystemType, 
    NotificationType, 
    NotificationAction 
} from '../types';
import * as api from '../services/api';


// FIX: Re-exporting types from the central `types/index.ts` file for compatibility.
export type { NotificationType, NotificationAction };

interface NotificationState {
  notifications: Notification[];
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  // For simple toast notifications
  addToast: (message: string, type?: NotificationType, options?: Partial<Notification>) => void;
  // For persistent system notifications
  addSystemNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
  removeNotification: (id: number) => void;
  markAsRead: (id: number) => void;
  markAllAsRead: (recipientId: number) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  isLoading: false,

  fetchNotifications: async () => {
    // FIX: The 'get' function was missing from the store creator's signature, causing a reference error.
    if (get().notifications.length > 0) return; // Avoid re-fetching
    set({ isLoading: true });
    try {
      // This single call fetches all data, including notifications from the mock layer.
      const data = await api.fetchAllData();
      set({ notifications: data.notifications, isLoading: false });
    } catch (error) {
      console.error("Failed to fetch notifications", error);
      set({ isLoading: false });
    }
  },
  
  // FIX: Explicitly type the `options` parameter to `Partial<Notification>` to resolve type inference error.
  addToast: (message: string, type: NotificationType = 'info', options: Partial<Notification> = {}) => {
    const id = Date.now();
    // FIX: This object now correctly conforms to the unified 'Notification' type from types/index.ts
    const toastNotification: Notification = {
        id,
        message,
        type,
        duration: options.duration || 5000,
        actions: options.actions,
        // Default values for system notification fields
        recipientId: 0, 
        actorName: 'System',
        referenceId: '',
        isRead: true, // Toasts are considered "read" once shown
        timestamp: new Date().toISOString(),
        ...options,
    };
    
    set((state) => ({
      notifications: [toastNotification, ...state.notifications]
    }));
  },

  addSystemNotification: (notificationData) => {
    const newNotification: Notification = {
        ...notificationData,
        id: Date.now(),
        isRead: false,
        timestamp: new Date().toISOString(),
    };
     set((state) => ({
      notifications: [newNotification, ...state.notifications]
    }));
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    }));
  },

  markAsRead: (id: number) => {
    set((state) => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, isRead: true } : n)
    }));
  },

  markAllAsRead: (recipientId: number) => {
      set((state) => ({
          notifications: state.notifications.map(n => n.recipientId === recipientId && !n.isRead ? { ...n, isRead: true } : n)
      }));
  }
}));

// This hook is now for TOASTS only. System notifications are handled by the NotificationBell.
export const useNotification = () => {
    return useNotificationStore((state) => state.addToast);
};