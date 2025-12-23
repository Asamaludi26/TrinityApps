
import {
    Asset, Request, Handover, Dismantle, Customer, User, Division, AssetCategory, Notification, LoanRequest, Maintenance, Installation, AssetReturn, AssetStatus, LoanRequestStatus, StockMovement, LoginResponse
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
import { useNotificationStore } from '../stores/useNotificationStore';
import { useAuthStore } from '../stores/useAuthStore';

// --- CONFIGURATION ---
// Safely access environment variables
const getEnv = () => {
    try {
        return (import.meta as any).env || {};
    } catch {
        return {};
    }
};
const env = getEnv();

const USE_MOCK = env.VITE_USE_MOCK !== 'false'; // Default to TRUE if not specified
const API_URL = env.VITE_API_URL || 'http://localhost:3001/api';
const MOCK_LATENCY = 600;

// --- ERROR HANDLING INTERCEPTOR ---
const handleError = (error: any) => {
    const message = error.message || 'Terjadi kesalahan jaringan.';
    // Avoid circular dependency by getting state directly
    useNotificationStore.getState().addToast(message, 'error');
    
    if (error.status === 401) {
        useAuthStore.getState().logout();
        window.location.href = '/';
    }
    throw error;
};

// --- REAL API CLIENT (FETCH WRAPPER) ---
const fetchClient = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const token = localStorage.getItem('auth-storage') 
        ? JSON.parse(localStorage.getItem('auth-storage')!).state?.currentUser?.token 
        : null;

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
    };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw { status: response.status, message: errorData.message || response.statusText };
        }
        return response.json();
    } catch (error) {
        return handleError(error);
    }
};

// --- MOCK STORAGE HELPERS ---
const getFromStorage = <T>(key: string): T | null => {
    try {
        const storedValue = localStorage.getItem(key);
        return storedValue ? JSON.parse(storedValue) : null;
    } catch (e) { return null; }
};

const saveToStorage = <T>(key: string, value: T): void => {
    localStorage.setItem(key, JSON.stringify(value));
};

const mockRequest = <T>(operation: () => T): Promise<T> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                resolve(operation());
            } catch (error) {
                reject(error);
            }
        }, MOCK_LATENCY);
    });
};

// --- DATA INITIALIZATION (MOCK ONLY) ---
const initializeMockData = () => {
    if (!USE_MOCK) return;
    const init = <T>(key: string, data: T) => {
        if (!localStorage.getItem(key)) saveToStorage(key, data);
    };
    init('app_users', initialMockUsers);
    init('app_assets', mockAssets);
    init('app_requests', initialMockRequests);
    init('app_handovers', mockHandovers);
    init('app_dismantles', mockDismantles);
    init('app_customers', mockCustomers);
    init('app_divisions', mockDivisions);
    init('app_assetCategories', initialAssetCategories);
    init('app_notifications', mockNotifications);
    init('app_loanRequests', mockLoanRequests);
    init('app_maintenances', mockMaintenances);
    init('app_installations', mockInstallations);
    init('app_returns', mockReturns);
    init('app_stockMovements', []);
};
initializeMockData();

// --- PUBLIC API METHODS ---

export const fetchAllData = async () => {
    if (USE_MOCK) {
        return mockRequest(() => ({
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
            stockMovements: getFromStorage<StockMovement[]>('app_stockMovements') || [],
        }));
    } else {
        // In real backend, we might fetch these parallelly or via a 'dashboard' aggregation endpoint
        // For simplicity, we assume separate endpoints here.
        const [assets, requests, users, divisions, categories] = await Promise.all([
            fetchClient<Asset[]>('/assets'),
            fetchClient<Request[]>('/requests'),
            fetchClient<User[]>('/users'),
            fetchClient<Division[]>('/divisions'),
            fetchClient<AssetCategory[]>('/categories'),
            // ... fetch others
        ]);
        return { assets, requests, users, divisions, assetCategories: categories, handovers: [], dismantles: [], customers: [], notifications: [], loanRequests: [], maintenances: [], installations: [], returns: [], stockMovements: [] };
    }
};

// --- GENERIC UPDATE (MOCK ONLY COMPATIBILITY) ---
// Note: In real implementation, specific methods below should be used.
export const updateData = async <T>(key: string, data: T): Promise<T> => {
    if (USE_MOCK) {
        return mockRequest(() => {
            saveToStorage(key, data);
            return data;
        });
    }
    throw new Error("updateData is for Mock Mode only. Use specific service methods.");
};


// --- AUTHENTICATION ---
export const loginUser = async (email: string, pass: string): Promise<User> => {
    if (USE_MOCK) {
        return mockRequest(() => {
            const users = getFromStorage<User[]>('app_users') || initialMockUsers;
            const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
            if (!user) throw new Error("Invalid credentials");
            return user;
        });
    }
    const res = await fetchClient<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: pass })
    });
    // Store token manually if needed or handle via HttpOnly cookie
    return res.user;
};

// --- TRANSACTIONAL LOGIC (HEAVY LIFTING) ---

export const approveLoanTransaction = async (
    requestId: string, 
    payload: { approver: string, approvalDate: string, assignedAssetIds: Record<number, string[]>, itemStatuses: any }
) => {
    if (USE_MOCK) {
        return mockRequest(() => {
            const requests = getFromStorage<LoanRequest[]>('app_loanRequests') || [];
            const assets = getFromStorage<Asset[]>('app_assets') || [];
            const targetIndex = requests.findIndex(r => r.id === requestId);
            
            if (targetIndex === -1) throw new Error("Request not found");

            // Race Condition Check (Mock)
            const assetIdsToCheck = Object.values(payload.assignedAssetIds).flat() as string[];
            const conflicting = assets.filter(a => assetIdsToCheck.includes(a.id) && a.status !== AssetStatus.IN_STORAGE);
            
            if (conflicting.length > 0) {
                throw new Error(`Aset berikut tidak tersedia: ${conflicting.map(a => a.name).join(', ')}`);
            }

            // Update Request
            const updatedRequest = {
                ...requests[targetIndex],
                ...payload,
                status: Object.values(payload.itemStatuses).every((s: any) => s.status === 'rejected') ? LoanRequestStatus.REJECTED : LoanRequestStatus.APPROVED
            };
            requests[targetIndex] = updatedRequest;
            saveToStorage('app_loanRequests', requests);

            // Update Assets
            if (updatedRequest.status === LoanRequestStatus.APPROVED) {
                const updatedAssets = assets.map(a => {
                    if (assetIdsToCheck.includes(a.id)) {
                        return { 
                            ...a, 
                            status: AssetStatus.IN_USE, 
                            currentUser: updatedRequest.requester,
                            location: `Dipinjam: ${updatedRequest.requester}`
                        };
                    }
                    return a;
                });
                saveToStorage('app_assets', updatedAssets);
            }
            
            return updatedRequest;
        });
    }
    
    return fetchClient<LoanRequest>(`/loan-requests/${requestId}/approve`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
    });
};

export const recordStockMovement = async (movementData: Omit<StockMovement, 'id' | 'balanceAfter'>) => {
    if (USE_MOCK) {
        return mockRequest(() => {
            const allMovements = getFromStorage<StockMovement[]>('app_stockMovements') || [];
            
            const newMovement: StockMovement = {
                id: `MOV-${Date.now()}`,
                ...movementData,
                quantity: Math.abs(movementData.quantity),
                balanceAfter: 0
            };

            // Filter for specific item
            const itemMovements = allMovements.filter(m => m.assetName === movementData.assetName && m.brand === movementData.brand);
            const combined = [...itemMovements, newMovement].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            // Recalculate Ledger
            let balance = 0;
            const recalculated = combined.map(m => {
                if (m.type.startsWith('IN_')) balance += m.quantity;
                else balance = Math.max(0, balance - m.quantity);
                return { ...m, balanceAfter: balance };
            });

            // Merge back
            const others = allMovements.filter(m => !(m.assetName === movementData.assetName && m.brand === movementData.brand));
            const final = [...others, ...recalculated];
            
            saveToStorage('app_stockMovements', final);
            return final;
        });
    }

    return fetchClient<StockMovement[]>('/stock/movements', {
        method: 'POST',
        body: JSON.stringify(movementData)
    });
};
