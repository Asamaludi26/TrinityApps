
# Panduan Pengembangan Frontend (React & Vite)

Dokumen ini menjelaskan arsitektur teknis, struktur folder, dan praktik terbaik untuk pengembangan frontend Aplikasi Inventori Aset. Frontend dibangun menggunakan **React**, **TypeScript**, **Vite**, dan **Tailwind CSS**.

## 1. Arsitektur Aplikasi (Feature-Based)

Aplikasi ini menggunakan pendekatan **Feature-Based Architecture**. Artinya, kode diorganisir berdasarkan **fitur bisnis** (seperti `dashboard`, `assets`, `users`) daripada berdasarkan jenis file (seperti folder `components`, `services` yang terpisah jauh).

### Struktur Folder (`src/`)

```
src/
├── components/          # Komponen UI global (Atomic Design)
│   ├── ui/              # Komponen dasar (Button, Modal, Input, Card)
│   ├── layout/          # Struktur halaman (Sidebar, Header, PageLayout)
│   └── icons/           # Ikon SVG sebagai komponen React
├── features/            # Modul fitur utama (Logika Bisnis & Halaman)
│   ├── auth/            # Halaman Login, Register
│   ├── dashboard/       # Widget, Chart, dan Halaman Dashboard
│   ├── assets/          # Manajemen Aset (List, Form, Detail)
│   ├── requests/        # Manajemen Permintaan (Form Request, Approval)
│   └── users/           # Manajemen Pengguna & Divisi
├── hooks/               # Custom React Hooks global (useSortable, useDebounce)
├── services/            # Logika komunikasi dengan API Backend
│   └── api.ts           # Centralized API client (Axios/Fetch wrapper)
├── stores/              # Manajemen State Global (Zustand)
│   ├── useAuthStore.ts
│   ├── useAssetStore.ts
│   └── useUIStore.ts
├── types/               # Definisi Tipe TypeScript Global
├── utils/               # Fungsi utilitas murni (Helper functions)
│   └── uuid.ts          # Generator ID unik standar
├── App.tsx              # Komponen Root & Routing Utama
└── main.tsx             # Entry point React DOM
```

## 2. Manajemen Konfigurasi (Environment Variables)

Dalam pengembangan modern, **jangan pernah** melakukan hardcode URL API atau kredensial. Vite menggunakan file `.env` untuk manajemen konfigurasi.

1.  **File `.env`**:
    Buat file `.env` di root folder `frontend/`.
    ```env
    # URL API Backend (Ubah ini saat deployment produksi)
    VITE_API_URL=http://localhost:3001/api
    
    # Judul Aplikasi
    VITE_APP_TITLE=Triniti Asset Management
    ```

2.  **Akses di Kode**:
    Gunakan `import.meta.env` untuk mengakses variabel.
    ```typescript
    // src/services/api.ts
    const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    ```

3.  **Type Safety**:
    Definisi tipe untuk `import.meta.env` ada di `src/vite-env.d.ts` untuk autocompletion.

## 3. Manajemen State (Zustand)

Kami menggunakan **Zustand** karena API-nya yang sederhana, performa tinggi, dan *boilerplate* yang minimal dibandingkan Redux.

### Pola Store
Setiap domain data memiliki store sendiri (`useAssetStore`, `useAuthStore`). Hindari membuat satu store raksasa.

**Contoh Implementasi (`src/stores/useAssetStore.ts`):**
```typescript
import { create } from 'zustand';
import { Asset } from '../types';
import * as api from '../services/api';

interface AssetState {
  assets: Asset[];
  isLoading: boolean;
  
  // Actions dipisahkan dalam interface untuk kejelasan
  fetchAssets: () => Promise<void>;
  addAsset: (asset: Asset) => void;
}

export const useAssetStore = create<AssetState>((set) => ({
  assets: [],
  isLoading: false,

  fetchAssets: async () => {
    set({ isLoading: true });
    try {
      // Panggil API service yang sebenarnya
      const data = await api.getAssets();
      set({ assets: data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error(error);
    }
  },

  addAsset: (asset) => set((state) => ({ 
    assets: [asset, ...state.assets] 
  })),
}));
```

## 4. Penanganan Formulir & Identitas

### 4.1. Generasi ID (UUID)
Jangan menggunakan `Date.now()` atau `Math.random()` sederhana untuk *key* atau *ID* item, terutama dalam formulir dinamis (seperti daftar item request). Ini berisiko menyebabkan duplikasi ID (*collision*) saat item dibuat sangat cepat atau secara massal.

**Gunakan utilitas standar:**
```typescript
import { generateUUID } from '../../utils/uuid';

const newItem = {
  id: generateUUID(), // Menghasilkan UUID v4
  // ...
};
```

### 4.2. Validasi Formulir
Validasi harus dilakukan setidaknya dua kali:
1.  **Client-side (UX):** Berikan umpan balik instan (misal: tombol disable, pesan error di bawah input).
2.  **Server-side (Security):** Backend wajib memvalidasi ulang semua data.

## 5. Optimasi Performa (Production Ready)

### 5.1. Code Splitting (Lazy Loading)
Jangan memuat seluruh aplikasi sekaligus. Pecah kode berdasarkan halaman (Route) menggunakan `React.lazy` dan `Suspense`.

**Implementasi di `App.tsx`:**

```typescript
import React, { Suspense } from 'react';
import { SpinnerIcon } from './components/icons/SpinnerIcon';

// Import komponen secara dinamis (Lazy Load)
// Komponen ini hanya akan di-download browser saat user mengakses halamannya
const DashboardPage = React.lazy(() => import('./features/dashboard/DashboardPage'));
const RegistrationPage = React.lazy(() => import('./features/assetRegistration/RegistrationPage'));

const LoadingFallback = () => (
  <div className="flex h-screen items-center justify-center">
    <SpinnerIcon className="w-10 h-10 text-blue-600 animate-spin" />
  </div>
);

const AppContent = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
       {/* Routing Logic */}
       {activePage === 'dashboard' && <DashboardPage />}
       {activePage === 'registration' && <RegistrationPage />}
    </Suspense>
  );
}
```

### 5.2. Error Boundaries
Mencegah seluruh aplikasi crash ("White Screen of Death") jika terjadi error pada satu komponen kecil. Gunakan `react-error-boundary` untuk membungkus aplikasi atau fitur utama.

## 6. Integrasi API (Migrasi dari Mock)

Saat ini `src/services/api.ts` menggunakan Mock Data. Untuk produksi, ini harus diganti dengan panggilan `fetch` atau `axios` ke Backend NestJS.

**Langkah Migrasi:**
1.  Hapus logika `localStorage` di `api.ts`.
2.  Ganti dengan:
    ```typescript
    export const fetchAllData = async () => {
        const response = await fetch(`${BASE_URL}/assets`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    };
    ```
