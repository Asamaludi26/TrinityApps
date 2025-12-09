
import { 
    Division, 
    User, 
    UserRole, 
    Customer, 
    CustomerStatus, 
    Asset, 
    AssetCategory, 
    AssetType, 
    StandardItem, 
    AssetStatus, 
    AssetCondition, 
    Attachment, 
    ActivityLogEntry, 
    Request, 
    RequestItem, 
    ItemStatus, 
    Handover, 
    HandoverItem, 
    Dismantle, 
    OrderDetails, 
    Notification, 
    LoanRequest, 
    LoanRequestStatus, 
    Maintenance, 
    InstalledMaterial, 
    Installation, 
    InstallationAsset, 
    InstallationMaterial, 
    Permission, 
    LoanItem, 
    MaintenanceMaterial, 
    MaintenanceReplacement, 
    AssetReturn,
    AssetReturnStatus,
    PurchaseDetails
} from '../types'; 
import { generateDocumentNumber } from '../utils/documentNumberGenerator'; 
import { 
    ALL_PERMISSION_KEYS, 
    STAFF_PERMISSIONS, 
    LEADER_PERMISSIONS, 
    ADMIN_LOGISTIK_PERMISSIONS, 
    ADMIN_PURCHASE_PERMISSIONS, 
    SUPER_ADMIN_PERMISSIONS 
} from '../utils/permissions'; 

// --- ============================================= ---
// ---         MOCK DATA UNTUK PENGUJIAN (QC)        ---
// --- ============================================= ---
// Data ini dibuat secara manual dan deterministik untuk memastikan
// setiap alur kerja dapat diuji secara konsisten.

const NOW = new Date();
const getDate = (daysOffset: number = 0): Date => {
    const date = new Date(NOW);
    date.setDate(date.getDate() + daysOffset);
    return date;
};

// --- 1. MASTER DATA DASAR ---

export const mockDivisions: Division[] = [ 
    { id: 1, name: 'NOC' }, 
    { id: 2, name: 'Customer Service' }, 
    { id: 3, name: 'Teknisi' }, 
    { id: 4, name: 'Logistik' }, 
    { id: 5, name: 'Administrasi' }, 
    { id: 6, name: 'Finance' }, 
]; 

export const initialAssetCategories: AssetCategory[] = [ 
    { 
        id: 1, name: 'Perangkat Jaringan (Core)', isCustomerInstallable: false, associatedDivisions: [1, 3], 
        types: [ 
            { id: 1, name: 'Router Core', standardItems: [{ id: 1, name: 'Router Core RB4011iGS+', brand: 'Mikrotik' }] }, 
            { id: 101, name: 'Switch 24 Port', standardItems: [{ id: 101, name: 'Switch 24 Port', brand: 'Cisco' }] }, 
        ] 
    }, 
    { 
        id: 2, name: 'Perangkat Pelanggan (CPE)', isCustomerInstallable: true, associatedDivisions: [3], 
        types: [ 
            { id: 4, name: 'ONT/ONU', standardItems: [{ id: 6, name: 'ONT HG8245H', brand: 'Huawei' }] }, 
        ] 
    }, 
    { 
        id: 3, name: 'Infrastruktur Fiber Optik', isCustomerInstallable: true, associatedDivisions: [3], 
        types: [ 
            { id: 6, name: 'Kabel Dropcore', trackingMethod: 'bulk', unitOfMeasure: 'roll', baseUnitOfMeasure: 'meter', quantityPerUnit: 150, standardItems: [{ id: 10, name: 'Kabel Dropcore 1 Core 150m', brand: 'FiberHome' }] }, 
            { id: 7, name: 'Kabel UTP', trackingMethod: 'bulk', unitOfMeasure: 'box', baseUnitOfMeasure: 'meter', quantityPerUnit: 305, standardItems: [{ id: 11, name: 'Kabel UTP Cat6 305m', brand: 'Belden' }] }, 
        ] 
    }, 
    { 
        id: 4, name: 'Alat Kerja Lapangan', isCustomerInstallable: false, associatedDivisions: [3], 
        types: [ 
            { id: 10, name: 'Fusion Splicer', standardItems: [{ id: 14, name: 'Fusion Splicer 90S', brand: 'Fujikura' }] }, 
            { id: 11, name: 'Tang Krimping', standardItems: [{ id: 15, name: 'Tang Krimping', brand: 'Krisbow' }] }, 
            { id: 12, name: 'Bor Listrik', standardItems: [{ id: 16, name: 'Drill Listrik', brand: 'Makita' }] }, 
        ] 
    }, 
    { 
        id: 5, name: 'Aset Kantor', isCustomerInstallable: false, associatedDivisions: [], 
        types: [ 
            { id: 14, name: 'PC Desktop', standardItems: [{ id: 18, name: 'PC Dell Optiplex', brand: 'Dell' }] }, 
            { id: 15, name: 'Headset', standardItems: [{ id: 19, name: 'Headset Customer Service', brand: 'Jabra' }] }, 
        ] 
    } 
]; 

const assetTemplates: { category: string; type: string; name: string; brand: string; price: number }[] = []; 
initialAssetCategories.forEach(cat => cat.types.forEach(type => type.standardItems?.forEach(item => { 
    let price = 500000;
    if (item.name.includes('Router Core')) price = 5000000;
    else if (item.name.includes('Splicer')) price = 15000000;
    else if (item.name.includes('PC')) price = 7000000;
    assetTemplates.push({ category: cat.name, type: type.name, ...item, price }); 
}))); 

// --- 2. PENGGUNA UNTUK PENGUJIAN ---

export const initialMockUsers: User[] = [
    { id: 1, name: 'Super Admin User', email: 'super.admin@triniti.com', divisionId: 5, role: 'Super Admin', permissions: SUPER_ADMIN_PERMISSIONS },
    { id: 2, name: 'Admin Purchase User', email: 'purchase.admin@triniti.com', divisionId: 6, role: 'Admin Purchase', permissions: ADMIN_PURCHASE_PERMISSIONS },
    { id: 3, name: 'Admin Logistik User', email: 'logistik.admin@triniti.com', divisionId: 4, role: 'Admin Logistik', permissions: ADMIN_LOGISTIK_PERMISSIONS },
    { id: 4, name: 'Leader User', email: 'leader.user@triniti.com', divisionId: 1, role: 'Leader', permissions: LEADER_PERMISSIONS },
    { id: 5, name: 'Staff User', email: 'staff.user@triniti.com', divisionId: 3, role: 'Staff', permissions: STAFF_PERMISSIONS },
];

// --- 3. PELANGGAN UNTUK PENGUJIAN ---

export let mockCustomers: Customer[] = [
    {
        id: 'TMI-TEST-01', name: 'Test Customer', address: 'Jl. Uji Coba No. 123, Jakarta', phone: '+62-812-0000-1111',
        email: 'test.customer@example.net', status: CustomerStatus.ACTIVE, installationDate: getDate(-30).toISOString(),
        servicePackage: 'Home 50Mbps', activityLog: [], installedMaterials: []
    }
];

// --- 4. ASET UNTUK PENGUJIAN ---
// Dibuat sedemikian rupa untuk mencakup semua skenario pengujian.

export let mockAssets: Asset[] = [
    // 1 Aset per kategori, IN_STORAGE
    { id: 'AST-CAT1-01', name: 'Router Core RB4011iGS+', category: 'Perangkat Jaringan (Core)', type: 'Router Core', brand: 'Mikrotik', serialNumber: 'SN-CAT1-001', registrationDate: getDate(-50).toISOString(), recordedBy: 'Admin Logistik User', purchaseDate: getDate(-50).toISOString(), purchasePrice: 5000000, vendor: 'Mega IT Store', location: 'Gudang Inventori', currentUser: null, status: AssetStatus.IN_STORAGE, condition: AssetCondition.BRAND_NEW, activityLog: [], attachments: [], poNumber: 'REQ-DUMMY-01', invoiceNumber: null, warrantyEndDate: null, notes: null },
    { id: 'AST-CAT2-01', name: 'ONT HG8245H', category: 'Perangkat Pelanggan (CPE)', type: 'ONT/ONU', brand: 'Huawei', serialNumber: 'SN-CAT2-001', registrationDate: getDate(-50).toISOString(), recordedBy: 'Admin Logistik User', purchaseDate: getDate(-50).toISOString(), purchasePrice: 750000, vendor: 'Optik Prima Distribusi', location: 'Gudang Inventori', currentUser: null, status: AssetStatus.IN_STORAGE, condition: AssetCondition.BRAND_NEW, activityLog: [], attachments: [], poNumber: 'REQ-DUMMY-02', invoiceNumber: null, warrantyEndDate: null, notes: null },
    { id: 'AST-CAT3-01', name: 'Kabel Dropcore 1 Core 150m', category: 'Infrastruktur Fiber Optik', type: 'Kabel Dropcore', brand: 'FiberHome', serialNumber: 'SN-CAT3-001', registrationDate: getDate(-50).toISOString(), recordedBy: 'Admin Logistik User', purchaseDate: getDate(-50).toISOString(), purchasePrice: 300000, vendor: 'CV. Sinar Teknik', location: 'Gudang Inventori', currentUser: null, status: AssetStatus.IN_STORAGE, condition: AssetCondition.BRAND_NEW, activityLog: [], attachments: [], poNumber: 'REQ-DUMMY-03', invoiceNumber: null, warrantyEndDate: null, notes: null },
    { id: 'AST-CAT4-01', name: 'Fusion Splicer 90S', category: 'Alat Kerja Lapangan', type: 'Fusion Splicer', brand: 'Fujikura', serialNumber: 'SN-CAT4-001', registrationDate: getDate(-50).toISOString(), recordedBy: 'Admin Logistik User', purchaseDate: getDate(-50).toISOString(), purchasePrice: 15000000, vendor: 'Mega IT Store', location: 'Gudang Inventori', currentUser: null, status: AssetStatus.IN_STORAGE, condition: AssetCondition.BRAND_NEW, activityLog: [], attachments: [], poNumber: 'REQ-DUMMY-04', invoiceNumber: null, warrantyEndDate: null, notes: null },
    { id: 'AST-CAT5-01', name: 'PC Dell Optiplex', category: 'Aset Kantor', type: 'PC Desktop', brand: 'Dell', serialNumber: 'SN-CAT5-001', registrationDate: getDate(-50).toISOString(), recordedBy: 'Admin Logistik User', purchaseDate: getDate(-50).toISOString(), purchasePrice: 7000000, vendor: 'Mega IT Store', location: 'Gudang Inventori', currentUser: null, status: AssetStatus.IN_STORAGE, condition: AssetCondition.BRAND_NEW, activityLog: [], attachments: [], poNumber: 'REQ-DUMMY-05', invoiceNumber: null, warrantyEndDate: null, notes: null },
    
    // Aset untuk berbagai status perbaikan
    { id: 'AST-REPAIR-01', name: 'Router WiFi Archer C6', category: 'Perangkat Pelanggan (CPE)', type: 'Router WiFi', brand: 'TP-Link', serialNumber: 'SN-REPAIR-001', registrationDate: getDate(-40).toISOString(), recordedBy: 'Admin Logistik User', purchaseDate: getDate(-40).toISOString(), purchasePrice: 600000, vendor: 'Mega IT Store', location: 'Gudang Inventori', currentUser: null, status: AssetStatus.DAMAGED, condition: AssetCondition.MAJOR_DAMAGE, activityLog: [{id:'log1', timestamp: getDate(-1).toISOString(), user:'Staff User', action:'Kerusakan Dilaporkan', details: 'Perangkat mati total.'}], attachments: [], poNumber: 'REQ-DUMMY-06', invoiceNumber: null, warrantyEndDate: null, notes: null },
    { id: 'AST-REPAIR-02', name: 'Laptop ThinkPad T480', category: 'Alat Kerja Lapangan', type: 'Laptop Teknisi', brand: 'Lenovo', serialNumber: 'SN-REPAIR-002', registrationDate: getDate(-40).toISOString(), recordedBy: 'Admin Logistik User', purchaseDate: getDate(-40).toISOString(), purchasePrice: 9000000, vendor: 'Mega IT Store', location: 'Gudang Inventori', currentUser: null, status: AssetStatus.UNDER_REPAIR, condition: AssetCondition.MINOR_DAMAGE, activityLog: [{id:'log2', timestamp: getDate(-2).toISOString(), user:'Admin Logistik User', action:'Proses Perbaikan Dimulai', details: 'Perbaikan internal oleh Teknisi A.'}], attachments: [], poNumber: 'REQ-DUMMY-07', invoiceNumber: null, warrantyEndDate: null, notes: null },
    { id: 'AST-REPAIR-03', name: 'OTDR AQ7280', category: 'Alat Kerja Lapangan', type: 'OTDR', brand: 'Yokogawa', serialNumber: 'SN-REPAIR-003', registrationDate: getDate(-40).toISOString(), recordedBy: 'Admin Logistik User', purchaseDate: getDate(-40).toISOString(), purchasePrice: 25000000, vendor: 'Mega IT Store', location: 'Perbaikan Eksternal', currentUser: null, status: AssetStatus.OUT_FOR_REPAIR, condition: AssetCondition.MAJOR_DAMAGE, activityLog: [{id:'log3', timestamp: getDate(-3).toISOString(), user:'Admin Logistik User', action:'Proses Perbaikan Dimulai', details: 'Dikirim ke vendor perbaikan PT. Servis Elektronik.'}], attachments: [], poNumber: 'REQ-DUMMY-08', invoiceNumber: null, warrantyEndDate: null, notes: null },
    
    // Aset tambahan untuk skenario spesifik
    { id: 'AST-LOAN-RETURN', name: 'Laptop ThinkPad T480', category: 'Alat Kerja Lapangan', type: 'Laptop Teknisi', brand: 'Lenovo', serialNumber: 'SN-LOAN-RET-01', registrationDate: getDate(-60).toISOString(), recordedBy: 'Admin Logistik User', purchaseDate: getDate(-60).toISOString(), purchasePrice: 9000000, vendor: 'Mega IT Store', location: 'Dipinjam oleh: Staff User', currentUser: 'Staff User', status: AssetStatus.IN_USE, condition: AssetCondition.GOOD, activityLog: [], attachments: [], poNumber: 'LREQ-RET-01', invoiceNumber: null, warrantyEndDate: null, notes: null },
    { id: 'AST-LOAN-OVERDUE', name: 'Fusion Splicer 90S', category: 'Alat Kerja Lapangan', type: 'Fusion Splicer', brand: 'Fujikura', serialNumber: 'SN-LOAN-OVD-01', registrationDate: getDate(-60).toISOString(), recordedBy: 'Admin Logistik User', purchaseDate: getDate(-60).toISOString(), purchasePrice: 15000000, vendor: 'Mega IT Store', location: 'Dipinjam oleh: Leader User', currentUser: 'Leader User', status: AssetStatus.IN_USE, condition: AssetCondition.GOOD, activityLog: [], attachments: [], poNumber: 'LREQ-OVERDUE-01', invoiceNumber: null, warrantyEndDate: null, notes: null },
    { id: 'AST-INSTALL', name: 'ONT F609', category: 'Perangkat Pelanggan (CPE)', type: 'ONT/ONU', brand: 'ZTE', serialNumber: 'SN-INSTALL-01', registrationDate: getDate(-50).toISOString(), recordedBy: 'Admin Logistik User', purchaseDate: getDate(-50).toISOString(), purchasePrice: 800000, vendor: 'Optik Prima Distribusi', location: 'Gudang Inventori', currentUser: null, status: AssetStatus.IN_STORAGE, condition: AssetCondition.BRAND_NEW, activityLog: [], attachments: [], poNumber: 'REQ-DUMMY-10', invoiceNumber: null, warrantyEndDate: null, notes: null },
    { id: 'AST-MAINT', name: 'ONT F609', category: 'Perangkat Pelanggan (CPE)', type: 'ONT/ONU', brand: 'ZTE', serialNumber: 'SN-MAINT-01', registrationDate: getDate(-50).toISOString(), recordedBy: 'Admin Logistik User', purchaseDate: getDate(-50).toISOString(), purchasePrice: 800000, vendor: 'Optik Prima Distribusi', location: `Terpasang di: ${mockCustomers[0].address}`, currentUser: mockCustomers[0].id, status: AssetStatus.IN_USE, condition: AssetCondition.GOOD, activityLog: [], attachments: [], poNumber: 'REQ-DUMMY-11', invoiceNumber: null, warrantyEndDate: null, notes: null },
    { id: 'AST-DISMANTLE', name: 'Router WiFi Archer C6', category: 'Perangkat Pelanggan (CPE)', type: 'Router WiFi', brand: 'TP-Link', serialNumber: 'SN-DISMANTLE-01', registrationDate: getDate(-50).toISOString(), recordedBy: 'Admin Logistik User', purchaseDate: getDate(-50).toISOString(), purchasePrice: 600000, vendor: 'Mega IT Store', location: `Terpasang di: ${mockCustomers[0].address}`, currentUser: mockCustomers[0].id, status: AssetStatus.IN_USE, condition: AssetCondition.USED_OKAY, activityLog: [], attachments: [], poNumber: 'REQ-DUMMY-12', invoiceNumber: null, warrantyEndDate: null, notes: null },
    { id: 'AST-HANDOVER-INT', name: 'Monitor LG 24 inch', category: 'Aset Kantor', type: 'Monitor', brand: 'LG', serialNumber: 'SN-HO-INT-01', registrationDate: getDate(-50).toISOString(), recordedBy: 'Admin Logistik User', purchaseDate: getDate(-50).toISOString(), purchasePrice: 2500000, vendor: 'Mega IT Store', location: 'Gudang Inventori', currentUser: null, status: AssetStatus.IN_STORAGE, condition: AssetCondition.BRAND_NEW, activityLog: [], attachments: [], poNumber: 'REQ-DUMMY-13', invoiceNumber: null, warrantyEndDate: null, notes: null },
    { id: 'AST-HANDOVER-REQ', name: 'Printer Epson L3210', category: 'Aset Kantor', type: 'Printer', brand: 'Epson', serialNumber: 'SN-HO-REQ-01', registrationDate: getDate(-10).toISOString(), recordedBy: 'Admin Logistik User', purchaseDate: getDate(-10).toISOString(), purchasePrice: 3000000, vendor: 'Mega IT Store', location: 'Gudang Inventori', currentUser: null, status: AssetStatus.IN_STORAGE, condition: AssetCondition.BRAND_NEW, activityLog: [], attachments: [], poNumber: 'REQ-HO-01', invoiceNumber: null, warrantyEndDate: null, notes: null },
    { id: 'AST-HANDOVER-LOAN', name: 'Power Meter', category: 'Alat Kerja Lapangan', type: 'Power Meter', brand: 'Joinwit', serialNumber: 'SN-HO-LOAN-01', registrationDate: getDate(-50).toISOString(), recordedBy: 'Admin Logistik User', purchaseDate: getDate(-50).toISOString(), purchasePrice: 1500000, vendor: 'Mega IT Store', location: 'Gudang Inventori', currentUser: null, status: AssetStatus.IN_STORAGE, condition: AssetCondition.BRAND_NEW, activityLog: [], attachments: [], poNumber: 'REQ-DUMMY-14', invoiceNumber: null, warrantyEndDate: null, notes: null },
];

// --- 5. DATA FITUR UNTUK PENGUJIAN ---
export let initialMockRequests: Request[] = [];
export let mockLoanRequests: LoanRequest[] = [];
export let mockReturns: AssetReturn[] = [];
export let mockInstallations: Installation[] = [];
export let mockMaintenances: Maintenance[] = [];
export let mockDismantles: Dismantle[] = [];
export let mockHandovers: Handover[] = [];

// --- BUAT DATA UNTUK SETIAP SKENARIO ---

// 1. New Request
initialMockRequests.push({
    id: 'REQ-TEST-01', docNumber: 'REQ-251012-001', requester: 'Staff User', division: 'Teknisi', requestDate: getDate(-5).toISOString(), status: ItemStatus.PENDING,
    order: { type: 'Regular Stock' }, items: [{ id: 1, itemName: 'PC Dell Optiplex', itemTypeBrand: 'Dell', stock: 1, quantity: 1, keterangan: 'PC untuk teknisi baru.' }],
    totalValue: 7000000, logisticApprover: null, logisticApprovalDate: null, finalApprover: null, finalApprovalDate: null, rejectionReason: null, rejectedBy: null, rejectionDate: null, rejectedByDivision: null
});

// 2. Loan Request
mockLoanRequests.push({
    id: 'LREQ-TEST-01', requester: 'Staff User', division: 'Teknisi', requestDate: getDate(-4).toISOString(), status: LoanRequestStatus.PENDING,
    items: [{ id: 1, itemName: 'Fusion Splicer 90S', brand: 'Fujikura', quantity: 1, returnDate: getDate(10).toISOString().split('T')[0], keterangan: 'Untuk perbaikan kabel putus.' }],
    notes: 'Kebutuhan mendesak.'
});

// 3. Return Request
const loanForReturn: LoanRequest = {
    id: 'LREQ-RET-01', requester: 'Staff User', division: 'Teknisi', requestDate: getDate(-20).toISOString(), status: LoanRequestStatus.ON_LOAN,
    items: [{ id: 1, itemName: 'Laptop ThinkPad T480', brand: 'Lenovo', quantity: 1, returnDate: getDate(5).toISOString().split('T')[0] }], notes: 'Peminjaman untuk WFH.',
    approver: 'Admin Logistik User', approvalDate: getDate(-19).toISOString(), assignedAssetIds: { 1: ['AST-LOAN-RETURN'] }
};
mockLoanRequests.push(loanForReturn);
mockReturns.push({
    id: 'RET-TEST-01', docNumber: 'RET-251017-001', returnDate: getDate(-1).toISOString(), loanRequestId: 'LREQ-RET-01', assetId: 'AST-LOAN-RETURN',
    assetName: 'Laptop ThinkPad T480', returnedBy: 'Staff User', receivedBy: 'Admin Logistik User', acknowledgedBy: 'Super Admin User',
    returnedCondition: AssetCondition.GOOD, notes: 'Pengembalian setelah selesai WFH.', status: AssetReturnStatus.PENDING_APPROVAL
});
const assetForReturnIdx = mockAssets.findIndex(a => a.id === 'AST-LOAN-RETURN');
if (assetForReturnIdx > -1) mockAssets[assetForReturnIdx].status = AssetStatus.AWAITING_RETURN;


// 4. Customer Installation
const assetForInstall = mockAssets.find(a => a.id === 'AST-INSTALL')!;
mockInstallations.push({
    id: 'INST-TEST-01', docNumber: 'INST-251017-001', installationDate: getDate(-15).toISOString(), technician: 'Staff User',
    customerId: 'TMI-TEST-01', customerName: 'Test Customer', assetsInstalled: [{ assetId: assetForInstall.id, assetName: assetForInstall.name, serialNumber: assetForInstall.serialNumber }],
    status: ItemStatus.COMPLETED
});
const assetForInstallIdx = mockAssets.findIndex(a => a.id === 'AST-INSTALL');
if (assetForInstallIdx > -1) {
    mockAssets[assetForInstallIdx].status = AssetStatus.IN_USE;
    mockAssets[assetForInstallIdx].currentUser = 'TMI-TEST-01';
    mockAssets[assetForInstallIdx].location = `Terpasang di: ${mockCustomers[0].address}`;
}


// 5. Customer Maintenance
mockMaintenances.push({
    id: 'MNT-TEST-01', docNumber: 'WO-MT-20251017-0001', maintenanceDate: getDate(-10).toISOString(), technician: 'Staff User',
    customerId: 'TMI-TEST-01', customerName: 'Test Customer', assets: [{ assetId: 'AST-MAINT', assetName: 'ONT F609' }],
    problemDescription: 'Internet lambat di malam hari.', actionsTaken: 'Restart ONT dan cek redaman.', status: ItemStatus.COMPLETED, attachments: []
});

// 6. Customer Dismantle
mockDismantles.push({
    id: 'DSM-TEST-01', docNumber: 'DSM-251017-001', assetId: 'AST-DISMANTLE', assetName: 'Router WiFi Archer C6', dismantleDate: getDate(-2).toISOString(),
    technician: 'Staff User', customerId: 'TMI-TEST-01', customerName: 'Test Customer', customerAddress: mockCustomers[0].address,
    retrievedCondition: AssetCondition.USED_OKAY, notes: 'Pelanggan berhenti berlangganan.', status: ItemStatus.IN_PROGRESS, acknowledger: null, attachments: []
});


// 7. Internal Handover (Aset Kantor)
const assetForIntHandover = mockAssets.find(a => a.id === 'AST-HANDOVER-INT')!;
mockHandovers.push({
    id: 'HO-INT-01', docNumber: 'HO-251017-001', handoverDate: getDate(-8).toISOString(), menyerahkan: 'Admin Logistik User', penerima: 'Leader User', mengetahui: 'Super Admin User',
    items: [{ id: 1, assetId: assetForIntHandover.id, itemName: assetForIntHandover.name, itemTypeBrand: assetForIntHandover.brand, conditionNotes: 'Baru', quantity: 1, checked: true }],
    status: ItemStatus.COMPLETED
});
const assetForIntHOIdx = mockAssets.findIndex(a => a.id === 'AST-HANDOVER-INT');
if (assetForIntHOIdx > -1) {
    mockAssets[assetForIntHOIdx].status = AssetStatus.IN_USE;
    mockAssets[assetForIntHOIdx].currentUser = 'Leader User';
    mockAssets[assetForIntHOIdx].location = `Digunakan oleh: Leader User`;
}

// 8. Handover from New Request
const reqForHO: Request = {
    id: 'REQ-HO-01', docNumber: 'REQ-251005-001', requester: 'Staff User', division: 'Teknisi', requestDate: getDate(-12).toISOString(), status: ItemStatus.AWAITING_HANDOVER,
    order: { type: 'Regular Stock' }, items: [{ id: 1, itemName: 'Printer Epson L3210', itemTypeBrand: 'Epson', stock: 1, quantity: 1, keterangan: 'Printer untuk divisi teknisi.' }],
    totalValue: 3000000, logisticApprover: 'Admin Logistik User', logisticApprovalDate: getDate(-11).toISOString(), finalApprover: 'Super Admin User', finalApprovalDate: getDate(-10).toISOString(), isRegistered: true, rejectionReason: null, rejectedBy: null, rejectionDate: null, rejectedByDivision: null
};
initialMockRequests.push(reqForHO);
const assetForReqHO = mockAssets.find(a => a.id === 'AST-HANDOVER-REQ')!;
mockHandovers.push({
    id: 'HO-REQ-01', docNumber: 'HO-RO-251017-001', handoverDate: getDate(-7).toISOString(), menyerahkan: 'Admin Logistik User', penerima: 'Staff User', mengetahui: 'Super Admin User',
    woRoIntNumber: 'REQ-HO-01', items: [{ id: 1, assetId: assetForReqHO.id, itemName: assetForReqHO.name, itemTypeBrand: assetForReqHO.brand, conditionNotes: 'Baru', quantity: 1, checked: true }],
    status: ItemStatus.COMPLETED
});
const assetForReqHOIdx = mockAssets.findIndex(a => a.id === 'AST-HANDOVER-REQ');
if (assetForReqHOIdx > -1) {
    mockAssets[assetForReqHOIdx].status = AssetStatus.IN_USE;
    mockAssets[assetForReqHOIdx].currentUser = 'Staff User';
    mockAssets[assetForReqHOIdx].location = 'Digunakan oleh: Staff User';
}
reqForHO.status = ItemStatus.COMPLETED; // Update status request setelah HO

// 9. Handover from Loan Request
const loanForHO: LoanRequest = {
    id: 'LREQ-HO-01', requester: 'Leader User', division: 'NOC', requestDate: getDate(-14).toISOString(), status: LoanRequestStatus.APPROVED,
    items: [{ id: 1, itemName: 'Power Meter', brand: 'Joinwit', quantity: 1, returnDate: getDate(20).toISOString().split('T')[0] }], notes: 'Untuk audit jaringan.',
    approver: 'Admin Logistik User', approvalDate: getDate(-13).toISOString(), assignedAssetIds: { 1: ['AST-HANDOVER-LOAN'] }
};
mockLoanRequests.push(loanForHO);
mockHandovers.push({
    id: 'HO-LREQ-01', docNumber: 'HO-LN-251017-001', handoverDate: getDate(-6).toISOString(), menyerahkan: 'Admin Logistik User', penerima: 'Leader User', mengetahui: 'Super Admin User',
    woRoIntNumber: 'LREQ-HO-01', items: [{ id: 1, assetId: 'AST-HANDOVER-LOAN', itemName: 'Power Meter', itemTypeBrand: 'Joinwit', conditionNotes: 'Baik', quantity: 1, checked: true }],
    status: ItemStatus.COMPLETED
});
const assetForLoanHOIdx = mockAssets.findIndex(a => a.id === 'AST-HANDOVER-LOAN');
if (assetForLoanHOIdx > -1) {
    mockAssets[assetForLoanHOIdx].status = AssetStatus.IN_USE;
    mockAssets[assetForLoanHOIdx].currentUser = 'Leader User';
    mockAssets[assetForLoanHOIdx].location = 'Digunakan oleh: Leader User';
}
loanForHO.status = LoanRequestStatus.ON_LOAN; // Update status loan setelah HO
loanForHO.handoverId = 'HO-LREQ-01';

// 10. SCENARIOS for Role-Specific Workflows
// a. For Admin Purchase (Status: LOGISTIC_APPROVED)
initialMockRequests.push({
    id: 'REQ-PURCHASE-01', docNumber: 'REQ-251014-001', requester: 'Staff User', division: 'Teknisi', requestDate: getDate(-3).toISOString(), status: ItemStatus.LOGISTIC_APPROVED,
    order: { type: 'Regular Stock' }, items: [{ id: 1, itemName: 'ONT HG8245H', itemTypeBrand: 'Huawei', stock: 0, quantity: 2, keterangan: 'Stok ONT habis.' }],
    totalValue: 1500000, logisticApprover: 'Admin Logistik User', logisticApprovalDate: getDate(-2).toISOString(), finalApprover: null, finalApprovalDate: null, rejectionReason: null, rejectedBy: null, rejectionDate: null, rejectedByDivision: null
});

// b. For Super Admin (Status: AWAITING_CEO_APPROVAL)
const purchaseDetailsForCeo: Record<number, PurchaseDetails> = {
    1: { purchasePrice: 25000000, vendor: 'Mega IT Store', poNumber: 'PO-TEST-CEO', invoiceNumber: 'INV-TEST-CEO', purchaseDate: getDate(-1).toISOString(), warrantyEndDate: null, filledBy: 'Admin Purchase User', fillDate: getDate(0).toISOString() }
};
initialMockRequests.push({
    id: 'REQ-CEO-01', docNumber: 'REQ-251013-001', requester: 'Leader User', division: 'NOC', requestDate: getDate(-4).toISOString(), status: ItemStatus.AWAITING_CEO_APPROVAL,
    order: { type: 'Project Based', project: 'Upgrade Core Network' }, items: [{ id: 1, itemName: 'Router Core RB4011iGS+', itemTypeBrand: 'Mikrotik', stock: 0, quantity: 5, keterangan: 'Untuk upgrade kapasitas core.' }],
    totalValue: 25000000, logisticApprover: 'Admin Logistik User', logisticApprovalDate: getDate(-3).toISOString(), finalApprover: null, finalApprovalDate: null,
    purchaseDetails: purchaseDetailsForCeo, rejectionReason: null, rejectedBy: null, rejectionDate: null, rejectedByDivision: null
});

// c. For Admin Logistik (Status: ARRIVED)
initialMockRequests.push({
    id: 'REQ-REGISTER-01', docNumber: 'REQ-251002-001', requester: 'Staff User', division: 'Teknisi', requestDate: getDate(-15).toISOString(), status: ItemStatus.ARRIVED,
    order: { type: 'Regular Stock' }, items: [{ id: 1, itemName: 'PC Dell Optiplex', itemTypeBrand: 'Dell', stock: 1, quantity: 1, keterangan: 'PC Pengganti.' }],
    totalValue: 7000000, logisticApprover: 'Admin Logistik User', logisticApprovalDate: getDate(-14).toISOString(), finalApprover: 'Super Admin User', finalApprovalDate: getDate(-13).toISOString(),
    arrivalDate: getDate(-1).toISOString(), receivedBy: 'Admin Logistik User', rejectionReason: null, rejectedBy: null, rejectionDate: null, rejectedByDivision: null
});

// d. For Leader (Urgent Request)
initialMockRequests.push({
    id: 'REQ-URGENT-01', docNumber: 'REQ-251017-001', requester: 'Leader User', division: 'NOC', requestDate: getDate(0).toISOString(), status: ItemStatus.PENDING,
    order: { type: 'Urgent', justification: 'Router core down, butuh pengganti segera untuk backup.' }, items: [{ id: 1, itemName: 'Router Core RB4011iGS+', itemTypeBrand: 'Mikrotik', stock: 1, quantity: 1, keterangan: 'Untuk backup sementara.' }],
    totalValue: 5000000, logisticApprover: null, logisticApprovalDate: null, finalApprover: null, finalApprovalDate: null, rejectionReason: null, rejectedBy: null, rejectionDate: null, rejectedByDivision: null
});

// 11. SCENARIOS for Unhappy Paths & Edge Cases
// a. Rejected New Request
initialMockRequests.push({
    id: 'REQ-REJECT-01', docNumber: 'REQ-251011-001', requester: 'Staff User', division: 'Teknisi', requestDate: getDate(-6).toISOString(), status: ItemStatus.REJECTED,
    order: { type: 'Regular Stock' }, items: [{ id: 1, itemName: 'PC Dell Optiplex', itemTypeBrand: 'Dell', stock: 1, quantity: 1, keterangan: 'PC tambahan untuk lab.' }],
    totalValue: 7000000, logisticApprover: 'Admin Logistik User', logisticApprovalDate: getDate(-5).toISOString(), 
    rejectionReason: 'Anggaran tidak tersedia untuk PC tambahan saat ini.', rejectedBy: 'Admin Logistik User', rejectionDate: getDate(-5).toISOString(), rejectedByDivision: 'Logistik',
    finalApprover: null, finalApprovalDate: null
});

// b. Rejected Loan Request
mockLoanRequests.push({
    id: 'LREQ-REJECT-01', requester: 'Staff User', division: 'Teknisi', requestDate: getDate(-3).toISOString(), status: LoanRequestStatus.REJECTED,
    items: [{ id: 1, itemName: 'Fusion Splicer 90S', brand: 'Fujikura', quantity: 1, returnDate: getDate(2).toISOString().split('T')[0] }],
    notes: 'Butuh untuk perbaikan minor.', approver: 'Admin Logistik User', approvalDate: getDate(-2).toISOString(),
    rejectionReason: 'Semua unit Splicer sedang dipinjam untuk proyek besar.'
});

// c. Overdue Loan Request
mockLoanRequests.push({
    id: 'LREQ-OVERDUE-01', requester: 'Leader User', division: 'NOC', requestDate: getDate(-15).toISOString(), status: LoanRequestStatus.OVERDUE,
    items: [{ id: 1, itemName: 'Fusion Splicer 90S', brand: 'Fujikura', quantity: 1, returnDate: getDate(-5).toISOString().split('T')[0] }], // Return date was 5 days ago
    notes: 'Untuk proyek audit jaringan.', approver: 'Admin Logistik User', approvalDate: getDate(-14).toISOString(),
    assignedAssetIds: { 1: ['AST-LOAN-OVERDUE'] }
});

// d. Fully Returned Loan Request
mockLoanRequests.push({
    id: 'LREQ-RETURNED-01', requester: 'Staff User', division: 'Teknisi', requestDate: getDate(-30).toISOString(), status: LoanRequestStatus.RETURNED,
    items: [{ id: 1, itemName: 'Laptop ThinkPad T480', brand: 'Lenovo', quantity: 1, returnDate: getDate(-10).toISOString().split('T')[0] }],
    notes: 'Peminjaman WFH.', approver: 'Admin Logistik User', approvalDate: getDate(-29).toISOString(),
    assignedAssetIds: { 1: ['AST-DUMMY-RETURNED'] }, // A dummy asset ID that is now back in storage
    returnedAssetIds: ['AST-DUMMY-RETURNED'],
    actualReturnDate: getDate(-10).toISOString()
});

// e. Approved Return Document
mockReturns.push({
    id: 'RET-APPROVED-01', docNumber: 'RET-250930-001', returnDate: getDate(-10).toISOString(), loanRequestId: 'LREQ-RETURNED-01', assetId: 'AST-DUMMY-RETURNED',
    assetName: 'Laptop ThinkPad T480', returnedBy: 'Staff User', receivedBy: 'Admin Logistik User', acknowledgedBy: 'Super Admin User',
    returnedCondition: AssetCondition.GOOD, notes: 'Pengembalian selesai.', status: AssetReturnStatus.APPROVED,
    approvedBy: 'Admin Logistik User', approvalDate: getDate(-9).toISOString()
});

// f. Rejected Return Document
mockReturns.push({
    id: 'RET-REJECT-01', docNumber: 'RET-251001-001', returnDate: getDate(-8).toISOString(), loanRequestId: 'LREQ-DUMMY-RET-REJ', assetId: 'AST-DUMMY-RET-REJ',
    assetName: 'PC Dell Optiplex', returnedBy: 'Staff User', receivedBy: 'Admin Logistik User', acknowledgedBy: 'Super Admin User',
    returnedCondition: AssetCondition.MINOR_DAMAGE, notes: 'Ada goresan di layar.', status: AssetReturnStatus.REJECTED,
    rejectedBy: 'Admin Logistik User', rejectionDate: getDate(-7).toISOString(), rejectionReason: 'Kondisi tidak sesuai, harap perbaiki dahulu.'
});


// 12. SCENARIOS for all remaining statuses
// a. Request `APPROVED` (Ready for Purchase Admin to start procurement)
initialMockRequests.push({
    id: 'REQ-APPROVED-01', docNumber: 'REQ-251011-002', requester: 'Staff User', division: 'Teknisi', requestDate: getDate(-6).toISOString(), status: ItemStatus.APPROVED,
    order: { type: 'Regular Stock' }, items: [{ id: 1, itemName: 'Kabel UTP Cat6 305m', itemTypeBrand: 'Belden', stock: 0, quantity: 5, keterangan: 'Untuk stok gudang.' }],
    totalValue: 5000000, logisticApprover: 'Admin Logistik User', logisticApprovalDate: getDate(-5).toISOString(), finalApprover: 'Super Admin User', finalApprovalDate: getDate(-4).toISOString(),
    rejectionReason: null, rejectedBy: null, rejectionDate: null, rejectedByDivision: null
});

// b. Request `PURCHASING`
initialMockRequests.push({
    id: 'REQ-PURCHASING-01', docNumber: 'REQ-251007-001', requester: 'Leader User', division: 'NOC', requestDate: getDate(-10).toISOString(), status: ItemStatus.PURCHASING,
    order: { type: 'Project Based', project: 'Expansion Area X' }, items: [{ id: 1, itemName: 'Switch 24 Port', itemTypeBrand: 'Cisco', stock: 0, quantity: 2, keterangan: 'Untuk ODP baru.' }],
    totalValue: 8000000, logisticApprover: 'Admin Logistik User', logisticApprovalDate: getDate(-9).toISOString(), finalApprover: 'Super Admin User', finalApprovalDate: getDate(-8).toISOString(),
    estimatedDeliveryDate: getDate(10).toISOString(),
    rejectionReason: null, rejectedBy: null, rejectionDate: null, rejectedByDivision: null
});

// c. Request `IN_DELIVERY`
initialMockRequests.push({
    id: 'REQ-DELIVERY-01', docNumber: 'REQ-251005-002', requester: 'Staff User', division: 'Customer Service', requestDate: getDate(-12).toISOString(), status: ItemStatus.IN_DELIVERY,
    order: { type: 'Regular Stock' }, items: [{ id: 1, itemName: 'Headset Customer Service', itemTypeBrand: 'Jabra', stock: 0, quantity: 10, keterangan: 'Penggantian headset lama.' }],
    totalValue: 4500000, logisticApprover: 'Admin Logistik User', logisticApprovalDate: getDate(-11).toISOString(), finalApprover: 'Super Admin User', finalApprovalDate: getDate(-10).toISOString(),
    estimatedDeliveryDate: getDate(2).toISOString(),
    actualShipmentDate: getDate(-1).toISOString(),
    rejectionReason: null, rejectedBy: null, rejectionDate: null, rejectedByDivision: null
});

// d. Request `CANCELLED`
initialMockRequests.push({
    id: 'REQ-CANCEL-01', docNumber: 'REQ-251015-001', requester: 'Staff User', division: 'Teknisi', requestDate: getDate(-2).toISOString(), status: ItemStatus.CANCELLED,
    order: { type: 'Regular Stock' }, items: [{ id: 1, itemName: 'Tang Krimping', itemTypeBrand: 'Krisbow', stock: 3, quantity: 1, keterangan: 'Tidak jadi dibutuhkan.' }],
    totalValue: 200000,
    rejectionReason: 'Dibatalkan oleh pemohon.', // Or just cancelled status is enough
    rejectionDate: getDate(-1).toISOString(),
    rejectedBy: 'Staff User', // Self-cancellation
    rejectedByDivision: 'Teknisi',
    logisticApprover: null, logisticApprovalDate: null, finalApprover: null, finalApprovalDate: null,
});

// e. LoanRequest `AWAITING_RETURN`
mockAssets.push({
    id: 'AST-LOAN-AWAIT', name: 'Drill Listrik', category: 'Alat Kerja Lapangan', type: 'Bor Listrik', brand: 'Makita', serialNumber: 'SN-LOAN-AWAIT-01',
    registrationDate: getDate(-90).toISOString(), recordedBy: 'Admin Logistik User', purchaseDate: getDate(-90).toISOString(), purchasePrice: 1500000, vendor: 'Toko Bangunan Jaya',
    location: 'Dipinjam oleh: Staff User', currentUser: 'Staff User', status: AssetStatus.AWAITING_RETURN, // This is key
    condition: AssetCondition.GOOD, activityLog: [], attachments: [], poNumber: 'LREQ-AWAIT-RET-01', invoiceNumber: null, warrantyEndDate: null, notes: null
});
mockLoanRequests.push({
    id: 'LREQ-AWAIT-RET-01', requester: 'Staff User', division: 'Teknisi', requestDate: getDate(-30).toISOString(), status: LoanRequestStatus.AWAITING_RETURN, // This is key
    items: [{ id: 1, itemName: 'Drill Listrik', brand: 'Makita', quantity: 1, returnDate: getDate(0).toISOString().split('T')[0] }],
    notes: 'Untuk instalasi di pelanggan A.', approver: 'Admin Logistik User', approvalDate: getDate(-29).toISOString(),
    assignedAssetIds: { 1: ['AST-LOAN-AWAIT'] }
});

// f. Dismantle `COMPLETED`
mockAssets.push({
    id: 'AST-DISMANTLED-DONE', name: 'ONT HG8245H', category: 'Perangkat Pelanggan (CPE)', type: 'ONT/ONU', brand: 'Huawei', serialNumber: 'SN-DSM-DONE-01',
    registrationDate: getDate(-100).toISOString(), recordedBy: 'Admin Logistik User', purchaseDate: getDate(-100).toISOString(), purchasePrice: 750000, vendor: 'Optik Prima Distribusi',
    location: 'Gudang Inventori', currentUser: null, status: AssetStatus.IN_STORAGE, // Back in storage
    condition: AssetCondition.USED_OKAY, isDismantled: true, // Key flags
    dismantleInfo: { customerId: 'TMI-TEST-01', customerName: 'Test Customer', dismantleDate: getDate(-5).toISOString(), dismantleId: 'DSM-COMPLETED-01' },
    activityLog: [], attachments: [], poNumber: 'REQ-DUMMY-DSM', invoiceNumber: null, warrantyEndDate: null, notes: null
});
mockDismantles.push({
    id: 'DSM-COMPLETED-01', docNumber: 'DSM-251012-001', assetId: 'AST-DISMANTLED-DONE', assetName: 'ONT HG8245H', dismantleDate: getDate(-5).toISOString(),
    technician: 'Staff User', customerId: 'TMI-TEST-01', customerName: 'Test Customer', customerAddress: mockCustomers[0].address,
    retrievedCondition: AssetCondition.USED_OKAY, notes: 'Pelanggan upgrade layanan.', status: ItemStatus.COMPLETED, // This is key
    acknowledger: 'Admin Logistik User', attachments: []
});

// 13. SCENARIOS for all remaining workflow states (Final additions for perfection)

// a. Request `REVISED` by Admin
initialMockRequests.push({
    id: 'REQ-REVISED-01', docNumber: 'REQ-251015-002', requester: 'Leader User', division: 'NOC', requestDate: getDate(-2).toISOString(), status: ItemStatus.LOGISTIC_APPROVED,
    order: { type: 'Regular Stock' }, items: [{ id: 1, itemName: 'Kabel UTP Cat6 305m', itemTypeBrand: 'Belden', stock: 0, quantity: 5, keterangan: 'Stok darurat.' }],
    totalValue: 5000000, logisticApprover: 'Admin Logistik User', logisticApprovalDate: getDate(-1).toISOString(),
    // FIX: Add missing properties to conform to Request type
    finalApprover: null,
    finalApprovalDate: null,
    itemStatuses: { 1: { status: 'partial', approvedQuantity: 3, reason: 'Budget terbatas, disetujui 3 box dahulu.' }},
    rejectionReason: null, rejectedBy: null, rejectionDate: null, rejectedByDivision: null
});

// b. Request `IN_PROGRESS`
initialMockRequests.push({
    id: 'REQ-INPROG-01', docNumber: 'REQ-251009-001', requester: 'Staff User', division: 'Teknisi', requestDate: getDate(-8).toISOString(), status: ItemStatus.IN_PROGRESS,
    order: { type: 'Regular Stock' }, items: [{ id: 1, itemName: 'Tang Krimping', itemTypeBrand: 'Krisbow', stock: 1, quantity: 10, keterangan: 'Untuk tim teknisi baru.' }],
    totalValue: 2000000, logisticApprover: 'Admin Logistik User', logisticApprovalDate: getDate(-7).toISOString(), finalApprover: 'Super Admin User', finalApprovalDate: getDate(-6).toISOString(),
    rejectionReason: null, rejectedBy: null, rejectionDate: null, rejectedByDivision: null
});

// c. Loan Request `REVISED` by Admin
mockLoanRequests.push({
    id: 'LREQ-REVISED-01', requester: 'Staff User', division: 'Teknisi', requestDate: getDate(-1).toISOString(), status: LoanRequestStatus.APPROVED,
    items: [
        { id: 1, itemName: 'Fusion Splicer 90S', brand: 'Fujikura', quantity: 1, returnDate: getDate(5).toISOString().split('T')[0] },
        { id: 2, itemName: 'Bor Listrik', brand: 'Makita', quantity: 2, returnDate: getDate(5).toISOString().split('T')[0] }
    ],
    notes: 'Butuh untuk instalasi proyek B.', approver: 'Admin Logistik User', approvalDate: getDate(0).toISOString(),
    itemStatuses: { 1: { status: 'approved', approvedQuantity: 1 }, 2: { status: 'rejected', approvedQuantity: 0, reason: 'Semua bor sedang dipakai.' } },
    assignedAssetIds: { 1: ['AST-CAT4-01'] }
});

// d. Installation `IN_PROGRESS`
mockInstallations.push({
    id: 'INST-INPROG-01', docNumber: 'INST-251018-001', installationDate: getDate(1).toISOString(), technician: 'Staff User',
    customerId: 'TMI-TEST-01', customerName: 'Test Customer',
    assetsInstalled: [], // Belum ada karena masih in progress
    status: ItemStatus.IN_PROGRESS, notes: 'Instalasi dijadwalkan besok.'
});

// e. Maintenance `IN_PROGRESS`
mockMaintenances.push({
    id: 'MNT-INPROG-01', docNumber: 'WO-MT-20251018-0001', maintenanceDate: getDate(0).toISOString(), technician: 'Staff User',
    customerId: 'TMI-TEST-01', customerName: 'Test Customer', assets: [{ assetId: 'AST-MAINT', assetName: 'ONT F609' }],
    problemDescription: 'Koneksi terputus-putus.', actionsTaken: 'Sedang dalam pengecekan redaman kabel.', status: ItemStatus.IN_PROGRESS, attachments: []
});

// f. Dismantle `CANCELLED`
mockDismantles.push({
    id: 'DSM-CANCEL-01', docNumber: 'DSM-251015-001', assetId: 'AST-DUMMY-CANCEL', assetName: 'Router WiFi Archer C6', dismantleDate: getDate(-3).toISOString(),
    technician: 'Staff User', customerId: 'TMI-TEST-01', customerName: 'Test Customer', customerAddress: mockCustomers[0].address,
    retrievedCondition: AssetCondition.GOOD, notes: 'Pelanggan batal berhenti berlangganan.', status: ItemStatus.CANCELLED, acknowledger: null, attachments: []
});

// g. Handover `PENDING`
mockHandovers.push({
    id: 'HO-PENDING-01', docNumber: 'HO-251018-001', handoverDate: getDate(0).toISOString(), menyerahkan: 'Admin Logistik User', penerima: 'Staff User', mengetahui: 'Leader User',
    items: [{ id: 1, assetId: 'AST-CAT5-01', itemName: 'PC Dell Optiplex', itemTypeBrand: 'Dell', conditionNotes: 'Baru', quantity: 1, checked: false }],
    status: ItemStatus.PENDING
});

// Final check: Asset for pending handover should still be in storage
const assetForPendingHOIdx = mockAssets.findIndex(a => a.id === 'AST-CAT5-01');
if (assetForPendingHOIdx > -1) {
    mockAssets[assetForPendingHOIdx].status = AssetStatus.IN_STORAGE;
}


// --- 6. DYNAMIC MOCK NOTIFICATIONS ---
// This block is now disabled to allow for real-time, event-driven notifications.
const generateNotifications = (): Notification[] => {
    return [];
};

export let mockNotifications: Notification[] = [];
