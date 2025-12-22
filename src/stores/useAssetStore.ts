
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
  
  // Categories
  updateCategories: (categories: AssetCategory[]) => Promise<void>;

  // Stock Ledger Actions
  recordMovement: (movement: Omit<StockMovement, 'id' | 'balanceAfter'>) => void;
  getStockHistory: (name: string, brand: string) => StockMovement[];
}

// Helper untuk membersihkan data Bulk
const sanitizeBulkAsset = (asset: Asset | Partial<Asset>, categories: AssetCategory[], existingAsset?: Asset): Asset | Partial<Asset> => {
    const categoryName = asset.category || existingAsset?.category;
    const typeName = asset.type || existingAsset?.type;

    if (!categoryName || !typeName) return asset;

    const category = categories.find(c => c.name === categoryName);
    const type = category?.types.find(t => t.name === typeName);

    if (type?.trackingMethod === 'bulk') {
        return {
            ...asset,
            serialNumber: undefined,
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
    const asset = sanitizeBulkAsset(rawAsset, get().categories) as Asset;
    const current = get().assets;
    const updated = [asset, ...current];
    await api.updateData('app_assets', updated);
    set({ assets: updated });
    
    // Auto-record movement for new items (Initial Stock)
    const category = get().categories.find(c => c.name === asset.category);
    const type = category?.types.find(t => t.name === asset.type);
    
    // Record movement for BOTH Bulk and Individual items to ensure ledger consistency
    // For individual items, quantity is usually 1
    get().recordMovement({
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

    // --- AUTO LOGGING LOGIC ---
    const changes: string[] = [];
    let actionType = 'Update Data';

    if (data.status && data.status !== originalAsset.status) {
        changes.push(`Status: ${originalAsset.status} ➔ ${data.status}`);
        actionType = 'Perubahan Status';
    }
    if (data.currentUser !== undefined && data.currentUser !== originalAsset.currentUser) {
        const oldUser = originalAsset.currentUser || 'Gudang';
        const newUser = data.currentUser || 'Gudang';
        changes.push(`Pengguna: ${oldUser} ➔ ${newUser}`);
        actionType = 'Perpindahan Aset';
    }
    if (data.location && data.location !== originalAsset.location) {
        changes.push(`Lokasi: ${originalAsset.location} ➔ ${data.location}`);
    }

    let updatedActivityLog = originalAsset.activityLog || [];

    if (changes.length > 0 && !data.activityLog) {
        const autoLog: ActivityLogEntry = {
            id: `sys-log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            user: 'System', 
            action: actionType,
            details: changes.join(', ')
        };
        updatedActivityLog = [...updatedActivityLog, autoLog];
    } else if (data.activityLog) {
        updatedActivityLog = data.activityLog;
    }

    const finalData = { ...data, activityLog: updatedActivityLog };

    const updated = current.map(a => a.id === id ? { ...a, ...finalData } : a);
    await api.updateData('app_assets', updated);
    set({ assets: updated });

    // --- AUTO LEDGER RECORDING ---
    if (originalAsset && data.status && data.status !== originalAsset.status) {
         let type: MovementType | null = null;
         
         // Logic: Gudang -> Luar (Keluar)
         if (originalAsset.status === 'Di Gudang' && (data.status === 'Digunakan' || data.status === 'Rusak')) {
             if (data.status === 'Digunakan') type = 'OUT_INSTALLATION';
             if (data.status === 'Rusak') type = 'OUT_BROKEN';
         }
         // Logic: Luar -> Gudang (Masuk)
         else if ((originalAsset.status === 'Digunakan' || originalAsset.status === 'Rusak' || originalAsset.status === 'Dalam Perbaikan') && data.status === 'Di Gudang') {
             type = 'IN_RETURN';
         }

         if (type) {
              get().recordMovement({
                 assetName: originalAsset.name,
                 brand: originalAsset.brand,
                 date: new Date().toISOString(),
                 type: type,
                 quantity: 1, // Individual items are always 1 unit movement
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

    // Record deletion in ledger as adjustment out
    if (assetToDelete && assetToDelete.status === 'Di Gudang') {
         get().recordMovement({
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

  // --- ROBUST STOCK LEDGER LOGIC ---
  // Fixes: Backdating issues, negative quantities, and recalculation
  recordMovement: (movementData) => {
      const allMovements = get().stockMovements;
      
      // 1. Create the new movement object (temporary balance)
      const newMovement: StockMovement = {
          id: `MOV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          ...movementData,
          quantity: Math.abs(movementData.quantity), // Safety: Ensure positive
          balanceAfter: 0 // Will be calculated
      };

      // 2. Filter movements ONLY for this specific item (Name + Brand)
      const itemMovements = allMovements.filter(m => 
          m.assetName === movementData.assetName && m.brand === movementData.brand
      );
      
      // 3. Add new movement and SORT chronologically
      const combinedMovements = [...itemMovements, newMovement].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // 4. RECALCULATE Balances from scratch (The Ledger Replay)
      let runningBalance = 0;
      const recalculatedItemMovements = combinedMovements.map(move => {
          const isIncoming = move.type.startsWith('IN_');
          if (isIncoming) {
              runningBalance += move.quantity;
          } else {
              runningBalance = Math.max(0, runningBalance - move.quantity);
          }
          return { ...move, balanceAfter: runningBalance };
      });

      // 5. Merge back into the main state
      // Remove old movements for this item, and append the recalculated ones
      const otherMovements = allMovements.filter(m => 
          !(m.assetName === movementData.assetName && m.brand === movementData.brand)
      );
      
      const finalMovements = [...otherMovements, ...recalculatedItemMovements];

      // Persist
      api.updateData('stockMovements', finalMovements); // Assuming api supports this key or mocked
      set({ stockMovements: finalMovements });
  },

  getStockHistory: (name, brand) => {
      return get().stockMovements
        .filter(m => m.assetName === name && m.brand === brand)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first for display
  }
}));
