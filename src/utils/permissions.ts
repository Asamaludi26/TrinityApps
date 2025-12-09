
import { User, Permission, UserRole } from '../types';

export const ALL_PERMISSIONS: { group: string; permissions: { key: Permission; label: string }[] }[] = [
    {
        group: 'Dashboard & Laporan',
        permissions: [
            { key: 'dashboard:view', label: 'Melihat Dashboard' },
            { key: 'reports:view', label: 'Melihat Laporan & Analitik' },
            { key: 'data:export', label: 'Melakukan Export Data (CSV)' },
        ],
    },
    {
        group: 'Request Aset (Baru)',
        permissions: [
            { key: 'requests:view:own', label: 'Melihat request pribadi' },
            { key: 'requests:view:all', label: 'Melihat semua request' },
            { key: 'requests:create', label: 'Membuat request baru (Regular)' },
            { key: 'requests:create:urgent', label: 'Membuat request Urgent & Project' },
            { key: 'requests:approve:logistic', label: 'Menyetujui (tahap Logistik)' },
            { key: 'requests:approve:purchase', label: 'Mengisi detail & menyetujui (tahap Purchase)' },
            { key: 'requests:approve:final', label: 'Memberikan persetujuan final (CEO)' },
            { key: 'requests:cancel:own', label: 'Membatalkan request pribadi' },
            { key: 'requests:delete', label: 'Menghapus request orang lain' },
        ],
    },
    {
        group: 'Request Aset (Pinjam)',
        permissions: [
            { key: 'loan-requests:view:own', label: 'Melihat request pinjam pribadi' },
            { key: 'loan-requests:view:all', label: 'Melihat semua request pinjam' },
            { key: 'loan-requests:create', label: 'Membuat request pinjam' },
            { key: 'loan-requests:approve', label: 'Menyetujui & menetapkan aset pinjaman' },
            { key: 'loan-requests:return', label: 'Mengkonfirmasi pengembalian aset pinjaman' },
        ],
    },
    {
        group: 'Manajemen Aset',
        permissions: [
            { key: 'assets:view', label: 'Melihat daftar aset' },
            { key: 'assets:create', label: 'Mencatat aset baru' },
            { key: 'assets:edit', label: 'Mengedit data aset' },
            { key: 'assets:delete', label: 'Menghapus data aset' },
            { key: 'assets:handover', label: 'Melakukan serah terima (handover)' },
            { key: 'assets:dismantle', label: 'Melakukan penarikan (dismantle)' },
            { key: 'assets:install', label: 'Melakukan instalasi ke pelanggan' },
            { key: 'assets:repair:report', label: 'Melaporkan kerusakan aset' },
            { key: 'assets:repair:manage', label: 'Mengelola alur perbaikan aset' },
        ],
    },
    {
        group: 'Manajemen Stok',
        permissions: [
            { key: 'stock:view', label: 'Melihat stok aset' },
            { key: 'stock:manage', label: 'Mengelola stok (Threshold, dll)' },
        ],
    },
    {
        group: 'Manajemen Pelanggan',
        permissions: [
            { key: 'customers:view', label: 'Melihat data pelanggan' },
            { key: 'customers:create', label: 'Menambah pelanggan baru' },
            { key: 'customers:edit', label: 'Mengedit data pelanggan' },
            { key: 'customers:delete', label: 'Menghapus data pelanggan' },
        ],
    },
    {
        group: 'Pengaturan & Pengguna',
        permissions: [
            { key: 'users:view', label: 'Melihat daftar pengguna & divisi' },
            { key: 'users:create', label: 'Membuat pengguna baru' },
            { key: 'users:edit', label: 'Mengedit data pengguna' },
            { key: 'users:delete', label: 'Menghapus pengguna' },
            { key: 'users:reset-password', label: 'Reset kata sandi pengguna' },
            { key: 'users:manage-permissions', label: 'Mengelola hak akses pengguna' },
            { key: 'divisions:manage', label: 'Mengelola divisi' },
            { key: 'categories:manage', label: 'Mengelola kategori, tipe, & model aset' },
            { key: 'account:manage', label: 'Mengelola akun pribadi' },
        ],
    },
];

export const ALL_PERMISSION_KEYS = ALL_PERMISSIONS.flatMap(group => group.permissions.map(p => p.key));

// --- PRESET IZIN BERDASARKAN PERAN (SOURCE OF TRUTH) ---

export const STAFF_PERMISSIONS: Permission[] = [ 
    'dashboard:view', 
    'requests:view:own', 
    'requests:create', 
    'requests:cancel:own', 
    'loan-requests:view:own', 
    'loan-requests:create', 
    'assets:view', 
    'assets:repair:report', 
    'account:manage', 
]; 

export const LEADER_PERMISSIONS: Permission[] = [ 
    ...STAFF_PERMISSIONS, 
    'requests:create:urgent', 
]; 

export const ADMIN_LOGISTIK_PERMISSIONS: Permission[] = [ 
    'dashboard:view', 
    'requests:view:all', 
    'requests:approve:logistic', 
    'loan-requests:view:all', 
    'loan-requests:approve', 
    'loan-requests:return', 
    'assets:view', 
    'assets:create', 
    'assets:edit', 
    'assets:handover', 
    'assets:dismantle', 
    'assets:install', 
    'assets:repair:manage', 
    'stock:view',
    'stock:manage',
    'customers:view', 
    'customers:create', 
    'customers:edit', 
    'categories:manage', 
    'account:manage', 
    'requests:view:own', 
    'loan-requests:view:own', 
    'data:export'
]; 

export const ADMIN_PURCHASE_PERMISSIONS: Permission[] = [ 
    'dashboard:view', 
    'requests:view:all', 
    'requests:approve:purchase', 
    'assets:view', 
    'stock:view',
    'customers:view', 
    'categories:manage', 
    'account:manage', 
    'requests:view:own',
    'data:export' 
]; 

export const SUPER_ADMIN_PERMISSIONS: Permission[] = ALL_PERMISSION_KEYS;

// Mapping Role ke Default Permissions
export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
    'Staff': STAFF_PERMISSIONS,
    'Leader': LEADER_PERMISSIONS,
    'Admin Logistik': ADMIN_LOGISTIK_PERMISSIONS,
    'Admin Purchase': ADMIN_PURCHASE_PERMISSIONS,
    'Super Admin': SUPER_ADMIN_PERMISSIONS,
};

// Definisi hak akses wajib (LOCKED) untuk peran tertentu agar sistem berjalan lancar
export const MANDATORY_PERMISSIONS: Partial<Record<UserRole, Permission[]>> = {
    'Admin Logistik': [
        'dashboard:view',
        'assets:view',
        'requests:view:all',
        'stock:view'
    ],
    'Admin Purchase': [
        'dashboard:view',
        'requests:view:all',
        'requests:approve:purchase'
    ],
    'Super Admin': ALL_PERMISSION_KEYS,
    'Leader': [
        'dashboard:view',
        'requests:create:urgent'
    ],
    'Staff': [
        'dashboard:view',
        'requests:view:own'
    ]
};

// Definisi Dependensi Izin (Cascading Logic)
// Key: Child Permission (Yang diklik)
// Value: Array of Parent Permissions (Yang WAJIB ikut terpilih)
export const PERMISSION_DEPENDENCIES: Partial<Record<Permission, Permission[]>> = {
    // Requests
    'requests:create': ['requests:view:own'],
    'requests:create:urgent': ['requests:view:own'],
    'requests:delete': ['requests:view:own'],
    'requests:cancel:own': ['requests:view:own'],
    'requests:approve:logistic': ['requests:view:all'],
    'requests:approve:purchase': ['requests:view:all'],
    'requests:approve:final': ['requests:view:all'],
    
    // Loan Requests
    'loan-requests:create': ['loan-requests:view:own'],
    'loan-requests:approve': ['loan-requests:view:all'],
    'loan-requests:return': ['loan-requests:view:all'],

    // Assets
    'assets:create': ['assets:view'],
    'assets:edit': ['assets:view'],
    'assets:delete': ['assets:view'],
    'assets:handover': ['assets:view'],
    'assets:dismantle': ['assets:view'],
    'assets:install': ['assets:view'],
    'assets:repair:report': ['assets:view'],
    'assets:repair:manage': ['assets:view'],
    
    // Stock
    'stock:manage': ['stock:view'],
    
    // Customers
    'customers:create': ['customers:view'],
    'customers:edit': ['customers:view'],
    'customers:delete': ['customers:view'],
    
    // Users & Settings
    'users:create': ['users:view'],
    'users:edit': ['users:view'],
    'users:delete': ['users:view'],
    'users:reset-password': ['users:view'],
    'users:manage-permissions': ['users:view'],
    'divisions:manage': ['users:view'], // Asumsi divisi ada di menu pengguna
};


/**
 * Checks if a user has a specific permission.
 * Super Admins are always granted permission.
 * @param user The user object.
 * @param permission The permission key to check.
 * @returns True if the user has the permission, false otherwise.
 */
export const hasPermission = (user: User | null, permission: Permission): boolean => {
    if (!user) {
        return false;
    }
    // Super Admin has all permissions implicitly.
    if (user.role === 'Super Admin') {
        return true;
    }
    return user.permissions.includes(permission);
};
