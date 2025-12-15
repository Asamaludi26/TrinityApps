
import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { SuccessIcon } from '../components/icons/SuccessIcon';
import { ErrorIcon } from '../components/icons/ErrorIcon';
import { CloseIcon } from '../components/icons/CloseIcon';
import { InfoIcon } from '../components/icons/InfoIcon';
import { ExclamationTriangleIcon } from '../components/icons/ExclamationTriangleIcon';
import { useNotificationStore } from '../stores/useNotificationStore';
import { Notification, NotificationType, NotificationAction } from '../types';

// Re-export types for compatibility
export type { NotificationType, NotificationAction };

// Keep Context for backward compatibility during migration, 
// but simpler to just export the hook that wraps the store
const NotificationContext = createContext<any>(undefined);

export const useNotification = () => {
  // FIX: Correctly point to `addToast` action from the store.
  return useNotificationStore((state) => state.addToast);
};

const typeDetails: Record<NotificationType, { Icon: React.FC<{className?:string}>; barClass: string }> = {
  success: { Icon: SuccessIcon, barClass: 'bg-success' },
  error: { Icon: ErrorIcon, barClass: 'bg-danger' },
  info: { Icon: InfoIcon, barClass: 'bg-info' },
  warning: { Icon: ExclamationTriangleIcon, barClass: 'bg-warning' },
  SYSTEM: { Icon: InfoIcon, barClass: 'bg-gray-500' },
};

// FIX: Create a type guard to differentiate toast notifications from system notifications.
const isToastNotification = (notification: Notification): notification is Notification & { type: NotificationType; message: string } => {
    return ['success', 'error', 'info', 'warning'].includes(notification.type) && notification.message !== undefined;
};

// FIX: Update the prop type to be more specific, ensuring type safety inside the component.
const Toast: React.FC<{ notification: Notification & { type: NotificationType; message: string } }> = ({ notification }) => {
    const removeNotification = useNotificationStore((state) => state.removeNotification);

    useEffect(() => {
        const timer = setTimeout(() => {
            removeNotification(notification.id);
        }, notification.duration || 5000);

        return () => clearTimeout(timer);
    }, [notification, removeNotification]);

    const details = typeDetails[notification.type];
    const { Icon } = details;

    const getIconColorClass = () => {
        switch (notification.type) {
            case 'success': return 'text-success';
            case 'error': return 'text-danger';
            case 'warning': return 'text-warning-text';
            case 'info': return 'text-info';
            default: return 'text-gray-500';
        }
    };

    return (
        <div 
            className="flex items-start w-full max-w-sm p-4 bg-white border border-gray-200 rounded-xl shadow-lg pointer-events-auto animate-fade-in-up"
            role="alert"
        >
            <div className="flex-shrink-0 pt-0.5">
                <Icon className={`w-6 h-6 ${getIconColorClass()}`} />
            </div>
            <div className="flex-1 w-0 ml-3">
                <p className="text-sm font-semibold text-gray-900">{notification.message}</p>
                 {notification.actions && notification.actions.length > 0 && (
                    <div className="flex items-center gap-2 mt-3">
                        {notification.actions.map((action, index) => (
                            <button
                                key={index}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    action.onClick();
                                    removeNotification(notification.id);
                                }}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors shadow-sm ${
                                    action.variant === 'secondary'
                                        ? 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                        : 'text-white bg-tm-primary hover:bg-tm-primary-hover'
                                }`}
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div className="flex-shrink-0 ml-4">
                <button
                    onClick={() => removeNotification(notification.id)}
                    className="inline-flex text-gray-400 rounded-md hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tm-accent"
                >
                    <span className="sr-only">Close</span>
                    <CloseIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};


export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const notifications = useNotificationStore((state) => state.notifications);
  // FIX: Correctly reference `addToast` instead of the non-existent `addNotification`.
  const addToast = useNotificationStore((state) => state.addToast);

  return (
    <NotificationContext.Provider value={addToast}>
      {children}
      
      <div
        aria-live="assertive"
        className="fixed inset-0 z-[100] flex items-end px-4 py-6 pointer-events-none sm:p-6"
      >
        <div className="flex flex-col items-end w-full space-y-4">
          {/* FIX: Filter notifications to only render toast-style notifications. */}
          {notifications.filter(isToastNotification).map((notification) => (
            <Toast key={notification.id} notification={notification} />
          ))}
        </div>
      </div>
    </NotificationContext.Provider>
  );
};
