
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
import { BsCalendarEvent, BsThreeDotsVertical } from 'react-icons/bs';

const SortableHeaderComp: React.FC<{
  children: React.ReactNode;
  columnKey: keyof Request;
  sortConfig: SortConfig<Request> | null;
  requestSort: (key: keyof Request) => void;
  className?: string;
}> = ({ children, columnKey, sortConfig, requestSort, className }) => {
  const isSorted = sortConfig?.key === columnKey;
  const direction = isSorted ? sortConfig.direction : undefined;
  
  return (
    <th scope="col" className={`px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer group select-none transition-colors hover:text-slate-700 ${className}`} onClick={() => requestSort(columnKey)}>
      <div className="flex items-center gap-2">
        <span>{children}</span>
        <span className={`transition-opacity duration-200 ${isSorted ? 'opacity-100 text-tm-primary' : 'opacity-0 group-hover:opacity-50'}`}>
           {direction === 'ascending' ? <SortAscIcon className="w-3.5 h-3.5" /> : <SortDescIcon className="w-3.5 h-3.5" />}
        </span>
        {!isSorted && <SortIcon className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
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
    <table className="min-w-full divide-y divide-slate-100">
      <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        <tr>
          {isBulkSelectMode && (
            <th scope="col" className="px-6 py-4 w-12">
              <Checkbox
                checked={selectedRequestIds.length === requests.length && requests.length > 0}
                onChange={onSelectAll}
                aria-label="Pilih semua request"
              />
            </th>
          )}
          <SortableHeaderComp columnKey="id" sortConfig={sortConfig} requestSort={requestSort}>Info Request</SortableHeaderComp>
          <SortableHeaderComp columnKey="requester" sortConfig={sortConfig} requestSort={requestSort}>Pemohon</SortableHeaderComp>
          <th scope="col" className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Detail Barang</th>
          <SortableHeaderComp columnKey="status" sortConfig={sortConfig} requestSort={requestSort}>Status</SortableHeaderComp>
          <th scope="col" className="px-6 py-4 w-24 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Aksi</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-slate-50">
        {requests.length > 0 ? (
          requests.map((req) => {
            // Notification Logic
            const relevantNotifs = notifications.filter(n => n.recipientId === currentUser.id && n.referenceId === req.id);
            const hasUnreadNotif = relevantNotifs.some(n => !n.isRead);
            const isApprover = ["Admin Purchase", "Admin Logistik", "Super Admin"].includes(currentUser.role);
            const showHighlight = hasUnreadNotif && isApprover;
            const unreadNotifTypes = new Set(relevantNotifs.filter(n => !n.isRead).map(n => n.type));

            // Follow Up Logic
            const now = new Date();
            const lastFollowUpDate = req.lastFollowUpAt ? new Date(req.lastFollowUpAt) : null;
            let isFollowUpDisabled = false;
            let followUpTooltip = "Kirim notifikasi follow-up ke approver";

            if (lastFollowUpDate) {
              const diffHours = (now.getTime() - lastFollowUpDate.getTime()) / (1000 * 60 * 60);
              if (diffHours < 24) {
                isFollowUpDisabled = true;
                followUpTooltip = `Tunggu ${Math.ceil(24 - diffHours)} jam untuk follow-up lagi.`;
              }
            }

            const isSelected = selectedRequestIds.includes(req.id);
            const isHighlighted = req.id === highlightedId;
            const rowBaseClass = "transition-all duration-200 cursor-pointer group relative border-l-4";
            
            // Dynamic Classes based on state (Accent Border Left)
            let bgClass = "hover:bg-slate-50 bg-white border-l-transparent";
            if (isSelected) bgClass = "bg-blue-50/60 border-l-tm-primary";
            else if (isHighlighted) bgClass = "bg-amber-50 border-l-amber-400 animate-pulse-slow";
            else if (showHighlight) bgClass = "bg-blue-50/30 border-l-blue-400";
            else if (req.order.type === 'Urgent') bgClass = "hover:bg-red-50/20 border-l-transparent hover:border-l-red-400";
            else bgClass = "hover:bg-slate-50 border-l-transparent hover:border-l-slate-300";

            return (
              <tr
                key={req.id}
                id={`request-row-${req.id}`}
                {...longPressHandlers}
                onClick={() => isBulkSelectMode ? onSelectOne(req.id) : onDetailClick(req)}
                className={`${rowBaseClass} ${bgClass}`}
              >
                {isBulkSelectMode && (
                  <td className="px-6 py-5 align-middle" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={isSelected} onChange={() => onSelectOne(req.id)} />
                  </td>
                )}

                {/* Column 1: ID & Date & Type */}
                <td className="px-6 py-5 align-top">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                       <span className="text-sm font-bold text-slate-800 group-hover:text-tm-primary transition-colors font-mono">{req.id}</span>
                       {showHighlight && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <BsCalendarEvent className="w-3 h-3 text-slate-400" />
                        <span>{new Date(req.requestDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>

                    <div className="mt-1">
                        <OrderIndicator order={req.order} />
                    </div>

                    {/* Notification Icons (Subtle) */}
                    {showHighlight && (
                      <div className="flex items-center gap-1.5 mt-1 animate-fade-in-up">
                        {unreadNotifTypes.has("CEO_DISPOSITION") && <Tooltip text="Diprioritaskan oleh CEO"><MegaphoneIcon className="w-3.5 h-3.5 text-purple-600" /></Tooltip>}
                        {unreadNotifTypes.has("PROGRESS_UPDATE_REQUEST") && <Tooltip text="CEO meminta update progres"><InfoIcon className="w-3.5 h-3.5 text-blue-600" /></Tooltip>}
                        {unreadNotifTypes.has("FOLLOW_UP") && <Tooltip text="Permintaan ini di-follow up"><BellIcon className="w-3.5 h-3.5 text-amber-500" /></Tooltip>}
                      </div>
                    )}
                  </div>
                </td>

                {/* Column 2: Requester (Text Only) */}
                <td className="px-6 py-5 align-middle">
                    <div className="flex flex-col">
                        <div className="text-sm font-bold text-slate-800">{req.requester}</div>
                        <div className="text-xs font-medium text-slate-500">{req.division}</div>
                    </div>
                </td>

                {/* Column 3: Items (Visual Badge Style) */}
                <td className="px-6 py-5 align-middle">
                    <div className="flex items-start gap-3">
                        {/* Count Badge */}
                        <div className="flex-shrink-0 bg-slate-100 text-slate-600 font-bold px-2.5 py-1.5 rounded-lg text-xs border border-slate-200 shadow-sm flex flex-col items-center min-w-[3rem]">
                             <span className="text-lg leading-none tracking-tight">{req.items.length}</span>
                             <span className="text-[8px] uppercase tracking-wide opacity-70">Item</span>
                        </div>
                        
                        {/* Item Details */}
                        <div className="flex flex-col justify-center min-h-[3rem]">
                            <div className="text-sm font-semibold text-slate-800 line-clamp-1" title={req.items[0]?.itemName}>
                                {req.items[0]?.itemName}
                            </div>
                            {req.items.length > 1 ? (
                                <span className="text-xs text-slate-500 font-medium">+ {req.items.length - 1} item lainnya</span>
                            ) : (
                                <span className="text-xs text-slate-400">{req.items[0]?.itemTypeBrand || 'Generic'}</span>
                            )}
                        </div>
                    </div>
                </td>

                {/* Column 4: Status */}
                <td className="px-6 py-5 align-middle">
                   <RequestStatusIndicator status={req.status} />
                   {req.status === ItemStatus.LOGISTIC_APPROVED && req.logisticApprover && (
                       <p className="text-[10px] text-slate-400 mt-1.5 ml-1 flex items-center gap-1">
                           <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                           by {req.logisticApprover.split(' ')[0]}
                       </p>
                   )}
                </td>

                {/* Column 5: Actions (Hover Reveal) */}
                <td className="px-6 py-5 align-middle text-right">
                  <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                    {/* Follow Up Button */}
                    {(currentUser.role === "Staff" || currentUser.role === "Leader") &&
                      (req.status === ItemStatus.PENDING || req.status === ItemStatus.LOGISTIC_APPROVED) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onFollowUpClick(req); }}
                            disabled={isFollowUpDisabled}
                            className={`p-2 rounded-full transition-colors ${isFollowUpDisabled ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'}`}
                            title={followUpTooltip}
                          >
                            <BellIcon className="w-4 h-4" />
                          </button>
                      )}

                    {/* Admin Registration Action */}
                    {req.status === ItemStatus.ARRIVED && !req.isRegistered && (currentUser.role === "Admin Logistik" || currentUser.role === "Super Admin") ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); onOpenStaging(req); }}
                            className="p-2 text-emerald-600 bg-emerald-50 rounded-full hover:bg-emerald-100 transition-colors shadow-sm"
                            title="Catat aset ke inventori"
                          >
                            <RegisterIcon className="w-4 h-4" />
                          </button>
                    ) : (
                      /* Detail Button */
                          <button onClick={(e) => { e.stopPropagation(); onDetailClick(req); }} className="p-2 text-slate-400 hover:text-tm-primary hover:bg-blue-50 rounded-full transition-colors" title="Lihat Detail">
                            <EyeIcon className="w-4 h-4" />
                          </button>
                    )}

                    {/* Delete Button */}
                    {(currentUser.role === "Admin Purchase" || currentUser.role === "Super Admin") && (
                          <button onClick={(e) => { e.stopPropagation(); onDeleteClick(req.id); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" title="Hapus Permintaan">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                    )}
                  </div>
                   {/* Mobile View Placeholder */}
                   <div className="sm:hidden group-hover:hidden flex justify-end text-slate-300">
                       <BsThreeDotsVertical className="w-5 h-5" />
                   </div>
                </td>
              </tr>
            );
          })
        ) : (
          <tr>
            <td colSpan={isBulkSelectMode ? 6 : 5} className="px-6 py-16 text-center">
              <div className="flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                    <InboxIcon className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-700">Tidak Ada Permintaan</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                    Belum ada data permintaan yang sesuai dengan filter Anda. Silakan buat permintaan baru atau ubah filter pencarian.
                </p>
              </div>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};
