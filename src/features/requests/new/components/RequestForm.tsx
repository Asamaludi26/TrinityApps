
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  User, 
  Asset, 
  AssetCategory, 
  Division, 
  RequestItem, 
  OrderDetails, 
  OrderType, 
  AssetStatus,
  AssetType,
  StandardItem,
  ItemClassification
} from '../../../../types';
import { CreatableSelect } from '../../../../components/ui/CreatableSelect';
import { useNotification } from '../../../../providers/NotificationProvider';
import { SpinnerIcon } from '../../../../components/icons/SpinnerIcon';
import { Letterhead } from '../../../../components/ui/Letterhead';
import { SignatureStamp } from '../../../../components/ui/SignatureStamp';
import { DownloadIcon } from '../../../../components/icons/DownloadIcon';
import { 
  BsBoxSeam, 
  BsFileEarmarkPdf, 
  BsPlusLg,
  BsJournalBookmark,
  BsTrash3,
  BsExclamationCircle,
  BsLightningChargeFill,
  BsCheckCircleFill,
  BsCart,
  BsPerson,
  BsBuilding
} from 'react-icons/bs';
import DatePicker from '../../../../components/ui/DatePicker';
import { useAssetStore } from '../../../../stores/useAssetStore';

// Versioning & Constraints
const DRAFT_VERSION = "1.0.4"; 
const MAX_ITEMS = 15; // Increased slightly as layout is more compact

interface RequestFormProps {
  currentUser: User;
  assets: Asset[];
  assetCategories: AssetCategory[];
  divisions: Division[];
  onCreateRequest: (data: { items: RequestItem[]; order: OrderDetails }) => void;
  prefillItem?: { name: string; brand: string } | null;
  onCancel: () => void;
}

type RequestItemFormState = RequestItem & {
  tempCategoryId: string;
  tempTypeId: string;
  availableStock: number;
  unit: string;
};

const UNIT_OPTIONS = ['Unit', 'Pcs', 'Set', 'Pack', 'Box', 'Meter', 'Roll', 'Batang', 'Lembar', 'Pasang', 'Lot'];

export const RequestForm: React.FC<RequestFormProps> = ({ 
  currentUser, 
  assets,
  assetCategories, 
  divisions,
  onCreateRequest, 
  prefillItem, 
  onCancel 
}) => {
  const [items, setItems] = useState<RequestItemFormState[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('Regular Stock');
  const [justification, setJustification] = useState('');
  const [project, setProject] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [requestDate, setRequestDate] = useState<Date | null>(new Date());
  
  // Access store actions for Auto-Sync
  const updateCategories = useAssetStore((state) => state.updateCategories);
  
  const formRef = useRef<HTMLDivElement>(null);
  const addNotification = useNotification();
  const userDraftKey = useMemo(() => `triniti_draft_user_${currentUser.id}`, [currentUser.id]);

  const userDivision = useMemo(() => 
    divisions.find(d => d.id === currentUser.divisionId)?.name || 'N/A'
  , [divisions, currentUser]);

  const categoryNames = useMemo(() => assetCategories.map(c => c.name), [assetCategories]);

  // Logic: Load Draft
  useEffect(() => {
    const savedDraft = localStorage.getItem(userDraftKey);
    
    if (savedDraft && !prefillItem) {
      try {
        const parsed = JSON.parse(savedDraft);
        // Simple version check logic
        if (parsed.version !== DRAFT_VERSION) {
            handleAddItem(); 
            return;
        }
        setItems(parsed.items);
        setOrderType(parsed.orderType);
        setJustification(parsed.justification);
        setProject(parsed.project);
        setLastSaved(parsed.lastSaved);
        addNotification("Draf permintaan telah dimuat.", "info");
      } catch (e) {
        handleAddItem();
      }
    } else if (prefillItem) {
      const cat = assetCategories.find(c => c.types.some(t => t.standardItems?.some(si => si.name === prefillItem.name)));
      const type = cat?.types.find(t => t.standardItems?.some(si => si.name === prefillItem.name));
      const stock = assets.filter(a => a.name === prefillItem.name && a.status === AssetStatus.IN_STORAGE).length;
      
      setItems([{ 
        id: Date.now(), itemName: prefillItem.name, itemTypeBrand: prefillItem.brand, quantity: 1, keterangan: 'Restock kebutuhan operasional.', 
        tempCategoryId: cat?.id.toString() || '', tempTypeId: type?.id.toString() || '', availableStock: stock, unit: type?.unitOfMeasure || 'Unit' 
      }]);
    } else if (items.length === 0) {
      handleAddItem();
    }
  }, [userDraftKey]); 

  const handleAddItem = () => {
    if (items.length >= MAX_ITEMS) {
        addNotification(`Batas maksimal ${MAX_ITEMS} item tercapai.`, "warning");
        return;
    }
    setItems(prev => [...prev, { 
      id: Date.now(), itemName: '', itemTypeBrand: '', quantity: 1, keterangan: '', 
      tempCategoryId: '', tempTypeId: '', availableStock: 0, unit: 'Unit' 
    }]);
  };

  const handleRemoveItem = (id: number) => {
    if (items.length > 1) setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateItemState = useCallback((id: number, updates: Partial<RequestItemFormState>) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newItem = { ...item, ...updates };
        
        // Reset children fields if parent changes
        if ('tempCategoryId' in updates && updates.tempCategoryId !== item.tempCategoryId) {
            newItem.tempTypeId = ''; newItem.itemName = ''; newItem.itemTypeBrand = ''; newItem.availableStock = 0;
        }
        
        if ('tempTypeId' in updates && updates.tempTypeId !== item.tempTypeId) {
            newItem.itemName = ''; newItem.itemTypeBrand = ''; newItem.availableStock = 0;
            const cat = assetCategories.find(c => c.id.toString() === newItem.tempCategoryId);
            const typeData = cat?.types.find(t => t.id.toString() === updates.tempTypeId);
            newItem.unit = typeData?.unitOfMeasure || 'Unit';
        }

        if ('itemName' in updates && updates.itemName) {
          const cat = assetCategories.find(c => c.id.toString() === newItem.tempCategoryId);
          const typeData = cat?.types.find(t => t.id.toString() === newItem.tempTypeId);
          const modelData = typeData?.standardItems?.find(m => m.name === updates.itemName);
          
          if (modelData) {
              newItem.itemTypeBrand = modelData.brand || '';
              newItem.availableStock = assets.filter(a => a.name === updates.itemName && a.brand === newItem.itemTypeBrand && a.status === AssetStatus.IN_STORAGE).length;
          } else {
              newItem.availableStock = 0;
          }
        }
        
        return newItem;
      }
      return item;
    }));
  }, [assetCategories, assets]);

  // --- LOGIC: FULFILLMENT CHECK ---
  const fulfillmentStatus = useMemo(() => {
      if (items.some(i => !i.itemName || i.quantity <= 0)) return 'invalid';
      const allInStock = items.every(item => {
          const actualStock = assets.filter(a => 
             a.name === item.itemName && 
             a.brand === item.itemTypeBrand && 
             a.status === AssetStatus.IN_STORAGE
          ).length;
          return actualStock >= item.quantity;
      });
      return allInStock ? 'stock' : 'procurement';
  }, [items, assets]);

  // --- ROBUST AUTO SYNC HANDLERS ---
  const handleCategorySelect = async (itemId: number, value: string) => {
    if (!value.trim()) return;
    const existingCat = assetCategories.find(c => c.name.toLowerCase() === value.trim().toLowerCase());
    
    if (existingCat) {
        updateItemState(itemId, { tempCategoryId: existingCat.id.toString() });
    } else {
        const newId = Date.now();
        const newCategory: AssetCategory = {
            id: newId,
            name: value.trim(),
            types: [],
            associatedDivisions: [],
            isCustomerInstallable: false
        };
        try {
            await updateCategories([...assetCategories, newCategory]);
            updateItemState(itemId, { tempCategoryId: newId.toString() });
            addNotification(`Kategori "${value}" ditambahkan.`, 'success');
        } catch (error) {
            addNotification("Gagal membuat kategori baru.", "error");
        }
    }
  };

  const handleTypeSelect = async (itemId: number, categoryId: string, value: string) => {
    if (!value.trim() || !categoryId) return;
    const category = assetCategories.find(c => c.id.toString() === categoryId);
    if (!category) return;

    const existingType = category.types.find(t => t.name.toLowerCase() === value.trim().toLowerCase());

    if (existingType) {
        updateItemState(itemId, { tempTypeId: existingType.id.toString(), unit: existingType.unitOfMeasure || 'Unit' });
    } else {
        const newTypeId = Date.now();
        const newType: AssetType = {
            id: newTypeId,
            name: value.trim(),
            standardItems: [],
            classification: 'asset',
            trackingMethod: 'individual',
            unitOfMeasure: 'Unit'
        };
        const updatedCategory = { ...category, types: [...category.types, newType] };
        const updatedCategories = assetCategories.map(c => c.id === category.id ? updatedCategory : c);
        
        try {
            await updateCategories(updatedCategories);
            updateItemState(itemId, { tempTypeId: newTypeId.toString(), unit: 'Unit' });
            addNotification(`Tipe "${value}" ditambahkan.`, 'success');
        } catch (error) {
            addNotification("Gagal membuat tipe baru.", "error");
        }
    }
  };

  const handleUpdateTypeConfig = async (itemId: number, categoryId: string, typeId: string, config: { classification: ItemClassification, unit: string }) => {
    const category = assetCategories.find(c => c.id.toString() === categoryId);
    if (!category) return;
    const typeIndex = category.types.findIndex(t => t.id.toString() === typeId);
    if (typeIndex === -1) return;
    const currentType = category.types[typeIndex];
    if (currentType.classification === config.classification && currentType.unitOfMeasure === config.unit) return;

    const updatedType: AssetType = {
        ...currentType,
        classification: config.classification,
        trackingMethod: config.classification === 'material' ? 'bulk' : 'individual',
        unitOfMeasure: config.unit
    };
    const updatedTypes = [...category.types];
    updatedTypes[typeIndex] = updatedType;
    const updatedCategory = { ...category, types: updatedTypes };
    const updatedCategories = assetCategories.map(c => c.id === category.id ? updatedCategory : c);

    try {
        await updateCategories(updatedCategories);
        updateItemState(itemId, { unit: config.unit });
        addNotification(`Konfigurasi tipe diperbarui.`, 'success');
    } catch (e) {
        addNotification("Gagal menyimpan konfigurasi tipe.", "error");
    }
  };

  const handleModelSelect = async (itemId: number, categoryId: string, typeId: string, value: string) => {
    updateItemState(itemId, { itemName: value });
    if (!value.trim()) return;
    const category = assetCategories.find(c => c.id.toString() === categoryId);
    const type = category?.types.find(t => t.id.toString() === typeId);
    
    if (category && type) {
        const existingModel = type.standardItems?.find(m => m.name.toLowerCase() === value.trim().toLowerCase());
        if (!existingModel) {
            const newModel: StandardItem = { 
                id: Date.now(), 
                name: value.trim(), 
                brand: 'Generic' 
            };
            const updatedType = { ...type, standardItems: [...(type.standardItems || []), newModel] };
            const updatedCategory = { ...category, types: category.types.map(t => t.id === type.id ? updatedType : t) };
            const updatedCategories = assetCategories.map(c => c.id === category.id ? updatedCategory : c);
            
            try {
                await updateCategories(updatedCategories);
                updateItemState(itemId, { itemTypeBrand: 'Generic' });
            } catch (e) {
                console.error("Failed to sync new model");
            }
        } else {
            updateItemState(itemId, { itemTypeBrand: existingModel.brand });
        }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some(i => !i.itemName || i.quantity <= 0)) {
      addNotification("Mohon lengkapi nama item dan kuantitas (minimal 1).", "error");
      return;
    }
    setIsLoading(true);
    localStorage.removeItem(userDraftKey);
    window.dispatchEvent(new Event('storage'));
    
    // FIX: Map temporary IDs to actual properties expected by backend DTO
    const cleanItems: RequestItem[] = items.map(({ tempCategoryId, tempTypeId, availableStock, unit, ...rest }) => ({
        ...rest,
        categoryId: tempCategoryId,
        typeId: tempTypeId
    }));

    onCreateRequest({
      items: cleanItems,
      order: { type: orderType, justification, project }
    });
  };

  const handleSaveDraft = () => {
    setIsSavingDraft(true);
    const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const draftData = { version: DRAFT_VERSION, items, orderType, justification, project, lastSaved: now, updatedAt: new Date().toISOString() };
    
    setTimeout(() => {
      try {
        localStorage.setItem(userDraftKey, JSON.stringify(draftData));
        setLastSaved(now);
        window.dispatchEvent(new Event('storage'));
        addNotification(`Draf disimpan pada ${now}`, "success");
      } catch (e) {
        addNotification("Gagal menyimpan draf.", "error");
      } finally {
        setIsSavingDraft(false);
      }
    }, 500);
  };

  const handleClearDraft = () => {
    if (window.confirm("Hapus draf ini? Data yang belum disimpan akan hilang.")) {
      localStorage.removeItem(userDraftKey);
      window.dispatchEvent(new Event('storage'));
      setItems([]);
      setOrderType('Regular Stock');
      setJustification('');
      setProject('');
      setLastSaved(null);
      handleAddItem();
      addNotification("Draf dihapus.", "info");
    }
  };

  const isAtLimit = items.length >= MAX_ITEMS;

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">
      {/* COMPACT TOOLBAR */}
      <div className="flex flex-wrap justify-between items-center bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm gap-4 no-print sticky top-2 z-10">
        <div className="flex items-center gap-3">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <BsFileEarmarkPdf className="text-tm-primary w-4 h-4" />
                Permintaan Barang
            </h4>
            {lastSaved && (
                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 font-medium">
                    Draft: {lastSaved}
                </span>
            )}
        </div>
        <div className="flex items-center gap-2">
            <button type="button" onClick={handleSaveDraft} disabled={isSavingDraft} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-100 hover:text-tm-primary transition-all disabled:opacity-50">
                {isSavingDraft ? <SpinnerIcon className="w-3 h-3" /> : <BsJournalBookmark className="w-3 h-3" />} Simpan
            </button>
            {lastSaved && (<button type="button" onClick={handleClearDraft} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="Hapus Draft"><BsTrash3 className="w-4 h-4" /></button>)}
            <div className="h-4 w-px bg-slate-300 mx-1"></div>
            <button type="button" disabled className="p-1.5 text-slate-400 hover:text-slate-600 transition-all"><DownloadIcon className="w-4 h-4" /></button>
        </div>
      </div>

      {/* FORM PAPER */}
      <div ref={formRef} className="bg-white border border-slate-200 rounded-xl shadow-lg relative overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-tm-primary to-tm-accent"></div>
        <div className="p-6 sm:p-10">
          <Letterhead />
          
          <div className="text-center my-6">
              <h2 className="text-xl font-bold text-slate-800 uppercase tracking-wide">Surat Permintaan Barang</h2>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-8">
              
              {/* ADMIN INFO - 3x2 GRID LAYOUT */}
              <div className="bg-slate-50/80 p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* ROW 1, COL 1: No Request */}
                      <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">No. Request</label>
                          <div className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-400 text-sm italic shadow-sm">
                              [Otomatis]
                          </div>
                      </div>

                      {/* ROW 1, COL 2: No Dokumen */}
                      <div>
                           <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">No. Dokumen</label>
                           <div className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-400 text-sm italic shadow-sm">
                              [Otomatis]
                           </div>
                      </div>

                      {/* ROW 1, COL 3: Tanggal */}
                      <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Tanggal</label>
                          <DatePicker id="req-date" selectedDate={requestDate} onDateChange={setRequestDate} />
                      </div>

                      {/* ROW 2, COL 1: Pemohon */}
                      <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Pemohon</label>
                          <div className="flex items-center gap-2 w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-sm font-medium">
                              <BsPerson className="w-4 h-4 text-slate-400"/> {currentUser.name}
                          </div>
                      </div>

                       {/* ROW 2, COL 2: Divisi */}
                       <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Divisi</label>
                          <div className="flex items-center gap-2 w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-sm font-medium">
                              <BsBuilding className="w-4 h-4 text-slate-400"/> {userDivision}
                          </div>
                      </div>

                       {/* ROW 2, COL 3: Tipe Order & Justification */}
                       <div className="relative">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                              {orderType === 'Regular Stock' ? 'Tipe Order' : (
                                  <span className="flex justify-between items-center">
                                      Tipe Order
                                      <span className="text-tm-primary text-[9px] normal-case bg-blue-50 px-1.5 py-0.5 rounded">Wajib Isi Info</span>
                                  </span>
                              )}
                          </label>
                          <div className="space-y-2">
                              <select 
                                  value={orderType} 
                                  onChange={e => setOrderType(e.target.value as OrderType)} 
                                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-tm-primary/20 focus:border-tm-primary outline-none transition-all shadow-sm"
                              >
                                  <option value="Regular Stock">Regular Stock</option>
                                  <option value="Urgent">Urgent Request</option>
                                  <option value="Project Based">Project Based</option>
                              </select>

                              {/* Conditional Input nested here to keep the grid flow clean */}
                              {orderType !== 'Regular Stock' && (
                                  <div className="animate-fade-in-down">
                                      <input 
                                          type="text" 
                                          value={orderType === 'Project Based' ? project : justification} 
                                          onChange={e => orderType === 'Project Based' ? setProject(e.target.value) : setJustification(e.target.value)} 
                                          placeholder={orderType === 'Project Based' ? "Nama Proyek / Site..." : "Alasan kebutuhan mendesak..."} 
                                          className="w-full px-3 py-2 bg-white border-2 border-yellow-100 focus:border-tm-primary/50 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:ring-0 outline-none transition-all" 
                                      />
                                  </div>
                              )}
                          </div>
                      </div>

                  </div>
              </div>

              {/* ITEMS SECTION - DENSE LAYOUT */}
              <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                          <BsBoxSeam className="text-tm-primary w-4 h-4" /> Daftar Barang
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isAtLimit ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {items.length} / {MAX_ITEMS}
                      </span>
                  </div>

                  <div className="space-y-3">
                      {items.map((item, idx) => {
                          const currentCat = assetCategories.find(c => c.id.toString() === item.tempCategoryId);
                          const availableTypes = currentCat?.types || [];
                          const currentType = availableTypes.find(t => t.id.toString() === item.tempTypeId);
                          const availableModels = currentType?.standardItems || [];
                          const isNewType = currentType && Date.now() - currentType.id < 60000;

                          return (
                              <div key={item.id} className="group relative bg-white border border-slate-200 rounded-lg shadow-sm hover:border-tm-primary/40 hover:shadow-md transition-all p-4">
                                  {/* DELETE BUTTON - Absolute Top Right */}
                                  {items.length > 1 && (
                                      <button type="button" onClick={() => handleRemoveItem(item.id)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 transition-colors p-1" title="Hapus Item">
                                          <BsTrash3 className="w-3.5 h-3.5" />
                                      </button>
                                  )}

                                  <div className="flex gap-4">
                                      {/* Number */}
                                      <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-slate-100 text-slate-500 text-xs font-bold rounded mt-1 group-hover:bg-tm-primary group-hover:text-white transition-colors">
                                          {idx + 1}
                                      </div>

                                      <div className="flex-1 space-y-3">
                                          {/* ROW 1: CLASSIFICATION */}
                                          <div className="grid grid-cols-12 gap-3">
                                              <div className="col-span-12 sm:col-span-4">
                                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Kategori</label>
                                                  <CreatableSelect options={categoryNames} value={currentCat?.name || ''} onChange={(val) => handleCategorySelect(item.id, val)} placeholder="Pilih Kategori" />
                                              </div>
                                              <div className="col-span-12 sm:col-span-4">
                                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Tipe</label>
                                                  <CreatableSelect options={availableTypes.map(t => t.name)} value={currentType?.name || ''} onChange={(val) => handleTypeSelect(item.id, item.tempCategoryId, val)} placeholder="Pilih Tipe" disabled={!item.tempCategoryId} />
                                              </div>
                                              <div className="col-span-12 sm:col-span-4">
                                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Model</label>
                                                  <CreatableSelect options={availableModels.map(m => m.name)} value={item.itemName} onChange={(val) => handleModelSelect(item.id, item.tempCategoryId, item.tempTypeId, val)} placeholder="Pilih Model" disabled={!item.tempTypeId} />
                                              </div>
                                          </div>

                                          {/* ROW 2: DETAILS */}
                                          <div className="grid grid-cols-12 gap-3 items-start">
                                              <div className="col-span-12 sm:col-span-4">
                                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Brand</label>
                                                  <input type="text" value={item.itemTypeBrand} onChange={e => updateItemState(item.id, { itemTypeBrand: e.target.value })} placeholder="Cth: Mikrotik" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-700 focus:bg-white focus:border-tm-primary outline-none transition-colors" />
                                              </div>
                                              <div className="col-span-8 sm:col-span-6">
                                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Keterangan</label>
                                                  <input type="text" value={item.keterangan} onChange={e => updateItemState(item.id, { keterangan: e.target.value })} placeholder="Spesifikasi / Keperluan..." className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-700 focus:bg-white focus:border-tm-primary outline-none transition-colors placeholder:text-slate-400" />
                                              </div>
                                              <div className="col-span-4 sm:col-span-2 relative group/qty">
                                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5 text-center">Jumlah</label>
                                                  <div className="relative">
                                                    <input type="number" value={item.quantity} onChange={e => updateItemState(item.id, { quantity: parseInt(e.target.value) || 0 })} min="1" className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-md text-sm font-bold text-center text-slate-800 focus:ring-1 focus:ring-tm-primary focus:border-tm-primary outline-none" />
                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase group-hover/qty:text-tm-primary">{item.unit}</span>
                                                  </div>
                                              </div>
                                          </div>
                                          
                                          {/* CONFIG PANEL (Only for new types) */}
                                          {(isNewType || (currentType && !currentType.classification)) && currentCat && currentType && (
                                                <div className="mt-2 p-2 bg-blue-50/50 border border-blue-100 rounded-md flex flex-wrap items-center gap-2 text-xs">
                                                    <span className="font-bold text-blue-700 flex items-center gap-1"><BsLightningChargeFill /> Konfigurasi:</span>
                                                    <button type="button" onClick={() => handleUpdateTypeConfig(item.id, item.tempCategoryId, item.tempTypeId, { classification: 'asset', unit: 'Unit' })} className={`px-2 py-0.5 rounded border ${currentType.classification === 'asset' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-slate-200 text-slate-500'}`}>Device</button>
                                                    <button type="button" onClick={() => handleUpdateTypeConfig(item.id, item.tempCategoryId, item.tempTypeId, { classification: 'material', unit: 'Pcs' })} className={`px-2 py-0.5 rounded border ${currentType.classification === 'material' ? 'bg-orange-100 border-orange-300 text-orange-800' : 'bg-white border-slate-200 text-slate-500'}`}>Material</button>
                                                    <select value={item.unit} onChange={(e) => handleUpdateTypeConfig(item.id, item.tempCategoryId, item.tempTypeId, { classification: currentType.classification || 'asset', unit: e.target.value })} className="px-1 py-0.5 border border-slate-200 rounded text-slate-700 bg-white outline-none">
                                                        {UNIT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                    </select>
                                                </div>
                                          )}
                                          
                                          {/* Stock Hint */}
                                          {item.availableStock > 0 && (
                                              <div className="absolute top-2 right-10 text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                                                  <BsCheckCircleFill /> Stok: {item.availableStock}
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          );
                      })}
                  </div>

                  <button 
                    type="button" 
                    onClick={handleAddItem} 
                    disabled={isAtLimit}
                    className={`w-full py-3 border-2 border-dashed rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all
                        ${isAtLimit ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-slate-300 text-slate-500 hover:border-tm-primary hover:text-tm-primary hover:bg-tm-primary/5'}`}
                  >
                    {isAtLimit ? <BsExclamationCircle /> : <BsPlusLg />}
                    {isAtLimit ? 'BATAS ITEM TERCAPAI' : 'TAMBAH BARIS'}
                  </button>
              </div>

              {/* FULFILLMENT BANNER */}
              {fulfillmentStatus !== 'invalid' && (
                  <div className={`p-3 rounded-lg border flex items-start gap-3 text-xs ${fulfillmentStatus === 'stock' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                      <div className={`p-1.5 rounded-full ${fulfillmentStatus === 'stock' ? 'bg-emerald-100' : 'bg-blue-100'}`}>
                          {fulfillmentStatus === 'stock' ? <BsCheckCircleFill className="w-3.5 h-3.5"/> : <BsCart className="w-3.5 h-3.5"/>}
                      </div>
                      <div>
                          <p className="font-bold">{fulfillmentStatus === 'stock' ? 'Stok Tersedia' : 'Perlu Pengadaan'}</p>
                          <p className="opacity-90 mt-0.5">{fulfillmentStatus === 'stock' ? 'Semua item tersedia. Langsung ke tahap Serah Terima.' : 'Sebagian item tidak tersedia. Masuk alur persetujuan pengadaan.'}</p>
                      </div>
                  </div>
              )}

              {/* SIGNATURES - COMPACT */}
              <div className="pt-6 border-t border-slate-100">
                  <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Pemohon</p>
                          <div className="h-20 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-100">
                              <SignatureStamp signerName={currentUser.name} signatureDate={new Date().toISOString()} signerDivision={userDivision} />
                          </div>
                      </div>
                      <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Logistik</p>
                          <div className="h-20 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg">
                              <span className="text-[10px] text-slate-300">Tanda Tangan</span>
                          </div>
                      </div>
                      <div>
                           <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Disetujui</p>
                           <div className="h-20 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg">
                               <span className="text-[10px] text-slate-300">Tanda Tangan</span>
                           </div>
                      </div>
                  </div>
              </div>

              {/* ACTION FOOTER */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 no-print">
                  <button type="button" onClick={onCancel} className="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Batal</button>
                  <button type="submit" disabled={isLoading || fulfillmentStatus === 'invalid'} className="px-6 py-2 text-sm font-bold text-white bg-slate-900 rounded-lg hover:bg-tm-primary transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                      {isLoading && <SpinnerIcon className="w-4 h-4" />} Kirim Permintaan
                  </button>
              </div>
          </form>
        </div>
      </div>
    </div>
  );
};
