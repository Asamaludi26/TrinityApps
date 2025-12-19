import React from 'react';
import { Request, User, Notification, ItemStatus } from '../../../../types';
import { useLongPress } from '../../../../hooks/useLongPress';
import { SortConfig } from '../../../../hooks/useSortableData';
import { Checkbox } from '../../../../components/ui/Checkbox';
import { Tooltip } from '../../../../components/ui/Tooltip';
import { EyeIcon } from '../../../../components/icons/EyeIcon';
import { TrashIcon } from '../../../../components/icons/TrashIcon';
import { BellIcon } from '../../../../components/icons/BellIcon';
import { InboxIcon } from '../../../../components/icons/InboxIcon';
import { MegaphoneIcon } from '../../../../components/icons/MegaphoneIcon';
import { InfoIcon } from '../../../../components/icons/InfoIcon';
import { RegisterIcon } from '../../../../components/icons/RegisterIcon';
import { SortIcon } from '../../../../components/icons/SortIcon';
import { SortAscIcon } from '../../../../components/icons/SortAscIcon';
import { SortDescIcon } from '../../../../components/icons/SortDescIcon';
import { RequestStatusIndicator, OrderIndicator } from './RequestStatus';

const SortableHeaderComp: React.FC<{
  children: React.ReactNode;
  columnKey: keyof Request;
  sortConfig: SortConfig<Request> | null;
  requestSort: (key: keyof Request) => void;
  className?: string;
}> = ({ children, columnKey, sortConfig, requestSort, className }) => {
  const isSorted = sortConfig?.key === columnKey;
  const direction = isSorted ? sortConfig.direction : undefined;
  const getSortIcon = () => {
    if (!isSorted) return <SortIcon className="w-4 h-4 text-gray-400" />;
    if (direction === "ascending") return <SortAscIcon className="w-4 h-4 text-tm-accent" />;
    return <SortDescIcon className="w-4 h-4 text-tm-accent" />;
  };
  return (
    <th scope="col" className={`px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500 ${className}`}>
      <button onClick={() => requestSort(columnKey)} className="flex items-center space-x-1 group">
        <span>{children}</span>
        <span className="opacity-50 group-hover:opacity-100">{getSortIcon()}</span>
      </button>
    </th>
  );
};

interface RequestTableProps {
  requests: Request[];
  currentUser: User;
  onDetailClick: (request: Request) => void;
  onDeleteClick: (id: string) => void;
  onOpenStaging: (request: Request) => void;
  sortConfig: SortConfig<Request> | null;
  requestSort: (key: keyof Request) => void;
  selectedRequestIds: string[];
  onSelectOne: (id: string) => void;
  onSelectAll: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isBulkSelectMode: boolean;
  onEnterBulkMode: () => void;
  notifications: Notification[];
  onFollowUpClick: (request: Request) => void;
  highlightedId: string | null;
}

export const RequestTable: React.FC<RequestTableProps> = ({
  requests,
  currentUser,
  onDetailClick,
  onDeleteClick,
  onOpenStaging,
  sortConfig,
  requestSort,
  selectedRequestIds,
  onSelectOne,
  onSelectAll,
  isBulkSelectMode,
  onEnterBulkMode,
  notifications,
  onFollowUpClick,
  highlightedId,
}) => {
  const longPressHandlers = useLongPress(onEnterBulkMode, 500);

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="sticky top-0 z-10 bg-gray-50">
        <tr>
          {isBulkSelectMode && (
            <th scope="col" className="px-6 py-3">
              <Checkbox
                checked={selectedRequestIds.length === requests.length && requests.length > 0}
                onChange={onSelectAll}
                aria-label="Pilih semua request"
              />
            </th>
          )}
          <SortableHeaderComp columnKey="id" sortConfig={sortConfig} requestSort={requestSort}>ID / Tanggal</SortableHeaderComp>
          <SortableHeaderComp columnKey="requester" sortConfig={sortConfig} requestSort={requestSort}>Pemohon</SortableHeaderComp>
          <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500">Detail Permintaan</th>
          <SortableHeaderComp columnKey="status" sortConfig={sortConfig} requestSort={requestSort}>Status</SortableHeaderComp>
          <th scope="col" className="relative px-6 py-3"><span className="sr-only">Aksi</span></th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {requests.length > 0 ? (
          requests.map((req) => {
            const relevantNotifs = notifications.filter(n => n.recipientId === currentUser.id && n.referenceId === req.id);
            const hasUnreadNotif = relevantNotifs.some(n => !n.isRead);
            const isApprover = ["Admin Purchase", "Admin Logistik", "Super Admin"].includes(currentUser.role);
            const showHighlight = hasUnreadNotif && isApprover;
            const unreadNotifTypes = new Set(relevantNotifs.filter(n => !n.isRead).map(n => n.type));

            const now = new Date();
            const lastFollowUpDate = req.lastFollowUpAt ? new Date(req.lastFollowUpAt) : null;
            let isFollowUpDisabled = false;
            let followUpTooltip = "Kirim notifikasi follow-up ke approver";

            if (lastFollowUpDate) {
              const diffHours = (now.getTime() - lastFollowUpDate.getTime()) / (1000 * 60 * 60);
              if (diffHours < 24) {
                isFollowUpDisabled = true;
                followUpTooltip = `Anda dapat follow-up lagi dalam ${Math.ceil(24 - diffHours)} jam.`;
              }
            }

            return (
              <tr
                key={req.id}
                id={`request-row-${req.id}`}
                {...longPressHandlers}
                onClick={() => isBulkSelectMode ? onSelectOne(req.id) : onDetailClick(req)}
                className={`transition-colors cursor-pointer 
                  ${selectedRequestIds.includes(req.id) ? "bg-blue-50" : ""} 
                  ${req.id === highlightedId ? "bg-amber-100 animate-pulse-slow" : showHighlight ? "bg-amber-100/50 animate-pulse-slow" : "hover:bg-gray-50"}`}
              >
                {isBulkSelectMode && (
                  <td className="px-6 py-4 align-top" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selectedRequestIds.includes(req.id)} onChange={() => onSelectOne(req.id)} />
                  </td>
                )}
                <td className="px-6 py-4 lg:whitespace-nowrap">
                  <div className="flex flex-col gap-2">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{req.id}</div>
                      <div className="text-xs text-gray-500">{new Date(req.requestDate).toLocaleString("id-ID")}</div>
                    </div>
                    <OrderIndicator order={req.order} />
                    {showHighlight && (
                      <div className="flex items-center gap-1.5">
                        {unreadNotifTypes.has("CEO_DISPOSITION") && <Tooltip text="Diprioritaskan oleh CEO"><MegaphoneIcon className="w-4 h-4 text-purple-600" /></Tooltip>}
                        {unreadNotifTypes.has("PROGRESS_UPDATE_REQUEST") && <Tooltip text="CEO meminta update progres"><InfoIcon className="w-4 h-4 text-blue-600 animate-pulse" /></Tooltip>}
                        {unreadNotifTypes.has("FOLLOW_UP") && <Tooltip text="Permintaan ini di-follow up"><BellIcon className="w-4 h-4 text-amber-50" /></Tooltip>}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 lg:whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{req.requester}</div>
                  <div className="text-xs text-gray-500">{req.division}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="font-medium text-gray-800">{req.items.length} item</div>
                  <div className="text-xs truncate text-gray-500 max-w-[200px]" title={req.items[0]?.itemName}>
                    {req.items[0]?.itemName}{req.items.length > 1 ? ", ..." : ""}
                  </div>
                </td>
                <td className="px-6 py-4 lg:whitespace-nowrap">
                  <RequestStatusIndicator status={req.status} />
                </td>
                <td className="px-6 py-4 text-sm font-medium text-right lg:whitespace-nowrap">
                  <div className="flex items-center justify-end space-x-2">
                    {(currentUser.role === "Staff" || currentUser.role === "Leader") &&
                      (req.status === ItemStatus.PENDING || req.status === ItemStatus.LOGISTIC_APPROVED) && (
                        <Tooltip text={followUpTooltip} position="left">
                          <button
                            onClick={(e) => { e.stopPropagation(); onFollowUpClick(req); }}
                            disabled={isFollowUpDisabled}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-info-text bg-info-light rounded-lg shadow-sm hover:bg-blue-200 disabled:bg-gray-200 disabled:text-gray-500"
                          >
                            <BellIcon className="w-4 h-4" />
                            <span>Follow Up</span>
                          </button>
                        </Tooltip>
                      )}
                    {req.status === ItemStatus.ARRIVED && !req.isRegistered && (currentUser.role === "Admin Logistik" || currentUser.role === "Super Admin") ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); onOpenStaging(req); }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover"
                      >
                        <RegisterIcon className="w-4 h-4" />
                        <span>Catat Aset</span>
                      </button>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); onDetailClick(req); }} className="flex items-center justify-center w-8 h-8 text-gray-500 transition-colors bg-gray-100 rounded-full hover:bg-info-light hover:text-info-text">
                        <EyeIcon className="w-5 h-5" />
                      </button>
                    )}
                    {(currentUser.role === "Admin Purchase" || currentUser.role === "Super Admin") && (
                      <button onClick={(e) => { e.stopPropagation(); onDeleteClick(req.id); }} className="flex items-center justify-center w-8 h-8 text-gray-500 transition-colors bg-gray-100 rounded-full hover:bg-danger-light hover:text-danger-text">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })
        ) : (
          <tr>
            <td colSpan={isBulkSelectMode ? 6 : 5} className="px-6 py-12 text-center text-gray-500">
              <div className="flex flex-col items-center">
                <InboxIcon className="w-12 h-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak Ada Data Request</h3>
                <p className="mt-1 text-sm text-gray-500">Ubah filter atau buat request baru.</p>
              </div>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};