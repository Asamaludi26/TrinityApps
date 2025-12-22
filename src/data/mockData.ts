
import {
    Asset,
    AssetCategory,
    AssetCondition,
    AssetReturn,
    AssetReturnStatus,
    AssetStatus,
    Customer,
    CustomerStatus,
    Dismantle,
    Division,
    Handover,
    Installation,
    ItemStatus,
    LoanRequest,
    LoanRequestStatus,
    Maintenance,
    Notification,
    Request,
    User
} from '../types';
import {
    ADMIN_LOGISTIK_PERMISSIONS,
    ADMIN_PURCHASE_PERMISSIONS,
    LEADER_PERMISSIONS,
    STAFF_PERMISSIONS,
    SUPER_ADMIN_PERMISSIONS
} from '../utils/permissions';

// Helper function untuk tanggal dinamis
const getDate = (daysOffset: number): Date => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date;
};

// Format Date to ISO String
const d = (days: number) => getDate(days).toISOString();

// --- 1. KATEGORI ASET & MATERIAL ---

export const initialAssetCategories: AssetCategory[] = [
    {
        id: 1, 
        name: 'Perangkat Jaringan (Core)', 
        isCustomerInstallable: false, 
        associatedDivisions: [1, 2],
        types: [
            { 
                id: 1, 
                name: 'Router Core', 
                classification: 'asset',
                trackingMethod: 'individual',
                unitOfMeasure: 'unit',
                standardItems: [{ id: 1, name: 'Router Core RB4011iGS+', brand: 'Mikrotik' }, { id: 2, name: 'CCR1009-7G-1C-1S+', brand: 'Mikrotik' }] 
            },
            { 
                id: 2, 
                name: 'Switch Aggregation', 
                classification: 'asset',
                trackingMethod: 'individual',
                unitOfMeasure: 'unit',
                standardItems: [{ id: 3, name: 'Switch CRS326-24G-2S+', brand: 'Mikrotik' }] 
            },
            { 
                id: 3, 
                name: 'OLT', 
                classification: 'asset',
                trackingMethod: 'individual',
                unitOfMeasure: 'unit',
                standardItems: [{ id: 4, name: 'OLT Hioso 4 Port', brand: 'Hioso' }, { id: 5, name: 'OLT ZTE C320', brand: 'ZTE' }] 
            },
        ]
    },
    {
        id: 2, 
        name: 'Perangkat Pelanggan (CPE)', 
        isCustomerInstallable: true, 
        associatedDivisions: [1, 3],
        types: [
            { 
                id: 4, 
                name: 'ONT/ONU', 
                classification: 'asset',
                trackingMethod: 'individual',
                unitOfMeasure: 'unit',
                standardItems: [{ id: 6, name: 'ONT HG8245H', brand: 'Huawei' }, { id: 7, name: 'ONT F609', brand: 'ZTE' }, { id: 8, name: 'ONT EG8141A5', brand: 'Huawei' }] 
            },
            { 
                id: 5, 
                name: 'Router WiFi', 
                classification: 'asset',
                trackingMethod: 'individual',
                unitOfMeasure: 'unit',
                standardItems: [{ id: 9, name: 'Router WR840N', brand: 'TP-Link' }, { id: 10, name: 'Archer C54', brand: 'TP-Link' }] 
            },
        ]
    },
    {
        id: 3, 
        name: 'Infrastruktur Fiber Optik (Material)', 
        isCustomerInstallable: true, 
        associatedDivisions: [3],
        types: [
            { 
                id: 6, 
                name: 'Kabel Dropcore (Hasbal/Drum)', 
                classification: 'material',
                trackingMethod: 'bulk', 
                unitOfMeasure: 'Roll', 
                baseUnitOfMeasure: 'Meter', 
                quantityPerUnit: 1000, 
                standardItems: [{ id: 11, name: 'Dropcore 1 Core (Hasbal)', brand: 'FiberHome' }] 
            },
            { 
                id: 7, 
                name: 'Kabel Dropcore (Pre-con)', 
                classification: 'material',
                trackingMethod: 'bulk', 
                unitOfMeasure: 'Pcs', 
                baseUnitOfMeasure: 'Pcs', 
                quantityPerUnit: 1, 
                standardItems: [
                    { id: 12, name: 'Dropcore Pre-con 150m', brand: 'FiberHome' },
                    { id: 13, name: 'Dropcore Pre-con 100m', brand: 'FiberHome' }
                ] 
            },
            { 
                id: 8, 
                name: 'Aksesoris Koneksi', 
                classification: 'material',
                trackingMethod: 'bulk', 
                unitOfMeasure: 'Pcs', 
                baseUnitOfMeasure: 'Pcs', 
                quantityPerUnit: 1, 
                standardItems: [
                    { id: 14, name: 'Adaptor SC-UPC', brand: 'Generic' },
                    { id: 15, name: 'Fast Connector SC-UPC', brand: 'Generic' },
                    { id: 16, name: 'Patchcord SC-UPC 3m', brand: 'Generic' }
                ] 
            },
        ]
    },
    {
        id: 5, 
        name: 'Alat Kerja Lapangan', 
        isCustomerInstallable: false, 
        associatedDivisions: [3],
        types: [
            { 
                id: 10, 
                name: 'Fusion Splicer', 
                classification: 'asset',
                trackingMethod: 'individual',
                unitOfMeasure: 'unit',
                standardItems: [{ id: 17, name: 'Fusion Splicer 90S', brand: 'Fujikura' }, { id: 18, name: 'Fusion Splicer AI-9', brand: 'Signal Fire' }] 
            },
            { 
                id: 11, 
                name: 'Optical Power Meter (OPM)', 
                classification: 'asset',
                trackingMethod: 'individual',
                unitOfMeasure: 'unit',
                standardItems: [{ id: 19, name: 'OPM Joinwit', brand: 'Joinwit' }] 
            },
        ]
    },
    {
        id: 6, 
        name: 'Aset Kantor', 
        isCustomerInstallable: false, 
        associatedDivisions: [],
        types: [
            { 
                id: 14, 
                name: 'PC Desktop', 
                classification: 'asset',
                trackingMethod: 'individual',
                unitOfMeasure: 'unit',
                standardItems: [{ id: 20, name: 'PC Dell Optiplex', brand: 'Dell' }] 
            },
             { 
                id: 15, 
                name: 'Laptop', 
                classification: 'asset',
                trackingMethod: 'individual',
                unitOfMeasure: 'unit',
                standardItems: [{ id: 21, name: 'ThinkPad X1 Carbon', brand: 'Lenovo' }, { id: 22, name: 'MacBook Air M1', brand: 'Apple' }] 
            },
        ]
    }
];

// --- 2. DIVISI ---

export const mockDivisions: Division[] = [
    { id: 1, name: 'Network Engineering' },
    { id: 2, name: 'NOC (Network Operation Center)' },
    { id: 3, name: 'Technical Support' },
    { id: 4, name: 'Logistik & Gudang' },
    { id: 5, name: 'Management' },
    { id: 6, name: 'Purchase' },
    { id: 7, name: 'HR & GA' },
];

// --- 3. PENGGUNA ---

export const initialMockUsers: User[] = [
    { id: 1, name: 'Super Admin User', email: 'super.admin@triniti.com', divisionId: 5, role: 'Super Admin', permissions: SUPER_ADMIN_PERMISSIONS },
    { id: 2, name: 'Admin Purchase User', email: 'purchase.admin@triniti.com', divisionId: 6, role: 'Admin Purchase', permissions: ADMIN_PURCHASE_PERMISSIONS },
    { id: 3, name: 'Admin Logistik User', email: 'logistik.admin@triniti.com', divisionId: 4, role: 'Admin Logistik', permissions: ADMIN_LOGISTIK_PERMISSIONS },
    { id: 4, name: 'Leader User', email: 'leader.user@triniti.com', divisionId: 1, role: 'Leader', permissions: LEADER_PERMISSIONS },
    { id: 5, name: 'Staff User', email: 'staff.user@triniti.com', divisionId: 3, role: 'Staff', permissions: STAFF_PERMISSIONS },
    { id: 6, name: 'Teknisi Lapangan A', email: 'teknisi.a@triniti.com', divisionId: 3, role: 'Staff', permissions: STAFF_PERMISSIONS },
];

// --- 4. PELANGGAN ---

export const mockCustomers: Customer[] = [
    {
        id: 'TMI-CUST-001', name: 'Budi Santoso (Home)', address: 'Jl. Meruya Ilir No. 45, Jakarta Barat', phone: '+62-812-5555-001',
        email: 'budi.santoso@gmail.com', status: CustomerStatus.ACTIVE, installationDate: d(-120),
        servicePackage: 'Home 50Mbps', activityLog: []
    },
    {
        id: 'TMI-CUST-002', name: 'PT. Maju Mundur (Corp)', address: 'Gedung Cyber Lt. 8, Kuningan, Jakarta Selatan', phone: '+62-21-520-9999',
        email: 'it@majumundur.co.id', status: CustomerStatus.ACTIVE, installationDate: d(-90),
        servicePackage: 'Dedicated 200Mbps', activityLog: []
    },
    {
        id: 'TMI-CUST-003', name: 'Cafe Kopi Senja', address: 'Jl. Senopati No. 10, Jakarta Selatan', phone: '+62-811-2222-333',
        email: 'manager@kopisenja.com', status: CustomerStatus.SUSPENDED, installationDate: d(-30),
        servicePackage: 'SOHO 100Mbps', activityLog: []
    }
];

// --- 5. ASET (Termasuk Material Bulk) ---

const generateBulkItems = (count: number, name: string, category: string, type: string, brand: string, prefix: string, status: AssetStatus = AssetStatus.IN_STORAGE) => {
    const items: Asset[] = [];
    for (let i = 0; i < count; i++) {
        items.push({
            id: `${prefix}-${1000 + i}`,
            name: name,
            category: category,
            type: type,
            brand: brand,
            serialNumber: null, // FORCE NULL FOR BULK
            macAddress: null,   // FORCE NULL FOR BULK
            registrationDate: d(-10),
            recordedBy: 'Admin Logistik User',
            purchaseDate: d(-10),
            purchasePrice: 15000,
            vendor: 'Toko Kabel Jaya',
            location: status === AssetStatus.IN_STORAGE ? 'Gudang Inventori' : 'Lokasi Pelanggan',
            currentUser: null,
            status: status,
            condition: AssetCondition.BRAND_NEW,
            activityLog: [],
            attachments: [],
            poNumber: `REQ-MAT-${prefix}`,
            invoiceNumber: null,
            warrantyEndDate: null,
            notes: 'Stok material'
        });
    }
    return items;
};

export const mockAssets: Asset[] = [
    // CORE NETWORK - In Use
    { id: 'NET-001', name: 'Router Core RB4011iGS+', category: 'Perangkat Jaringan (Core)', type: 'Router Core', brand: 'Mikrotik', serialNumber: 'MT-CORE-001', registrationDate: d(-365), recordedBy: 'Admin Logistik User', purchaseDate: d(-365), purchasePrice: 5000000, vendor: 'Citra Web', location: 'Rack Server HQ', currentUser: 'Leader User', status: AssetStatus.IN_USE, condition: AssetCondition.GOOD, activityLog: [], attachments: [], poNumber: 'PO-001', invoiceNumber: 'INV-001', warrantyEndDate: d(365), notes: 'Router Utama HQ' },
    
    // CPE - In Use (Customer)
    { id: 'CPE-001', name: 'ONT HG8245H', category: 'Perangkat Pelanggan (CPE)', type: 'ONT/ONU', brand: 'Huawei', serialNumber: 'HW-ONT-001', registrationDate: d(-120), recordedBy: 'Admin Logistik User', purchaseDate: d(-125), purchasePrice: 750000, vendor: 'Optik Prima', location: 'Terpasang di Pelanggan', currentUser: 'TMI-CUST-001', status: AssetStatus.IN_USE, condition: AssetCondition.GOOD, activityLog: [], attachments: [], poNumber: 'PO-005', invoiceNumber: 'INV-005', warrantyEndDate: d(240), notes: 'Installed at Budi Home' },
    { id: 'CPE-002', name: 'ONT F609', category: 'Perangkat Pelanggan (CPE)', type: 'ONT/ONU', brand: 'ZTE', serialNumber: 'ZT-ONT-002', registrationDate: d(-90), recordedBy: 'Admin Logistik User', purchaseDate: d(-95), purchasePrice: 700000, vendor: 'Optik Prima', location: 'Terpasang di Pelanggan', currentUser: 'TMI-CUST-002', status: AssetStatus.IN_USE, condition: AssetCondition.GOOD, activityLog: [], attachments: [], poNumber: 'PO-006', invoiceNumber: 'INV-006', warrantyEndDate: d(270), notes: 'Installed at Maju Mundur' },
    
    // CPE - In Storage
    { id: 'CPE-003', name: 'ONT HG8245H', category: 'Perangkat Pelanggan (CPE)', type: 'ONT/ONU', brand: 'Huawei', serialNumber: 'HW-ONT-003', registrationDate: d(-20), recordedBy: 'Admin Logistik User', purchaseDate: d(-20), purchasePrice: 750000, vendor: 'Optik Prima', location: 'Gudang Inventori', currentUser: null, status: AssetStatus.IN_STORAGE, condition: AssetCondition.BRAND_NEW, activityLog: [], attachments: [], poNumber: 'REQ-INIT-02', invoiceNumber: 'INV-100', warrantyEndDate: d(340), notes: 'Stok baru' },
    { id: 'CPE-004', name: 'Router WR840N', category: 'Perangkat Pelanggan (CPE)', type: 'Router WiFi', brand: 'TP-Link', serialNumber: 'TP-WR-004', registrationDate: d(-15), recordedBy: 'Admin Logistik User', purchaseDate: d(-15), purchasePrice: 185000, vendor: 'Mega IT', location: 'Gudang Inventori', currentUser: null, status: AssetStatus.IN_STORAGE, condition: AssetCondition.BRAND_NEW, activityLog: [], attachments: [], poNumber: 'REQ-INIT-03', invoiceNumber: 'INV-101', warrantyEndDate: d(350), notes: null },
    
    // TOOLS - Sync with Loan Request LREQ-002
    // FIX: Status synced to IN_USE and currentUser set to Staff User
    { 
        id: 'TOL-001', 
        name: 'Fusion Splicer 90S', 
        category: 'Alat Kerja Lapangan', 
        type: 'Fusion Splicer', 
        brand: 'Fujikura', 
        serialNumber: 'FJ-SPL-001', 
        registrationDate: d(-200), 
        recordedBy: 'Admin Logistik User', 
        purchaseDate: d(-200), 
        purchasePrice: 65000000, 
        vendor: 'Fiber Solusi', 
        location: 'Digunakan oleh Staff User', // Sync Location
        currentUser: 'Staff User',             // Sync User
        status: AssetStatus.IN_USE,            // Sync Status
        condition: AssetCondition.GOOD, 
        activityLog: [], 
        attachments: [], 
        poNumber: 'PO-TOOLS-01', 
        invoiceNumber: null, 
        warrantyEndDate: d(165), 
        notes: 'Sedang dipinjam (LREQ-002)' 
    },
    
    // OFFICE - In Use
    { id: 'OFC-001', name: 'MacBook Air M1', category: 'Aset Kantor', type: 'Laptop', brand: 'Apple', serialNumber: 'FVFG-M1-001', registrationDate: d(-60), recordedBy: 'Admin Logistik User', purchaseDate: d(-60), purchasePrice: 14000000, vendor: 'iBox', location: 'Kantor Management', currentUser: 'Super Admin User', status: AssetStatus.IN_USE, condition: AssetCondition.GOOD, activityLog: [], attachments: [], poNumber: 'PO-OFC-01', invoiceNumber: null, warrantyEndDate: d(300), notes: 'Laptop Direktur' },

    // MATERIAL - Bulk (Low Stock & Out of Stock simulation)
    // Patchcord (20 Pcs - OK)
    ...generateBulkItems(20, 'Patchcord SC-UPC 3m', 'Infrastruktur Fiber Optik (Material)', 'Aksesoris Koneksi', 'Generic', 'MAT-PC'),
    // Adaptor (5 Pcs - Low Stock)
    ...generateBulkItems(5, 'Adaptor SC-UPC', 'Infrastruktur Fiber Optik (Material)', 'Aksesoris Koneksi', 'Generic', 'MAT-AD'),
    // Dropcore Precon (0 Pcs - Out of Stock - No Items generated)
];

// --- 6. REQUESTS ---

export const initialMockRequests: Request[] = [
    // 1. Pending Request (Regular) - Staff to Leader/Admin
    {
        id: 'REQ-005',
        requester: 'Staff User',
        division: 'Technical Support',
        requestDate: d(-1),
        status: ItemStatus.PENDING,
        order: { type: 'Regular Stock' },
        items: [
            { id: 1, itemName: 'Router WR840N', itemTypeBrand: 'TP-Link', quantity: 5, keterangan: 'Stok teknisi lapangan menipis', stock: 1, categoryId: '2', typeId: '5' }
        ],
        totalValue: 925000,
        activityLog: []
    },
    // 2. Logistic Approved (Urgent) - Waiting for Purchase
    {
        id: 'REQ-004',
        requester: 'Leader User',
        division: 'Network Engineering',
        requestDate: d(-3),
        status: ItemStatus.LOGISTIC_APPROVED,
        logisticApprover: 'Admin Logistik User',
        logisticApprovalDate: d(-2),
        order: { type: 'Urgent', justification: 'Penggantian Switch Core yang mati total di POP Cempaka Putih' },
        items: [
            { id: 1, itemName: 'Switch CRS326-24G-2S+', itemTypeBrand: 'Mikrotik', quantity: 1, keterangan: 'Urgent replacement', stock: 0, categoryId: '1', typeId: '2' }
        ],
        totalValue: 3500000,
        activityLog: [{ id: 1, author: 'Leader User', timestamp: d(-3), type: 'comment', payload: { text: 'Mohon diproses segera' } }]
    },
    // 3. Arrived (Ready for Registration)
    {
        id: 'REQ-003',
        requester: 'Admin Logistik User',
        division: 'Logistik & Gudang',
        requestDate: d(-10),
        status: ItemStatus.ARRIVED,
        logisticApprover: 'Admin Logistik User',
        logisticApprovalDate: d(-9),
        finalApprover: 'Super Admin User',
        finalApprovalDate: d(-8),
        order: { type: 'Regular Stock' },
        items: [
            { id: 1, itemName: 'ONT HG8245H', itemTypeBrand: 'Huawei', quantity: 10, keterangan: 'Restock bulanan', stock: 2, categoryId: '2', typeId: '4' }
        ],
        purchaseDetails: {
            1: { purchasePrice: 7500000, vendor: 'Optik Prima', poNumber: 'PO-OCT-001', invoiceNumber: 'INV-OCT-001', purchaseDate: d(-5), warrantyEndDate: d(360), filledBy: 'Admin Purchase User', fillDate: d(-4) }
        },
        totalValue: 7500000,
        arrivalDate: d(0),
        isRegistered: false,
        activityLog: []
    },
    // 4. Completed (History)
    {
        id: 'REQ-001',
        requester: 'Staff User',
        division: 'Technical Support',
        requestDate: d(-60),
        status: ItemStatus.COMPLETED,
        logisticApprover: 'Admin Logistik User',
        logisticApprovalDate: d(-59),
        finalApprover: 'Super Admin User',
        finalApprovalDate: d(-58),
        order: { type: 'Regular Stock' },
        items: [
            { id: 1, itemName: 'Tang Krimping', itemTypeBrand: 'Krisbow', quantity: 2, keterangan: 'Untuk teknisi baru', stock: 0, categoryId: '5', typeId: '11' }
        ],
        purchaseDetails: {
            1: { purchasePrice: 300000, vendor: 'Ace Hardware', poNumber: 'PO-AUG-005', invoiceNumber: 'INV-AUG-005', purchaseDate: d(-55), warrantyEndDate: null, filledBy: 'Admin Purchase User', fillDate: d(-54) }
        },
        totalValue: 300000,
        completionDate: d(-50),
        completedBy: 'Admin Logistik User',
        isRegistered: true,
        activityLog: []
    }
];

// --- 7. LOAN REQUESTS ---

export const mockLoanRequests: LoanRequest[] = [
    // 1. Active Loan (Testing Return)
    {
        id: 'LREQ-002',
        requester: 'Staff User',
        division: 'Technical Support',
        requestDate: d(-5),
        status: LoanRequestStatus.ON_LOAN,
        items: [
            { id: 1, itemName: 'Fusion Splicer 90S', brand: 'Fujikura', quantity: 1, keterangan: 'Peminjaman untuk project instalasi Apartemen', returnDate: d(5) }
        ],
        approver: 'Admin Logistik User',
        approvalDate: d(-4),
        assignedAssetIds: { 1: ['TOL-001'] }, 
        notes: 'Peminjaman alat kerja'
    },
    // 2. Overdue Loan (Testing Alert)
    {
        id: 'LREQ-001',
        requester: 'Teknisi Lapangan A',
        division: 'Technical Support',
        requestDate: d(-15),
        status: LoanRequestStatus.OVERDUE,
        items: [
            { id: 1, itemName: 'Optical Power Meter (OPM)', brand: 'Joinwit', quantity: 1, keterangan: 'Maintenance link', returnDate: d(-1) }
        ],
        approver: 'Admin Logistik User',
        approvalDate: d(-14),
        assignedAssetIds: { 1: ['TOL-002-MOCK'] }, // Virtual ID
        notes: 'Alat ukur'
    }
];

// --- 8. TRANSACTIONS (HANDOVER, INSTALLATION, MAINTENANCE, DISMANTLE) ---

export const mockHandovers: Handover[] = [
    {
        id: 'HO-001',
        docNumber: 'HO-231001-001',
        handoverDate: d(-60),
        menyerahkan: 'Admin Logistik User',
        penerima: 'Super Admin User',
        mengetahui: 'HR Manager',
        items: [
            { id: 1, assetId: 'OFC-001', itemName: 'MacBook Air M1', itemTypeBrand: 'Apple', conditionNotes: 'Baru, segel dibuka untuk pengecekan', quantity: 1, checked: true }
        ],
        status: ItemStatus.COMPLETED
    }
];

export const mockInstallations: Installation[] = [
    {
        id: 'INST-001',
        docNumber: 'INST-230915-005',
        requestNumber: 'REQ-CUST-001',
        installationDate: d(-120),
        technician: 'Staff User',
        customerId: 'TMI-CUST-001',
        customerName: 'Budi Santoso (Home)',
        assetsInstalled: [
            { assetId: 'CPE-001', assetName: 'ONT HG8245H', serialNumber: 'HW-ONT-001' }
        ],
        materialsUsed: [
            { itemName: 'Dropcore 1 Core (Hasbal)', brand: 'FiberHome', quantity: 150, unit: 'Meter' },
            { itemName: 'Fast Connector SC-UPC', brand: 'Generic', quantity: 2, unit: 'Pcs' }
        ],
        notes: 'Instalasi berjalan lancar. Redaman -18dBm.',
        status: ItemStatus.COMPLETED,
        acknowledger: 'Admin Logistik User',
        createdBy: 'Staff User'
    }
];

export const mockDismantles: Dismantle[] = [
    {
        id: 'DSM-001',
        docNumber: 'DSM-230930-001',
        dismantleDate: d(-17),
        assetId: 'CPE-OLD-001', // Virtual Asset ID
        assetName: 'ONT F609',
        technician: 'Staff User',
        customerId: 'TMI-CUST-003',
        customerName: 'Cafe Kopi Senja',
        customerAddress: 'Jl. Senopati No. 10',
        retrievedCondition: AssetCondition.USED_OKAY,
        notes: 'Pelanggan suspend sementara karena renovasi cafe.',
        acknowledger: 'Admin Logistik User',
        status: ItemStatus.COMPLETED
    }
];

export const mockMaintenances: Maintenance[] = [
    {
        id: 'MNT-001',
        docNumber: 'MNT-230820-003',
        maintenanceDate: d(-58),
        technician: 'Teknisi Lapangan A',
        customerId: 'TMI-CUST-002',
        customerName: 'PT. Maju Mundur (Corp)',
        assets: [{ assetId: 'CPE-002', assetName: 'ONT F609' }],
        problemDescription: 'Koneksi putus nyambung (LOS merah kedip)',
        actionsTaken: 'Splicing ulang di ODP dan ganti patchcord.',
        workTypes: ['Splicing FO', 'Ganti Perangkat'],
        priority: 'Tinggi',
        materialsUsed: [
            { itemName: 'Patchcord SC-UPC 3m', brand: 'Generic', quantity: 1, unit: 'Pcs' }
        ],
        status: ItemStatus.COMPLETED,
        completedBy: 'Teknisi Lapangan A',
        completionDate: d(-58)
    }
];

// --- 9. NOTIFICATIONS & RETURNS ---

export const mockNotifications: Notification[] = [
    {
        id: 1,
        recipientId: 2, // Admin Purchase
        actorName: 'Admin Logistik User',
        type: 'REQUEST_LOGISTIC_APPROVED',
        referenceId: 'REQ-004',
        message: 'menyetujui request #REQ-004, mohon isi detail pembelian.',
        isRead: false,
        timestamp: d(0)
    },
    {
        id: 2,
        recipientId: 3, // Admin Logistik
        actorName: 'Staff User',
        type: 'REQUEST_CREATED',
        referenceId: 'REQ-005',
        message: 'membuat request baru.',
        isRead: false,
        timestamp: d(0)
    },
    {
        id: 3,
        recipientId: 5, // Staff
        actorName: 'System',
        type: 'info',
        message: 'Selamat datang di Aplikasi Inventori Aset Triniti Media.',
        isRead: true,
        timestamp: d(-5)
    }
];

export const mockReturns: AssetReturn[] = []; // Kosong, nanti diisi via fitur

// Mock History for Stock Item
export const mockStockMovements = [];
