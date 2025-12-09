
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { BellIcon } from '../icons/BellIcon';
import { InfoIcon } from '../icons/InfoIcon';
import { RequestIcon } from '../icons/RequestIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { RegisterIcon } from '../icons/RegisterIcon';
import { MegaphoneIcon } from '../icons/MegaphoneIcon';
import { CloseIcon } from '../icons/CloseIcon';
import { WrenchIcon } from '../icons/WrenchIcon';
import { SpinnerIcon } from '../icons/SpinnerIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';
import { InboxIcon } from '../icons/InboxIcon';
import { Avatar } from './Avatar';
import { Notification, Page, PreviewData, User } from '../../types';
import { HandoverIcon } from '../icons/HandoverIcon';

// Stores
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useMasterDataStore } from '../../stores/useMasterDataStore';
import { useUIStore } from '../../stores/useUIStore';

interface NotificationBellProps {
  currentUser: User;
  setActivePage: (page: Page, filters?: any) => void;
  onShowPreview: (data: PreviewData) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  currentUser,
  setActivePage,
  onShowPreview,
}) => {
  const notifications = useNotificationStore((state) => state.notifications);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const setHighlightOnReturn = useUIStore((state) => state.setHighlightOnReturn);
  
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const users = useMasterDataStore((state) => state.users);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const myNotifications = useMemo(
    () =>
      notifications
        .filter((n) => n.recipientId === currentUser.id)
        .sort(
          (a, b) =>
            new Date(b.timestamp || '').getTime() - new Date(a.timestamp || '').getTime()
        ),
    [notifications, currentUser.id]
  );

  const unreadCount = useMemo(
    () => myNotifications.filter((n) => !n.isRead).length,
    [myNotifications]
  );

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    
    // Set item to be highlighted when returning to the list view
    if (notification.referenceId) {
      setHighlightOnReturn(notification.referenceId);
    }
    
    if (notification.type && (
      notification.type.startsWith("REQUEST_") ||
      [
        "FOLLOW_UP",
        "CEO_DISPOSITION",
        "PROGRESS_UPDATE_REQUEST",
        "PROGRESS_FEEDBACK",
        "STATUS_CHANGE",
      ].includes(notification.type)
    )) {
      if (notification.referenceId) {
          const targetPage = notification.referenceId.startsWith('LREQ-') ? 'request-pinjam' : 'request';
          setActivePage(targetPage, { openDetailForId: notification.referenceId });
      }
    } else if (notification.type === 'ASSET_HANDED_OVER') {
        if (notification.referenceId) {
            onShowPreview({ type: 'handover', id: notification.referenceId });
        }
    } else if (notification.type && (
      notification.type.startsWith("ASSET_") ||
      ["REPAIR_STARTED", "REPAIR_COMPLETED", "REPAIR_PROGRESS_UPDATE"].includes(
        notification.type
      )
    )) {
       if (notification.referenceId) {
           onShowPreview({ type: "asset", id: notification.referenceId });
       }
    }
    setIsOpen(false);
  };

  const getNotificationDetails = (notification: Notification) => {
    const actor = users.find((u) => u.name === notification.actorName);
    let message = notification.message || "";
    let Icon = InfoIcon;

    switch (notification.type) {
      case "REQUEST_CREATED":
        message = `membuat request baru`;
        Icon = RequestIcon;
        break;
      case "REQUEST_LOGISTIC_APPROVED":
        message = `menyetujui request, mohon isi detail pembelian untuk`;
        Icon = PencilIcon;
        break;
      case "REQUEST_AWAITING_FINAL_APPROVAL":
        message = `menyetujui request, butuh approval final untuk`;
        Icon = CheckIcon;
        break;
      case "REQUEST_FULLY_APPROVED":
        message = `memberikan approval final untuk`;
        Icon = CheckIcon;
        break;
      case "REQUEST_COMPLETED":
        message = `telah menyelesaikan registrasi aset untuk`;
        Icon = RegisterIcon;
        break;
      case "FOLLOW_UP":
        message = `meminta follow-up untuk request`;
        Icon = BellIcon;
        break;
      case "CEO_DISPOSITION":
        message = `memprioritaskan request`;
        Icon = MegaphoneIcon;
        break;
      case "PROGRESS_UPDATE_REQUEST":
        message = `meminta update progres untuk request`;
        Icon = InfoIcon;
        break;
      case "PROGRESS_FEEDBACK":
        message = `memberikan update progres untuk`;
        Icon = CheckIcon;
        break;
      case "STATUS_CHANGE":
        message = `mengubah status request`;
        Icon = RequestIcon;
        break;
      case "REQUEST_APPROVED":
        message = `menyetujui request Anda`;
        Icon = CheckIcon;
        break;
      case "REQUEST_REJECTED":
        message = `menolak request Anda`;
        Icon = CloseIcon;
        break;
      case "ASSET_DAMAGED_REPORT":
        message = `melaporkan kerusakan pada aset`;
        Icon = WrenchIcon;
        break;
      case "REPAIR_STARTED":
        message = `memulai perbaikan untuk aset Anda`;
        Icon = SpinnerIcon;
        break;
      case "REPAIR_COMPLETED":
        message = `menyelesaikan perbaikan untuk aset Anda`;
        Icon = CheckIcon;
        break;
      case "REPAIR_PROGRESS_UPDATE":
        message = `memberi update progres perbaikan aset`;
        Icon = InfoIcon;
        break;
      case "ASSET_DECOMMISSIONED":
        message = `memberhentikan aset Anda yang rusak berat`;
        Icon = ExclamationTriangleIcon;
        break;
      case "ASSET_HANDED_OVER":
        message = `menyerahkan aset baru kepada Anda`;
        Icon = HandoverIcon;
        break;
    }

    const fullMessage = (
      <>
        <strong className="font-semibold text-gray-900">
          {notification.actorName}
        </strong>{" "}
        {message}{" "}
        {notification.referenceId && !message.includes("aset baru") && (
            <strong className="font-semibold text-gray-900">
            #{notification.referenceId}
            </strong>
        )}
        .
      </>
    );

    return { actor, fullMessage, Icon };
  };

  const formatRelativeTime = (isoDate?: string) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const now = new Date();
    const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
    if (diffSeconds < 60) return `${diffSeconds}d lalu`;
    const diffMinutes = Math.round(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m lalu`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}j lalu`;
    return `${Math.round(diffHours / 24)}h lalu`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 text-gray-500 rounded-full hover:bg-gray-100 hover:text-tm-primary"
        title={`${unreadCount} notifikasi belum dibaca`}
      >
        <BellIcon className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-5 w-5">
            <span className="absolute inline-flex w-full h-full bg-red-400 rounded-full opacity-75 animate-ping"></span>
            <span className="relative inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
              {unreadCount}
            </span>
          </span>
        )}
      </button>
      {isOpen && (
        <div className="absolute right-0 z-30 w-96 mt-2 origin-top-right bg-white border border-gray-200 rounded-xl shadow-lg animate-zoom-in">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-base font-semibold text-gray-800">
              Notifikasi
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead(currentUser.id)}
                className="text-xs font-semibold text-tm-primary hover:underline"
              >
                Tandai semua terbaca
              </button>
            )}
          </div>
          <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
            {myNotifications.length > 0 ? (
              myNotifications.map((notif) => {
                const { fullMessage, Icon } = getNotificationDetails(notif);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`relative flex items-start gap-4 p-4 border-b cursor-pointer last:border-b-0 transition-colors ${
                      !notif.isRead
                        ? "bg-blue-50/50 hover:bg-blue-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {!notif.isRead && (
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 bg-tm-primary rounded-full"></span>
                    )}
                    <Avatar
                      name={notif.actorName || 'System'}
                      className="w-9 h-9 text-xs flex-shrink-0"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">{fullMessage}</p>
                      <time className="block mt-1 text-xs font-medium text-gray-400">
                        {formatRelativeTime(notif.timestamp)}
                      </time>
                    </div>
                    <Icon
                      className={`w-5 h-5 text-gray-400 flex-shrink-0 mt-1 ${
                        notif.type === "REPAIR_STARTED" ? "animate-spin" : ""
                      }`}
                    />
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-sm text-center text-gray-500">
                <InboxIcon className="w-12 h-12 mx-auto text-gray-300" />
                <p className="mt-3 font-semibold text-gray-700">
                  Tidak ada notifikasi
                </p>
                <p className="mt-1">
                  Semua notifikasi Anda akan muncul di sini.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
