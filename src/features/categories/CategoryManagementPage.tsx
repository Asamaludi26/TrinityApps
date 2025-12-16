

import React, { useState, useMemo, useEffect } from 'react';
import { AssetCategory, Division, Asset, User, AssetType, StandardItem, ItemClassification } from '../../types';
import Modal from '../../components/ui/Modal';
import { useNotification } from '../../providers/NotificationProvider';
import { PencilIcon } from '../../components/icons/PencilIcon';
import { TrashIcon } from '../../components/icons/TrashIcon';
import { SpinnerIcon } from '../../components/icons/SpinnerIcon';
import { InboxIcon } from '../../components/icons/InboxIcon';
import { ExclamationTriangleIcon } from '../../components/icons/ExclamationTriangleIcon';
import { SearchIcon } from '../../components/icons/SearchIcon';
import { PlusIcon } from '../../components/icons/PlusIcon';
import { CategoryIcon } from '../../components/icons/CategoryIcon';
import { Tooltip } from '../../components/ui/Tooltip';
import { Checkbox } from '../../components/ui/Checkbox';
import { ChevronDownIcon } from '../../components/icons/ChevronDownIcon';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { CustomerIcon } from '../../components/icons/CustomerIcon';
import { ModelManagementModal } from '../../components/ui/ModelManagementModal';
import { TypeManagementModal } from '../../components/ui/TypeManagementModal';
import { BsTools, BsBoxSeam, BsLightningFill } from 'react-icons/bs';

// Store
import { useAssetStore } from '../../stores/useAssetStore';
import { useMasterDataStore } from '../../stores/useMasterDataStore';

interface CategoryManagementProps {
    currentUser: User;
}

const CategoryManagementPage: React.FC<CategoryManagementProps> = ({ currentUser }) => {
    // Store Hooks
    const assets = useAssetStore((state) => state.assets);
    const categories = useAssetStore((state) => state.categories);
    const updateCategories = useAssetStore((state) => state.updateCategories);
    const divisions = useMasterDataStore((state) => state.divisions);

    // --- STATE MANAGEMENT ---
    const [activeTab, setActiveTab] = useState<'asset' | 'material'>('asset');
    const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
    const [expandedType, setExpandedType] = useState<number | null>(null);

    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<AssetCategory | null>(null);
    const [itemToDelete, setItemToDelete] = useState<{ type: 'category' | 'type' | 'model', data: any, assetCount: number } | null>(null);
    const [categorySearch, setCategorySearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [divisionFilter, setDivisionFilter] = useState<string>('all');
    const addNotification = useNotification();
    
    // Internal Modal States
    const [typeModalState, setTypeModalState] = useState<{ isOpen: boolean; category: AssetCategory | null; typeToEdit: AssetType | null }>({ isOpen: false, category: null, typeToEdit: null });
    const [modelModalState, setModelModalState] = useState<{ isOpen: boolean; category: AssetCategory | null; type: AssetType | null }>({ isOpen: false, category: null, type: null });

    // --- DERIVED STATE ---
    const isManager = ['Admin Logistik', 'Admin Purchase', 'Super Admin', 'Leader'].includes(currentUser.role);
    const divisionFilterOptions = useMemo(() => [
        { value: 'all', label: 'Semua Divisi' },
        ...divisions.map(d => ({ value: d.id.toString(), label: d.name }))
    ], [divisions]);

    const filteredCategories = useMemo(() => {
        let tempCategories = [...categories];

        // 1. Filter by search text
        if (categorySearch) {
            tempCategories = tempCategories.filter(c => 
                c.name.toLowerCase().includes(categorySearch.toLowerCase())
            );
        }

        // 2. Filter by division
        if (isManager) {
            // Manager can filter by a specific division's view
            if (divisionFilter !== 'all') {
                const selectedDivisionId = parseInt(divisionFilter, 10);
                tempCategories = tempCategories.filter(category => 
                    category.associatedDivisions.length === 0 || 
                    category.associatedDivisions.includes(selectedDivisionId)
                );
            }
        } else {
            // Staff only see their own division's categories + global ones
            if (currentUser.divisionId) {
                tempCategories = tempCategories.filter(category => 
                    category.associatedDivisions.length === 0 || 
                    category.associatedDivisions.includes(currentUser.divisionId!)
                );
            } else {
                // Staff with no division only see global categories
                tempCategories = tempCategories.filter(category => 
                    category.associatedDivisions.length === 0
                );
            }
        }

        return tempCategories;
    }, [categories, categorySearch, isManager, divisionFilter, currentUser.divisionId]);

    // --- EFFECTS ---
    useEffect(() => {
        // Auto-expand the first category if none is selected
        if (filteredCategories.length > 0 && expandedCategory === null) {
            setExpandedCategory(filteredCategories[0].id);
        } else if (filteredCategories.length > 0 && !filteredCategories.some(c => c.id === expandedCategory)) {
            // If the expanded category is filtered out, expand the new first one
            setExpandedCategory(filteredCategories[0].id);
        } else if (filteredCategories.length === 0) {
            setExpandedCategory(null);
        }
    }, [filteredCategories, expandedCategory]);
    
    // --- EVENT HANDLERS ---
    const handleCategoryClick = (categoryId: number) => {
        setExpandedCategory(prev => (prev === categoryId ? null : categoryId));
        setExpandedType(null); // Always collapse types when changing category
    };

    const handleTypeClick = (typeId: number) => {
        setExpandedType(prev => (prev === typeId ? null : typeId));
    };

    // --- CRUD OPERATIONS ---
    const handleOpenCategoryModal = (category: AssetCategory | null) => {
        setEditingCategory(category);
        setIsCategoryModalOpen(true);
    };
    
    const openTypeModal = (category: AssetCategory, typeToEdit: AssetType | null) => {
        setTypeModalState({ isOpen: true, category, typeToEdit });
    };
    
    const openModelModal = (category: AssetCategory, type: AssetType) => {
        setModelModalState({ isOpen: true, category, type });
    };

    const handleSaveCategory = async (formData: Omit<AssetCategory, 'id'|'types'>) => {
        setIsLoading(true);
        try {
            if (editingCategory) { // Update
                const updatedCategories = categories.map(cat => cat.id === editingCategory.id ? { ...cat, ...formData } : cat);
                await updateCategories(updatedCategories);
                addNotification(`Kategori "${formData.name}" diperbarui.`, 'success');
            } else { // Create
                const newCategory: AssetCategory = { ...formData, id: Date.now(), types: [] };
                const updatedCategories = [...categories, newCategory];
                await updateCategories(updatedCategories);
                setExpandedCategory(newCategory.id);
                addNotification(`Kategori "${formData.name}" ditambahkan.`, 'success');
            }
        } catch (error) {
            addNotification('Gagal menyimpan kategori.', 'error');
        } finally {
             setIsLoading(false);
            setIsCategoryModalOpen(false);
        }
    };

    const handleOpenDeleteModal = (type: 'category' | 'type' | 'model', data: any, parentCategory?: AssetCategory, parentType?: AssetType) => {
        let assetCount = 0;
        if (type === 'category') assetCount = assets.filter(a => a.category === data.name).length;
        if (type === 'type' && parentCategory) assetCount = assets.filter(a => a.category === parentCategory.name && a.type === data.name).length;
        if (type === 'model') assetCount = assets.filter(a => a.name === data.name && a.brand === data.brand).length;
        setItemToDelete({ type, data, assetCount });
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete || itemToDelete.assetCount > 0) return;
        const { type, data } = itemToDelete;
        const currentExpandedCategory = categories.find(c => c.id === expandedCategory);
        const currentExpandedType = currentExpandedCategory?.types.find(t => t.id === expandedType);

        let newCategories = [...categories];

        if (type === 'category') {
            newCategories = categories.filter(c => c.id !== data.id);
            if (expandedCategory === data.id) setExpandedCategory(categories[0]?.id || null);
        }
        if (type === 'type' && currentExpandedCategory) {
            newCategories = categories.map(c => c.id === currentExpandedCategory.id ? { ...c, types: c.types.filter(t => t.id !== data.id) } : c);
            if (expandedType === data.id) setExpandedType(null);
        }
        if (type === 'model' && currentExpandedCategory && currentExpandedType) {
            newCategories = categories.map(c => c.id === currentExpandedCategory.id ? { ...c, types: c.types.map(t => t.id === currentExpandedType.id ? { ...t, standardItems: (t.standardItems || []).filter(m => m.id !== data.id) } : t) } : c);
        }
        
        await updateCategories(newCategories);
        addNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} "${data.name}" berhasil dihapus.`, 'success');
        setItemToDelete(null);
    };

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                <h1 className="text-3xl font-bold text-tm-dark">Pusat Manajemen Kategori</h1>
                <div className="flex items-center gap-2">
                    <div className="relative flex-grow md:flex-grow-0 md:w-52">
                        <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input type="text" placeholder="Cari kategori..." value={categorySearch} onChange={e => setCategorySearch(e.target.value)} className="w-full h-10 py-2 pl-9 pr-4 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-tm-accent focus:border-tm-accent" />
                    </div>
                    {isManager && (
                        <div className="md:w-48">
                            <CustomSelect
                                options={divisionFilterOptions}
                                value={divisionFilter}
                                onChange={setDivisionFilter}
                            />
                        </div>
                    )}
                    <button onClick={() => handleOpenCategoryModal(null)} className="inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover">
                        <PlusIcon className="w-5 h-5" />
                        <span>Kategori Baru</span>
                    </button>
                </div>
            </div>

            <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('asset')}
                        className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                            activeTab === 'asset'
                                ? 'border-tm-primary text-tm-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <BsTools className={`mr-2 h-5 w-5 ${activeTab === 'asset' ? 'text-tm-primary' : 'text-gray-400 group-hover:text-gray-500'}`} />
                        Device & Tools (Individual)
                    </button>
                    <button
                        onClick={() => setActiveTab('material')}
                        className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                            activeTab === 'material'
                                ? 'border-orange-500 text-orange-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <BsLightningFill className={`mr-2 h-5 w-5 ${activeTab === 'material' ? 'text-orange-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                        Material (Massal)
                    </button>
                </nav>
            </div>
            
            <div className="flex-1 min-h-0 -mx-2 overflow-y-auto custom-scrollbar px-2 space-y-3">
                {filteredCategories.length > 0 ? (
                    filteredCategories.map(cat => {
                        // Filter types based on active tab
                        const displayTypes = cat.types.filter(t => (t.classification || 'asset') === activeTab);
                        
                        // Show category if it has matching types OR if it's completely empty (so we can add new types to it)
                        const showCategory = displayTypes.length > 0 || cat.types.length === 0;

                        if (!showCategory) return null;

                        const isExpanded = expandedCategory === cat.id;
                        const assetCount = assets.filter(a => a.category === cat.name).length;
                        
                        return (
                            <div key={cat.id} className="bg-white rounded-xl border border-gray-200/80 shadow-sm transition-all duration-300">
                                <div onClick={() => handleCategoryClick(cat.id)} className="flex items-center p-4 cursor-pointer group">
                                    <div className="flex-1">
                                        <p className="font-bold text-lg text-gray-800 group-hover:text-tm-primary">{cat.name}</p>
                                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                            <span><strong className="text-gray-700">{displayTypes.length}</strong> Tipe</span>
                                            <span><strong className="text-gray-700">{assetCount}</strong> Item Total</span>
                                            {cat.isCustomerInstallable && <Tooltip text="Dapat dipasang ke pelanggan"><CustomerIcon className="w-4 h-4 text-sky-600" /></Tooltip>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={(e) => { e.stopPropagation(); handleOpenCategoryModal(cat); }} className="p-2 text-gray-500 rounded-full hover:bg-yellow-100 hover:text-yellow-600"><PencilIcon className="w-4 h-4"/></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleOpenDeleteModal('category', cat); }} className="p-2 text-gray-500 rounded-full hover:bg-red-100 hover:text-red-600"><TrashIcon className="w-4 h-4"/></button>
                                        <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                    </div>
                                </div>
                                
                                <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[2000px]' : 'max-h-0'}`}>
                                    <div className="pt-2 pb-4 px-4 space-y-2 border-t border-gray-200">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{activeTab === 'asset' ? 'Tipe Aset (Fixed Asset)' : 'Tipe Material (Consumables)'}</h4>
                                            <button onClick={(e) => { e.stopPropagation(); openTypeModal(cat, null); }} className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-tm-accent rounded-md shadow-sm hover:bg-tm-primary"><PlusIcon className="w-4 h-4" /><span>Tipe Baru</span></button>
                                        </div>
                                        
                                        {displayTypes.length > 0 ? (
                                            displayTypes.map(type => {
                                                const isTypeExpanded = expandedType === type.id;
                                                const isMaterial = type.classification === 'material';

                                                return (
                                                    <div key={type.id} className="bg-gray-50/70 rounded-lg border border-gray-200/80">
                                                        <div onClick={() => handleTypeClick(type.id)} className="flex items-center p-3 cursor-pointer group">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-semibold text-gray-800">{type.name}</p>
                                                                    {isMaterial ? (
                                                                        <span className="px-1.5 py-0.5 text-[10px] font-bold text-orange-700 bg-orange-100 rounded border border-orange-200 uppercase tracking-wide">Material</span>
                                                                    ) : (
                                                                        <span className="px-1.5 py-0.5 text-[10px] font-bold text-blue-700 bg-blue-100 rounded border border-blue-200 uppercase tracking-wide">Aset</span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-gray-500 mt-0.5">
                                                                    {type.standardItems?.length || 0} Model &bull; {assets.filter(a => a.category === cat.name && a.type === type.name).length} Unit &bull; 
                                                                    <span className="font-medium ml-1">
                                                                        {type.trackingMethod === 'bulk' ? `Bulk (${type.unitOfMeasure})` : 'Individual'}
                                                                    </span>
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <button onClick={(e) => { e.stopPropagation(); openTypeModal(cat, type); }} className="p-2 text-gray-500 rounded-full hover:bg-yellow-100 hover:text-yellow-600 text-xs"><PencilIcon className="w-4 h-4"/></button>
                                                                <button onClick={(e) => { e.stopPropagation(); handleOpenDeleteModal('type', type, cat); }} className="p-2 text-gray-500 rounded-full hover:bg-red-100 hover:text-red-600 text-xs"><TrashIcon className="w-4 h-4"/></button>
                                                                <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isTypeExpanded ? 'rotate-180' : ''}`} />
                                                            </div>
                                                        </div>
                                                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isTypeExpanded ? 'max-h-[1000px]' : 'max-h-0'}`}>
                                                            <div className="pt-2 pb-3 px-3 border-t">
                                                                <div className="flex justify-between items-center mb-2 px-2">
                                                                    <h5 className="text-xs font-semibold text-gray-500">MODEL STANDAR ({type.standardItems?.length || 0})</h5>
                                                                    <button onClick={(e) => { e.stopPropagation(); openModelModal(cat, type); }} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-white bg-tm-accent/80 rounded hover:bg-tm-accent"><PlusIcon className="w-3 h-3"/><span>Model</span></button>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    {(type.standardItems || []).map(model => (
                                                                        <div key={model.id} className="flex items-center justify-between p-2 rounded-md hover:bg-white/80">
                                                                            <div>
                                                                                <p className="text-sm font-medium text-gray-800">{model.name}</p>
                                                                                <p className="text-xs text-gray-500">{model.brand}</p>
                                                                            </div>
                                                                            <button onClick={(e) => { e.stopPropagation(); handleOpenDeleteModal('model', model, cat, type); }} className="p-1 text-gray-400 rounded-full hover:bg-red-100 hover:text-red-600"><TrashIcon className="w-3.5 h-3.5"/></button>
                                                                        </div>
                                                                    ))}
                                                                    {(type.standardItems || []).length === 0 && (
                                                                        <p className="text-center text-xs text-gray-400 py-2 italic">Belum ada model.</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        ) : (
                                            <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
                                                <p className="text-sm text-gray-500">Belum ada tipe {activeTab === 'asset' ? 'aset' : 'material'} di kategori ini.</p>
                                                <button onClick={(e) => { e.stopPropagation(); openTypeModal(cat, null); }} className="mt-2 text-xs font-semibold text-tm-primary hover:underline">
                                                    + Tambah Tipe Baru
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500 bg-white border-2 border-dashed rounded-xl">
                        <InboxIcon className="w-16 h-16 text-gray-300" />
                        <p className="mt-4 text-lg font-semibold">Tidak Ada Kategori</p>
                        <p className="mt-1 text-sm">Mulai dengan membuat kategori aset pertama Anda atau ubah filter Anda.</p>
                        <button onClick={() => handleOpenCategoryModal(null)} className="inline-flex items-center justify-center gap-2 mt-4 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover">
                           <PlusIcon className="w-5 h-5" /> Buat Kategori Baru
                        </button>
                    </div>
                )}
            </div>

            {isCategoryModalOpen && (
                <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title={editingCategory ? "Edit Kategori" : "Tambah Kategori Baru"} hideDefaultCloseButton disableContentPadding>
                    <CategoryFormModal category={editingCategory} divisions={divisions} onSave={handleSaveCategory} onClose={() => setIsCategoryModalOpen(false)} isLoading={isLoading} />
                </Modal>
            )}
            
            {typeModalState.isOpen && typeModalState.category && (
                <TypeManagementModal 
                    isOpen={typeModalState.isOpen}
                    onClose={() => setTypeModalState({ ...typeModalState, isOpen: false })}
                    parentCategory={typeModalState.category}
                    typeToEdit={typeModalState.typeToEdit}
                    defaultClassification={activeTab} // <-- Ensuring the active tab is passed as default context
                />
            )}
            
            {modelModalState.isOpen && modelModalState.category && modelModalState.type && (
                <ModelManagementModal 
                    isOpen={modelModalState.isOpen}
                    onClose={() => setModelModalState({ ...modelModalState, isOpen: false })}
                    parentInfo={{ category: modelModalState.category, type: modelModalState.type }}
                />
            )}

            {itemToDelete && (
                <Modal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} title={itemToDelete.assetCount > 0 ? "Tidak Dapat Menghapus" : "Konfirmasi Hapus"} size="md" hideDefaultCloseButton>
                    <div className="text-center">
                        <div className={`flex items-center justify-center w-12 h-12 mx-auto rounded-full ${itemToDelete.assetCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}><ExclamationTriangleIcon className="w-8 h-8" /></div>
                        <h3 className="mt-4 text-lg font-semibold text-gray-800">{itemToDelete.assetCount > 0 ? 'Item Sedang Digunakan' : `Hapus ${itemToDelete.type}?`}</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            {itemToDelete.assetCount > 0
                                ? `Anda tidak dapat menghapus "${itemToDelete.data.name}" karena masih ada ${itemToDelete.assetCount} aset yang terhubung.`
                                : `Anda yakin ingin menghapus "${itemToDelete.data.name}"? Aksi ini tidak dapat diurungkan.`}
                        </p>
                    </div>
                    <div className="flex items-center justify-end pt-5 mt-5 space-x-3 border-t">
                        <button onClick={() => setItemToDelete(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">{itemToDelete.assetCount > 0 ? 'Mengerti' : 'Batal'}</button>
                        {itemToDelete.assetCount === 0 && (<button onClick={handleConfirmDelete} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-danger rounded-lg shadow-sm hover:bg-red-700">Ya, Hapus</button>)}
                    </div>
                </Modal>
            )}
        </div>
    );
};

export const CategoryFormModal: React.FC<{
    category: AssetCategory | null;
    divisions: Division[];
    onSave: (formData: Omit<AssetCategory, 'id'|'types'>) => void;
    onClose: () => void;
    isLoading: boolean;
}> = ({ category, divisions, onSave, onClose, isLoading }) => {
    // ... same as before
    const [name, setName] = useState('');
    const [associatedDivisions, setAssociatedDivisions] = useState<number[]>([]);
    const [isCustomerInstallable, setIsCustomerInstallable] = useState(false);
    const [divisionSearch, setDivisionSearch] = useState('');
    const [accessMode, setAccessMode] = useState<'global' | 'specific'>('global');

    useEffect(() => {
        if (category) {
            setName(category.name);
            setAssociatedDivisions(category.associatedDivisions || []);
            setIsCustomerInstallable(category.isCustomerInstallable || false);
            setAccessMode(category.associatedDivisions && category.associatedDivisions.length > 0 ? 'specific' : 'global');
        } else {
            setName('');
            setAssociatedDivisions([]);
            setIsCustomerInstallable(false);
            setAccessMode('global');
        }
    }, [category]);


    const filteredDivisions = useMemo(() => {
        return divisions.filter(d => d.name.toLowerCase().includes(divisionSearch.toLowerCase()));
    }, [divisions, divisionSearch]);

    const handleDivisionToggle = (divisionId: number) => {
        setAssociatedDivisions(prev => prev.includes(divisionId) ? prev.filter(id => id !== divisionId) : [...prev, divisionId]);
    };

    const handleAccessModeChange = (mode: 'global' | 'specific') => {
        setAccessMode(mode);
        if (mode === 'global') {
            setAssociatedDivisions([]);
        }
    };

    const handleSelectAllDivisions = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setAssociatedDivisions(filteredDivisions.map(d => d.id));
        } else {
            setAssociatedDivisions([]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, associatedDivisions, isCustomerInstallable });
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="p-6">
                <p className="text-sm text-gray-600 mb-6 -mt-2">
                    {category ? `Perbarui detail untuk kategori aset "${category.name}".` : 'Isi detail untuk kategori aset baru.'}
                </p>
                <div className="space-y-6">
                    <div>
                        <h3 className="text-base font-semibold text-gray-800 mb-3 border-b pb-2">Detail Kategori</h3>
                        <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700">Nama Kategori</label>
                        <div className="relative mt-1">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><CategoryIcon className="w-5 h-5 text-gray-400" /></div>
                            <input type="text" id="categoryName" value={name} onChange={e => setName(e.target.value)} required className="block w-full py-2.5 pl-10 pr-3 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-tm-accent sm:text-sm" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-gray-800 mb-3 border-b pb-2">Opsi Tambahan</h3>
                         <div className="flex items-start space-x-3 p-3 bg-blue-50/50 border border-blue-200/50 rounded-lg">
                            <Checkbox id="is-customer-installable" checked={isCustomerInstallable} onChange={e => setIsCustomerInstallable(e.target.checked)} className="mt-1" />
                            <label htmlFor="is-customer-installable" className="cursor-pointer">
                                <span className="text-sm font-semibold text-gray-800">Dapat dipasang ke pelanggan</span>
                                <p className="text-xs text-gray-500">Aktifkan jika aset kategori ini boleh diinstal di lokasi pelanggan (CPE, Kabel).</p>
                            </label>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-gray-800 mb-2 border-b pb-2">Hak Akses Divisi</h3>
                        <p className="text-xs text-gray-500 mb-3">Atur divisi mana yang dapat melihat dan membuat permintaan untuk kategori aset ini.</p>
                        
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <button
                                type="button"
                                onClick={() => handleAccessModeChange('global')}
                                className={`p-4 border-2 rounded-lg text-left transition-all duration-200 ${accessMode === 'global' ? 'bg-blue-50 border-tm-primary ring-2 ring-tm-primary/50' : 'bg-white border-gray-300 hover:border-tm-accent'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-tm-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2H15a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.704 4.122A10.005 10.005 0 0112 3c4.228 0 7.913 2.513 9.423 6.015M16.296 19.878A10.005 10.005 0 0112 21c-4.228 0-7.913-2.513-9.423-6.015M12 11a1 1 0 110-2 1 1 0 010 2z" />
                                    </svg>
                                    <span className="font-semibold text-gray-800">Semua Divisi (Global)</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-2 pl-1">Kategori dapat diakses oleh semua divisi tanpa batasan.</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleAccessModeChange('specific')}
                                className={`p-4 border-2 rounded-lg text-left transition-all duration-200 ${accessMode === 'specific' ? 'bg-blue-50 border-tm-primary ring-2 ring-tm-primary/50' : 'bg-white border-gray-300 hover:border-tm-accent'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-tm-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="font-semibold text-gray-800">Hanya Divisi Tertentu</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-2 pl-1">Batasi akses kategori hanya untuk divisi yang dipilih.</p>
                            </button>
                        </div>

                        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${accessMode === 'specific' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="p-4 border rounded-lg bg-gray-50/50 mt-2 space-y-3">
                                <div className="relative">
                                    <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input type="text" placeholder="Cari divisi..." value={divisionSearch} onChange={e => setDivisionSearch(e.target.value)} className="w-full h-9 py-2 pl-9 pr-4 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-tm-accent focus:border-tm-accent" />
                                </div>

                                <div className="flex items-center justify-between px-2 py-1 border-b">
                                    <label htmlFor="select-all-divisions" className="flex items-center space-x-2 cursor-pointer">
                                        <Checkbox id="select-all-divisions" checked={filteredDivisions.length > 0 && associatedDivisions.length === filteredDivisions.length} onChange={handleSelectAllDivisions} />
                                        <span className="text-sm font-medium text-gray-600">Pilih Semua</span>
                                    </label>
                                    <span className="text-xs text-gray-500">{associatedDivisions.length} / {divisions.length} dipilih</span>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-2 -mr-2">
                                    {filteredDivisions.map(division => (
                                        <div key={division.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100">
                                            <Checkbox id={`division-toggle-${division.id}`} checked={associatedDivisions.includes(division.id)} onChange={() => handleDivisionToggle(division.id)} />
                                            <label htmlFor={`division-toggle-${division.id}`} className="text-sm text-gray-800 cursor-pointer flex-1">{division.name}</label>
                                        </div>
                                    ))}
                                    {filteredDivisions.length === 0 && <p className="text-sm text-gray-400 sm:col-span-2 text-center py-2">Tidak ada divisi yang cocok.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-end px-6 py-4 space-x-3 bg-gray-50 border-t">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
                <button type="submit" disabled={isLoading} className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover disabled:bg-tm-primary/70">
                    {isLoading && <SpinnerIcon className="w-5 h-5 mr-2" />} Simpan
                </button>
            </div>
        </form>
    );
};

export default CategoryManagementPage;

