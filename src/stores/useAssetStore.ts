
import { create } from 'zustand';
import { Asset, AssetCategory } from '../types';
import * as api from '../services/api';

interface AssetState {
  assets: Asset[];
  categories: AssetCategory[];
  isLoading: boolean;

  // Actions
  fetchAssets: () => Promise<void>;
  addAsset: (asset: Asset) => Promise<void>;
  updateAsset: (id: string, data: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  
  // Categories
  updateCategories: (categories: AssetCategory[]) => Promise<void>;
}

export const useAssetStore = create<AssetState>((set, get) => ({
  assets: [],
  categories: [],
  isLoading: false,

  fetchAssets: async () => {
    set({ isLoading: true });
    try {
      const data = await api.fetchAllData();
      set({ assets: data.assets, categories: data.assetCategories, isLoading: false });
    } catch (error) {
      console.error("Failed to fetch assets", error);
      set({ isLoading: false });
    }
  },

  addAsset: async (asset) => {
    const current = get().assets;
    const updated = [asset, ...current];
    await api.updateData('app_assets', updated);
    set({ assets: updated });
  },

  updateAsset: async (id, data) => {
    const current = get().assets;
    const updated = current.map(a => a.id === id ? { ...a, ...data } : a);
    await api.updateData('app_assets', updated);
    set({ assets: updated });
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
  }
}));
