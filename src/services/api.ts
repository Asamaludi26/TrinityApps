
import {
    Asset, Request, Handover, Dismantle, Customer, User, Division, AssetCategory, Notification, LoanRequest, Maintenance, Installation, AssetReturn, AssetStatus, LoanRequestStatus
} from '../types';
import {
  initialMockRequests,
  mockAssets,
  mockHandovers,
  mockDismantles,
  initialMockUsers,
  mockDivisions,
  mockCustomers,
  initialAssetCategories,
  mockNotifications,
  mockLoanRequests,
  mockMaintenances,
  mockInstallations,
  mockReturns
} from '../data/mockData';

// --- Configuration ---
const MOCK_LATENCY_MS = 600; // Simulasi network delay yang lebih realistis
const SHOULD_LOG = true; // Untuk debugging

// --- Helper for LocalStorage ---

function getFromStorage<T>(key: string): T | null {
    try {
        const storedValue = localStorage.getItem(key);
        if (storedValue && storedValue !== 'undefined') {
            return JSON.parse(storedValue);
        }
        return null;
    } catch (error) {
        console.error(`Gagal mem-parsing localStorage untuk kunci "${key}":`, error);
        return null;
    }
}

function saveToStorage<T>(key: string, value: T): void {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        if (SHOULD_LOG) console.log(`[MOCK API] Data saved to ${key}`);
    } catch (error) {
        console.error(`Gagal menyimpan ke localStorage untuk kunci "${key}":`, error);
    }
}

// --- Generic API Client Simulator ---
async function request<T>(operation: () => T, latency: number = MOCK_LATENCY_MS): Promise<T> {
    if (SHOULD_LOG) console.log("[MOCK API] Request received...");
    
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                const result = operation();
                if (SHOULD_LOG) console.log("[MOCK API] Request successful.", result);
                resolve(result);
            } catch (error) {
                console.error("[MOCK API ERROR]", error);
                reject(error);
            }
        }, latency);
    });
}

// --- Data Initialization ---
const initializeData = () => {
    const initKey = <T>(key: string, initialData: T) => {
        const existing = localStorage.getItem(key);
        if (!existing) {
            saveToStorage(key, initialData);
        }
    };

    initKey('app_users', initialMockUsers);
    initKey('app_assets', mockAssets);
    initKey('app_requests', initialMockRequests);
    initKey('app_handovers', mockHandovers);
    initKey('app_dismantles', mockDismantles);
    initKey('app_customers', mockCustomers);
    initKey('app_divisions', mockDivisions);
    initKey('app_assetCategories', initialAssetCategories);
    initKey('app_notifications', mockNotifications);
    initKey('app_loanRequests', mockLoanRequests);
    initKey('app_maintenances', mockMaintenances);
    initKey('app_installations', mockInstallations);
    initKey('app_returns', mockReturns);
};

initializeData();


// --- Public API Methods ---

export const fetchAllData = () => {
    return request(() => {
        return {
            assets: getFromStorage<Asset[]>('app_assets') || [],
            requests: getFromStorage<Request[]>('app_requests') || [],
            handovers: getFromStorage<Handover[]>('app_handovers') || [],
            dismantles: getFromStorage<Dismantle[]>('app_dismantles') || [],
            customers: getFromStorage<Customer[]>('app_customers') || [],
            users: getFromStorage<User[]>('app_users') || [],
            divisions: getFromStorage<Division[]>('app_divisions') || [],
            assetCategories: getFromStorage<AssetCategory[]>('app_assetCategories') || [],
            notifications: getFromStorage<Notification[]>('app_notifications') || [],
            loanRequests: getFromStorage<LoanRequest[]>('app_loanRequests') || [],
            maintenances: getFromStorage<Maintenance[]>('app_maintenances') || [],
            installations: getFromStorage<Installation[]>('app_installations') || [],
            returns: getFromStorage<AssetReturn[]>('app_returns') || [],
        };
    }, 500); 
};

export function updateData<T>(key: string, data: T | ((prevData: T) => T)): Promise<T> {
    return request(() => {
        if (typeof data === 'function') {
            const currentData = getFromStorage(key) as T | null ?? [] as T;
            const newData = (data as (prevData: T) => T)(currentData);
            saveToStorage(key, newData);
            return newData;
        } else {
            saveToStorage(key, data);
            return data;
        }
    });
}

// --- TRANSACTIONAL ENDPOINTS (Simulasi Backend Logic) ---

/**
 * Endpoint Transaksi Khusus untuk Menyetujui Peminjaman.
 * Melakukan validasi stok (race condition check) dan update atomic.
 */
export const approveLoanTransaction = (
    requestId: string, 
    payload: { 
        approver: string, 
        approvalDate: string, 
        assignedAssetIds: Record<number, string[]>, 
        itemStatuses: any 
    }
) => {
    return request(() => {
        // 1. Load Fresh Data (Simulate DB Query)
        const requests = getFromStorage<LoanRequest[]>('app_loanRequests') || [];
        const assets = getFromStorage<Asset[]>('app_assets') || [];
        
        const requestIndex = requests.findIndex(r => r.id === requestId);
        if (requestIndex === -1) throw new Error("Request tidak ditemukan.");
        const targetRequest = requests[requestIndex];

        // 2. RACE CONDITION CHECK (Critical Step)
        // Validasi apakah semua aset yang dipilih MASIH berstatus 'IN_STORAGE'
        const assetIdsToAssign = Object.values(payload.assignedAssetIds).flat();
        
        const conflictingAssets = assets.filter(a => 
            assetIdsToAssign.includes(a.id) && a.status !== AssetStatus.IN_STORAGE
        );

        if (conflictingAssets.length > 0) {
            const names = conflictingAssets.map(a => `${a.name} (${a.id})`).join(', ');
            throw new Error(`TRANSAKSI GAGAL: Aset berikut telah diambil oleh pengguna lain: ${names}. Harap refresh halaman.`);
        }

        // 3. ATOMIC UPDATE (Jika lolos validasi)
        
        // A. Update Request Status
        const allStatuses = Object.values(payload.itemStatuses).map((s: any) => s.status);
        const allRejected = allStatuses.every(s => s === 'rejected');
        const newStatus = allRejected ? LoanRequestStatus.REJECTED : LoanRequestStatus.APPROVED;

        const updatedRequest = {
            ...targetRequest,
            status: newStatus,
            approver: payload.approver,
            approvalDate: payload.approvalDate,
            assignedAssetIds: payload.assignedAssetIds,
            itemStatuses: payload.itemStatuses,
            rejectionReason: allRejected ? "Semua item ditolak oleh Admin." : undefined
        };
        
        requests[requestIndex] = updatedRequest;
        saveToStorage('app_loanRequests', requests);

        // B. Update Assets Status (Locking Assets)
        if (!allRejected && assetIdsToAssign.length > 0) {
            const updatedAssets = assets.map(asset => {
                if (assetIdsToAssign.includes(asset.id)) {
                    return {
                        ...asset,
                        status: AssetStatus.IN_USE,
                        currentUser: targetRequest.requester,
                        location: `Dipinjam oleh ${targetRequest.requester}`,
                        lastModifiedDate: new Date().toISOString(),
                        lastModifiedBy: payload.approver
                    };
                }
                return asset;
            });
            saveToStorage('app_assets', updatedAssets);
        }

        return updatedRequest;
    });
};

// 3. Auth
export const loginUser = (email: string, pass: string): Promise<User> => {
     return request(() => {
        const users = getFromStorage<User[]>('app_users') || initialMockUsers;
        const foundUser = users.find(user => user.email.toLowerCase() === email.toLowerCase());

        if (foundUser) {
            localStorage.setItem('currentUser', JSON.stringify(foundUser));
            return foundUser;
        } else {
            throw new Error("Invalid credentials");
        }
    }, 800);
}
