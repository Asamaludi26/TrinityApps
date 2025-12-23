
import { create } from 'zustand';
import { Asset, AssetCategory, StockMovement, MovementType, ActivityLogEntry } from '../types';
import * as api from '../services/api';

interface AssetState {
  assets: Asset[];
  categories: AssetCategory[];
  stockMovements: StockMovement[];
  isLoading: boolean;

  // Actions
  fetchAssets: () => Promise<void>;
  addAsset: (asset: Asset) => Promise<void>;
  updateAsset: (id: string, data: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  
  updateCategories: (categories: AssetCategory[]) => Promise<void>;

  // Updated: Ledger is now handled by API
  recordMovement: (movement: Omit<StockMovement, 'id' | 'balanceAfter'>) => Promise<void>;
  getStockHistory: (name: string, brand: string) => StockMovement[];
  refreshAll: () => Promise<void>;
}

// Helper (Keep for UI sanitization if needed, or move to utils)
const sanitizeBulkAsset = (asset: Asset | Partial<Asset>, categories: AssetCategory[], existingAsset?: Asset): Asset | Partial<Asset> => {
    const categoryName = asset.category || existingAsset?.category;
    const typeName = asset.type || existingAsset?.type;
    if (!categoryName || !typeName) return asset;
    const category = categories.find(c => c.name === categoryName);
    const type = category?.types.find(t => t.name === typeName);
    if (type?.trackingMethod === 'bulk') {
        return { ...asset, serialNumber: undefined, macAddress: undefined };
    }
    return asset;
};

export const useAssetStore = create<AssetState>((set, get) => ({
  assets: [],
  categories: [],
  stockMovements: [],
  isLoading: false,

  refreshAll: async () => {
      // Re-fetch all asset related data to ensure consistency
      await get().fetchAssets();
  },

  fetchAssets: async () => {
    set({ isLoading: true });
    try {
      const data = await api.fetchAllData();
      // In real mode, you might need separate calls if fetchAllData isn't aggregated
      set({ 
          assets: data.assets, 
          categories: data.assetCategories, 
          stockMovements: (data as any).stockMovements || [],
          isLoading: false 
      });
    } catch (error) {
      set({ isLoading: false });
      // Error handled by Interceptor
    }
  },

  addAsset: async (rawAsset) => {
    const asset = sanitizeBulkAsset(rawAsset, get().categories) as Asset;
    // Call API (Generic update for mock, specific create for real)
    // For Mock Mode simplicity in this refactor, we stick to updating the whole list via generic helper
    // In a full migration, api.createAsset(asset) should be defined.
    const current = get().assets;
    const updated = [asset, ...current];
    await api.updateData('app_assets', updated); // Using generic for mock compatibility
    set({ assets: updated });
    
    // Auto-record movement for new items
    const category = get().categories.find(c => c.name === asset.category);
    const type = category?.types.find(t => t.name === asset.type);
    
    await get().recordMovement({
         assetName: asset.name,
         brand: asset.brand,
         date: asset.registrationDate,
         type: 'IN_PURCHASE',
         quantity: (type?.trackingMethod === 'bulk' && (rawAsset as any).quantity) ? (rawAsset as any).quantity : 1,
         referenceId: asset.poNumber || 'Initial',
         actor: asset.recordedBy,
         notes: 'Penerimaan barang baru'
     });
  },

  updateAsset: async (id, rawData) => {
    const current = get().assets;
    const originalAsset = current.find(a => a.id === id);
    if (!originalAsset) return;

    const data = sanitizeBulkAsset(rawData, get().categories, originalAsset);
    
    // --- AUTO LOGGING LOGIC (Can move to backend) ---
    const changes: string[] = [];
    let actionType = 'Update Data';
    if (data.status && data.status !== originalAsset.status) {
        changes.push(`Status: ${originalAsset.status} ➔ ${data.status}`);
        actionType = 'Perubahan Status';
    }
    // ... other logging logic ...
    
    // In Real Backend, this logic happens on server.
    // For Mock, we do it here or in API layer.
    
    const updated = current.map(a => a.id === id ? { ...a, ...data } : a);
    await api.updateData('app_assets', updated);
    set({ assets: updated });

    // Ledger Logic
    if (originalAsset && data.status && data.status !== originalAsset.status) {
         let type: MovementType | null = null;
         if (originalAsset.status === 'Di Gudang' && (data.status === 'Digunakan' || data.status === 'Rusak')) {
             if (data.status === 'Digunakan') type = 'OUT_INSTALLATION';
             if (data.status === 'Rusak') type = 'OUT_BROKEN';
         } else if ((originalAsset.status === 'Digunakan' || originalAsset.status === 'Rusak' || originalAsset.status === 'Dalam Perbaikan') && data.status === 'Di Gudang') {
             type = 'IN_RETURN';
         }

         if (type) {
              await get().recordMovement({
                 assetName: originalAsset.name,
                 brand: originalAsset.brand,
                 date: new Date().toISOString(),
                 type: type,
                 quantity: 1,
                 referenceId: (data as any).woRoIntNumber || 'Status Update',
                 actor: 'System', 
                 notes: `Otomatis dari perubahan status: ${originalAsset.status} -> ${data.status}`
             });
         }
    }
  },

  deleteAsset: async (id) => {
    const current = get().assets;
    const assetToDelete = current.find(a => a.id === id);
    const updated = current.filter(a => a.id !== id);
    await api.updateData('app_assets', updated);
    set({ assets: updated });

    if (assetToDelete && assetToDelete.status === 'Di Gudang') {
         await get().recordMovement({
             assetName: assetToDelete.name,
             brand: assetToDelete.brand,
             date: new Date().toISOString(),
             type: 'OUT_ADJUSTMENT',
             quantity: 1,
             referenceId: 'DELETE',
             actor: 'System',
             notes: 'Aset dihapus dari sistem'
         });
    }
  },

  updateCategories: async (categories) => {
      await api.updateData('app_assetCategories', categories);
      set({ categories });
  },

  // Refactored: Call API and set state from result
  recordMovement: async (movementData) => {
      // api.recordStockMovement handles the heavy lifting (calculation)
      // returns the FULL updated list of movements
      const updatedMovements = await api.recordStockMovement(movementData);
      set({ stockMovements: updatedMovements as StockMovement[] });
  },

  getStockHistory: (name, brand) => {
      // Simple filter on local state (which is synced via recordMovement response)
      return get().stockMovements
        .filter(m => m.assetName === name && m.brand === brand)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}));
