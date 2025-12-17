
import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Request,
  ItemStatus,
  RequestItem,
  User,
  AssetStatus,
  Asset,
  PreviewData,
  AssetCategory,
  AssetType,
  StandardItem,
  Division,
  Page,
  OrderDetails,
  OrderType,
  Notification,
  UserRole,
  PurchaseDetails,
  Activity,
} from "../../../types";
import Modal from "../../../components/ui/Modal";
import { Avatar } from "../../../components/ui/Avatar";
import { CloseIcon } from "../../../components/icons/CloseIcon";
import DatePicker from "../../../components/ui/DatePicker";
import { EyeIcon } from "../../../components/icons/EyeIcon";
import { TrashIcon } from "../../../components/icons/TrashIcon";
import FloatingActionBar from "../../../components/ui/FloatingActionBar";
import { useNotification } from "../../../providers/NotificationProvider";
import { InboxIcon } from "../../../components/icons/InboxIcon";
import { useSortableData, SortConfig } from "../../../hooks/useSortableData";
import { SortAscIcon } from "../../../components/icons/SortAscIcon";
import { SortDescIcon } from "../../../components/icons/SortDescIcon";
import { SortIcon } from "../../../components/icons/SortIcon";
import { exportToCSV } from "../../../utils/csvExporter";
import { Checkbox } from "../../../components/ui/Checkbox";
import { useLongPress } from "../../../hooks/useLongPress";
import { SpinnerIcon } from "../../../components/icons/SpinnerIcon";
import { SearchIcon } from "../../../components/icons/SearchIcon";
import { PaginationControls } from "../../../components/ui/PaginationControls";
import { RegisterIcon } from "../../../components/icons/RegisterIcon";
import { ExclamationTriangleIcon } from "../../../components/icons/ExclamationTriangleIcon";
import { Tooltip } from "../../../components/ui/Tooltip";
import { CustomSelect } from "../../../components/ui/CustomSelect";
import { CreatableSelect } from "../../../components/ui/CreatableSelect";
import { FilterIcon } from "../../../components/icons/FilterIcon";
import { CheckIcon } from "../../../components/icons/CheckIcon";
import { BellIcon } from "../../../components/icons/BellIcon";
import { MegaphoneIcon } from "../../../components/icons/MegaphoneIcon";
import { InfoIcon } from "../../../components/icons/InfoIcon";
import { ExportIcon } from "../../../components/icons/ExportIcon";
import { PlusIcon } from "../../../components/icons/PlusIcon";
import {
  RequestStatusIndicator,
  OrderIndicator,
} from "./components/RequestStatus";
import NewRequestDetailPage from "./NewRequestDetailPage";
import { SignatureStamp } from "../../../components/ui/SignatureStamp";
import { PencilIcon } from "../../../components/icons/PencilIcon";
import { Letterhead } from "../../../components/ui/Letterhead";
import { toYYYYMMDD } from "../../../utils/dateFormatter";
import { AssetIcon } from "../../../components/icons/AssetIcon";
import { ModelManagementModal } from "../../../components/ui/ModelManagementModal";
import { TypeManagementModal } from "../../../components/ui/TypeManagementModal";
import { CategoryFormModal } from "../../categories/CategoryManagementPage";
import { BsLightningFill, BsBoxSeam, BsFileEarmarkSpreadsheet, BsTable, BsCalendarRange, BsPersonBadge, BsInfoCircleFill } from "react-icons/bs";

// Stores
import { useRequestStore } from "../../../stores/useRequestStore";
import { useAssetStore } from "../../../stores/useAssetStore";
import { useMasterDataStore } from "../../../stores/useMasterDataStore";
import { useNotificationStore } from "../../../stores/useNotificationStore";
import { useUIStore } from "../../../stores/useUIStore";

const canViewPrice = (role: UserRole) =>
  ["Admin Purchase", "Super Admin"].includes(role);

// --- COMPONENT: Export Config Modal ---
const ExportConfigModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  data: Request[];
  onConfirmExport: (mappedData: any[], filename: string, extraHeader: any) => void;
}> = ({ isOpen, onClose, currentUser, data, onConfirmExport }) => {
  const [rangeType, setRangeType] = useState('all');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const rangeOptions = [
    { value: 'all', label: 'Semua Data Permintaan (Seluruh Database)' },
    { value: 'today', label: 'Hari Ini (Aktivitas Terbaru)' },
    { value: 'week', label: '7 Hari Terakhir (Laporan Mingguan)' },
    { value: 'month', label: 'Bulan Berjalan (Laporan Bulanan)' },
    { value: 'year', label: 'Tahun Berjalan (Laporan Tahunan)' },
    { value: 'custom', label: 'Rentang Tanggal Kustom (Pilih Manual)' },
  ];

  const filteredData = useMemo(() => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    
    return data.filter(item => {
      const itemDate = new Date(item.requestDate);
      
      switch (rangeType) {
        case 'today':
          return itemDate.toDateString() === now.toDateString();
        case 'week': {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          return itemDate >= weekAgo && itemDate <= now;
        }
        case 'month':
          return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
        case 'year':
          return itemDate.getFullYear() === now.getFullYear();
        case 'custom':
          if (!startDate || !endDate) return true;
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          return itemDate >= start && itemDate <= end;
        default:
          return true;
      }
    });
  }, [data, rangeType, startDate, endDate]);

  const totalValueSum = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + (item.totalValue || 0), 0);
  }, [filteredData]);

  const prepareMappedData = (requests: Request[]) => {
    return requests.map((req, index) => {
      const itemsFormatted = req.items
        .map(i => `${i.quantity}x ${i.itemName} [${i.itemTypeBrand}]`)
        .join('; ');

      const totalQty = req.items.reduce((sum, i) => sum + i.quantity, 0);
      const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('id-ID', { 
        day: '2-digit', month: '2-digit', year: 'numeric' 
      }) : '-';

      return {
        'NO': index + 1,
        'ID REQUEST': req.id,
        'TANGGAL PENGAJUAN': fmtDate(req.requestDate),
        'NAMA PEMOHON': req.requester.toUpperCase(),
        'DIVISI': req.division,
        'TIPE ORDER': req.order.type,
        'REFERENSI PROYEK JUSTIFIKASI': req.order.project || req.order.justification || 'Reguler',
        'STATUS DOKUMEN': req.status,
        'DAFTAR BARANG': itemsFormatted,
        'TOTAL UNIT': totalQty,
        'ESTIMASI NILAI': req.totalValue || 0,
        'ESTIMASI NILAI FORMAT': req.totalValue ? `Rp ${req.totalValue.toLocaleString('id-ID')}` : 'Rp 0',
        'APPROVER LOGISTIK': req.logisticApprover || '-',
        'TGL APPROVE LOGISTIK': fmtDate(req.logisticApprovalDate),
        'APPROVER FINAL': req.finalApprover || '-',
        'TGL APPROVE FINAL': fmtDate(req.finalApprovalDate),
        'CATATAN REVISI TOLAK': req.rejectionReason || '-'
      };
    });
  };

  const handleExport = () => {
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0].replace(/-/g, '');
    const filename = `LAPORAN_REQUEST_${rangeType.toUpperCase()}_${timestamp}`;
    
    const mappedData = prepareMappedData(filteredData);
    
    const extraHeader = {
        title: "LAPORAN DAFTAR REQUEST ASET",
        metadata: {
            "Akun": currentUser.name,
            "Range Waktu": rangeType === 'custom' ? `${startDate?.toLocaleDateString('id-ID')} - ${endDate?.toLocaleDateString('id-ID')}` : rangeOptions.find(o => o.value === rangeType)?.label || rangeType,
            "Tanggal Cetak": now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
        }
    };

    onConfirmExport(mappedData, filename, extraHeader);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Laporan Profesional" size="lg">
      <div className="space-y-6">
        {/* Banner Section */}
        <div className="flex items-center gap-5 p-6 bg-gradient-to-r from-tm-dark to-slate-800 text-white rounded-2xl shadow-lg border border-slate-700">
          <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
            <BsFileEarmarkSpreadsheet className="w-12 h-12 text-tm-accent" />
          </div>
          <div>
            <h4 className="font-black text-xl tracking-tight uppercase">Excel Report Engine</h4>
            <p className="text-sm text-slate-400 mt-1">Konfigurasikan parameter laporan Anda untuk hasil yang akurat.</p>
          </div>
        </div>

        <div className="space-y-5">
            {/* Section 1: Filter Waktu (Full Width Row) */}
            <div className="p-5 bg-white border border-gray-200 rounded-2xl shadow-sm hover:border-tm-accent/30 transition-colors">
                <label className="flex items-center gap-2 text-xs font-black text-tm-primary uppercase tracking-widest mb-4">
                    <BsCalendarRange className="w-4 h-4"/> 1. Tentukan Periode Data
                </label>
                <div className="space-y-4">
                    <CustomSelect 
                        options={rangeOptions} 
                        value={rangeType} 
                        onChange={setRangeType} 
                    />
                    
                    {rangeType === 'custom' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl animate-fade-in-up">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Tanggal Mulai</label>
                                <DatePicker id="export-start" selectedDate={startDate} onDateChange={setStartDate} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Tanggal Selesai</label>
                                <DatePicker id="export-end" selectedDate={endDate} onDateChange={setEndDate} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Section 2: Informasi Akun (Full Width Row) */}
            <div className="p-5 bg-white border border-gray-200 rounded-2xl shadow-sm hover:border-tm-accent/30 transition-colors">
                <label className="flex items-center gap-2 text-xs font-black text-tm-primary uppercase tracking-widest mb-4">
                    <BsPersonBadge className="w-4 h-4"/> 2. Metadata Pembuat Laporan
                </label>
                <div className="flex items-center gap-4 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                    <Avatar name={currentUser.name} className="w-14 h-14 shadow-md border-2 border-white" />
                    <div className="min-w-0">
                        <p className="text-lg font-extrabold text-tm-dark truncate leading-tight">{currentUser.name}</p>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter mt-1">{currentUser.role} &bull; PT. Triniti Media Indonesia</p>
                    </div>
                    <div className="ml-auto hidden sm:block">
                        <div className="flex items-center gap-1 px-2 py-1 bg-white border rounded-lg text-[10px] font-mono font-bold text-tm-primary">
                            VALIDATED
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 3: Summary Statistics (Footer Highlight) */}
            <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl">
                <div className="px-5 py-2.5 bg-slate-800/50 border-b border-white/5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live Export Statistics</p>
                </div>
                <div className="p-5 grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Baris Ditemukan</span>
                        <p className="text-2xl font-black text-white">{filteredData.length} <span className="text-xs font-medium text-slate-400">Request</span></p>
                    </div>
                    <div className="space-y-1 border-l border-white/10 pl-4">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Akumulasi Nilai</span>
                        <p className="text-2xl font-black text-tm-accent truncate">Rp {totalValueSum.toLocaleString('id-ID')}</p>
                    </div>
                </div>
                <div className="px-5 py-3 bg-tm-primary/10 flex items-center gap-2">
                    <BsInfoCircleFill className="text-tm-accent w-3 h-3" />
                    <p className="text-[10px] text-slate-400 font-medium italic">Format file: CSV UTF-8 with Byte Order Mark (BOM) untuk kompatibilitas Excel penuh.</p>
                </div>
            </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button onClick={onClose} className="order-2 sm:order-1 flex-1 px-6 py-3.5 text-sm font-black text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all uppercase tracking-widest">Batal</button>
          <button 
            onClick={handleExport} 
            disabled={filteredData.length === 0}
            className="order-1 sm:order-2 flex-[2] inline-flex items-center justify-center gap-3 px-6 py-3.5 text-sm font-black text-white bg-tm-primary rounded-xl shadow-lg shadow-tm-primary/25 hover:bg-tm-primary-hover disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed transition-all transform active:scale-95 uppercase tracking-widest"
          >
            <BsTable className="w-5 h-5" />
            Download Laporan
          </button>
        </div>
      </div>
    </Modal>
  );
};

// --- MAIN PAGE COMPONENT ---
interface NewRequestPageProps {
  currentUser: User;
  onInitiateRegistration: (
    request: Request,
    itemToRegister: RequestItem
  ) => void;
  onInitiateHandoverFromRequest: (request: Request) => void;
  initialFilters?: any;
  onClearInitialFilters: () => void;
  onShowPreview: (data: PreviewData) => void;
  setActivePage: (page: Page, initialState?: any) => void;
  markNotificationsAsRead: (referenceId: string) => void;
}

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
    if (direction === "ascending")
      return <SortAscIcon className="w-4 h-4 text-tm-accent" />;
    return <SortDescIcon className="w-4 h-4 text-tm-accent" />;
  };
  return (
    <th
      scope="col"
      className={`px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500 ${className}`}
    >
      <button
        onClick={() => requestSort(columnKey)}
        className="flex items-center space-x-1 group"
      >
        <span>{children}</span>
        <span className="opacity-50 group-hover:opacity-100">
          {getSortIcon()}
        </span>
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

const RequestTable: React.FC<RequestTableProps> = ({
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
  const handleRowClick = (req: Request) => {
    if (isBulkSelectMode) {
      onSelectOne(req.id);
    } else {
      onDetailClick(req);
    }
  };

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="sticky top-0 z-10 bg-gray-50">
        <tr>
          {isBulkSelectMode && (
            <th scope="col" className="px-6 py-3">
              <Checkbox
                checked={
                  selectedRequestIds.length === requests.length &&
                  requests.length > 0
                }
                onChange={onSelectAll}
                aria-label="Pilih semua request"
              />
            </th>
          )}
          <SortableHeaderComp
            columnKey="id"
            sortConfig={sortConfig}
            requestSort={requestSort}
          >
            ID / Tanggal
          </SortableHeaderComp>
          <SortableHeaderComp
            columnKey="requester"
            sortConfig={sortConfig}
            requestSort={requestSort}
          >
            Pemohon
          </SortableHeaderComp>
          <th
            scope="col"
            className="px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500"
          >
            Detail Permintaan
          </th>
          <SortableHeaderComp
            columnKey="status"
            sortConfig={sortConfig}
            requestSort={requestSort}
          >
            Status
          </SortableHeaderComp>
          <th scope="col" className="relative px-6 py-3">
            <span className="sr-only">Aksi</span>
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {requests.length > 0 ? (
          requests.map((req) => {
            const relevantNotifs = notifications.filter(
              (n) =>
                n.recipientId === currentUser.id && n.referenceId === req.id
            );
            const hasUnreadNotif = relevantNotifs.some((n) => !n.isRead);
            const isApprover = [
              "Admin Purchase",
              "Admin Logistik",
              "Super Admin",
            ].includes(currentUser.role);
            const showHighlight = hasUnreadNotif && isApprover;

            const unreadNotifTypes = new Set(
              relevantNotifs.filter((n) => !n.isRead).map((n) => n.type)
            );

            const now = new Date();
            const lastFollowUpDate = req.lastFollowUpAt
              ? new Date(req.lastFollowUpAt)
              : null;
            let isFollowUpDisabled = false;
            let followUpTooltip = "Kirim notifikasi follow-up ke approver";

            if (lastFollowUpDate) {
              const diffHours =
                (now.getTime() - lastFollowUpDate.getTime()) / (1000 * 60 * 60);
              if (diffHours < 24) {
                isFollowUpDisabled = true;
                const hoursRemaining = Math.ceil(24 - diffHours);
                followUpTooltip = `Anda dapat follow-up lagi dalam ${hoursRemaining} jam.`;
              }
            }

            return (
              <tr
                key={req.id}
                id={`request-row-${req.id}`}
                {...longPressHandlers}
                onClick={() => handleRowClick(req)}
                className={`transition-colors cursor-pointer 
                                ${
                                  selectedRequestIds.includes(req.id)
                                    ? "bg-blue-50"
                                    : ""
                                } 
                                ${
                                  req.id === highlightedId
                                    ? "bg-amber-100 animate-pulse-slow"
                                    : showHighlight
                                    ? "bg-amber-100/50 animate-pulse-slow"
                                    : "hover:bg-gray-50"
                                }`}
              >
                {isBulkSelectMode && (
                  <td
                    className="px-6 py-4 align-top"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={selectedRequestIds.includes(req.id)}
                      onChange={() => onSelectOne(req.id)}
                      aria-labelledby={`request-id-${req.id}`}
                    />
                  </td>
                )}
                <td className="px-6 py-4 lg:whitespace-nowrap">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col gap-2">
                      <div>
                        <div
                          id={`request-id-${req.id}`}
                          className="text-sm font-semibold text-gray-900"
                        >
                          {req.id}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(req.requestDate).toLocaleString("id-ID")}
                        </div>
                      </div>
                      <OrderIndicator order={req.order} />
                      {showHighlight && (
                        <div className="flex items-center gap-1.5">
                          {unreadNotifTypes.has("CEO_DISPOSITION") && (
                            <Tooltip text="Diprioritaskan oleh CEO">
                              <MegaphoneIcon className="w-4 h-4 text-purple-600" />
                            </Tooltip>
                          )}
                          {unreadNotifTypes.has("PROGRESS_UPDATE_REQUEST") && (
                            <Tooltip text="CEO meminta update progres">
                              <InfoIcon className="w-4 h-4 text-blue-600 animate-pulse" />
                            </Tooltip>
                          )}
                          {unreadNotifTypes.has("FOLLOW_UP") && (
                            <Tooltip text="Permintaan ini di-follow up">
                              <BellIcon className="w-4 h-4 text-amber-500" />
                            </Tooltip>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 lg:whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {req.requester}
                  </div>
                  <div className="text-xs text-gray-500">{req.division}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="font-medium text-gray-800">
                    {req.items.length} item
                  </div>
                  <div
                    className="text-xs truncate text-gray-500 max-w-[200px]"
                    title={req.items[0]?.itemName}
                  >
                    {req.items[0]?.itemName}
                    {req.items.length > 1 ? ", ..." : ""}
                  </div>
                </td>
                <td className="px-6 py-4 lg:whitespace-nowrap">
                  <RequestStatusIndicator status={req.status} />
                </td>
                <td className="px-6 py-4 text-sm font-medium text-right lg:whitespace-nowrap">
                  <div className="flex items-center justify-end space-x-2">
                    {(currentUser.role === "Staff" ||
                      currentUser.role === "Leader") &&
                      (req.status === ItemStatus.PENDING ||
                        req.status === ItemStatus.LOGISTIC_APPROVED) && (
                        <Tooltip text={followUpTooltip} position="left">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onFollowUpClick(req);
                            }}
                            disabled={isFollowUpDisabled}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-info-text bg-info-light rounded-lg shadow-sm hover:bg-blue-200 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
                            aria-label={followUpTooltip}
                          >
                            <BellIcon className="w-4 h-4" />
                            <span>Follow Up</span>
                          </button>
                        </Tooltip>
                      )}
                    {req.status === ItemStatus.ARRIVED &&
                    !req.isRegistered &&
                    (currentUser.role === "Admin Logistik" ||
                      currentUser.role === "Super Admin") ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenStaging(req);
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-white transition-all duration-200 bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover"
                        title="Catat sebagai Aset"
                      >
                        <RegisterIcon className="w-4 h-4" />
                        <span>Catat Aset</span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDetailClick(req);
                        }}
                        className="flex items-center justify-center w-8 h-8 text-gray-500 transition-colors bg-gray-100 rounded-full hover:bg-info-light hover:text-info-text"
                        title="Lihat Detail"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                    )}
                    {(currentUser.role === "Admin Purchase" ||
                      currentUser.role === "Super Admin") && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteClick(req.id);
                        }}
                        className="flex items-center justify-center w-8 h-8 text-gray-500 transition-colors bg-gray-100 rounded-full hover:bg-danger-light hover:text-danger-text"
                        title="Hapus"
                      >
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
            <td
              colSpan={isBulkSelectMode ? 6 : 5}
              className="px-6 py-12 text-center text-gray-500"
            >
              <div className="flex flex-col items-center">
                <InboxIcon className="w-12 h-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Tidak Ada Data Request
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Ubah filter atau buat request baru.
                </p>
              </div>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

type RequestItemForm = Omit<RequestItem, "id"> & {
  id: number;
  categoryId: string;
  typeId: string;
};

const RequestForm: React.FC<{
  currentUser: User;
  assets: Asset[];
  assetCategories: AssetCategory[];
  divisions: Division[];
  onCreateRequest: (
    data: Omit<
      Request,
      | "id"
      | "status"
      | "docNumber"
      | "logisticApprover"
      | "logisticApprovalDate"
      | "finalApprover"
      | "finalApprovalDate"
      | "rejectionReason"
      | "rejectedBy"
      | "rejectionDate"
      | "rejectedByDivision"
    >
  ) => void;
  prefillItem: { name: string; brand: string } | null;
  setActivePage: (page: Page, initialState?: any) => void;
}> = ({
  currentUser,
  assets,
  assetCategories,
  divisions,
  onCreateRequest,
  prefillItem,
  setActivePage,
}) => {
  const [requestDate, setRequestDate] = useState<Date | null>(new Date());
  const [requesterName, setRequesterName] = useState(currentUser.name);
  const [requesterDivision, setRequesterDivision] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("Regular Stock");
  const [justification, setJustification] = useState("");
  const [project, setProject] = useState("");
  const [items, setItems] = useState<RequestItemForm[]>([
    {
      id: Date.now(),
      categoryId: "",
      typeId: "",
      itemName: "",
      itemTypeBrand: "",
      stock: 0,
      quantity: 1,
      keterangan: "",
    },
  ]);
  const [isFooterVisible, setIsFooterVisible] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  
  // State for internal modals
  const [modelModalState, setModelModalState] = useState<{ isOpen: boolean; category: AssetCategory | null; type: AssetType | null }>({ isOpen: false, category: null, type: null });
  const [typeModalState, setTypeModalState] = useState<{ isOpen: boolean; category: AssetCategory | null; typeToEdit: AssetType | null }>({ isOpen: false, category: null, typeToEdit: null });

  const footerRef = useRef<HTMLDivElement>(null);
  const addNotification = useNotification();
  
  // Store actions needed for Category Creation
  const updateCategories = useAssetStore((state) => state.updateCategories);

  const availableCategories = useMemo(() => {
    if (currentUser.role === "Staff" && currentUser.divisionId) {
      return assetCategories.filter(
        (category) =>
          category.associatedDivisions.length === 0 ||
          category.associatedDivisions.includes(currentUser.divisionId!)
      );
    }
    return assetCategories;
  }, [assetCategories, currentUser]);

  const orderOptions = useMemo(() => {
    const allOptions = [
      {
        value: "Regular Stock",
        label: "Regular Stock",
        indicator: <OrderIndicator order={{ type: "Regular Stock" }} />,
      },
      {
        value: "Urgent",
        label: "Urgent",
        indicator: <OrderIndicator order={{ type: "Urgent" }} />,
      },
      {
        value: "Project Based",
        label: "Project Based",
        indicator: <OrderIndicator order={{ type: "Project Based" }} />,
      },
    ];
    if (currentUser.role === "Staff")
      return allOptions.filter((opt) => opt.value === "Regular Stock");
    return allOptions;
  }, [currentUser.role]);
  const formId = "item-request-form";

  useEffect(() => {
    const userDivision = divisions.find((d) => d.id === currentUser.divisionId);
    if (userDivision) setRequesterDivision(userDivision.name);
  }, [currentUser, divisions]);

  useEffect(() => {
    if (prefillItem) {
      const stock = assets.filter(
        (asset) =>
          asset.name === prefillItem.name &&
          asset.status === AssetStatus.IN_STORAGE
      ).length;
      const category = availableCategories.find((c) =>
        c.types.some((t) =>
          t.standardItems?.some((si) => si.name === prefillItem?.name)
        )
      );
      const type = category?.types.find((t) =>
        t.standardItems?.some((si) => si.name === prefillItem?.name)
      );
      setItems([
        {
          id: Date.now(),
          categoryId: category?.id.toString() || "",
          typeId: type?.id.toString() || "",
          itemName: prefillItem.name,
          itemTypeBrand: prefillItem.brand,
          stock: stock,
          quantity: 1,
          keterangan: "Permintaan dari halaman stok.",
        },
      ]);
    }
  }, [prefillItem, assets, availableCategories]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsFooterVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    const currentRef = footerRef.current;
    if (currentRef) observer.observe(currentRef);
    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, []);

  const handleAddItem = () =>
    setItems([
      ...items,
      {
        id: Date.now(),
        categoryId: "",
        typeId: "",
        itemName: "",
        itemTypeBrand: "",
        stock: 0,
        quantity: 1,
        keterangan: "",
      },
    ]);
  const handleRemoveItem = (id: number) => {
    if (items.length > 1) setItems(items.filter((item) => item.id !== id));
  };
  const handleItemChange = (
    id: number,
    field: keyof RequestItemForm,
    value: string | number
  ) =>
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  const handleCategoryChange = (id: number, categoryId: string) =>
    setItems(
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              categoryId,
              typeId: "",
              itemName: "",
              itemTypeBrand: "",
              stock: 0,
            }
          : item
      )
    );
  const handleTypeChange = (id: number, typeId: string) =>
    setItems(
      items.map((item) =>
        item.id === id
          ? { ...item, typeId, itemName: "", itemTypeBrand: "", stock: 0 }
          : item
      )
    );
  const handleModelChange = (id: number, modelNameOrValue: string) => {
    const model = availableCategories
      .flatMap((c) => c.types)
      .flatMap((t) => t.standardItems)
      .find((m) => m?.name === modelNameOrValue);
      
    if (model) {
        // Known model from master data
        const stock = assets.filter(
          (asset) =>
            asset.name === model.name && asset.status === AssetStatus.IN_STORAGE
        ).length;
        setItems(
          items.map((item) =>
            item.id === id
              ? { ...item, itemName: model.name, itemTypeBrand: model.brand, stock }
              : item
          )
        );
    } else {
        // Manual input (new model)
        setItems(
            items.map((item) =>
              item.id === id
                ? { ...item, itemName: modelNameOrValue, stock: 0 } // Reset stock to 0 for new item
                : item
            )
          );
    }
  };

  const handleSaveCategory = async (formData: Omit<AssetCategory, 'id'|'types'>) => {
      try {
          const newCategory: AssetCategory = { ...formData, id: Date.now(), types: [] };
          const updatedCategories = [...assetCategories, newCategory];
          await updateCategories(updatedCategories);
          addNotification(`Kategori "${formData.name}" ditambahkan.`, 'success');
      } catch (error) {
          addNotification('Gagal menyimpan kategori.', 'error');
      } finally {
          setIsCategoryModalOpen(false);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderType === "Urgent" && !justification.trim()) {
      addNotification(
        "Justifikasi harus diisi untuk permintaan Urgent.",
        "error"
      );
      return;
    }
    if (orderType === "Project Based" && !project.trim()) {
      addNotification("Nama/Kode Proyek harus diisi.", "error");
      return;
    }

    // Validation for manually entered items
    for (const item of items) {
        if (!item.itemName.trim()) {
            addNotification("Nama barang tidak boleh kosong.", "error");
            return;
        }
        if (!item.itemTypeBrand.trim()) {
             addNotification(`Harap isi Brand untuk item "${item.itemName}".`, "error");
             return;
        }
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const totalValue = items.reduce((sum, item) => {
        const assetSample = assets.find(
          (a) => a.name === item.itemName && a.brand === item.itemTypeBrand
        );
        return sum + (assetSample?.purchasePrice || 0) * item.quantity;
      }, 0);

      const finalItems = items.map(({ categoryId, typeId, ...rest }) => rest);
      const orderDetails: OrderDetails = {
        type: orderType,
        justification: orderType === "Urgent" ? justification : undefined,
        project: orderType === "Project Based" ? project : undefined,
      };

      onCreateRequest({
        requester: requesterName,
        division: requesterDivision,
        requestDate: requestDate
          ? toYYYYMMDD(requestDate)
          : toYYYYMMDD(new Date()),
        order: orderDetails,
        items: finalItems,
        totalValue,
      });
      setIsSubmitting(false);
    }, 1000);
  };

  const ActionButtons: React.FC<{ formId?: string }> = ({ formId }) => (
    <button
      type="submit"
      form={formId}
      disabled={isSubmitting}
      className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tm-accent disabled:bg-tm-primary/70 disabled:cursor-not-allowed"
    >
      {isSubmitting ? <SpinnerIcon className="w-5 h-5 mr-2" /> : null}
      {isSubmitting ? "Mengajukan..." : "Ajukan Permintaan"}
    </button>
  );

  return (
    <>
      <form id={formId} className="space-y-6" onSubmit={handleSubmit}>
        <Letterhead />
        <div className="text-center">
          <h3 className="text-xl font-bold uppercase text-tm-dark">
            Surat Permintaan Pembelian Barang
          </h3>
        </div>
        <div className="p-4 border-t border-b border-gray-200">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label
                htmlFor="requestNumber"
                className="block text-sm font-medium text-gray-700"
              >
                Nomor Request
              </label>
              <input
                type="text"
                id="requestNumber"
                value="[Otomatis]"
                readOnly
                className="block w-full px-3 py-2 mt-1 text-gray-700 placeholder:text-gray-500 bg-gray-100 border border-gray-200 rounded-lg shadow-sm sm:text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="docNumber"
                className="block text-sm font-medium text-gray-700"
              >
                Nomor Dokumen
              </label>
              <input
                type="text"
                id="docNumber"
                value="[Otomatis]"
                readOnly
                className="block w-full px-3 py-2 mt-1 text-gray-700 placeholder:text-gray-500 bg-gray-100 border border-gray-200 rounded-lg shadow-sm sm:text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="requestDate"
                className="block text-sm font-medium text-gray-700"
              >
                Tanggal
              </label>
              <div className="mt-1">
                <DatePicker
                  id="requestDate"
                  selectedDate={requestDate}
                  onDateChange={setRequestDate}
                  disablePastDates
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="requesterName"
                className="block text-sm font-medium text-gray-700"
              >
                Nama
              </label>
              <input
                type="text"
                id="requesterName"
                value={requesterName}
                readOnly
                className="block w-full px-3 py-2 mt-1 text-gray-700 placeholder:text-gray-500 bg-gray-100 border border-gray-200 rounded-lg shadow-sm sm:text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="division"
                className="block text-sm font-medium text-gray-700"
              >
                Divisi
              </label>
              <input
                type="text"
                id="division"
                value={requesterDivision}
                onChange={(e) => setRequesterDivision(e.target.value)}
                readOnly={!!currentUser.divisionId}
                className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg shadow-sm sm:text-sm read-only:bg-gray-100 read-only:text-gray-700"
              />
            </div>
            <div>
              <label
                htmlFor="order"
                className="block text-sm font-medium text-gray-700"
              >
                Tipe Order
              </label>
              <div className="mt-1">
                <CustomSelect
                  options={orderOptions}
                  value={orderType}
                  onChange={(value) => setOrderType(value as OrderType)}
                />
              </div>
            </div>
          </div>
          {orderType === "Urgent" && (
            <div className="mt-6">
              <label
                htmlFor="justification"
                className="block text-sm font-medium text-gray-700"
              >
                Justifikasi Urgent
              </label>
              <textarea
                id="justification"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                required
                rows={2}
                className="block w-full px-3 py-2 mt-1 text-gray-900 bg-amber-50 border border-amber-300 rounded-lg sm:text-sm"
                placeholder="Jelaskan alasan mendesak..."
              ></textarea>
            </div>
          )}
          {orderType === "Project Based" && (
            <div className="mt-6">
              <label
                htmlFor="project"
                className="block text-sm font-medium text-gray-700"
              >
                Nama Proyek
              </label>
              <input
                type="text"
                id="project"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                required
                className="block w-full px-3 py-2 mt-1 text-gray-900 bg-blue-50 border border-blue-300 rounded-lg sm:text-sm"
                placeholder="Nama Proyek"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-tm-dark">
            Detail Permintaan Barang
          </h3>
          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-accent hover:bg-tm-primary"
          >
            Tambah Item
          </button>
        </div>

        <div className="space-y-6">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="relative p-5 pt-6 bg-white border border-gray-200 rounded-xl shadow-sm"
            >
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-12">
                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-gray-600">
                    Kategori
                  </label>
                  <CustomSelect
                    options={availableCategories.map((c) => ({
                      value: c.id.toString(),
                      label: c.name,
                    }))}
                    value={item.categoryId}
                    onChange={(v) => handleCategoryChange(item.id, v)}
                    placeholder="-- Pilih --"
                    actionLabel="Tambah Kategori Baru"
                    onActionClick={() => setIsCategoryModalOpen(true)}
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-gray-600">
                    Tipe
                  </label>
                  <CustomSelect
                    options={
                      availableCategories
                        .find((c) => c.id.toString() === item.categoryId)
                        ?.types.map((t) => {
                          const isMaterial = t.trackingMethod === 'bulk';
                          return {
                            value: t.id.toString(),
                            label: t.name,
                            indicator: isMaterial ? (
                              <BsLightningFill className="w-3 h-3 text-orange-500" title="Material (Bulk)" />
                            ) : (
                              <BsBoxSeam className="w-3 h-3 text-blue-500" title="Asset (Individual)" />
                            )
                          };
                        }) || []
                    }
                    value={item.typeId}
                    onChange={(v) => handleTypeChange(item.id, v)}
                    placeholder="-- Pilih --"
                    disabled={!item.categoryId}
                    emptyStateMessage="Tidak ada tipe."
                    emptyStateButtonLabel="Tambah Tipe"
                    onEmptyStateClick={() => {
                      const cat = availableCategories.find(
                        (c) => c.id.toString() === item.categoryId
                      );
                      if (cat) setTypeModalState({ isOpen: true, category: cat, typeToEdit: null });
                    }}
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-gray-600">
                    Model (Nama Barang)
                  </label>
                  <CreatableSelect
                    options={
                      availableCategories
                        .find((c) => c.id.toString() === item.categoryId)
                        ?.types.find((t) => t.id.toString() === item.typeId)
                        ?.standardItems?.map((m) => m.name) || []
                    }
                    value={item.itemName}
                    onChange={(v) => handleModelChange(item.id, v)}
                    placeholder={item.typeId ? "Pilih atau Ketik Baru..." : "-- Pilih Tipe Dulu --"}
                    disabled={!item.typeId}
                  />
                </div>
                <div className="md:col-span-6">
                  <label className="block text-sm font-medium text-gray-600">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={item.itemTypeBrand}
                    onChange={(e) =>
                      handleItemChange(item.id, "itemTypeBrand", e.target.value)
                    }
                    className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg sm:text-sm"
                    placeholder="Contoh: Mikrotik, Samsung (Wajib diisi)"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-600">
                    Stok Tersedia
                  </label>
                  <input
                    type="number"
                    value={item.stock}
                    readOnly
                    className="block w-full px-3 py-2 mt-1 text-gray-700 bg-gray-100 border border-gray-200 rounded-lg shadow-sm sm:text-sm"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-600">
                    Jumlah Diminta
                  </label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      handleItemChange(
                        item.id,
                        "quantity",
                        parseInt(e.target.value)
                      )
                    }
                    min="1"
                    className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg sm:text-sm"
                  />
                </div>
                <div className="md:col-span-12">
                  <label className="block text-sm font-medium text-gray-600">
                    Keterangan / Spesifikasi
                  </label>
                  <input
                    type="text"
                    value={item.keterangan}
                    onChange={(e) =>
                      handleItemChange(item.id, "keterangan", e.target.value)
                    }
                    className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg shadow-sm sm:text-sm"
                    placeholder="Contoh: Warna Hitam, RAM 8GB..."
                  />
                </div>
              </div>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveItem(item.id)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>
        <div
          ref={footerRef}
          className="flex justify-end pt-4 mt-4 border-t border-gray-200"
        >
          <ActionButtons formId={formId} />
        </div>
      </form>
      <FloatingActionBar isVisible={!isFooterVisible}>
        <ActionButtons formId={formId} />
      </FloatingActionBar>

      {/* Modals for Type/Model/Category Creation */}
      {isCategoryModalOpen && (
          <Modal
            isOpen={isCategoryModalOpen}
            onClose={() => setIsCategoryModalOpen(false)}
            title="Tambah Kategori Baru"
            size="lg"
            hideDefaultCloseButton
            disableContentPadding
        >
            <CategoryFormModal 
                category={null} 
                divisions={divisions} 
                onSave={handleSaveCategory} 
                onClose={() => setIsCategoryModalOpen(false)} 
                isLoading={false} 
            />
        </Modal>
      )}

      {modelModalState.isOpen &&
        modelModalState.category &&
        modelModalState.type && (
          <ModelManagementModal
            isOpen={modelModalState.isOpen}
            onClose={() =>
              setModelModalState({ ...modelModalState, isOpen: false })
            }
            parentInfo={{
              category: modelModalState.category,
              type: modelModalState.type,
            }}
          />
        )}
      {typeModalState.isOpen && typeModalState.category && (
        <TypeManagementModal
          isOpen={typeModalState.isOpen}
          onClose={() =>
            setTypeModalState({ ...typeModalState, isOpen: false })
          }
          parentCategory={typeModalState.category}
          typeToEdit={typeModalState.typeToEdit}
        />
      )}
    </>
  );
};

const NewRequestPage: React.FC<NewRequestPageProps> = (props) => {
    const { currentUser, onInitiateRegistration, onInitiateHandoverFromRequest, initialFilters, onClearInitialFilters, onShowPreview, setActivePage } = props;
    
    // Stores
    const requests = useRequestStore((state) => state.requests);
    const fetchRequests = useRequestStore((state) => state.fetchRequests);
    const addRequest = useRequestStore((state) => state.addRequest);
    const deleteRequest = useRequestStore((state) => state.deleteRequest);
    const updateRequest = useRequestStore((state) => state.updateRequest);

    const assets = useAssetStore((state) => state.assets);
    const fetchAssets = useAssetStore((state) => state.fetchAssets);
    const assetCategories = useAssetStore((state) => state.categories);
    
    const users = useMasterDataStore((state) => state.users);
    const divisions = useMasterDataStore((state) => state.divisions);
    const notifications = useNotificationStore((state) => state.notifications);
    const highlightedItemId = useUIStore((state) => state.highlightedItemId);

    // State
    const [view, setView] = useState<'list' | 'form' | 'detail'>('list');
    const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // --- FILTER STATE ---
    const initialFilterState = { status: '', orderType: '', division: '' };
    const [filters, setFilters] = useState(initialFilterState);
    const [tempFilters, setTempFilters] = useState(initialFilterState);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const filterPanelRef = useRef<HTMLDivElement>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
    const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
    
    const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const addNotification = useNotification();

    // Initial fetch
    useEffect(() => {
        if (requests.length === 0) fetchRequests();
        if (assets.length === 0) fetchAssets();
    }, []);

    // Handle Click Outside Filter Panel
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
                setIsFilterPanelOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => { document.removeEventListener("mousedown", handleClickOutside); };
    }, [filterPanelRef]);

    // Handle initial filters (e.g. open detail)
    useEffect(() => {
        if (initialFilters?.openDetailForId) {
            const req = requests.find(r => r.id === initialFilters.openDetailForId);
            if (req) {
                setSelectedRequest(req);
                setView('detail');
            }
        }
        // Handle prefillItem for form
        if (initialFilters?.prefillItem) {
            setView('form');
        }
    }, [initialFilters, requests]);

    const handleCreateRequest = async (data: any) => {
        setIsLoading(true);
        try {
            await addRequest(data);
            addNotification('Permintaan baru berhasil dibuat.', 'success');
            setView('list');
        } catch (e) {
            addNotification('Gagal membuat permintaan.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteRequest = async () => {
        if (!requestToDelete) return;
        setIsLoading(true);
        try {
            await deleteRequest(requestToDelete);
            addNotification('Permintaan berhasil dihapus.', 'success');
            setRequestToDelete(null);
        } catch (e) {
            addNotification('Gagal menghapus permintaan.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Filter Logic
    const activeFilterCount = useMemo(() => {
        return Object.values(filters).filter(Boolean).length;
    }, [filters]);

    const handleRemoveFilter = (key: keyof typeof filters) => {
        setFilters((prev) => ({ ...prev, [key]: "" }));
        setTempFilters((prev) => ({ ...prev, [key]: "" }));
    };

    const handleResetFilters = () => {
        setFilters(initialFilterState);
        setTempFilters(initialFilterState);
        setIsFilterPanelOpen(false);
    };

    const handleApplyFilters = () => {
        setFilters(tempFilters);
        setIsFilterPanelOpen(false);
    };

    const filteredRequests = useMemo(() => {
        let tempRequests = [...requests];
        if (!['Admin Logistik', 'Admin Purchase', 'Super Admin'].includes(currentUser.role)) {
            tempRequests = tempRequests.filter(req => req.requester === currentUser.name);
        }
        return tempRequests.filter(req => {
            const searchLower = searchQuery.toLowerCase();
            return (
                req.id.toLowerCase().includes(searchLower) ||
                req.requester.toLowerCase().includes(searchLower) ||
                req.items.some(i => i.itemName.toLowerCase().includes(searchLower))
            );
        }).filter(req => {
            if (filters.status && req.status !== filters.status) return false;
            if (filters.orderType && req.order.type !== filters.orderType) return false;
            if (filters.division && req.division !== filters.division) return false;
            return true;
        });
    }, [requests, currentUser, searchQuery, filters]);

    const { items: sortedRequests, requestSort, sortConfig } = useSortableData(filteredRequests, { key: 'requestDate', direction: 'descending' });

    const totalItems = sortedRequests.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedRequests = sortedRequests.slice(startIndex, startIndex + itemsPerPage);

    // Render logic
    if (view === 'form') {
        return (
             <div className="p-4 sm:p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold text-tm-dark">Buat Request Baru</h1>
                    <button onClick={() => setView('list')} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Kembali</button>
                </div>
                <div className="p-4 sm:p-6 bg-white border border-gray-200/80 rounded-xl shadow-md pb-24">
                    <RequestForm 
                        currentUser={currentUser}
                        assets={assets}
                        assetCategories={assetCategories}
                        divisions={divisions}
                        onCreateRequest={handleCreateRequest}
                        prefillItem={initialFilters?.prefillItem}
                        setActivePage={setActivePage}
                    />
                </div>
             </div>
        );
    }

    if (view === 'detail' && selectedRequest) {
        return (
            <NewRequestDetailPage 
                request={selectedRequest}
                currentUser={currentUser}
                assets={assets}
                users={users}
                divisions={divisions}
                assetCategories={assetCategories}
                onBackToList={() => { setView('list'); setSelectedRequest(null); }}
                onShowPreview={onShowPreview}
                onOpenReviewModal={() => {}} // Placeholder
                onOpenCancellationModal={() => {}} // Placeholder
                onOpenFollowUpModal={() => {}} // Placeholder
                onLogisticApproval={(id) => updateRequest(id, { status: ItemStatus.LOGISTIC_APPROVED, logisticApprover: currentUser.name, logisticApprovalDate: new Date().toISOString() })}
                onSubmitForCeoApproval={(id, data) => updateRequest(id, { status: ItemStatus.AWAITING_CEO_APPROVAL, purchaseDetails: data })}
                onFinalCeoApproval={(id) => updateRequest(id, { status: ItemStatus.APPROVED, finalApprover: currentUser.name, finalApprovalDate: new Date().toISOString() })}
                onStartProcurement={() => updateRequest(selectedRequest.id, { status: ItemStatus.PURCHASING })}
                onUpdateRequestStatus={(status) => updateRequest(selectedRequest.id, { status })}
                onOpenStaging={(req) => onInitiateRegistration(req, req.items[0])}
                onCeoDisposition={(id) => updateRequest(id, { isPrioritizedByCEO: true, ceoDispositionDate: new Date().toISOString() })}
                onAcknowledgeProgressUpdate={() => {}} // Placeholder
                onRequestProgressUpdate={() => {}} // Placeholder
                onFollowUpToCeo={() => {}} // Placeholder
                onInitiateHandoverFromRequest={onInitiateHandoverFromRequest}
                isLoading={isLoading}
            />
        );
    }

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                <h1 className="text-3xl font-bold text-tm-dark">Daftar Request</h1>
                <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => setIsExportModalOpen(true)} 
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border rounded-lg shadow-sm hover:bg-gray-50"
                    >
                        <ExportIcon className="w-4 h-4"/> Export CSV
                    </button>
                    <button onClick={() => setView('form')} className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover">
                        Buat Request
                    </button>
                </div>
            </div>

            <div className="p-4 mb-4 bg-white border border-gray-200/80 rounded-xl shadow-md space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-grow">
                        <SearchIcon className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 top-1/2 left-3" />
                        <input type="text" placeholder="Cari ID, Pemohon, Item..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-10 py-2 pl-10 pr-4 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-tm-accent focus:border-tm-accent" />
                    </div>
                    
                    {/* Filter Button & Panel */}
                    <div className="relative" ref={filterPanelRef}>
                        <button
                            onClick={() => { setTempFilters(filters); setIsFilterPanelOpen(p => !p); }}
                            className={`inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-semibold transition-all duration-200 border rounded-lg shadow-sm sm:w-auto 
                                ${activeFilterCount > 0 ? 'bg-tm-light border-tm-accent text-tm-primary' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}
                            `}
                        >
                            <FilterIcon className="w-4 h-4" /> <span>Filter</span> {activeFilterCount > 0 && <span className="px-1.5 py-0.5 text-[10px] font-bold text-white rounded-full bg-tm-primary">{activeFilterCount}</span>}
                        </button>
                        {isFilterPanelOpen && (
                            <>
                                <div onClick={() => setIsFilterPanelOpen(false)} className="fixed inset-0 z-20 bg-black/25 sm:hidden" />
                                <div className="fixed top-32 inset-x-4 z-30 origin-top rounded-xl border border-gray-200 bg-white shadow-lg sm:absolute sm:top-full sm:inset-x-auto sm:right-0 sm:mt-2 sm:w-72">
                                    <div className="flex items-center justify-between p-4 border-b">
                                        <h3 className="text-lg font-semibold text-gray-800">Filter Request</h3>
                                        <button onClick={() => setIsFilterPanelOpen(false)} className="p-1 text-gray-400 rounded-full hover:bg-gray-100"><CloseIcon className="w-5 h-5"/></button>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                                            <CustomSelect 
                                                options={[{ value: '', label: 'Semua Status' }, ...Object.values(ItemStatus).map(s => ({ value: s, label: s }))]} 
                                                value={tempFilters.status} 
                                                onChange={v => setTempFilters(f => ({ ...f, status: v }))} 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Tipe Order</label>
                                            <CustomSelect 
                                                options={[{ value: '', label: 'Semua Tipe' }, { value: 'Regular Stock', label: 'Regular Stock' }, { value: 'Urgent', label: 'Urgent' }, { value: 'Project Based', label: 'Project Based' }]} 
                                                value={tempFilters.orderType} 
                                                onChange={v => setTempFilters(f => ({ ...f, orderType: v }))} 
                                            />
                                        </div>
                                        {['Admin Logistik', 'Admin Purchase', 'Super Admin'].includes(currentUser.role) && (
                                             <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Divisi</label>
                                                <CustomSelect 
                                                    options={[{ value: '', label: 'Semua Divisi' }, ...divisions.map(d => ({ value: d.name, label: d.name }))]} 
                                                    value={tempFilters.division} 
                                                    onChange={v => setTempFilters(f => ({ ...f, division: v }))} 
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 border-t">
                                        <button onClick={handleResetFilters} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Reset</button>
                                        <button onClick={handleApplyFilters} className="px-4 py-2 text-sm font-semibold text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover">Terapkan</button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* ACTIVE FILTER CHIPS */}
                {activeFilterCount > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 animate-fade-in-up">
                        {filters.status && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-full">
                                Status: <span className="font-bold">{filters.status}</span>
                                <button onClick={() => handleRemoveFilter('status')} className="p-0.5 ml-1 rounded-full hover:bg-blue-200 text-blue-500"><CloseIcon className="w-3 h-3" /></button>
                            </span>
                        )}
                        {filters.orderType && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-100 rounded-full">
                                Tipe: <span className="font-bold">{filters.orderType}</span>
                                <button onClick={() => handleRemoveFilter('orderType')} className="p-0.5 ml-1 rounded-full hover:bg-purple-200 text-purple-500"><CloseIcon className="w-3 h-3" /></button>
                            </span>
                        )}
                        {filters.division && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-orange-700 bg-blue-50 border border-blue-100 rounded-full">
                                Divisi: <span className="font-bold">{filters.division}</span>
                                <button onClick={() => handleRemoveFilter('division')} className="p-0.5 ml-1 rounded-full hover:bg-orange-200 text-orange-500"><CloseIcon className="w-3 h-3" /></button>
                            </span>
                        )}
                         <button onClick={handleResetFilters} className="text-xs text-gray-500 hover:text-red-600 hover:underline px-2 py-1">Hapus Semua</button>
                    </div>
                )}
            </div>

            <div className="overflow-hidden bg-white border border-gray-200/80 rounded-xl shadow-md">
                <div className="overflow-x-auto custom-scrollbar">
                    <RequestTable 
                        requests={paginatedRequests}
                        currentUser={currentUser}
                        onDetailClick={(r) => { setSelectedRequest(r); setView('detail'); }}
                        onDeleteClick={setRequestToDelete}
                        onOpenStaging={(r) => onInitiateRegistration(r, r.items[0])}
                        sortConfig={sortConfig}
                        requestSort={requestSort}
                        selectedRequestIds={selectedRequestIds}
                        onSelectOne={(id) => setSelectedRequestIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                        onSelectAll={(e) => setSelectedRequestIds(e.target.checked ? paginatedRequests.map(r => r.id) : [])}
                        isBulkSelectMode={isBulkSelectMode}
                        onEnterBulkMode={() => setIsBulkSelectMode(true)}
                        notifications={notifications}
                        onFollowUpClick={() => {}} // Placeholder
                        highlightedId={highlightedItemId}
                    />
                </div>
                <PaginationControls currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} startIndex={startIndex} endIndex={startIndex + paginatedRequests.length} />
            </div>

            {requestToDelete && (
                <Modal isOpen={!!requestToDelete} onClose={() => setRequestToDelete(null)} title="Konfirmasi Hapus" footerContent={<><button onClick={() => setRequestToDelete(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button><button onClick={handleDeleteRequest} disabled={isLoading} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-danger rounded-lg shadow-sm hover:bg-red-700">{isLoading && <SpinnerIcon className="w-4 h-4 mr-2"/>}Hapus</button></>}>
                    <p className="text-sm text-gray-600">Anda yakin ingin menghapus request <strong>{requestToDelete}</strong>? Tindakan ini tidak dapat diurungkan.</p>
                </Modal>
            )}

            {isExportModalOpen && (
              <ExportConfigModal 
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                currentUser={currentUser}
                data={sortedRequests}
                onConfirmExport={exportToCSV}
              />
            )}
        </div>
    );
};

export default NewRequestPage;
