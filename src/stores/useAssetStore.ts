
import { create } from 'zustand';
import { Asset, AssetCategory, StockMovement, MovementType } from '../types';
import * as api from '../services/api';

interface AssetState {
  assets: Asset[];
  categories: AssetCategory[];
  stockMovements: StockMovement[]; // NEW STATE
  isLoading: boolean;

  // Actions
  fetchAssets: () => Promise<void>;
  addAsset: (asset: Asset) => Promise<void>;
  updateAsset: (id: string, data: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  
  // Categories
  updateCategories: (categories: AssetCategory[]) => Promise<void>;

  // Stock Ledger Actions
  recordMovement: (movement: Omit<StockMovement, 'id' | 'balanceAfter'>) => void;
  getStockHistory: (name: string, brand: string) => StockMovement[];
}

// Helper untuk membersihkan data Bulk
const sanitizeBulkAsset = (asset: Asset | Partial<Asset>, categories: AssetCategory[], existingAsset?: Asset): Asset | Partial<Asset> => {
    // Tentukan kategori dan tipe (gunakan data baru, atau fallback ke data lama jika update parsial)
    const categoryName = asset.category || existingAsset?.category;
    const typeName = asset.type || existingAsset?.type;

    if (!categoryName || !typeName) return asset;

    const category = categories.find(c => c.name === categoryName);
    const type = category?.types.find(t => t.name === typeName);

    // Jika tracking method adalah BULK, paksa SN dan MAC menjadi null/undefined
    if (type?.trackingMethod === 'bulk') {
        return {
            ...asset,
            serialNumber: undefined, // atau null, tergantung preferensi backend
            macAddress: undefined
        };
    }

    return asset;
};

export const useAssetStore = create<AssetState>((set, get) => ({
  assets: [],
  categories: [],
  stockMovements: [],
  isLoading: false,

  fetchAssets: async () => {
    set({ isLoading: true });
    try {
      const data = await api.fetchAllData();
      // Mock movements if empty (for demo purposes)
      let movements: StockMovement[] = (data as any).stockMovements || [];
      
      set({ 
          assets: data.assets, 
          categories: data.assetCategories, 
          stockMovements: movements,
          isLoading: false 
      });
    } catch (error) {
      console.error("Failed to fetch assets", error);
      set({ isLoading: false });
    }
  },

  addAsset: async (rawAsset) => {
    // SAFETY LAYER: Pastikan aset bulk tidak punya SN/MAC sebelum masuk state/DB
    const asset = sanitizeBulkAsset(rawAsset, get().categories) as Asset;

    const current = get().assets;
    const updated = [asset, ...current];
    await api.updateData('app_assets', updated);
    set({ assets: updated });
    
    // Auto-record movement for new bulk items (Initial Stock)
    const category = get().categories.find(c => c.name === asset.category);
    const type = category?.types.find(t => t.name === asset.type);
    
    if (type?.trackingMethod === 'bulk') {
         get().recordMovement({
             assetName: asset.name,
             brand: asset.brand,
             date: asset.registrationDate,
             type: 'IN_PURCHASE',
             quantity: 1, // Simplified: array length based
             referenceId: asset.poNumber || 'Initial',
             actor: asset.recordedBy,
             notes: 'Penerimaan barang baru'
         });
    }
  },

  updateAsset: async (id, rawData) => {
    const current = get().assets;
    const originalAsset = current.find(a => a.id === id);
    
    // SAFETY LAYER: Pastikan update tidak menyelundupkan SN ke item Bulk
    const data = originalAsset ? sanitizeBulkAsset(rawData, get().categories, originalAsset) : rawData;

    const updated = current.map(a => a.id === id ? { ...a, ...data } : a);
    await api.updateData('app_assets', updated);
    set({ assets: updated });

    // Auto-record movement for status changes (Consumption)
    if (originalAsset && data.status && data.status !== originalAsset.status) {
         // Logic to determine movement type
         let type: MovementType | null = null;
         const isOut = data.status === 'Digunakan' || data.status === 'Rusak' || data.status === 'Diberhentikan';
         
         if (originalAsset.status === 'Di Gudang' && data.status === 'Digunakan') type = 'OUT_INSTALLATION';
         if (data.status === 'Rusak') type = 'OUT_BROKEN';

         if (type) {
              get().recordMovement({
                 assetName: originalAsset.name,
                 brand: originalAsset.brand,
                 date: new Date().toISOString(),
                 type: type,
                 quantity: 1,
                 referenceId: (data as any).woRoIntNumber || 'Manual Update',
                 actor: 'System', // Should get current user in real app
                 notes: `Status berubah: ${originalAsset.status} -> ${data.status}`
             });
         }
    }
  },

  deleteAsset: async (id) => {
    const current = get().assets;
    const updated = current.filter(a => a.id !== id);
    await api.updateData('app_assets', updated);
    set({ assets: updated });
  },

  updateCategories: async (categories) => {
      await api.updateData('app_assetCategories', categories);
      set({ categories });
  },

  // --- NEW: STOCK LEDGER LOGIC ---
  recordMovement: (movementData) => {
      const currentMovements = get().stockMovements;
      
      // Calculate previous balance
      const history = currentMovements
        .filter(m => m.assetName === movementData.assetName && m.brand === movementData.brand)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const lastBalance = history.length > 0 ? history[history.length - 1].balanceAfter : 0;
      
      // Determine direction (IN adds, OUT subtracts)
      const isIncoming = movementData.type.startsWith('IN_');
      const balanceAfter = isIncoming 
        ? lastBalance + movementData.quantity 
        : Math.max(0, lastBalance - movementData.quantity);

      const newMovement: StockMovement = {
          id: `MOV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          ...movementData,
          balanceAfter
      };

      const updatedMovements = [...currentMovements, newMovement];
      // In real app, persist this to API
      set({ stockMovements: updatedMovements });
  },

  getStockHistory: (name, brand) => {
      return get().stockMovements
        .filter(m => m.assetName === name && m.brand === brand)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first
  }
}));
