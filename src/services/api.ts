
import {
    Asset, Request, Handover, Dismantle, Customer, User, Division, AssetCategory, Notification, LoanRequest, Maintenance, Installation, AssetReturn
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
const MOCK_LATENCY_MS = 300; // Simulasi network delay
const SHOULD_LOG = true; // Untuk debugging

// --- Helper for LocalStorage ---

/**
 * [REVISED] Fungsi ini sekarang HANYA membaca dari localStorage.
 * Logika inisialisasi telah dihapus untuk menghilangkan ambiguitas.
 * @param key Kunci item di localStorage.
 * @returns Data yang sudah di-parse, atau null jika tidak ada atau terjadi error.
 */
function getFromStorage<T>(key: string): T | null {
    try {
        const storedValue = localStorage.getItem(key);
        if (storedValue && storedValue !== 'undefined') {
            return JSON.parse(storedValue);
        }
        return null; // Return null jika tidak ditemukan
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
// [REVISED] Fungsi ini menjadi SATU-SATUNYA sumber kebenaran untuk inisialisasi data.
// Ini secara paksa menimpa localStorage dengan data mock terbaru SETIAP KALI aplikasi dimuat.
const initializeData = () => {
    saveToStorage('app_users', initialMockUsers);
    saveToStorage('app_assets', mockAssets);
    saveToStorage('app_requests', initialMockRequests);
    saveToStorage('app_handovers', mockHandovers);
    saveToStorage('app_dismantles', mockDismantles);
    saveToStorage('app_customers', mockCustomers);
    saveToStorage('app_divisions', mockDivisions);
    saveToStorage('app_assetCategories', initialAssetCategories);
    saveToStorage('app_notifications', mockNotifications);
    saveToStorage('app_loanRequests', mockLoanRequests);
    saveToStorage('app_maintenances', mockMaintenances);
    saveToStorage('app_installations', mockInstallations);
    saveToStorage('app_returns', mockReturns);
};
initializeData();


// --- Public API Methods ---

// 1. Get All Data (Dashboard & Init)
/**
 * [REVISED] Fungsi ini sekarang hanya membaca data yang sudah dijamin ada oleh `initializeData`.
 * Menggunakan `|| []` sebagai fallback yang aman jika terjadi error saat membaca localStorage.
 */
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
    }, 500); // Higher latency for initial big load
};

// 2. Generic Update
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

// 3. Auth
export const loginUser = (email: string, pass: string): Promise<User> => {
     return request(() => {
        const users = getFromStorage<User[]>('app_users') || initialMockUsers;
        const foundUser = users.find(user => user.email.toLowerCase() === email.toLowerCase());

        if (foundUser) {
            // Mock password check (always success for demo/mock users)
            localStorage.setItem('currentUser', JSON.stringify(foundUser));
            return foundUser;
        } else {
            throw new Error("Invalid credentials");
        }
    }, 800); // Slower latency for login simulation
}
