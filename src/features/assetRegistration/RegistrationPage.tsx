
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Asset, AssetStatus, AssetCondition, Attachment, Request, User, ActivityLogEntry, PreviewData, AssetCategory, StandardItem, Page, AssetType, RequestItem, ParsedScanResult } from '../../types';
import DatePicker from '../../components/ui/DatePicker';
import { InfoIcon } from '../../components/icons/InfoIcon';
import { DollarIcon } from '../../components/icons/DollarIcon';
import { WrenchIcon } from '../../components/icons/WrenchIcon';
import { PaperclipIcon } from '../../components/icons/PaperclipIcon';
import { TrashIcon } from '../../components/icons/TrashIcon';
import FloatingActionBar from '../../components/ui/FloatingActionBar';
import { useNotification } from '../../providers/NotificationProvider';
import { InboxIcon } from '../../components/icons/InboxIcon';
import { useSortableData, SortConfig } from '../../hooks/useSortableData';
import { exportToCSV } from '../../utils/csvExporter';
import { Checkbox } from '../../components/ui/Checkbox';
import { SortAscIcon } from '../../components/icons/SortAscIcon';
import { SortDescIcon } from '../../components/icons/SortDescIcon';
import { SortIcon } from '../../components/icons/SortIcon';
import { ExportIcon } from '../../components/icons/ExportIcon';
import { useLongPress } from '../../hooks/useLongPress';
import { SpinnerIcon } from '../../components/icons/SpinnerIcon';
import { SearchIcon } from '../../components/icons/SearchIcon';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { CustomerIcon } from '../../components/icons/CustomerIcon';
import { RegisterIcon } from '../../components/icons/RegisterIcon';
import { RequestIcon } from '../../components/icons/RequestIcon';
import { CopyIcon } from '../../components/icons/CopyIcon';
import { QrCodeIcon } from '../../components/icons/QrCodeIcon';
import { PencilIcon } from '../../components/icons/PencilIcon';
import { ExclamationTriangleIcon } from '../../components/icons/ExclamationTriangleIcon';
import { ClickableLink } from '../../components/ui/ClickableLink';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { CreatableSelect } from '../../components/ui/CreatableSelect';
import { FilterIcon } from '../../components/icons/FilterIcon';
import { ModelManagementModal } from '../../components/ui/ModelManagementModal';
import { TypeManagementModal } from '../../components/ui/TypeManagementModal';
import { EyeIcon } from '../../components/icons/EyeIcon';
import { CloseIcon } from '../../components/icons/CloseIcon';

// Stores
import { useAssetStore } from '../../stores/useAssetStore';
import { useRequestStore } from '../../stores/useRequestStore';
import { useMasterDataStore } from '../../stores/useMasterDataStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useNotificationStore } from '../../stores/useNotificationStore';

interface ItemRegistrationProps {
    currentUser: User;
    prefillData?: { request: Request; itemToRegister?: RequestItem } | null;
    onClearPrefill: () => void;
    onInitiateHandover: (asset: Asset) => void;
    onInitiateDismantle: (asset: Asset) => void;
    onInitiateInstallation: (asset: Asset) => void;
    assetToViewId: string | null;
    initialFilters?: any;
    onClearInitialFilters: () => void;
    itemToEdit: { type: string; data: any } | null;
    onClearItemToEdit: () => void;
    onShowPreview: (data: PreviewData) => void;
    setActivePage: (page: Page, initialState?: any) => void;
    setIsGlobalScannerOpen: (isOpen: boolean) => void;
    setScanContext: (context: 'global' | 'form') => void;
    setFormScanCallback: (callback: ((data: ParsedScanResult) => void) | null) => void;
}

const assetLocations = [
    'Gudang Inventori',
    'Data Center Lt. 1',
    'POP Cempaka Putih',
    'Gudang Teknisi',
    'Kantor Marketing',
    'Mobil Tim Engineer',
    'Kantor Engineer',
    'Kantor NOC',
];

export const getStatusClass = (status: AssetStatus) => {
    switch (status) {
        case AssetStatus.IN_USE: return 'bg-info-light text-info-text';
        case AssetStatus.IN_STORAGE: return 'bg-gray-100 text-gray-800';
        case AssetStatus.UNDER_REPAIR: return 'bg-blue-100 text-blue-700';
        case AssetStatus.OUT_FOR_REPAIR: return 'bg-purple-100 text-purple-700';
        case AssetStatus.DAMAGED: return 'bg-warning-light text-warning-text';
        case AssetStatus.DECOMMISSIONED: return 'bg-red-200 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

// ... (SortableHeader & RegistrationTable kept same as before for brevity, omitted here but assumed present)
// RE-INSERTING REGISTRATION TABLE COMPONENTS FOR COMPLETENESS

const SortableHeader: React.FC<{
    children: React.ReactNode;
    columnKey: keyof Asset;
    sortConfig: SortConfig<Asset> | null;
    requestSort: (key: keyof Asset) => void;
    className?: string;
}> = ({ children, columnKey, sortConfig, requestSort, className }) => {
    const isSorted = sortConfig?.key === columnKey;
    const direction = isSorted ? sortConfig.direction : undefined;
    const getSortIcon = () => {
        if (!isSorted) return <SortIcon className="w-4 h-4 text-gray-400" />;
        if (direction === 'ascending') return <SortAscIcon className="w-4 h-4 text-tm-accent" />;
        return <SortDescIcon className="w-4 h-4 text-tm-accent" />;
    };
    return (
        <th scope="col" className={`px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500 ${className}`}>
            <button onClick={() => requestSort(columnKey)} className="flex items-center space-x-1 group">
                <span>{children}</span>
                <span className="opacity-50 group-hover:opacity-100">{getSortIcon()}</span>
            </button>
        </th>
    );
};

interface RegistrationTableProps {
    assets: Asset[];
    onDetailClick: (asset: Asset) => void;
    onDeleteClick: (id: string) => void;
    sortConfig: SortConfig<Asset> | null;
    requestSort: (key: keyof Asset) => void;
    selectedAssetIds: string[];
    onSelectOne: (id: string) => void;
    onSelectAll: (event: React.ChangeEvent<HTMLInputElement>) => void;
    isBulkSelectMode: boolean;
    onEnterBulkMode: () => void;
    onShowPreview: (data: PreviewData) => void;
}

const RegistrationTable: React.FC<RegistrationTableProps> = ({ assets, onDetailClick, onDeleteClick, sortConfig, requestSort, selectedAssetIds, onSelectOne, onSelectAll, isBulkSelectMode, onEnterBulkMode, onShowPreview }) => {
    const longPressHandlers = useLongPress(onEnterBulkMode, 500);
    const handleRowClick = (asset: Asset) => {
        if (isBulkSelectMode) {
            onSelectOne(asset.id);
        } else {
            onDetailClick(asset);
        }
    };

    return (
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="sticky top-0 z-10 bg-gray-50">
                <tr>
                    {isBulkSelectMode && (
                        <th scope="col" className="px-6 py-3"><Checkbox checked={selectedAssetIds.length === assets.length && assets.length > 0} onChange={onSelectAll} aria-label="Pilih semua aset" /></th>
                    )}
                    <SortableHeader columnKey="name" sortConfig={sortConfig} requestSort={requestSort}>Aset</SortableHeader>
                    <SortableHeader columnKey="location" sortConfig={sortConfig} requestSort={requestSort}>Lokasi / Pengguna</SortableHeader>
                    <SortableHeader columnKey="status" sortConfig={sortConfig} requestSort={requestSort}>Status</SortableHeader>
                    <th className="relative px-6 py-3"><span className="sr-only">Aksi</span></th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {assets.length > 0 ? (
                    assets.map((asset) => (
                        <tr key={asset.id} {...longPressHandlers} onClick={() => handleRowClick(asset)} className={`transition-colors cursor-pointer ${selectedAssetIds.includes(asset.id) ? 'bg-blue-50' : asset.isDismantled ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-gray-50'}`}>
                            {isBulkSelectMode && (
                                <td className="px-6 py-4 align-top" onClick={(e) => e.stopPropagation()}><Checkbox checked={selectedAssetIds.includes(asset.id)} onChange={() => onSelectOne(asset.id)} /></td>
                            )}
                            <td className="px-6 py-4 lg:whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-gray-900">{asset.name}</span>
                                    {asset.lastModifiedDate && <span title={`Diubah: ${new Date(asset.lastModifiedDate).toLocaleString('id-ID')} oleh ${asset.lastModifiedBy}`}><PencilIcon className="w-3.5 h-3.5 text-gray-400" /></span>}
                                    {asset.isDismantled && <span className="px-2 py-0.5 text-xs font-semibold text-amber-800 bg-amber-100 rounded-full">Dismantled</span>}
                                </div>
                                <div className="text-xs text-gray-500">{asset.id} &bull; {asset.category}</div>
                            </td>
                            <td className="px-6 py-4 lg:whitespace-nowrap">
                                {asset.currentUser && asset.currentUser.startsWith('TMI-') ? (
                                    <div className="flex items-center gap-2">
                                        <CustomerIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                        <div><div className="text-sm font-medium text-tm-dark"><ClickableLink onClick={() => onShowPreview({ type: 'customer', id: asset.currentUser! })}>Pelanggan: {asset.currentUser}</ClickableLink></div></div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-sm font-medium text-gray-800">{asset.location || '-'}</div>
                                        <div className="text-xs text-gray-500">{asset.currentUser || 'Tidak ada pengguna'}</div>
                                    </>
                                )}
                            </td>
                            <td className="px-6 py-4 lg:whitespace-nowrap">
                                <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(asset.status)}`}>{asset.status}</span>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-right lg:whitespace-nowrap">
                                <div className="flex items-center justify-end space-x-2">
                                   <button onClick={(e) => { e.stopPropagation(); onDetailClick(asset); }} className="flex items-center justify-center w-8 h-8 text-gray-500 transition-colors bg-gray-100 rounded-full hover:bg-info-light hover:text-info-text" title="Lihat Detail"><EyeIcon className="w-5 h-5"/></button>
                                    <button onClick={(e) => { e.stopPropagation(); onDeleteClick(asset.id); }} className="flex items-center justify-center w-8 h-8 text-gray-500 transition-colors bg-gray-100 rounded-full hover:bg-danger-light hover:text-danger-text" title="Hapus"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr><td colSpan={isBulkSelectMode ? 5 : 4} className="px-6 py-12 text-center text-gray-500"><div className="flex flex-col items-center"><InboxIcon className="w-12 h-12 text-gray-400" /><h3 className="mt-2 text-sm font-medium text-gray-900">Tidak Ada Data Aset</h3><p className="mt-1 text-sm text-gray-500">Ubah filter atau buat aset baru.</p></div></td></tr>
                )}
            </tbody>
        </table>
    );
};

const FormSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className }) => (
    <div className={`pt-6 border-t border-gray-200 first:pt-0 first:border-t-0 ${className}`}>
        <div className="flex items-center mb-4">{icon}<h3 className="text-lg font-semibold text-tm-dark">{title}</h3></div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">{children}</div>
    </div>
);

// RegistrationForm Component
interface RegistrationFormData {
    assetName: string; category: string; type: string; brand: string; purchasePrice: number | null; vendor: string | null; poNumber: string | null; invoiceNumber: string | null; purchaseDate: string; registrationDate: string; recordedBy: string; warrantyEndDate: string | null; condition: AssetCondition; location: string | null; locationDetail: string | null; currentUser: string | null; notes: string | null; attachments: Attachment[]; bulkItems: { id: number, serialNumber: string, macAddress: string }[]; relatedRequestId: string | null;
}

interface RegistrationFormProps {
    onBack: () => void;
    onSave: (data: RegistrationFormData, assetIdToUpdate?: string) => void;
    prefillData?: { request: Request; itemToRegister?: RequestItem } | null;
    editingAsset?: Asset | null;
    currentUser: User;
    onStartScan: (itemId: number) => void;
    bulkItems: { id: number; serialNumber: string; macAddress: string }[];
    setBulkItems: React.Dispatch<React.SetStateAction<{ id: number; serialNumber: string; macAddress: string }[]>>;
    assetCategories: AssetCategory[];
    setActivePage: (page: Page, initialState?: any) => void;
    // Modal Handlers
    openModelModal: (category: AssetCategory, type: AssetType) => void;
    openTypeModal: (category: AssetCategory, typeToEdit: AssetType | null) => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onBack, onSave, prefillData, editingAsset, currentUser, onStartScan, bulkItems, setBulkItems, assetCategories, setActivePage, openModelModal, openTypeModal }) => {
    // ... (Copied from previous logic, ensuring local modal triggers are used)
    // STATE
    const isEditing = !!editingAsset;
    const [assetName, setAssetName] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [assetTypeId, setAssetTypeId] = useState('');
    const [brand, setBrand] = useState('');
    const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
    const [vendor, setVendor] = useState('');
    const [poNumber, setPoNumber] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [purchaseDate, setPurchaseDate] = useState<Date | null>(new Date());
    const [registrationDate, setRegistrationDate] = useState<Date | null>(new Date());
    const [warrantyDate, setWarrantyDate] = useState<Date | null>(null);
    const [warrantyPeriod, setWarrantyPeriod] = useState<number | ''>('');
    const [condition, setCondition] = useState<AssetCondition>(AssetCondition.BRAND_NEW);
    const [location, setLocation] = useState('Gudang Inventori');
    const [locationDetail, setLocationDetail] = useState('');
    const [initialUser, setInitialUser] = useState('');
    const [notes, setNotes] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [quantity, setQuantity] = useState<number | ''>(1);
    const [isFooterVisible, setIsFooterVisible] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const footerRef = useRef<HTMLDivElement>(null);
    const formId = "asset-registration-form";
    const addNotification = useNotification();

    // DERIVED
    const selectedCategory = useMemo(() => assetCategories.find(c => c.id.toString() === selectedCategoryId), [assetCategories, selectedCategoryId]);
    const availableTypes = useMemo(() => selectedCategory?.types || [], [selectedCategory]);
    const selectedType = useMemo(() => availableTypes.find(t => t.id.toString() === assetTypeId), [availableTypes, assetTypeId]);
    const availableModels = useMemo(() => selectedType?.standardItems || [], [selectedType]);

    const categoryOptions = useMemo(() => assetCategories.map(cat => ({ value: cat.id.toString(), label: cat.name })), [assetCategories]);
    const typeOptions = useMemo(() => availableTypes.map(type => ({ value: type.id.toString(), label: type.name })), [availableTypes]);
    const modelOptions = useMemo(() => availableModels.map(model => ({ value: model.name, label: model.name })), [availableModels]);
    const conditionOptions = useMemo(() => Object.values(AssetCondition).map(c => ({ value: c, label: c })), []);
    const locationOptions = useMemo(() => assetLocations.map(loc => ({ value: loc, label: loc })), []);

    const canViewPrice = (role: User['role']) => ['Admin Purchase', 'Super Admin'].includes(role);
    const calculateWarrantyPeriod = (start: Date | null, end: Date | null): number | '' => {
        if (start && end && end > start) {
            const timeDiff = end.getTime() - start.getTime();
            const dayDiff = timeDiff / (1000 * 3600 * 24);
            const totalMonths = Math.round(dayDiff / 30.44);
            return totalMonths > 0 ? totalMonths : '';
        }
        return '';
    };
    const unitLabel = selectedType?.unitOfMeasure ? selectedType.unitOfMeasure.charAt(0).toUpperCase() + selectedType.unitOfMeasure.slice(1) : 'Unit';
    const totalCalculatedBaseQuantity = (typeof quantity === 'number' && selectedType?.quantityPerUnit) ? quantity * selectedType.quantityPerUnit : '';

    // EFFECTS
    useEffect(() => {
        if (prefillData?.request && prefillData.itemToRegister) {
            const { request, itemToRegister } = prefillData;
            const category = assetCategories.find(c => c.types.some(t => t.standardItems?.some(si => si.name === itemToRegister.itemName)));
            const type = category?.types.find(t => t.standardItems?.some(si => si.name === itemToRegister.itemName));

            if (category) setSelectedCategoryId(category.id.toString());
            if (type) setAssetTypeId(type.id.toString());

            setAssetName(itemToRegister.itemName);
            setBrand(itemToRegister.itemTypeBrand);
            setNotes(`Pencatatan dari request ${request.id}: ${itemToRegister.keterangan}`);
            setInitialUser(request.requester);
            
            if (request.purchaseDetails && request.purchaseDetails[itemToRegister.id]) {
                const details = request.purchaseDetails[itemToRegister.id];
                if (details) {
                    if (canViewPrice(currentUser.role)) setPurchasePrice(details.purchasePrice);
                    setVendor(details.vendor);
                    setPoNumber(details.poNumber);
                    setInvoiceNumber(details.invoiceNumber);
                    const purchase = new Date(details.purchaseDate);
                    const warrantyEnd = details.warrantyEndDate ? new Date(details.warrantyEndDate) : null;
                    setPurchaseDate(purchase);
                    setWarrantyDate(warrantyEnd);
                    setWarrantyPeriod(calculateWarrantyPeriod(purchase, warrantyEnd));
                }
            }
            
            const itemStatus = request.itemStatuses?.[itemToRegister.id];
            const totalApprovedQuantity = itemStatus?.approvedQuantity ?? itemToRegister.quantity;
            const alreadyRegistered = request.partiallyRegisteredItems?.[itemToRegister.id] || 0;
            const quantityToRegister = Math.max(0, totalApprovedQuantity - alreadyRegistered);

            if (type?.trackingMethod === 'bulk') {
                setQuantity(quantityToRegister);
                setBulkItems([]);
            } else {
                setBulkItems(Array.from({ length: quantityToRegister }, (_, i) => ({ id: Date.now() + i, serialNumber: '', macAddress: '' })));
                setQuantity(quantityToRegister);
            }
        }
    }, [prefillData, setBulkItems, assetCategories, currentUser.role]);
    
    useEffect(() => {
        if (isEditing && editingAsset) {
            setAssetName(editingAsset.name);
            const category = assetCategories.find(c => c.name === editingAsset.category);
            const type = category?.types.find(t => t.name === editingAsset.type);
            if(category) setSelectedCategoryId(category.id.toString());
            if(type) setAssetTypeId(type.id.toString());
            setBrand(editingAsset.brand);
            setPurchasePrice(editingAsset.purchasePrice ?? '');
            setVendor(editingAsset.vendor ?? '');
            setPoNumber(editingAsset.poNumber ?? '');
            setInvoiceNumber(editingAsset.invoiceNumber ?? '');
            setRegistrationDate(new Date(editingAsset.registrationDate));
            setCondition(editingAsset.condition);
            setLocation(editingAsset.location ?? 'Gudang Inventori');
            setLocationDetail(editingAsset.locationDetail ?? '');
            setInitialUser(editingAsset.currentUser ?? '');
            setNotes(editingAsset.notes ?? '');
            setQuantity(1); 
            setBulkItems([{
                id: Date.now(),
                serialNumber: editingAsset.serialNumber || '',
                macAddress: editingAsset.macAddress || '',
            }]);
            const purchase = new Date(editingAsset.purchaseDate || new Date());
            const warrantyEnd = editingAsset.warrantyEndDate ? new Date(editingAsset.warrantyEndDate) : null;
            setPurchaseDate(purchase);
            setWarrantyDate(warrantyEnd);
            setWarrantyPeriod(calculateWarrantyPeriod(purchase, warrantyEnd));
        }
    }, [isEditing, editingAsset, assetCategories]);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => setIsFooterVisible(entry.isIntersecting), { threshold: 0.1 });
        const currentRef = footerRef.current;
        if (currentRef) observer.observe(currentRef);
        return () => { if (currentRef) observer.unobserve(currentRef); };
    }, []);

    useEffect(() => {
        if (purchaseDate && warrantyPeriod) {
            const newWarrantyDate = new Date(purchaseDate);
            newWarrantyDate.setMonth(newWarrantyDate.getMonth() + Number(warrantyPeriod));
            setWarrantyDate(newWarrantyDate);
        } else if (warrantyPeriod === '') {
            setWarrantyDate(null);
        }
    }, [purchaseDate, warrantyPeriod]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) setAttachments(prev => [...prev, ...Array.from(event.target.files!)]);
    };

    const removeAttachment = (fileName: string) => {
        setAttachments(prev => prev.filter(file => file.name !== fileName));
    };

    const handleCategoryChange = (value: string) => {
        setSelectedCategoryId(value);
        setAssetTypeId('');
        setAssetName('');
        setBrand('');
    };
    
    const handleTypeChange = (value: string) => {
        setAssetTypeId(value);
        setAssetName('');
        setBrand('');
    };
    
    const handleModelChange = (modelName: string) => {
        const model = availableModels.find(m => m.name === modelName);
        if (model) {
            setAssetName(model.name);
            setBrand(model.brand);
        }
    };

    const addBulkItem = () => {
        setBulkItems([...bulkItems, { id: Date.now(), serialNumber: '', macAddress: '' }]);
    };

    const removeBulkItem = (id: number) => {
        if (bulkItems.length > 1) setBulkItems(bulkItems.filter(item => item.id !== id));
    };
    
    const handleBulkItemChange = (id: number, field: 'serialNumber' | 'macAddress', value: string) => {
        setBulkItems(bulkItems.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        let finalBulkItems = bulkItems;
        if (!isEditing && selectedType?.trackingMethod === 'bulk') {
            const finalQuantity = typeof quantity === 'number' ? quantity : 0;
            finalBulkItems = Array.from({ length: finalQuantity }, (_, i) => ({
                id: Date.now() + i,
                serialNumber: '',
                macAddress: '',
            }));
        }

        if (finalBulkItems.length === 0 && (isEditing || selectedType?.trackingMethod !== 'bulk')) {
             addNotification('Jumlah aset yang dicatat tidak boleh nol.', 'error');
             setIsSubmitting(false);
             return;
        }
        if (quantity === 0 && !isEditing && selectedType?.trackingMethod === 'bulk') {
            addNotification('Jumlah aset yang dicatat tidak boleh nol.', 'error');
            setIsSubmitting(false);
            return;
        }

        const formData: RegistrationFormData = {
            assetName,
            category: selectedCategory?.name || '',
            type: selectedType?.name || '',
            brand,
            purchasePrice: purchasePrice === '' ? null : purchasePrice,
            vendor: vendor || null,
            poNumber: poNumber || null,
            invoiceNumber: invoiceNumber || null,
            purchaseDate: purchaseDate!.toISOString().split('T')[0],
            registrationDate: registrationDate!.toISOString().split('T')[0],
            recordedBy: currentUser.name,
            warrantyEndDate: warrantyDate ? warrantyDate.toISOString().split('T')[0] : null,
            condition,
            location: location || null,
            locationDetail: locationDetail || null,
            currentUser: initialUser || null,
            notes: notes || null,
            attachments: [],
            bulkItems: finalBulkItems,
            relatedRequestId: prefillData?.request.id || null,
        };

        setTimeout(() => {
            onSave(formData, editingAsset?.id);
            setIsSubmitting(false);
        }, 1000);
    };
    
    const ActionButtons: React.FC<{ formId?: string }> = ({ formId }) => (
        <>
            <button type="button" onClick={onBack} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
            <button type="submit" form={formId} disabled={isSubmitting} className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tm-accent disabled:bg-tm-primary/70 disabled:cursor-not-allowed">
                {isSubmitting ? <SpinnerIcon className="w-5 h-5 mr-2"/> : null}
                {isSubmitting ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Simpan Aset Baru')}
            </button>
        </>
    );

    return (
        <>
            <form id={formId} className="space-y-8" onSubmit={handleSubmit}>
                 {prefillData && (
                    <div className="p-4 border-l-4 rounded-r-lg bg-info-light border-tm-primary">
                        <p className="text-sm text-info-text">
                            Mencatat <strong>{prefillData.itemToRegister?.itemName}</strong> dari permintaan <span className="font-bold">{prefillData.request.id}</span> oleh <span className="font-bold">{prefillData.request.requester}</span>.
                        </p>
                    </div>
                )}
                <div className="mb-6 space-y-2 text-center">
                    <h4 className="text-xl font-bold text-tm-dark">TRINITY MEDIA INDONESIA</h4>
                    <p className="font-semibold text-tm-secondary">{isEditing ? 'FORMULIR EDIT DATA ASET' : 'FORMULIR PENCATATAN ASET BARU'}</p>
                </div>

                <div className="p-4 border-t border-b border-gray-200">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <div><label htmlFor="registrationDate" className="block text-sm font-medium text-gray-700">Tanggal Pencatatan</label><DatePicker id="registrationDate" selectedDate={registrationDate} onDateChange={setRegistrationDate} disableFutureDates /></div>
                        <div><label htmlFor="recordedBy" className="block text-sm font-medium text-gray-700">Dicatat oleh</label><input type="text" id="recordedBy" readOnly className="block w-full px-3 py-2 mt-1 text-gray-700 bg-gray-100 border border-gray-200 rounded-md shadow-sm sm:text-sm" value={currentUser.name} /></div>
                        <div><label htmlFor="docNumber" className="block text-sm font-medium text-gray-700">No Dokumen Aset</label><input type="text" id="docNumber" readOnly className="block w-full px-3 py-2 mt-1 text-gray-700 bg-gray-100 border border-gray-200 rounded-md shadow-sm sm:text-sm" value={editingAsset?.id || '[Otomatis]'} /></div>
                    </div>
                </div>

                <FormSection title="Informasi Dasar Aset" icon={<InfoIcon className="w-6 h-6 mr-3 text-tm-primary" />}>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:col-span-2">
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-gray-700">Kategori Aset</label>
                            <div className="mt-1">
                                <CustomSelect options={categoryOptions} value={selectedCategoryId} onChange={handleCategoryChange} placeholder="-- Pilih Kategori --" emptyStateMessage="Belum ada kategori." emptyStateButtonLabel="Buka Pengaturan Kategori" onEmptyStateClick={() => setActivePage('kategori')} disabled={!!prefillData} />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="type" className="block text-sm font-medium text-gray-700">Tipe Aset</label>
                             <div className="mt-1">
                                <CustomSelect options={typeOptions} value={assetTypeId} onChange={handleTypeChange} placeholder={selectedCategoryId ? '-- Pilih Tipe --' : 'Pilih kategori dahulu'} disabled={!selectedCategoryId || !!prefillData} emptyStateMessage="Tidak ada tipe untuk kategori ini." emptyStateButtonLabel="Tambah Tipe Aset" onEmptyStateClick={() => { if (selectedCategory) openTypeModal(selectedCategory, null); }} />
                            </div>
                        </div>
                         <div>
                            <label htmlFor="standardModel" className="block text-sm font-medium text-gray-700">Model Barang Standar</label>
                             <div className="mt-1">
                                <CustomSelect options={modelOptions} value={assetName} onChange={handleModelChange} placeholder={assetTypeId ? '-- Pilih Model --' : 'Pilih tipe dahulu'} disabled={!assetTypeId || !!prefillData} emptyStateMessage="Tidak ada model untuk tipe ini." emptyStateButtonLabel="Tambah Model Barang" onEmptyStateClick={() => { if (selectedCategory && selectedType) openModelModal(selectedCategory, selectedType); }} />
                            </div>
                        </div>
                    </div>
                    <div className="md:col-span-2"><label htmlFor="assetName" className="block text-sm font-medium text-gray-700">Nama Aset (Otomatis)</label><input type="text" id="assetName" value={assetName} readOnly required className="block w-full px-3 py-2 mt-1 text-gray-700 bg-gray-100 border border-gray-200 rounded-md shadow-sm sm:text-sm" /></div>
                    <div className="md:col-span-2"><label htmlFor="brand" className="block text-sm font-medium text-gray-700">Brand (Otomatis)</label><input type="text" id="brand" value={brand} readOnly required className="block w-full px-3 py-2 mt-1 text-gray-700 bg-gray-100 border border-gray-200 rounded-md shadow-sm sm:text-sm" /></div>
                </FormSection>

                <FormSection title="Detail Unit Aset" icon={<InfoIcon className="w-6 h-6 mr-3 text-tm-primary" />} className="md:col-span-2">
                    {isEditing || selectedType?.trackingMethod !== 'bulk' ? (
                         <div className="md:col-span-2">
                            {isEditing && selectedType?.trackingMethod === 'bulk' ? (
                                <div className="p-4 mb-4 border-l-4 rounded-r-lg bg-amber-50 border-amber-400">
                                    <div className="flex items-start gap-3">
                                        <ExclamationTriangleIcon className="flex-shrink-0 w-5 h-5 mt-1 text-amber-600" />
                                        <div className="text-sm text-amber-800">
                                            <p className="font-semibold">Mengedit Aset Massal</p>
                                            <p>Anda sedang mengedit properti umum (seperti harga, vendor, dll.) untuk tipe aset <strong className="font-bold">{assetName}</strong>. Perubahan di sini akan memengaruhi informasi umum, bukan kuantitas stok.</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-gray-700">Daftar Unit (Nomor Seri & MAC Address)</label>
                                    {!isEditing && <button type="button" onClick={addBulkItem} className="px-3 py-1 text-xs font-semibold text-white transition-colors duration-200 rounded-md shadow-sm bg-tm-accent hover:bg-tm-primary">+ Tambah {unitLabel}</button>}
                                </div>
                                <div className="space-y-3">
                                    {bulkItems.map((item, index) => (
                                        <div key={item.id} className="relative grid grid-cols-1 md:grid-cols-5 gap-x-4 gap-y-2 p-3 bg-gray-50/80 border rounded-lg">
                                            <div className="md:col-span-5"><label className="text-sm font-medium text-gray-700">{isEditing ? `Detail ${unitLabel}` : `${unitLabel} #${index + 1}`}</label></div>
                                            <div className="md:col-span-2"><label htmlFor={`sn-${item.id}`} className="block text-xs font-medium text-gray-500">Nomor Seri</label><input id={`sn-${item.id}`} type="text" value={item.serialNumber} onChange={(e) => handleBulkItemChange(item.id, 'serialNumber', e.target.value)} required={!isEditing && selectedType?.trackingMethod !== 'bulk'} className="block w-full px-3 py-2 mt-1 text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-tm-accent focus:border-tm-accent sm:text-sm" placeholder="Wajib diisi" /></div>
                                            <div className="md:col-span-2"><label htmlFor={`mac-${item.id}`} className="block text-xs font-medium text-gray-500">MAC Address</label><input id={`mac-${item.id}`} type="text" value={item.macAddress} onChange={(e) => handleBulkItemChange(item.id, 'macAddress', e.target.value)} className="block w-full px-3 py-2 mt-1 text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-tm-accent focus:border-tm-accent sm:text-sm" placeholder="Opsional" /></div>
                                            <div className="flex items-end justify-start md:justify-center"><button type="button" onClick={() => onStartScan(item.id)} className="flex items-center justify-center w-full h-10 px-3 text-gray-600 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-100 hover:text-tm-primary" title="Pindai SN/MAC"><QrCodeIcon className="w-5 h-5"/></button></div>
                                            {bulkItems.length > 1 && !isEditing && (<div className="absolute top-2 right-2"><button type="button" onClick={() => removeBulkItem(item.id)} className="p-1 text-gray-400 rounded-full hover:bg-red-100 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button></div>)}
                                        </div>
                                    ))}
                                </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="md:col-span-2 p-4 -mt-2 mb-2 border-l-4 rounded-r-lg bg-info-light border-tm-primary">
                                <div className="flex items-start gap-3"><InfoIcon className="flex-shrink-0 w-5 h-5 mt-1 text-info-text" /><div className="text-sm text-info-text"><p className="font-semibold">Mode Pencatatan Massal (Bulk)</p><p>Anda akan mencatat aset ini secara massal. Sistem akan membuat {quantity || 0} entri aset terpisah tanpa nomor seri individual, yang semuanya terhubung ke dokumen ini.</p></div></div>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:col-span-2">
                                <div><label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Stok ({unitLabel})</label><div className="relative mt-1"><input type="number" id="quantity" value={quantity} onChange={(e) => setQuantity(e.target.value === '' ? '' : parseInt(e.target.value, 10))} min="1" required className="block w-full py-2 text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-tm-accent focus:border-tm-accent sm:text-sm" /></div></div>
                                <div><label htmlFor="unitSize" className="block text-sm font-medium text-gray-700">Ukuran Satuan ({selectedType?.baseUnitOfMeasure || '...'})</label><div className="relative mt-1"><input type="number" id="unitSize" value={selectedType?.quantityPerUnit || ''} readOnly className="block w-full py-2 text-gray-700 bg-gray-100 border border-gray-200 rounded-md shadow-sm sm:text-sm" /></div></div>
                                <div><label htmlFor="totalSize" className="block text-sm font-medium text-gray-700">Total Ukuran ({selectedType?.baseUnitOfMeasure || '...'})</label><div className="relative mt-1"><input type="number" id="totalSize" value={totalCalculatedBaseQuantity} readOnly className="block w-full py-2 text-gray-700 bg-gray-100 border border-gray-200 rounded-md shadow-sm sm:text-sm" /></div></div>
                            </div>
                        </>
                    )}
                </FormSection>

                {canViewPrice(currentUser.role) && (
                    <FormSection title="Informasi Pembelian" icon={<DollarIcon className="w-6 h-6 mr-3 text-tm-primary" />}>
                        <div><label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700">Harga Beli (Rp)</label><input type="number" id="purchasePrice" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value === '' ? '' : parseFloat(e.target.value))} disabled={!!prefillData} className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-md shadow-sm sm:text-sm disabled:bg-gray-100 disabled:text-gray-500" /></div>
                        <div><label htmlFor="vendor" className="block text-sm font-medium text-gray-700">Vendor / Toko</label><input type="text" id="vendor" value={vendor} onChange={e => setVendor(e.target.value)} disabled={!!prefillData} className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-md shadow-sm sm:text-sm disabled:bg-gray-100 disabled:text-gray-500" /></div>
                        <div><label htmlFor="poNumber" className="block text-sm font-medium text-gray-700">Nomor PO</label><input type="text" id="poNumber" value={poNumber} onChange={e => setPoNumber(e.target.value)} disabled={!!prefillData} className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-md shadow-sm sm:text-sm disabled:bg-gray-100 disabled:text-gray-500" /></div>
                        <div><label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-700">Nomor Faktur</label><input type="text" id="invoiceNumber" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} disabled={!!prefillData} className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-md shadow-sm sm:text-sm disabled:bg-gray-100 disabled:text-gray-500" /></div>
                        <div><label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700">Tanggal Pembelian</label><DatePicker id="purchaseDate" selectedDate={purchaseDate} onDateChange={setPurchaseDate} disableFutureDates disabled={!!prefillData} /></div>
                        <div><label htmlFor="warrantyPeriod" className="block text-sm font-medium text-gray-700">Masa Garansi (bulan)</label><input type="number" id="warrantyPeriod" value={warrantyPeriod} onChange={e => setWarrantyPeriod(e.target.value === '' ? '' : parseInt(e.target.value, 10))} disabled={!!prefillData} className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-md shadow-sm sm:text-sm disabled:bg-gray-100 disabled:text-gray-500" /></div>
                        <div className="md:col-span-2"><label htmlFor="warrantyEndDate" className="block text-sm font-medium text-gray-700">Akhir Garansi</label><DatePicker id="warrantyEndDate" selectedDate={warrantyDate} onDateChange={setWarrantyDate} disabled={!!prefillData} /></div>
                    </FormSection>
                )}

                <FormSection title="Kondisi, Lokasi & Catatan" icon={<WrenchIcon className="w-6 h-6 mr-3 text-tm-primary" />}>
                    <div><label htmlFor="condition" className="block text-sm font-medium text-gray-700">Kondisi Aset</label><div className="mt-1"><CustomSelect options={conditionOptions} value={condition} onChange={(value) => setCondition(value as AssetCondition)} /></div></div>
                    <div><label htmlFor="location" className="block text-sm font-medium text-gray-700">Lokasi Fisik Aset</label><div className="mt-1"><CustomSelect options={locationOptions} value={location} onChange={(value) => setLocation(value)} placeholder="-- Pilih Lokasi --" /></div></div>
                     <div><label htmlFor="locationDetail" className="block text-sm font-medium text-gray-700">Detail Lokasi / Rak</label><input type="text" id="locationDetail" value={locationDetail} onChange={e => setLocationDetail(e.target.value)} className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-md shadow-sm sm:text-sm" /></div>
                    <div><label htmlFor="initialUser" className="block text-sm font-medium text-gray-700">Pengguna Awal (Opsional)</label><input type="text" id="initialUser" value={initialUser} onChange={e => setInitialUser(e.target.value)} className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-md shadow-sm sm:text-sm" /></div>
                    <div className="md:col-span-2"><label htmlFor="notes" className="block text-sm font-medium text-gray-700">Catatan Tambahan</label><textarea id="notes" rows={3} value={notes} onChange={e => setNotes(e.target.value)} className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-md shadow-sm sm:text-sm" ></textarea></div>
                </FormSection>

                <FormSection title="Lampiran" icon={<PaperclipIcon className="w-6 h-6 mr-3 text-tm-primary" />}>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Unggah File (Foto, Invoice, dll)</label>
                        <div className="flex items-center justify-center w-full px-6 pt-5 pb-6 mt-1 border-2 border-gray-300 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                            <svg className="w-12 h-12 mx-auto text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                <div className="flex text-sm text-gray-600">
                                    <label htmlFor="file-upload" className="relative font-medium bg-white rounded-md cursor-pointer text-tm-primary hover:text-tm-accent focus-within:outline-none">
                                        <span>Pilih file</span><input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} />
                                    </label>
                                    <p className="pl-1">atau tarik dan lepas</p>
                                </div>
                                <p className="text-xs text-gray-500">PNG, JPG, PDF hingga 10MB</p>
                            </div>
                        </div>
                        {attachments.length > 0 && (
                            <div className="mt-4 space-y-2">
                                {attachments.map(file => (
                                    <div key={file.name} className="flex items-center justify-between p-2 text-sm text-gray-700 bg-gray-100 border border-gray-200 rounded-md">
                                        <span className="truncate">{file.name}</span>
                                        <button type="button" onClick={() => removeAttachment(file.name)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </FormSection>

                <div ref={footerRef} className="flex justify-end pt-5 mt-4 space-x-3 border-t border-gray-200">
                    <ActionButtons formId={formId} />
                </div>
            </form>
            <FloatingActionBar isVisible={!isFooterVisible}>
                <ActionButtons formId={formId} />
            </FloatingActionBar>
        </>
    );
};

const ItemRegistration: React.FC<ItemRegistrationProps> = (props) => {
    const { currentUser: propUser, prefillData, onClearPrefill, onShowPreview, onInitiateHandover, onInitiateDismantle, onInitiateInstallation, assetToViewId, initialFilters, onClearInitialFilters, itemToEdit, onClearItemToEdit, setActivePage, setIsGlobalScannerOpen, setScanContext, setFormScanCallback } = props;
    
    const assets = useAssetStore((state) => state.assets);
    const addAsset = useAssetStore((state) => state.addAsset);
    const updateAsset = useAssetStore((state) => state.updateAsset);
    const deleteAsset = useAssetStore((state) => state.deleteAsset);
    const assetCategories = useAssetStore((state) => state.categories);
    
    const updateRequestRegistration = useRequestStore((state) => state.updateRequestRegistration);
    // FIX: Correctly reference `addToast` action from the store. 'addNotification' does not exist.
    const addNotification = useNotificationStore((state) => state.addToast);
    const storeUser = useAuthStore((state) => state.currentUser);
    const currentUser = storeUser || propUser;

    const [view, setView] = useState<'list' | 'form'>('list');
    const [assetToEdit, setAssetToEdit] = useState<Asset | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
    const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [bulkItems, setBulkItems] = useState<{ id: number; serialNumber: string; macAddress: string }[]>([{ id: Date.now(), serialNumber: '', macAddress: '' }]);
    
    // Modal States for Local Management
    const [modelModalState, setModelModalState] = useState<{ isOpen: boolean; category: AssetCategory | null; type: AssetType | null }>({ isOpen: false, category: null, type: null });
    const [typeModalState, setTypeModalState] = useState<{ isOpen: boolean; category: AssetCategory | null; typeToEdit: AssetType | null }>({ isOpen: false, category: null, typeToEdit: null });
    
    const openModelModal = (category: AssetCategory, type: AssetType) => {
        setModelModalState({ isOpen: true, category, type });
    };
    const openTypeModal = (category: AssetCategory, typeToEdit: AssetType | null) => {
        setTypeModalState({ isOpen: true, category, typeToEdit });
    };

    const addNotificationUI = useNotification();

    useEffect(() => {
        if (prefillData) {
            setView('form');
        }
        if (itemToEdit && itemToEdit.type === 'asset') {
             setAssetToEdit(itemToEdit.data);
             setView('form');
        }
        if (assetToViewId) {
             onShowPreview({ type: 'asset', id: assetToViewId });
        }
    }, [prefillData, itemToEdit, assetToViewId, onShowPreview]);
    
    // Filter Logic
    const filteredAssets = useMemo(() => {
        return assets.filter(asset => {
             const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                   asset.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                   (asset.serialNumber && asset.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()));
             return matchesSearch;
        });
    }, [assets, searchQuery]);
    
    const { items: sortedAssets, requestSort, sortConfig } = useSortableData<Asset>(filteredAssets, { key: 'registrationDate', direction: 'descending' });
    const totalItems = sortedAssets.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedAssets = sortedAssets.slice(startIndex, endIndex);

    const handleSave = async (formData: RegistrationFormData, assetIdToUpdate?: string) => {
        const activityLog: ActivityLogEntry = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            user: currentUser.name,
            action: assetIdToUpdate ? 'Aset Diperbarui' : 'Aset Dicatat',
            details: assetIdToUpdate ? 'Data aset diperbarui.' : `Aset baru dicatat.`,
            referenceId: formData.relatedRequestId || undefined
        };
        
        const baseAsset: Omit<Asset, 'id'> = {
            ...formData,
            name: formData.assetName,
            purchasePrice: formData.purchasePrice || 0,
            attachments: formData.attachments,
            activityLog: [activityLog],
            status: AssetStatus.IN_STORAGE
        };

        try {
             if (assetIdToUpdate) {
                 // Editing
                 await updateAsset(assetIdToUpdate, baseAsset);
                 addNotificationUI(`Aset ${assetIdToUpdate} berhasil diperbarui.`, 'success');
             } else {
                 // Creating New
                 const newAssets = formData.bulkItems.map((item, index) => {
                     const newId = `AST-${String(assets.length + index + 1).padStart(4, '0')}`;
                     return {
                         ...baseAsset,
                         id: newId,
                         serialNumber: item.serialNumber || undefined,
                         macAddress: item.macAddress || undefined
                     } as Asset;
                 });
                 
                 for (const asset of newAssets) {
                     await addAsset(asset);
                 }
                 
                 if (formData.relatedRequestId && prefillData?.itemToRegister) {
                     // Update Request Status Parsial
                     const allDone = await updateRequestRegistration(formData.relatedRequestId, prefillData.itemToRegister.id, newAssets.length);
                     if (allDone) {
                         addNotificationUI(`Semua item untuk request ${formData.relatedRequestId} telah dicatat.`, 'success');
                     }
                 }
                 
                 addNotificationUI(`${newAssets.length} aset berhasil dicatat.`, 'success');
             }
             
             if (prefillData) onClearPrefill();
             if (itemToEdit) onClearItemToEdit();
             setView('list');
             setAssetToEdit(null);
        } catch (e) {
            addNotificationUI('Gagal menyimpan data aset.', 'error');
        }
    };
    
    const handleDelete = async (id: string) => {
        await deleteAsset(id);
        addNotificationUI(`Aset ${id} dihapus.`, 'success');
    };

    const handleStartScan = (itemId: number) => {
        setScanContext('form');
        setFormScanCallback(() => (data: ParsedScanResult) => {
            setBulkItems(prev => prev.map(item => {
                if (item.id === itemId) {
                     return { ...item, serialNumber: data.serialNumber || item.serialNumber, macAddress: data.macAddress || item.macAddress };
                }
                return item;
            }));
        });
        setIsGlobalScannerOpen(true);
    };

    if (view === 'form') {
        return (
             <div className="p-4 sm:p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold text-tm-dark">{assetToEdit ? 'Edit Aset' : 'Catat Aset Baru'}</h1>
                    <button onClick={() => { setView('list'); setAssetToEdit(null); if(prefillData) onClearPrefill(); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Kembali</button>
                </div>
                <div className="p-4 sm:p-6 bg-white border border-gray-200/80 rounded-xl shadow-md pb-24">
                    <RegistrationForm 
                        onBack={() => { setView('list'); setAssetToEdit(null); }} 
                        onSave={handleSave} 
                        prefillData={prefillData}
                        editingAsset={assetToEdit}
                        currentUser={currentUser}
                        onStartScan={handleStartScan}
                        bulkItems={bulkItems}
                        setBulkItems={setBulkItems}
                        assetCategories={assetCategories}
                        openModelModal={openModelModal}
                        openTypeModal={openTypeModal}
                        setActivePage={setActivePage}
                    />
                </div>
                
                {/* Local Modals */}
                {modelModalState.isOpen && modelModalState.category && modelModalState.type && (
                    <ModelManagementModal 
                        isOpen={modelModalState.isOpen}
                        onClose={() => setModelModalState({ ...modelModalState, isOpen: false })}
                        parentInfo={{ category: modelModalState.category, type: modelModalState.type }}
                    />
                )}
                {typeModalState.isOpen && typeModalState.category && (
                    <TypeManagementModal 
                        isOpen={typeModalState.isOpen}
                        onClose={() => setTypeModalState({ ...typeModalState, isOpen: false })}
                        parentCategory={typeModalState.category}
                        typeToEdit={typeModalState.typeToEdit}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                <h1 className="text-3xl font-bold text-tm-dark">Daftar Aset</h1>
                <div className="flex items-center space-x-2">
                    <button onClick={() => exportToCSV(assets, 'daftar_aset.csv')} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border rounded-lg shadow-sm hover:bg-gray-50"><ExportIcon className="w-4 h-4"/> Export CSV</button>
                    <button onClick={() => setView('form')} className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover">Catat Aset Baru</button>
                </div>
            </div>
            <div className="p-4 mb-4 bg-white border border-gray-200/80 rounded-xl shadow-md"><div className="relative"><SearchIcon className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 top-1/2 left-3" /><input type="text" placeholder="Cari aset..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-10 py-2 pl-10 pr-4 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-tm-accent focus:border-tm-accent" /></div></div>
            <div className="overflow-hidden bg-white border border-gray-200/80 rounded-xl shadow-md">
                <div className="overflow-x-auto custom-scrollbar">
                    <RegistrationTable assets={paginatedAssets} onDetailClick={(asset) => onShowPreview({ type: 'asset', id: asset.id })} onDeleteClick={handleDelete} sortConfig={sortConfig} requestSort={requestSort} selectedAssetIds={selectedAssetIds} onSelectAll={(e) => setSelectedAssetIds(e.target.checked ? paginatedAssets.map(a => a.id) : [])} onSelectOne={(id) => setSelectedAssetIds(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])} isBulkSelectMode={isBulkSelectMode} onEnterBulkMode={() => setIsBulkSelectMode(true)} onShowPreview={onShowPreview} />
                </div>
                <PaginationControls currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }} startIndex={startIndex} endIndex={endIndex} />
            </div>
        </div>
    );
};

export default ItemRegistration;
