
import React, { useState, useEffect } from 'react';
import { AssetCategory, AssetType, StandardItem, Asset } from '../../types';
import Modal from './Modal';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { SpinnerIcon } from '../icons/SpinnerIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';
import { InboxIcon } from '../icons/InboxIcon';
import { useNotification } from '../../providers/NotificationProvider';

// Store
import { useAssetStore } from '../../stores/useAssetStore';

interface ModelManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentInfo: { category: AssetCategory; type: AssetType };
  // Legacy props (optional now)
  assets?: Asset[];
  onSave?: (parentInfo: { category: AssetCategory; type: AssetType }, modelData: Omit<StandardItem, 'id'>, id?: number) => void;
  onDelete?: (parentInfo: { category: AssetCategory, type: AssetType }, modelToDelete: StandardItem) => void;
}

interface ModelToDelete extends StandardItem {
    assetCount: number;
}

export const ModelManagementModal: React.FC<ModelManagementModalProps> = ({
  isOpen,
  onClose,
  parentInfo,
  assets: propAssets,
  onSave: propOnSave,
  onDelete: propOnDelete,
}) => {
  // Store hooks
  const storeAssets = useAssetStore((state) => state.assets);
  const assetCategories = useAssetStore((state) => state.categories);
  const updateCategories = useAssetStore((state) => state.updateCategories);
  
  // Use store assets if available
  const assets = storeAssets.length > 0 ? storeAssets : (propAssets || []);

  // Derived state from parentInfo ids to ensure freshness
  const category = assetCategories.find(c => c.id === parentInfo.category.id) || parentInfo.category;
  const type = category.types.find(t => t.id === parentInfo.type.id) || parentInfo.type;
  const models = type.standardItems || [];

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modelToDelete, setModelToDelete] = useState<ModelToDelete | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const addNotification = useNotification();

  const isEditing = editingId !== null;

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setName('');
    setBrand('');
    setEditingId(null);
    setIsLoading(false);
  };

  const handleEditClick = (model: StandardItem) => {
    setEditingId(model.id);
    setName(model.name);
    setBrand(model.brand);
  };

  const handleDeleteClick = (model: StandardItem) => {
    const assetCount = assets.filter(asset => asset.name === model.name && asset.brand === model.brand).length;
    setModelToDelete({ ...model, assetCount });
  };

  const handleConfirmDelete = async () => {
    if (modelToDelete && modelToDelete.assetCount === 0) {
        if (propOnDelete) {
             propOnDelete(parentInfo, modelToDelete);
        } else {
            // Store Logic
             const updatedCategories = assetCategories.map(cat => {
                if (cat.id === category.id) {
                    return {
                        ...cat,
                        types: cat.types.map(t => {
                            if (t.id === type.id) {
                                return {
                                    ...t,
                                    standardItems: (t.standardItems || []).filter(item => item.id !== modelToDelete.id)
                                };
                            }
                            return t;
                        })
                    };
                }
                return cat;
            });
            await updateCategories(updatedCategories);
            addNotification(`Model "${modelToDelete.name}" berhasil dihapus.`, 'success');
        }
      setModelToDelete(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !brand.trim()) {
      addNotification('Nama model dan brand harus diisi.', 'error');
      return;
    }
    setIsLoading(true);

    if (propOnSave) {
        propOnSave(parentInfo, { name, brand }, editingId || undefined);
    } else {
        // Store Logic
        const updatedCategories = assetCategories.map(cat => {
            if (cat.id === category.id) {
                return {
                    ...cat,
                    types: cat.types.map(t => {
                        if (t.id === type.id) {
                            let updatedItems;
                            if (editingId) {
                                updatedItems = (t.standardItems || []).map(item => 
                                    item.id === editingId ? { ...item, name, brand } : item
                                );
                                addNotification(`Model "${name}" berhasil diperbarui.`, 'success');
                            } else {
                                const newItem: StandardItem = { id: Date.now(), name, brand };
                                updatedItems = [...(t.standardItems || []), newItem];
                                addNotification(`Model "${name}" berhasil ditambahkan.`, 'success');
                            }
                            return { ...t, standardItems: updatedItems };
                        }
                        return t;
                    })
                };
            }
            return cat;
        });
        await updateCategories(updatedCategories);
    }

    setIsLoading(false);
    resetForm();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Kelola Model Aset`}
        size="lg"
        hideDefaultCloseButton
        disableContentPadding
      >
        <div className="p-6 space-y-6">
            <div className="p-3 text-sm text-blue-800 bg-blue-50/70 rounded-lg border border-blue-200/50">
                Mengelola Model untuk Tipe: <strong className="font-semibold">{type.name}</strong><br/>
                Dalam Kategori: <strong className="font-semibold">{category.name}</strong>
            </div>

            {/* Form Section */}
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
                <h3 className="text-base font-semibold text-gray-800 mb-3">{isEditing ? 'Edit Model' : 'Tambah Model Baru'}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="modelName" className="block text-sm font-medium text-gray-700">Nama Model</label>
                            <input type="text" id="modelName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Router Core RB4011iGS+" required className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-tm-accent focus:border-tm-accent sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="modelBrand" className="block text-sm font-medium text-gray-700">Brand</label>
                            <input type="text" id="modelBrand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Contoh: Mikrotik" required className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-tm-accent focus:border-tm-accent sm:text-sm" />
                        </div>
                    </div>
                    <div className="flex items-center justify-end space-x-2 pt-2">
                        {isEditing && (<button type="button" onClick={resetForm} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal Edit</button>)}
                        <button type="submit" disabled={isLoading} className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover disabled:bg-tm-primary/70">
                            {isLoading && <SpinnerIcon className="w-5 h-5 mr-2" />}
                            {isEditing ? 'Simpan Perubahan' : 'Tambah Model'}
                        </button>
                    </div>
                </form>
            </div>

            {/* List Section */}
            <div>
                <h3 className="text-base font-semibold text-gray-800 mb-2">Daftar Model ({models.length})</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2 -mr-2">
                {models.length > 0 ? (
                    models.map(model => {
                        const assetCount = assets.filter(a => a.name === model.name && a.brand === model.brand).length;
                        return (
                            <div key={model.id} className={`flex items-center justify-between p-3 rounded-lg transition-colors ${editingId === model.id ? 'bg-blue-100 border border-tm-primary' : 'bg-gray-50/70'}`}>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">{model.name}</p>
                                    <p className="text-xs text-gray-500">{model.brand} &bull; {assetCount} Aset</p>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <button onClick={() => handleEditClick(model)} className="p-1.5 text-gray-500 rounded-md hover:bg-yellow-100 hover:text-yellow-700" title="Edit Model"><PencilIcon className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteClick(model)} className="p-1.5 text-gray-500 rounded-md hover:bg-red-100 hover:text-red-700" title="Hapus Model"><TrashIcon className="w-4 h-4" /></button>
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500 border-2 border-dashed rounded-lg">
                        <InboxIcon className="w-10 h-10 text-gray-400" />
                        <p className="mt-2 text-sm">Belum ada model untuk tipe ini.</p>
                    </div>
                )}
                </div>
            </div>
        </div>
      </Modal>

      {modelToDelete && (
        <Modal
          isOpen={!!modelToDelete}
          onClose={() => setModelToDelete(null)}
          title={modelToDelete.assetCount > 0 ? "Tidak Dapat Menghapus" : "Konfirmasi Hapus Model"}
          size="md"
          hideDefaultCloseButton
        >
          <div className="text-center">
            <div className={`flex items-center justify-center w-12 h-12 mx-auto rounded-full ${modelToDelete.assetCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
              <ExclamationTriangleIcon className="w-8 h-8" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-800">{modelToDelete.assetCount > 0 ? `Model Sedang Digunakan` : `Hapus Model?`}</h3>
             {modelToDelete.assetCount > 0 ? (
                <p className="mt-2 text-sm text-gray-600">
                    Anda tidak dapat menghapus model <span className="font-bold">"{modelToDelete.name}"</span> karena masih ada {modelToDelete.assetCount} aset yang terhubung. Harap pindahkan atau hapus aset tersebut terlebih dahulu.
                </p>
             ) : (
                <p className="mt-2 text-sm text-gray-600">
                    Anda yakin ingin menghapus model <span className="font-bold">"{modelToDelete.name}"</span>? Tindakan ini tidak dapat diurungkan.
                </p>
             )}
          </div>
            <div className="flex items-center justify-end pt-5 mt-5 space-x-3 border-t">
                 {modelToDelete.assetCount > 0 ? (
                    <button type="button" onClick={() => setModelToDelete(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Mengerti</button>
                 ) : (
                     <>
                        <button type="button" onClick={() => setModelToDelete(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
                        <button type="button" onClick={handleConfirmDelete} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-danger rounded-lg shadow-sm hover:bg-red-700">Ya, Hapus</button>
                    </>
                 )}
            </div>
        </Modal>
      )}
    </>
  );
};
