

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Asset, AssetStatus, Division, LoanItem } from '../../../types';
import DatePicker from '../../../components/ui/DatePicker';
import { useNotification } from '../../../providers/NotificationProvider';
import { SpinnerIcon } from '../../../components/icons/SpinnerIcon';
import FloatingActionBar from '../../../components/ui/FloatingActionBar';
import { Letterhead } from '../../../components/ui/Letterhead';
import { SignatureStamp } from '../../../components/ui/SignatureStamp';
import { InfoIcon } from '../../../components/icons/InfoIcon';
import { AssetIcon } from '../../../components/icons/AssetIcon';
import { TrashIcon } from '../../../components/icons/TrashIcon';
import { Checkbox } from '../../../components/ui/Checkbox';
import { useAssetStore } from '../../../stores/useAssetStore'; // IMPORT Store
import { BsLightningFill, BsBoxSeam } from 'react-icons/bs'; // NEW Icons

interface LoanRequestFormProps {
    availableAssets: Asset[];
    onSave: (data: {
        loanItems: LoanItem[];
        notes: string;
    }) => void;
    onCancel: () => void;
    currentUser: User;
    divisions: Division[];
}

const LoanRequestForm: React.FC<LoanRequestFormProps> = ({ availableAssets, onSave, onCancel, currentUser, divisions }) => {
    type LoanItemForm = {
        tempId: number;
        modelKey: string;
        quantity: number | '';
        keterangan: string;
        returnDate: Date | null;
        isIndefinite: boolean;
    };
    
    // Store access to check categories for Material/Bulk logic
    const assetCategories = useAssetStore((state) => state.categories);

    const [loanItems, setLoanItems] = useState<LoanItemForm[]>([
        { tempId: Date.now(), modelKey: '', quantity: 1, keterangan: '', returnDate: null, isIndefinite: false }
    ]);
    const [itemInputs, setItemInputs] = useState<Record<number, string>>({});
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
    const addNotification = useNotification();
    const footerRef = useRef<HTMLDivElement>(null);
    const [isFooterVisible, setIsFooterVisible] = useState(true);
    const formId = "loan-request-form";
    const requestDate = useMemo(() => new Date(), []);
    
    // State for bulk actions
    const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
    const [globalReturnDate, setGlobalReturnDate] = useState<Date | null>(null);
    const [isGlobalIndefinite, setIsGlobalIndefinite] = useState(false);
    
    const userDivision = useMemo(() => divisions.find(d => d.id === currentUser.divisionId)?.name || 'N/A', [divisions, currentUser]);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => setIsFooterVisible(entry.isIntersecting), { threshold: 0.1 });
        const currentRef = footerRef.current;
        if (currentRef) observer.observe(currentRef);
        return () => { if (currentRef) observer.unobserve(currentRef); };
    }, []);

    useEffect(() => {
        itemRefs.current = itemRefs.current.slice(0, loanItems.length);
    }, [loanItems]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (openDropdownId === null) return;
    
            const openItemIndex = loanItems.findIndex(item => item.tempId === openDropdownId);
            if (openItemIndex === -1) return;
    
            const node = itemRefs.current[openItemIndex];
            if (node && !node.contains(event.target as Node)) {
                setOpenDropdownId(null);
            }
        };
    
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openDropdownId, loanItems]);

    const availableModels = useMemo(() => {
        const models = new Map<string, { name: string; brand: string; count: number; category: string; type: string }>();
        availableAssets.forEach(asset => {
            const key = `${asset.name}|${asset.brand}`;
            if (!models.has(key)) {
                models.set(key, { name: asset.name, brand: asset.brand, count: 0, category: asset.category, type: asset.type });
            }
            models.get(key)!.count++;
        });
        return Array.from(models.values());
    }, [availableAssets]);

    const getAvailableOptions = (currentItemKey: string) => {
        const selectedKeys = loanItems.map(item => item.modelKey).filter(key => key !== currentItemKey);
        
        return availableModels
            .filter(model => !selectedKeys.includes(`${model.name}|${model.brand}`))
            .map(model => {
                const category = assetCategories.find(c => c.name === model.category);
                const type = category?.types.find(t => t.name === model.type);
                const isMaterial = type?.trackingMethod === 'bulk';
                
                return {
                    value: `${model.name}|${model.brand}`,
                    label: `${model.name} - ${model.brand}`,
                    isMaterial,
                    count: model.count
                };
            });
    };
    
    const getFilteredOptions = (currentItemKey: string, input: string) => {
        const options = getAvailableOptions(currentItemKey);
        return options.filter(opt => opt.label.toLowerCase().includes(input.toLowerCase()));
    };

    const handleItemChange = (tempId: number, field: keyof LoanItemForm, value: any) => {
        setLoanItems(prev => prev.map(item => {
            if (item.tempId === tempId) {
                if (field === 'quantity') {
                    const selectedModel = availableModels.find(m => `${m.name}|${m.brand}` === item.modelKey);
                    const maxStock = selectedModel?.count || 0;
                    
                    let finalValue = value;
                    if (value === '') {
                        finalValue = '';
                    } else if (typeof value === 'number' && !isNaN(value)) {
                        if (value > maxStock) {
                            finalValue = maxStock;
                            addNotification(`Jumlah tidak bisa melebihi stok yang tersedia (${maxStock}).`, 'warning');
                        } else if (value < 1) {
                            finalValue = 1;
                        }
                    } else {
                        finalValue = item.quantity;
                    }
                    
                    return { ...item, quantity: finalValue };
                }
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    const handleModelSelect = (tempId: number, modelKey: string) => {
        const model = availableModels.find(m => `${m.name}|${m.brand}` === modelKey);
        const modelLabel = model ? `${model.name} - ${model.brand}` : '';
        setItemInputs(prev => ({ ...prev, [tempId]: modelLabel }));
        handleItemChange(tempId, 'modelKey', modelKey);
        setOpenDropdownId(null);
    };

    const handleModelInputChange = (tempId: number, value: string) => {
        setItemInputs(prev => ({...prev, [tempId]: value}));
        if (openDropdownId !== tempId) {
            setOpenDropdownId(tempId);
        }
        if (value === '') {
            handleItemChange(tempId, 'modelKey', '');
        }
    }

    const handleAddItem = () => {
        setLoanItems(prev => [...prev, { tempId: Date.now(), modelKey: '', quantity: 1, keterangan: '', returnDate: null, isIndefinite: false }]);
    };

    const handleRemoveItem = (tempId: number) => {
        if (loanItems.length > 1) {
            setLoanItems(prev => prev.filter(item => item.tempId !== tempId));
            setSelectedItemIds(prev => prev.filter(id => id !== tempId));
        }
    };

    const handleSelectOne = (tempId: number) => {
        setSelectedItemIds(prev =>
            prev.includes(tempId)
                ? prev.filter(id => id !== tempId)
                : [...prev, tempId]
        );
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedItemIds(loanItems.map(item => item.tempId));
        } else {
            setSelectedItemIds([]);
        }
    };
    
    const handleApplyToSelected = () => {
        if (selectedItemIds.length === 0) return;
        setLoanItems(prev => prev.map(item => {
            if (selectedItemIds.includes(item.tempId)) {
                return {
                    ...item,
                    returnDate: isGlobalIndefinite ? null : globalReturnDate,
                    isIndefinite: isGlobalIndefinite,
                };
            }
            return item;
        }));
        setSelectedItemIds([]);
    };


    const isSubmitDisabled = useMemo(() => {
        if (isLoading) return true;
        
        const hasInvalidItems = loanItems.some(item => !item.modelKey || item.quantity === '' || item.quantity <= 0);
        if (hasInvalidItems) return true;
        
        const hasInvalidDates = loanItems.some(item => !item.isIndefinite && !item.returnDate);
        return hasInvalidDates;
        
    }, [isLoading, loanItems]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitDisabled) {
            addNotification('Harap lengkapi semua informasi yang diperlukan, termasuk tanggal kembali untuk setiap item.', 'error');
            return;
        }
        setIsLoading(true);
        setTimeout(() => {
            onSave({
                loanItems: loanItems.map(item => {
                    const [name, brand] = item.modelKey.split('|');
                    return {
                        id: Date.now() + Math.random(),
                        itemName: name,
                        brand,
                        quantity: Number(item.quantity),
                        keterangan: item.keterangan,
                        returnDate: item.isIndefinite ? null : item.returnDate?.toISOString().split('T')[0] || null,
                    };
                }),
                notes,
            });
            setIsLoading(false);
        }, 800);
    };

    const ActionButtons: React.FC<{ formId?: string }> = ({ formId }) => (
        <>
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">
                Batal
            </button>
            <button
                type="submit"
                form={formId}
                disabled={isSubmitDisabled}
                className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover disabled:bg-tm-primary/70 disabled:cursor-not-allowed">
                {isLoading ? <SpinnerIcon className="w-5 h-5 mr-2" /> : null}
                {isLoading ? 'Mengajukan...' : 'Ajukan Permintaan Pinjam'}
            </button>
        </>
    );

    return (
        <>
            <form id={formId} onSubmit={handleSubmit} className="space-y-6">
                <Letterhead />
                <div className="text-center">
                    <h3 className="text-xl font-bold uppercase text-tm-dark">Surat Permintaan Peminjaman Aset</h3>
                    <p className="text-sm text-tm-secondary">Nomor: [Otomatis]</p>
                </div>

                <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2 text-sm">
                    <div><label className="block font-medium text-gray-700">Tanggal</label><input type="text" readOnly value={new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(requestDate)} className="w-full p-2 mt-1 bg-gray-100 border border-gray-200 rounded-md text-gray-600" /></div>
                    <div><label className="block font-medium text-gray-700">Nama</label><input type="text" readOnly value={currentUser.name} className="w-full p-2 mt-1 bg-gray-100 border border-gray-200 rounded-md text-gray-600" /></div>
                    <div><label className="block font-medium text-gray-700">Divisi</label><input type="text" readOnly value={userDivision} className="w-full p-2 mt-1 bg-gray-100 border border-gray-200 rounded-md text-gray-600" /></div>
                    <div><label className="block font-medium text-gray-700">No Dokumen</label><input type="text" readOnly value="[Otomatis]" className="w-full p-2 mt-1 bg-gray-100 border border-gray-200 rounded-md text-gray-600" /></div>
                </div>

                <section className="pt-4 border-t">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold text-gray-800 border-b pb-1">Detail Aset yang Dipinjam</h4>
                        <button type="button" onClick={handleAddItem} className="px-4 py-2 text-sm font-semibold text-white transition-colors bg-tm-accent rounded-lg shadow-sm hover:bg-tm-primary">
                            Tambah Aset
                        </button>
                    </div>
                    
                    {loanItems.length > 1 && (
                         <div className="p-4 border rounded-lg bg-blue-50/30 border-blue-200/80 mb-6">
                            <h5 className="font-semibold text-tm-primary mb-3">Aksi Massal</h5>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tanggal Pengembalian</label>
                                    <div className="mt-1">
                                        <DatePicker 
                                            id="loanReturnDate" 
                                            selectedDate={globalReturnDate} 
                                            onDateChange={setGlobalReturnDate} 
                                            disablePastDates 
                                            disabled={isGlobalIndefinite}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-end pb-1">
                                    <label htmlFor="isGlobalIndefinite" className="flex items-center space-x-3 cursor-pointer text-sm text-gray-700">
                                        <Checkbox id="isGlobalIndefinite" checked={isGlobalIndefinite} onChange={(e) => setIsGlobalIndefinite(e.target.checked)} />
                                        <span>Belum ditentukan</span>
                                    </label>
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end">
                                 <button type="button" onClick={handleApplyToSelected} disabled={selectedItemIds.length === 0} className="px-4 py-2 text-sm font-semibold text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover disabled:bg-gray-400 disabled:cursor-not-allowed">
                                    Terapkan ke ({selectedItemIds.length}) Pilihan
                                </button>
                            </div>
                        </div>
                    )}

                    {loanItems.length > 1 && (
                        <div className="flex items-center space-x-3 mb-4 p-2 border-b">
                            <Checkbox 
                                id="select-all-items" 
                                checked={selectedItemIds.length > 0 && selectedItemIds.length === loanItems.length}
                                onChange={handleSelectAll}
                            />
                            <label htmlFor="select-all-items" className="text-sm font-medium text-gray-700 cursor-pointer">Pilih Semua Item</label>
                        </div>
                    )}
                    
                    <div className="space-y-6">
                        {loanItems.map((item, index) => {
                            const selectedModel = availableModels.find(m => `${m.name}|${m.brand}` === item.modelKey);
                            const filteredOptions = getFilteredOptions(item.modelKey, itemInputs[item.tempId] || '');
                            return (
                                <div key={item.tempId} className={`relative p-5 pt-6 bg-white border rounded-xl shadow-sm transition-all duration-300 ${selectedItemIds.includes(item.tempId) ? 'border-tm-primary ring-2 ring-tm-accent/30' : 'border-gray-200/80'}`}>
                                    <div className="absolute flex items-center justify-center w-8 h-8 font-bold text-white rounded-full -top-4 left-4 bg-tm-primary shadow-lg">
                                        {index + 1}
                                    </div>
                                    
                                    {loanItems.length > 1 && (
                                        <button type="button" onClick={() => handleRemoveItem(item.tempId)} className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 text-gray-400 transition-colors rounded-full hover:bg-red-100 hover:text-red-500 z-10" aria-label={`Hapus Item ${index + 1}`}>
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    )}

                                    {loanItems.length > 1 && (
                                        <div className="flex items-center space-x-3 mb-4">
                                            <Checkbox
                                                id={`select-item-${item.tempId}`}
                                                checked={selectedItemIds.includes(item.tempId)}
                                                onChange={() => handleSelectOne(item.tempId)}
                                            />
                                            <label htmlFor={`select-item-${item.tempId}`} className="text-sm font-medium text-gray-700 cursor-pointer">Pilih item ini untuk aksi massal</label>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                        <div className="sm:col-span-2" ref={el => { itemRefs.current[index] = el; }}>
                                            <label className="block text-sm font-medium text-gray-700">Pilih Aset <span className="text-danger">*</span></label>
                                            <div className="relative mt-1">
                                                <AssetIcon className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 top-1/2 left-3 pointer-events-none" />
                                                <input
                                                    value={itemInputs[item.tempId] || ''}
                                                    onChange={(e) => handleModelInputChange(item.tempId, e.target.value)}
                                                    onClick={() => setOpenDropdownId(item.tempId === openDropdownId ? null : item.tempId)}
                                                    placeholder="Ketik untuk mencari model aset..."
                                                    className="block w-full py-2 pl-10 pr-4 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-tm-accent"
                                                />
                                                {openDropdownId === item.tempId && (
                                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto custom-scrollbar">
                                                        <ul>
                                                            {filteredOptions.length > 0 ? filteredOptions.map(opt => (
                                                                <li key={opt.value} onClick={() => handleModelSelect(item.tempId, opt.value)} className="px-4 py-2.5 text-sm text-gray-800 cursor-pointer hover:bg-blue-50 hover:text-tm-primary flex items-center justify-between">
                                                                    <span>{opt.label}</span>
                                                                    <div className="flex items-center gap-2">
                                                                        {opt.isMaterial ? (
                                                                            <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                                <BsLightningFill className="w-2.5 h-2.5" /> Bulk
                                                                            </span>
                                                                        ) : (
                                                                             <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                                <BsBoxSeam className="w-2.5 h-2.5" /> Unit
                                                                            </span>
                                                                        )}
                                                                        <span className="text-xs text-gray-500 font-semibold bg-gray-100 px-1.5 py-0.5 rounded">Stok: {opt.count}</span>
                                                                    </div>
                                                                </li>
                                                            )) : (
                                                                <li className="px-4 py-4 text-sm text-center text-gray-500">Tidak ada aset tersedia.</li>
                                                            )}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="sm:col-span-1">
                                            <label className="block text-sm font-medium text-gray-700">Stok</label>
                                            <input type="text" readOnly value={selectedModel?.count || 0} className="block w-full px-3 py-2 mt-1 text-center text-gray-700 bg-gray-200/60 border border-gray-300 rounded-lg shadow-sm" />
                                        </div>
                                        <div className="sm:col-span-1">
                                            <label className="block text-sm font-medium text-gray-700">Jumlah <span className="text-danger">*</span></label>
                                            <input type="number" value={item.quantity} onChange={e => handleItemChange(item.tempId, 'quantity', e.target.value === '' ? '' : parseInt(e.target.value, 10))} min="1" max={selectedModel?.count || 1} disabled={!item.modelKey} className="block w-full px-3 py-2 mt-1 text-center text-gray-900 bg-white border border-gray-300 rounded-lg shadow-sm disabled:bg-gray-200/60 disabled:text-gray-500" />
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <label className="block text-sm font-medium text-gray-700">Catatan (Opsional)</label>
                                        <input type="text" value={item.keterangan} onChange={(e) => handleItemChange(item.tempId, 'keterangan', e.target.value)} placeholder="Kebutuhan spesifik untuk item ini..." className="block w-full px-3 py-2 mt-1 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-tm-accent" />
                                    </div>
                                    <div className="pt-4 mt-4 border-t">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Tgl Kembali Item Ini <span className="text-danger">*</span></label>
                                                <div className="mt-1"><DatePicker id={`rd-${item.tempId}`} selectedDate={item.returnDate} onDateChange={(date) => handleItemChange(item.tempId, 'returnDate', date)} disablePastDates disabled={item.isIndefinite} /></div>
                                            </div>
                                            <div className="flex items-end pb-1">
                                                <label htmlFor={`indef-${item.tempId}`} className="flex items-center space-x-3 cursor-pointer text-sm text-gray-700">
                                                    <Checkbox id={`indef-${item.tempId}`} checked={item.isIndefinite} onChange={(e) => handleItemChange(item.tempId, 'isIndefinite', e.target.checked)} />
                                                    <span>Belum ditentukan</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="pt-4 border-t">
                    <div>
                        <label htmlFor="loan-notes" className="block text-sm font-medium text-gray-700">Alasan Peminjaman (Umum)</label>
                        <div className="relative mt-1">
                            <InfoIcon className="absolute top-3 left-3 w-5 h-5 text-gray-400 pointer-events-none" />
                            <textarea id="loan-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={4} className="w-full pl-10 pr-4 py-2 border-gray-300 rounded-lg shadow-sm focus:ring-tm-accent focus:border-tm-accent bg-gray-50 text-gray-700 placeholder:text-gray-400" placeholder="Jelaskan kebutuhan peminjaman, misalnya untuk proyek apa, lokasi pengerjaan, dll." />
                        </div>
                    </div>
                </section>

                <section className="pt-8 mt-6 border-t border-gray-200">
                    <div className="grid grid-cols-1 text-sm text-center gap-y-8 md:grid-cols-2 md:gap-x-8">
                        <div>
                            <p className="font-semibold text-gray-700">Pemohon,</p>
                            <div className="flex items-center justify-center mt-2 h-28"><SignatureStamp signerName={currentUser.name} signatureDate={new Date().toISOString()} signerDivision={userDivision} /></div>
                            <p className="pt-1 mt-2 border-t border-gray-400 text-gray-600">{currentUser.name}</p>
                        </div>
                        <div>
                            <p className="font-semibold text-gray-700">Mengetahui (Admin Logistik),</p>
                            <div className="flex items-center justify-center mt-2 h-28"><span className="text-sm italic text-gray-400">Menunggu Persetujuan</span></div>
                            <p className="pt-1 mt-2 border-t border-gray-400 text-gray-600">.........................................</p>
                        </div>
                    </div>
                </section>

                <div ref={footerRef} className="flex justify-end pt-4 mt-4 border-t border-gray-200">
                    <ActionButtons />
                </div>
            </form>
            <FloatingActionBar isVisible={!isFooterVisible}>
                <ActionButtons formId={formId} />
            </FloatingActionBar>
        </>
    );
};

export default LoanRequestForm;

