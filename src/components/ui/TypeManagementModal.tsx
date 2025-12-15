
import React, { useState, useEffect } from 'react';
import { AssetCategory, AssetType, Asset, TrackingMethod, StandardItem, ItemClassification } from '../../types';
import Modal from './Modal';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { SpinnerIcon } from '../icons/SpinnerIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';
import { InboxIcon } from '../icons/InboxIcon';
import { useNotification } from '../../providers/NotificationProvider';
import { CustomSelect } from './CustomSelect';
import { CreatableSelect } from './CreatableSelect';
import { BsBoxes, BsUpcScan, BsTools, BsLightningFill } from 'react-icons/bs';

// Store
import { useAssetStore } from '../../stores/useAssetStore';

interface TypeManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentCategory: AssetCategory;
  typeToEdit: AssetType | null;
  // Legacy Props (optional)
  assets?: Asset[];
  onSave?: (parentCategory: AssetCategory, typeData: Omit<AssetType, 'id' | 'standardItems'>, typeId?: number) => void;
  onDelete?: (parentCategory: AssetCategory, typeToDelete: AssetType) => void;
  defaultClassification?: ItemClassification; // New Prop
}

interface TypeToDelete extends AssetType {
    assetCount: number;
}

const commonUnits = ['unit', 'pcs', 'set', 'pack', 'box', 'meter', 'roll', 'liter', 'kg', 'lembar', 'pasang', 'buah'];

export const TypeManagementModal: React.FC<TypeManagementModalProps> = ({
  isOpen,
  onClose,
  parentCategory,
  typeToEdit,
  assets: propAssets,
  onSave: propOnSave,
  onDelete: propOnDelete,
  defaultClassification = 'asset', // Default value
}) => {
  // Store hooks
  const storeAssets = useAssetStore((state) => state.assets);
  const assetCategories = useAssetStore((state) => state.categories);
  const updateCategories = useAssetStore((state) => state.updateCategories);
  
  // Use store assets if available
  const assets = storeAssets.length > 0 ? storeAssets : (propAssets || []);
  
  // Derived state
  const category = assetCategories.find(c => c.id === parentCategory.id) || parentCategory;
  const types = category.types || [];

  const [name, setName] = useState('');
  const [classification, setClassification] = useState<ItemClassification>(defaultClassification);
  const [trackingMethod, setTrackingMethod] = useState<TrackingMethod>('individual');
  const [unitOfMeasure, setUnitOfMeasure] = useState('unit');
  const [baseUnitOfMeasure, setBaseUnitOfMeasure] = useState('pcs');
  const [quantityPerUnit, setQuantityPerUnit] = useState<number | ''>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [typeToDelete, setTypeToDelete] = useState<TypeToDelete | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const addNotification = useNotification();

  const isEditing = editingId !== null;

  useEffect(() => {
    if (isOpen) {
        if (typeToEdit) {
            setEditingId(typeToEdit.id);
            setName(typeToEdit.name);
            setClassification(typeToEdit.classification || 'asset');
            setTrackingMethod(typeToEdit.trackingMethod || 'individual');
            setUnitOfMeasure(typeToEdit.unitOfMeasure || 'unit');
            setBaseUnitOfMeasure(typeToEdit.baseUnitOfMeasure || 'pcs');
            setQuantityPerUnit(typeToEdit.quantityPerUnit || '');
        } else {
            resetForm();
        }
    } else {
        resetForm();
    }
  }, [isOpen, typeToEdit, defaultClassification]);

  // Effect to enforce constraints when classification changes
  useEffect(() => {
      if (classification === 'material') {
          setTrackingMethod('bulk'); // Material must be bulk
      }
  }, [classification]);

  const resetForm = () => {
    setName('');
    setClassification(defaultClassification); // Use prop default
    setTrackingMethod(defaultClassification === 'material' ? 'bulk' : 'individual');
    setUnitOfMeasure('unit');
    setBaseUnitOfMeasure('pcs');
    setQuantityPerUnit('');
    setEditingId(null);
    setIsLoading(false);
  };

  const handleEditClick = (type: AssetType) => {
    setEditingId(type.id);
    setName(type.name);
    setClassification(type.classification || 'asset');
    setTrackingMethod(type.trackingMethod || 'individual');
    setUnitOfMeasure(type.unitOfMeasure || 'unit');
    setBaseUnitOfMeasure(type.baseUnitOfMeasure || 'pcs');
    setQuantityPerUnit(type.quantityPerUnit || '');
  };

  const handleDeleteClick = (type: AssetType) => {
    const assetCount = assets.filter(asset => asset.category === category.name && asset.type === type.name).length;
    setTypeToDelete({ ...type, assetCount });
  };

  const handleConfirmDelete = async () => {
    if (typeToDelete && typeToDelete.assetCount === 0) {
        if (propOnDelete) {
            propOnDelete(category, typeToDelete);
        } else {
            // Store Logic
            const updatedCategories = assetCategories.map(cat => {
                if (cat.id === category.id) {
                    return {
                        ...cat,
                        types: cat.types.filter(t => t.id !== typeToDelete.id)
                    };
                }
                return cat;
            });
            await updateCategories(updatedCategories);
            addNotification(`Tipe "${typeToDelete.name}" berhasil dihapus.`, 'success');
        }
      setTypeToDelete(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !unitOfMeasure.trim()) {
      addNotification('Nama tipe dan satuan ukur harus diisi.', 'error');
      return;
    }
    
    // Validate Material Requirement
    if (classification === 'material' && !category.isCustomerInstallable) {
        addNotification('Peringatan: Material seharusnya berada dalam Kategori yang dapat dipasang ke pelanggan ("Installable"). Pastikan kategori ini sudah diatur dengan benar.', 'warning');
        // We allow it to proceed with a warning, or you could block it:
        // return; 
    }

    setIsLoading(true);

    const typeData = {
        name,
        classification,
        trackingMethod, 
        unitOfMeasure,
        baseUnitOfMeasure: trackingMethod === 'bulk' ? baseUnitOfMeasure : undefined,
        quantityPerUnit: (trackingMethod === 'bulk' && quantityPerUnit !== '') ? Number(quantityPerUnit) : undefined
    };

    if (propOnSave) {
        propOnSave(category, typeData, editingId || undefined);
    } else {
        // Store Logic
        const updatedCategories = assetCategories.map(cat => {
            if (cat.id === category.id) {
                let updatedTypes;
                if (editingId) {
                    updatedTypes = cat.types.map(t => t.id === editingId ? { ...t, ...typeData } : t);
                    addNotification(`Tipe "${name}" berhasil diperbarui.`, 'success');
                } else {
                    const newType: AssetType = { ...typeData, id: Date.now(), standardItems: [] };
                    updatedTypes = [...cat.types, newType];
                    addNotification(`Tipe "${name}" berhasil ditambahkan.`, 'success');
                }
                return { ...cat, types: updatedTypes };
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
        title={`Kelola Tipe & Material`}
        size="lg"
        hideDefaultCloseButton
        disableContentPadding
      >
        <div className="p-6 space-y-6">
            <div className="p-3 text-sm text-blue-800 bg-blue-50/70 rounded-lg border border-blue-200/50">
                Mengelola Tipe untuk Kategori: <strong className="font-semibold">{category.name}</strong>
            </div>

            {/* Form Section */}
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
                <h3 className="text-base font-semibold text-gray-800 mb-3">{isEditing ? 'Edit Tipe' : 'Tambah Tipe Baru'}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="typeName" className="block text-sm font-medium text-gray-700">Nama Tipe / Material</label>
                        <input type="text" id="typeName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Router, Dropcore 1 Core, Patchcord" required className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-tm-accent focus:border-tm-accent sm:text-sm" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Classification Selector */}
                        <div className="sm:col-span-2">
                             <label className="block text-sm font-medium text-gray-700 mb-2">Klasifikasi Item</label>
                             <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setClassification('asset')}
                                    className={`p-3 border rounded-lg text-left transition-all flex items-center gap-3 ${classification === 'asset' ? 'bg-blue-50 border-tm-primary ring-1 ring-tm-primary' : 'bg-white border-gray-300 hover:border-gray-400'}`}
                                >
                                    <div className={`p-2 rounded-full ${classification === 'asset' ? 'bg-blue-100 text-tm-primary' : 'bg-gray-100 text-gray-500'}`}><BsTools /></div>
                                    <div>
                                        <div className="font-semibold text-sm text-gray-800">Aset Tetap</div>
                                        <div className="text-xs text-gray-500">Perangkat, Alat Kerja (Router, Splicer)</div>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setClassification('material')}
                                    className={`p-3 border rounded-lg text-left transition-all flex items-center gap-3 ${classification === 'material' ? 'bg-orange-50 border-orange-500 ring-1 ring-orange-500' : 'bg-white border-gray-300 hover:border-gray-400'}`}
                                >
                                    <div className={`p-2 rounded-full ${classification === 'material' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}><BsLightningFill /></div>
                                    <div>
                                        <div className="font-semibold text-sm text-gray-800">Material</div>
                                        <div className="text-xs text-gray-500">Habis Pakai (Kabel, Konektor, Patchcord)</div>
                                    </div>
                                </button>
                             </div>
                        </div>

                        {/* Tracking Method - Conditional */}
                        {classification === 'asset' ? (
                             <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mt-2">Metode Pelacakan</label>
                                <div className="grid grid-cols-2 gap-3 mt-1">
                                    <button
                                        type="button"
                                        onClick={() => setTrackingMethod('individual')}
                                        className={`px-3 py-2 border rounded-md text-sm text-center transition-colors ${trackingMethod === 'individual' ? 'bg-blue-50 border-tm-primary text-tm-primary font-medium' : 'bg-white text-gray-600'}`}
                                    >
                                        Individual (Serial Number)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTrackingMethod('bulk')}
                                        className={`px-3 py-2 border rounded-md text-sm text-center transition-colors ${trackingMethod === 'bulk' ? 'bg-blue-50 border-tm-primary text-tm-primary font-medium' : 'bg-white text-gray-600'}`}
                                    >
                                        Massal (Jumlah Saja)
                                    </button>
                                </div>
                            </div>
                        ) : (
                             <div className="sm:col-span-2 p-3 bg-orange-50 border border-orange-100 rounded-md text-xs text-orange-800 flex items-start gap-2">
                                 <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 flex-shrink-0"/>
                                 <span>Material otomatis menggunakan metode pelacakan <strong>Massal (Bulk)</strong> karena sifatnya yang habis pakai.</span>
                             </div>
                        )}

                        {/* Unit Config */}
                        <div className="space-y-4 sm:col-span-2 border-t pt-4">
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                 <div>
                                    <label htmlFor="unitOfMeasure" className="block text-sm font-medium text-gray-700">
                                        Satuan Stok Utama
                                    </label>
                                    <div className="mt-1">
                                        <CreatableSelect
                                            options={commonUnits}
                                            value={unitOfMeasure}
                                            onChange={setUnitOfMeasure}
                                            placeholder="Cth: Pcs, Meter, Roll"
                                        />
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">
                                        {classification === 'material' 
                                            ? "Satuan saat barang dikeluarkan dari gudang. (Cth: 'Meter' untuk kabel hasbal, 'Pcs' untuk patchcord)." 
                                            : "Satuan penghitungan stok."}
                                    </p>
                                </div>

                                {trackingMethod === 'bulk' && (
                                    <>
                                        <div>
                                            <label htmlFor="baseUnitOfMeasure" className="block text-sm font-medium text-gray-700">Satuan Eceran (Opsional)</label>
                                            <div className="mt-1">
                                                <CreatableSelect
                                                    options={commonUnits}
                                                    value={baseUnitOfMeasure}
                                                    onChange={setBaseUnitOfMeasure}
                                                    placeholder="Cth: Meter, Pcs"
                                                />
                                            </div>
                                            <p className="mt-1 text-xs text-gray-500">Jika stok utama adalah paket (misal: Roll/Box), ini satuan isinya.</p>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label htmlFor="quantityPerUnit" className="block text-sm font-medium text-gray-700">Konversi (Isi per Satuan Utama)</label>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-sm text-gray-600">1 {unitOfMeasure || '...'} = </span>
                                                <input 
                                                    type="number" 
                                                    id="quantityPerUnit" 
                                                    value={quantityPerUnit} 
                                                    onChange={(e) => setQuantityPerUnit(e.target.value === '' ? '' : Number(e.target.value))} 
                                                    placeholder="1" 
                                                    className="block w-24 px-3 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-tm-accent focus:border-tm-accent sm:text-sm" 
                                                />
                                                <span className="text-sm text-gray-600">{baseUnitOfMeasure || '...'}</span>
                                            </div>
                                             <p className="mt-1 text-xs text-gray-500">Biarkan 1 jika tidak ada konversi (misal: stok langsung dalam Meter).</p>
                                        </div>
                                    </>
                                )}
                             </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-end space-x-2 pt-4 border-t">
                        {isEditing && (<button type="button" onClick={resetForm} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal Edit</button>)}
                        <button type="submit" disabled={isLoading} className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover disabled:bg-tm-primary/70">
                        {isLoading && <SpinnerIcon className="w-5 h-5 mr-2" />}
                        {isEditing ? 'Simpan Perubahan' : 'Tambah Tipe'}
                        </button>
                    </div>
                </form>
            </div>

          {/* List Section */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-2">Daftar Tipe ({types.length})</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2 -mr-2">
              {types.length > 0 ? (
                types.map(type => {
                    const modelCount = type.standardItems?.length || 0;
                    const assetCount = assets.filter(a => a.category === category.name && a.type === type.name).length;
                    const isMaterial = type.classification === 'material';
                    
                    return (
                        <div key={type.id} className={`flex items-center justify-between p-3 rounded-lg transition-colors ${editingId === type.id ? 'bg-blue-100 border border-tm-primary' : 'bg-gray-50/70 border border-transparent'}`}>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-gray-900">{type.name}</p>
                                    {isMaterial ? (
                                         <span className="px-1.5 py-0.5 text-[10px] font-bold text-orange-700 bg-orange-100 rounded border border-orange-200 uppercase">Material</span>
                                    ) : (
                                         <span className="px-1.5 py-0.5 text-[10px] font-bold text-blue-700 bg-blue-100 rounded border border-blue-200 uppercase">Aset</span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {modelCount} Model &bull; {assetCount} Item &bull; <span className="font-medium">{type.trackingMethod === 'bulk' ? `Bulk (${type.unitOfMeasure})` : 'Individual'}</span>
                                </p>
                            </div>
                            <div className="flex items-center space-x-1">
                                <button onClick={() => handleEditClick(type)} className="p-1.5 text-gray-500 rounded-md hover:bg-yellow-100 hover:text-yellow-700" title="Edit Tipe"><PencilIcon className="w-4 h-4" /></button>
                                <button onClick={() => handleDeleteClick(type)} className="p-1.5 text-gray-500 rounded-md hover:bg-red-100 hover:text-red-700" title="Hapus Tipe"><TrashIcon className="w-4 h-4" /></button>
                            </div>
                        </div>
                    );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500 border-2 border-dashed rounded-lg">
                    <InboxIcon className="w-10 h-10 text-gray-400" />
                    <p className="mt-2 text-sm">Belum ada tipe untuk kategori ini.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {typeToDelete && (
        <Modal
          isOpen={!!typeToDelete}
          onClose={() => setTypeToDelete(null)}
          title={typeToDelete.assetCount > 0 ? "Tidak Dapat Menghapus" : "Konfirmasi Hapus Tipe"}
          size="md"
          hideDefaultCloseButton
        >
          <div className="text-center">
            <div className={`flex items-center justify-center w-12 h-12 mx-auto rounded-full ${typeToDelete.assetCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
              <ExclamationTriangleIcon className="w-8 h-8" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-800">{typeToDelete.assetCount > 0 ? `Tipe Sedang Digunakan` : `Hapus Tipe?`}</h3>
            {typeToDelete.assetCount > 0 ? (
                <p className="mt-2 text-sm text-gray-600">
                    Anda tidak dapat menghapus tipe <span className="font-bold">"{typeToDelete.name}"</span> karena masih ada {typeToDelete.assetCount} aset yang terhubung. Harap pindahkan atau hapus aset tersebut terlebih dahulu.
                </p>
            ) : (
                <p className="mt-2 text-sm text-gray-600">
                    Anda yakin ingin menghapus tipe <span className="font-bold">"{typeToDelete.name}"</span>? Tindakan ini tidak dapat diurungkan.
                </p>
            )}
          </div>
           <div className="flex items-center justify-end pt-5 mt-5 space-x-3 border-t">
                 {typeToDelete.assetCount > 0 ? (
                    <button type="button" onClick={() => setTypeToDelete(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Mengerti</button>
                 ) : (
                     <>
                        <button type="button" onClick={() => setTypeToDelete(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
                        <button type="button" onClick={handleConfirmDelete} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-danger rounded-lg shadow-sm hover:bg-red-700">Ya, Hapus</button>
                    </>
                 )}
            </div>
        </Modal>
      )}
    </>
  );
};
