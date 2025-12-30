

export type Page = 
  | 'dashboard' 
  | 'request' 
  | 'request-pinjam' 
  | 'registration' 
  | 'handover' 
  | 'stock' 
  | 'repair' 
  | 'return-form' 
  | 'return-detail'
  | 'customers' 
  | 'customer-new' 
  | 'customer-edit' 
  | 'customer-installation-form' 
  | 'customer-maintenance-form' 
  | 'customer-dismantle' 
  | 'customer-detail'
  | 'pengaturan-pengguna' 
  | 'user-form' 
  | 'division-form' 
  | 'user-detail' 
  | 'division-detail'
  | 'pengaturan-akun' 
  | 'kategori';

export type UserRole = 'Super Admin' | 'Admin Logistik' | 'Admin Purchase' | 'Leader' | 'Staff';

export type Permission = 
    | 'dashboard:view' 
    | 'reports:view' 
    | 'data:export'
    | 'requests:view:own' 
    | 'requests:view:all' 
    | 'requests:create' 
    | 'requests:create:urgent' 
    | 'requests:approve:logistic' 
    | 'requests:approve:purchase' 
    | 'requests:approve:final' 
    | 'requests:cancel:own' 
    | 'requests:delete'
    | 'loan-requests:view:own' 
    | 'loan-requests:view:all' 
    | 'loan-requests:create' 
    | 'loan-requests:approve' 
    | 'loan-requests:return'
    | 'assets:view' 
    | 'assets:create' 
    | 'assets:edit' 
    | 'assets:delete' 
    | 'assets:handover' 
    | 'assets:dismantle' 
    | 'assets:install' 
    | 'assets:repair:report' 
    | 'assets:repair:manage'
    | 'stock:view' 
    | 'stock:manage'
    | 'customers:view' 
    | 'customers:create' 
    | 'customers:edit' 
    | 'customers:delete'
    | 'users:view' 
    | 'users:create' 
    | 'users:edit' 
    | 'users:delete' 
    | 'users:reset-password' 
    | 'users:manage-permissions'
    | 'divisions:manage' 
    | 'categories:manage' 
    | 'account:manage';

export interface User {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    divisionId: number | null;
    permissions: Permission[];
}

export interface Division {
    id: number;
    name: string;
}

export type AssetStatus = 
    | 'Di Gudang' 
    | 'Digunakan' 
    | 'Rusak' 
    | 'Dalam Perbaikan' 
    | 'Sedang Diperbaiki Pihak Luar' 
    | 'Diberhentikan'
    | 'Menunggu Pengembalian'; 

// Runtime values for AssetStatus
export const AssetStatus = {
    IN_STORAGE: 'Di Gudang' as AssetStatus,
    IN_USE: 'Digunakan' as AssetStatus,
    DAMAGED: 'Rusak' as AssetStatus,
    UNDER_REPAIR: 'Dalam Perbaikan' as AssetStatus,
    OUT_FOR_REPAIR: 'Sedang Diperbaiki Pihak Luar' as AssetStatus,
    DECOMMISSIONED: 'Diberhentikan' as AssetStatus,
    AWAITING_RETURN: 'Menunggu Pengembalian' as AssetStatus,
};

export enum AssetCondition {
    BRAND_NEW = 'Baru',
    GOOD = 'Baik',
    USED_OKAY = 'Bekas Layak Pakai',
    MINOR_DAMAGE = 'Rusak Ringan',
    MAJOR_DAMAGE = 'Rusak Berat',
    FOR_PARTS = 'Kanibalisasi'
}

export type ItemClassification = 'asset' | 'material';
export type TrackingMethod = 'individual' | 'bulk';

export interface StandardItem {
    id: number;
    name: string;
    brand: string;
}

export interface AssetType {
    id: number;
    name: string;
    classification?: ItemClassification;
    trackingMethod?: TrackingMethod;
    unitOfMeasure?: string;
    baseUnitOfMeasure?: string;
    quantityPerUnit?: number;
    standardItems?: StandardItem[];
}

export interface AssetCategory {
    id: number;
    name: string;
    isCustomerInstallable?: boolean;
    associatedDivisions: number[]; // Division IDs
    types: AssetType[];
}

export interface Attachment {
    id: number;
    name: string;
    url: string;
    type: 'image' | 'pdf' | 'other';
}

export interface ActivityLogEntry {
    id: string;
    timestamp: string;
    user: string;
    action: string;
    details: string;
    referenceId?: string;
}

export interface Asset {
    id: string;
    name: string;
    category: string;
    type: string;
    brand: string;
    serialNumber?: string | null;
    macAddress?: string | null;
    
    // Purchase Info
    purchasePrice?: number | null;
    vendor?: string | null;
    poNumber?: string | null;
    invoiceNumber?: string | null;
    purchaseDate?: string; // ISO Date
    warrantyEndDate?: string | null; // ISO Date

    // Registration Info
    registrationDate: string; // ISO Date
    recordedBy: string;
    
    // Status & Location
    status: AssetStatus;
    condition: AssetCondition;
    location?: string | null;
    locationDetail?: string | null;
    currentUser?: string | null; // User Name or Customer ID
    
    // Misc
    notes?: string | null;
    attachments: Attachment[];
    activityLog: ActivityLogEntry[];
    
    woRoIntNumber?: string | null; // Ref to Request/WO
    isDismantled?: boolean;
    dismantleInfo?: {
        customerId: string;
        customerName: string;
        dismantleDate: string;
        dismantleId: string;
    };
    lastModifiedDate?: string;
    lastModifiedBy?: string;
}

export type OrderType = 'Regular Stock' | 'Urgent' | 'Project Based';

export interface OrderDetails {
    type: OrderType;
    justification?: string;
    project?: string;
}

export enum ItemStatus {
    PENDING = 'Menunggu Persetujuan',
    LOGISTIC_APPROVED = 'Disetujui Logistik',
    AWAITING_CEO_APPROVAL = 'Menunggu Persetujuan CEO',
    APPROVED = 'Disetujui',
    PURCHASING = 'Sedang Dipesan',
    IN_DELIVERY = 'Dalam Pengiriman',
    ARRIVED = 'Telah Tiba',
    AWAITING_HANDOVER = 'Menunggu Serah Terima',
    COMPLETED = 'Selesai',
    REJECTED = 'Ditolak',
    CANCELLED = 'Dibatalkan',
    IN_PROGRESS = 'Diproses'
}

export interface RequestItem {
    id: number;
    itemName: string;
    itemTypeBrand: string;
    quantity: number; // Requested quantity
    stock?: number;
    keterangan?: string;
    categoryId?: string; // Optional for form
    typeId?: string; // Optional for form
}

export interface PurchaseDetails {
    purchasePrice: number;
    vendor: string;
    poNumber: string;
    invoiceNumber: string;
    purchaseDate: string;
    warrantyEndDate: string | null;
    filledBy: string;
    fillDate: string;
}

export interface Activity {
    id: number;
    author: string;
    timestamp: string;
    type: 'comment' | 'status_change' | 'revision';
    parentId?: number;
    payload: {
        text?: string;
        revisions?: {
            itemName: string;
            originalQuantity: number;
            approvedQuantity: number;
            reason: string;
        }[];
    };
}

export interface Request {
    id: string;
    docNumber?: string;
    requester: string;
    division: string;
    requestDate: string;
    status: ItemStatus;
    order: OrderDetails;
    items: RequestItem[];
    
    // Approval Flow
    logisticApprover?: string | null;
    logisticApprovalDate?: string | null;
    
    // Purchase Flow
    purchaseDetails?: Record<number, PurchaseDetails>; // Keyed by Item ID
    
    // Final Approval
    finalApprover?: string | null;
    finalApprovalDate?: string | null;
    
    // Rejection
    rejectionReason?: string | null;
    rejectedBy?: string | null;
    rejectionDate?: string | null;
    rejectedByDivision?: string | null;

    // Execution
    estimatedDeliveryDate?: string | null;
    actualShipmentDate?: string | null;
    arrivalDate?: string | null;
    receivedBy?: string | null;
    
    // Registration
    isRegistered?: boolean;
    partiallyRegisteredItems?: Record<number, number>; // ItemId -> Count
    
    // Completion
    completedBy?: string;
    completionDate?: string;

    // Misc
    totalValue?: number;
    activityLog?: Activity[];
    
    // Special Flags
    isPrioritizedByCEO?: boolean;
    ceoDispositionDate?: string;
    ceoDispositionFeedbackSent?: boolean;
    ceoFollowUpSent?: boolean;
    lastFollowUpAt?: string;
    
    progressUpdateRequest?: {
        requestedBy: string;
        requestDate: string;
        isAcknowledged: boolean;
        acknowledgedBy?: string;
        acknowledgedDate?: string;
        feedbackSent?: boolean;
    };

    // ITEM LEVEL STATUSES (UPDATED for Mixed Fulfillment)
    itemStatuses?: Record<number, {
        // 'stock_allocated': Tersedia di gudang, langsung ke handover
        // 'procurement_needed': Tidak cukup, harus dibeli
        // 'approved': Disetujui (standard)
        // 'rejected': Ditolak
        // 'partial': Disetujui sebagian
        status: 'approved' | 'rejected' | 'partial' | 'stock_allocated' | 'procurement_needed';
        reason?: string;
        approvedQuantity: number;
    }>;
}

export enum LoanRequestStatus {
    PENDING = 'Menunggu Persetujuan',
    APPROVED = 'Disetujui',
    ON_LOAN = 'Dipinjam',
    RETURNED = 'Dikembalikan',
    REJECTED = 'Ditolak',
    OVERDUE = 'Terlambat',
    AWAITING_RETURN = 'Menunggu Pengembalian'
}

export interface LoanItem {
    id: number;
    itemName: string;
    brand: string;
    quantity: number;
    keterangan?: string;
    returnDate?: string | null;
}

export interface LoanRequest {
    id: string;
    requester: string;
    division: string;
    requestDate: string;
    status: LoanRequestStatus;
    items: LoanItem[];
    notes?: string;
    
    approver?: string;
    approvalDate?: string;
    rejectionReason?: string;
    
    // Assets Assigned
    assignedAssetIds?: Record<number, string[]>; // ItemId -> Array of Asset IDs
    itemStatuses?: Record<number, {
        status: 'approved' | 'rejected' | 'partial';
        reason?: string;
        approvedQuantity: number;
    }>;
    
    // Return Info
    actualReturnDate?: string;
    returnedAssetIds?: string[];
    
    handoverId?: string; // HO document for loan start
}

export enum AssetReturnStatus {
    PENDING_APPROVAL = 'Menunggu Persetujuan',
    APPROVED = 'Disetujui',
    REJECTED = 'Ditolak'
}

export interface AssetReturn {
    id: string;
    docNumber: string;
    returnDate: string;
    loanRequestId: string;
    loanDocNumber: string;
    assetId: string;
    assetName: string;
    returnedBy: string;
    receivedBy: string;
    acknowledgedBy?: string;
    returnedCondition: AssetCondition;
    notes?: string;
    status: AssetReturnStatus;
    approvedBy?: string;
    approvalDate?: string;
    rejectedBy?: string;
    rejectionDate?: string;
    rejectionReason?: string;
}

export interface HandoverItem {
    id: number;
    assetId?: string;
    itemName: string;
    itemTypeBrand: string;
    conditionNotes: string;
    quantity: number;
    checked: boolean;
}

export interface Handover {
    id: string;
    docNumber: string;
    handoverDate: string;
    menyerahkan: string;
    penerima: string;
    mengetahui: string;
    woRoIntNumber?: string;
    items: HandoverItem[];
    status: ItemStatus;
}

export interface Dismantle {
    id: string;
    docNumber: string;
    requestNumber?: string;
    assetId: string;
    assetName: string;
    dismantleDate: string;
    technician: string;
    customerId: string;
    customerName: string;
    customerAddress: string;
    retrievedCondition: AssetCondition;
    notes: string | null;
    acknowledger: string | null; // Gudang
    attachments?: Attachment[];
    status: ItemStatus;
}

export interface InstalledMaterial {
    itemName: string;
    brand: string;
    quantity: number;
    unit: string;
    installationDate: string;
}

export enum CustomerStatus {
    ACTIVE = 'Aktif',
    INACTIVE = 'Non-Aktif',
    SUSPENDED = 'Suspend'
}

export interface Customer {
    id: string;
    name: string;
    address: string;
    phone: string;
    email: string;
    status: CustomerStatus;
    installationDate: string;
    servicePackage: string;
    installedMaterials?: InstalledMaterial[];
    activityLog: ActivityLogEntry[];
}

export interface MaintenanceMaterial {
    materialAssetId?: string;
    itemName: string;
    brand: string;
    quantity: number;
    unit: string;
}

export interface MaintenanceReplacement {
    oldAssetId: string;
    newAssetId: string;
    retrievedAssetCondition: AssetCondition;
}

export interface Maintenance {
    id: string;
    docNumber: string;
    maintenanceDate: string;
    requestNumber?: string;
    technician: string;
    customerId: string;
    customerName: string;
    assets?: { assetId: string; assetName: string }[];
    problemDescription: string;
    actionsTaken: string;
    workTypes?: string[];
    priority?: 'Tinggi' | 'Sedang' | 'Rendah';
    
    materialsUsed?: MaintenanceMaterial[];
    replacements?: MaintenanceReplacement[];
    
    attachments?: Attachment[];
    status: ItemStatus;
    completedBy?: string;
    completionDate?: string;
    acknowledger?: string; // Mengetahui (CEO/Leader)
}

export interface InstallationAsset {
    assetId: string;
    assetName: string;
    serialNumber?: string;
}

export interface InstallationMaterial {
    materialAssetId?: string;
    itemName: string;
    brand: string;
    quantity: number;
    unit: string;
}

export interface Installation {
    id: string;
    docNumber: string;
    requestNumber?: string;
    installationDate: string;
    technician: string;
    customerId: string;
    customerName: string;
    assetsInstalled: InstallationAsset[];
    materialsUsed?: InstallationMaterial[];
    notes: string;
    status: ItemStatus;
    acknowledger?: string;
    createdBy?: string;
}

export type PreviewData = 
    | { type: 'asset'; id: string }
    | { type: 'customer'; id: string }
    | { type: 'user'; id: number | string }
    | { type: 'request'; id: string }
    | { type: 'handover'; id: string }
    | { type: 'dismantle'; id: string }
    | { type: 'customerAssets'; id: string } // id is customerId
    | { type: 'stockItemAssets'; id: string } // id is "name|brand|status"
    | { type: 'stockHistory'; id: string }; // id is "name|brand"

export type NotificationType = 'success' | 'error' | 'info' | 'warning' | 'SYSTEM';
export type NotificationSystemType = 
    | 'REQUEST_CREATED' 
    | 'REQUEST_LOGISTIC_APPROVED' 
    | 'REQUEST_AWAITING_FINAL_APPROVAL' 
    | 'REQUEST_FULLY_APPROVED' 
    | 'REQUEST_COMPLETED' 
    | 'FOLLOW_UP' 
    | 'CEO_DISPOSITION' 
    | 'PROGRESS_UPDATE_REQUEST' 
    | 'PROGRESS_FEEDBACK' 
    | 'STATUS_CHANGE'
    | 'REQUEST_APPROVED'
    | 'REQUEST_REJECTED'
    | 'ASSET_DAMAGED_REPORT'
    | 'REPAIR_STARTED'
    | 'REPAIR_COMPLETED'
    | 'REPAIR_PROGRESS_UPDATE'
    | 'ASSET_DECOMMISSIONED'
    | 'ASSET_HANDED_OVER';

export interface NotificationAction {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
}

export interface Notification {
    id: number;
    message: string;
    type: NotificationType | NotificationSystemType | string;
    duration?: number; // for toasts
    isRead: boolean;
    timestamp: string;
    
    // System Notification Fields
    recipientId: number;
    actorName?: string;
    referenceId?: string; // Request ID, Asset ID, etc.
    actions?: NotificationAction[];
}

export interface ParsedScanResult {
    raw: string;
    id?: string;
    serialNumber?: string;
    macAddress?: string;
    name?: string;
}

// --- NEW: STOCK MOVEMENT LEDGER ---
export type MovementType = 'IN_PURCHASE' | 'IN_RETURN' | 'IN_ADJUSTMENT' | 'OUT_INSTALLATION' | 'OUT_MAINTENANCE' | 'OUT_DISMANTLE' | 'OUT_ADJUSTMENT' | 'OUT_BROKEN';

export interface StockMovement {
    id: string;
    assetName: string;
    brand: string;
    date: string;
    type: MovementType;
    quantity: number;
    balanceAfter: number; // Sisa stok setelah transaksi ini
    referenceId?: string; // No Request / No Tiket / No Dokumen
    actor: string;
    notes?: string;
}

export interface LoginResponse {
    access_token: string;
    user: User;
}