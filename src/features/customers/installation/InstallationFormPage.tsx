
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Page, User, Installation, Customer, Asset, PreviewData, ItemStatus, InstallationAsset, InstallationMaterial, AssetStatus, AssetCategory, Division } from '../../../types';
import { useSortableData, SortConfig } from '../../../hooks/useSortableData';
import { useNotification } from '../../../providers/NotificationProvider';
import { PaginationControls } from '../../../components/ui/PaginationControls';
import { SearchIcon } from '../../../components/icons/SearchIcon';
import { InboxIcon } from '../../../components/icons/InboxIcon';
import { SortIcon } from '../../../components/icons/SortIcon';
import { SortAscIcon } from '../../../components/icons/SortAscIcon';
import { SortDescIcon } from '../../../components/icons/SortDescIcon';
import { EyeIcon } from '../../../components/icons/EyeIcon';
import { generateDocumentNumber } from '../../../utils/documentNumberGenerator';
import DatePicker from '../../../components/ui/DatePicker';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import { TrashIcon } from '../../../components/icons/TrashIcon';
import { Letterhead } from '../../../components/ui/Letterhead';
import { SignatureStamp } from '../../../components/ui/SignatureStamp';
import { SpinnerIcon } from '../../../components/icons/SpinnerIcon';
import FloatingActionBar from '../../../components/ui/FloatingActionBar';
import { DetailPageLayout } from '../../../components/layout/DetailPageLayout';
import { ClickableLink } from '../../../components/ui/ClickableLink';
import { FileSignatureIcon } from '../../../components/icons/FileSignatureIcon';
import { PlusIcon } from '../../../components/icons/PlusIcon';
import { FilterIcon } from '../../../components/icons/FilterIcon';
import { CloseIcon } from '../../../components/icons/CloseIcon';

// Stores
import { useTransactionStore } from '../../../stores/useTransactionStore';
import { useAssetStore } from '../../../stores/useAssetStore';
import { useMasterDataStore } from '../../../stores/useMasterDataStore';
import { useAuthStore } from '../../../stores/useAuthStore';

// Main Props Interface
interface InstallationFormPageProps {
    currentUser: User; // Optional
    // Legacy props
    installations?: Installation[];
    customers?: Customer[];
    assets?: Asset[];
    users?: User[];
    divisions?: Division[];
    assetCategories?: AssetCategory[];
    onSaveInstallation?: any; // Handled by store

    setActivePage: (page: Page, filters?: any) => void;
    pageInitialState: { prefillCustomer?: string; openDetailForId?: string };
    onShowPreview: (data: PreviewData) => void;
}

// FIX: Add SortableHeader for InstallationTable
const SortableHeader: React.FC<{
    children: React.ReactNode;
    columnKey: keyof Installation;
    sortConfig: SortConfig<Installation> | null;
    requestSort: (key: keyof Installation) => void;
}> = ({ children, columnKey, sortConfig, requestSort }) => {
    const isSorted = sortConfig?.key === columnKey;
    const direction = isSorted ? sortConfig.direction : undefined;

    const getSortIcon = () => {
        if (!isSorted) return <SortIcon className="w-4 h-4 text-gray-400" />;
        if (direction === 'ascending') return <SortAscIcon className="w-4 h-4 text-tm-accent" />;
        return <SortDescIcon className="w-4 h-4 text-tm-accent" />;
    };

    return (
        <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500">
            <button onClick={() => requestSort(columnKey)} className="flex items-center space-x-1 group">
                <span>{children}</span>
                <span className="opacity-50 group-hover:opacity-100">{getSortIcon()}</span>
            </button>
        </th>
    );
};

// FIX: Add missing InstallationTable component
const InstallationTable: React.FC<{
    installations: Installation[];
    onDetailClick: (installation: Installation) => void;
    sortConfig: SortConfig<Installation> | null;
    requestSort: (key: keyof Installation) => void;
}> = ({ installations, onDetailClick, sortConfig, requestSort }) => (
    <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
            <tr>
                <SortableHeader columnKey="docNumber" sortConfig={sortConfig} requestSort={requestSort}>No. Dokumen / Tanggal</SortableHeader>
                <SortableHeader columnKey="customerName" sortConfig={sortConfig} requestSort={requestSort}>Pelanggan</SortableHeader>
                <SortableHeader columnKey="technician" sortConfig={sortConfig} requestSort={requestSort}>Teknisi</SortableHeader>
                <SortableHeader columnKey="status" sortConfig={sortConfig} requestSort={requestSort}>Status</SortableHeader>
                <th className="relative px-6 py-3"><span className="sr-only">Aksi</span></th>
            </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
            {installations.map(inst => (
                <tr key={inst.id} onClick={() => onDetailClick(inst)} className="cursor-pointer hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{inst.docNumber}</div>
                        <div className="text-xs text-gray-500">{new Date(inst.installationDate).toLocaleDateString('id-ID')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{inst.customerName}</div>
                        <div className="text-xs text-gray-500">{inst.customerId}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800 whitespace-nowrap">{inst.technician}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-success-light text-success-text">{inst.status}</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-right">
                        <button className="p-2 text-gray-500 rounded-full hover:bg-info-light hover:text-info-text"><EyeIcon className="w-5 h-5"/></button>
                    </td>
                </tr>
            ))}
        </tbody>
    </table>
);

// FIX: Add missing InstallationForm component
const InstallationForm: React.FC<{
    currentUser: User;
    customers: Customer[];
    assets: Asset[];
    users: User[];
    installations: Installation[];
    assetCategories: AssetCategory[];
    onSave: (data: Omit<Installation, 'id'|'status'>) => void;
    divisions: Division[];
    onCancel: () => void;
    prefillCustomerId?: string;
}> = ({ currentUser, customers, assets, users, installations, assetCategories, onSave, onCancel, prefillCustomerId, divisions }) => {
    
    const [installationDate, setInstallationDate] = useState<Date | null>(new Date());
    const [docNumber, setDocNumber] = useState('');
    const [requestNumber, setRequestNumber] = useState('');
    const [technician, setTechnician] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState(prefillCustomerId || '');
    const [assetsInstalled, setAssetsInstalled] = useState<InstallationAsset[]>([]);
    const [materialsUsed, setMaterialsUsed] = useState<{ id: number; modelKey: string; quantity: number | ''; unit: string; }[]>([]);
    const [notes, setNotes] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const footerRef = useRef<HTMLDivElement>(null);
    const [isFooterVisible, setIsFooterVisible] = useState(true);
    const formId = "installation-form";
    const addNotification = useNotification();

    const technicianOptions = useMemo(() => users.filter(u => u.divisionId === 3).map(u => ({ value: u.name, label: u.name })), [users]);
    const customerOptions = useMemo(() => customers.map(c => ({ value: c.id, label: `${c.name} (${c.id})` })), [customers]);
    const selectedCustomer = useMemo(() => customers.find(c => c.id === selectedCustomerId), [customers, selectedCustomerId]);
    const ceo = useMemo(() => users.find(u => u.role === 'Super Admin'), [users]);
    const logisticAdmin = useMemo(() => users.find(u => u.role === 'Admin Logistik'), [users]);

    const getDivisionForUser = (userName: string): string | undefined => {
        const user = users.find(u => u.name === userName);
        if (user && user.divisionId) {
            return divisions.find(d => d.id === user.divisionId)?.name;
        }
        return undefined;
    };

    const installableAssets = useMemo(() => {
        const assignedIds = assetsInstalled.map(a => a.assetId);
        return assets.filter(asset => {
            const category = assetCategories.find(c => c.name === asset.category);
            const type = category?.types.find(t => t.name === asset.type);
            return category?.isCustomerInstallable && 
                   asset.status === AssetStatus.IN_STORAGE && 
                   !assignedIds.includes(asset.id) &&
                   type?.trackingMethod !== 'bulk';
        });
    }, [assets, assetCategories, assetsInstalled]);
    
    const materialOptions = useMemo(() => {
        const items: { value: string, label: string, unit: string }[] = [];
        assetCategories.forEach(cat => {
            if (cat.isCustomerInstallable) {
                cat.types.forEach(type => {
                     if (type.trackingMethod === 'bulk') {
                        (type.standardItems || []).forEach(item => {
                            items.push({
                                value: `${item.name}|${item.brand}`,
                                label: `${item.name} - ${item.brand}`,
                                unit: type.baseUnitOfMeasure || 'pcs'
                            });
                        });
                    }
                });
            }
        });
        return items;
    }, [assetCategories]);

    useEffect(() => {
        if (materialsUsed.length === 0) { // Only pre-fill on initial render for a new form
            const requiredMaterials = [
                { name: 'Kabel Dropcore 1 Core 150m', brand: 'FiberHome', defaultQty: 50 },
                { name: 'Kabel UTP Cat6 305m', brand: 'Belden', defaultQty: 10 },
                { name: 'Patchcord SC-UPC 3M', brand: 'Generic', defaultQty: 2 },
                { name: 'Adaptor 12V 1A', brand: 'Generic', defaultQty: 1 }
            ];
    
            const defaultMaterials = requiredMaterials
                .map((mat, index) => {
                    const modelKey = `${mat.name}|${mat.brand}`;
                    const option = materialOptions.find(opt => opt.value === modelKey);
                    if (option) {
                        return {
                            id: Date.now() + index,
                            modelKey: modelKey,
                            quantity: mat.defaultQty,
                            unit: option.unit
                        };
                    }
                    return null;
                })
                .filter((m): m is { id: number; modelKey: string; quantity: number; unit: string; } => m !== null);
            
            setMaterialsUsed(defaultMaterials);
        }
    }, [materialOptions]);

    useEffect(() => {
        const newDocNumber = generateDocumentNumber('INST', installations, installationDate || new Date());
        setDocNumber(newDocNumber);
    }, [installationDate, installations]);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => setIsFooterVisible(entry.isIntersecting), { threshold: 0.1 });
        const currentRef = footerRef.current;
        if (currentRef) observer.observe(currentRef);
        return () => { if (currentRef) observer.unobserve(currentRef); };
    }, []);

    const handleAddAsset = (assetId: string) => {
        const asset = assets.find(a => a.id === assetId);
        if (asset && !assetsInstalled.some(a => a.assetId === assetId)) {
            setAssetsInstalled(prev => [...prev, { assetId: asset.id, assetName: asset.name, serialNumber: asset.serialNumber ?? undefined }]);
        }
    };
    const handleRemoveAsset = (assetId: string) => {
        setAssetsInstalled(prev => prev.filter(a => a.assetId !== assetId));
    };

    const handleAddMaterial = () => {
        setMaterialsUsed(prev => [...prev, { id: Date.now(), modelKey: '', quantity: 1, unit: 'pcs' }]);
    };
    const handleRemoveMaterial = (id: number) => {
        setMaterialsUsed(prev => prev.filter(m => m.id !== id));
    };
    const handleMaterialChange = (id: number, field: 'modelKey' | 'quantity', value: any) => {
        setMaterialsUsed(prev => prev.map(item => {
            if (item.id === id) {
                const updatedItem = { ...item, [field]: value };
                if (field === 'modelKey') {
                    const model = materialOptions.find(opt => opt.value === value);
                    updatedItem.unit = model?.unit || 'pcs';
                }
                return updatedItem;
            }
            return item;
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomerId || !technician) {
            addNotification('Pelanggan dan Teknisi harus dipilih.', 'error');
            return;
        }
        if (assetsInstalled.length === 0 && materialsUsed.filter(m => m.modelKey && m.quantity).length === 0) {
            addNotification('Tambahkan setidaknya satu aset atau material yang dipasang.', 'error');
            return;
        }

        setIsLoading(true);

        const finalMaterials = materialsUsed
            .filter(m => m.modelKey && m.quantity && Number(m.quantity) > 0)
            .map(m => {
                const [name, brand] = m.modelKey.split('|');
                const materialAsset = assets.find(a => {
                    const type = assetCategories.flatMap(c => c.types).find(t => t.standardItems?.some(si => si.name === name));
                    return a.name === name && a.brand === brand && type?.trackingMethod === 'bulk';
                });
                return { 
                    materialAssetId: materialAsset?.id,
                    itemName: name, 
                    brand: brand, 
                    quantity: Number(m.quantity), 
                    unit: m.unit 
                };
            });

        setTimeout(() => {
            onSave({
                docNumber,
                requestNumber: requestNumber || undefined,
                installationDate: installationDate!.toISOString().split('T')[0],
                technician,
                customerId: selectedCustomer!.id,
                customerName: selectedCustomer!.name,
                assetsInstalled,
                materialsUsed: finalMaterials.length > 0 ? finalMaterials : undefined,
                notes,
                acknowledger: ceo?.name,
                createdBy: currentUser.name,
            });
            setIsLoading(false);
        }, 800);
    };

    const ActionButtons:React.FC<{formId: string}> = ({formId}) => (
        <>
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
            <button type="submit" form={formId} disabled={isLoading} className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover disabled:bg-tm-primary/70">
                {isLoading && <SpinnerIcon className="w-4 h-4 mr-2" />} Simpan Laporan
            </button>
        </>
    );

    const isTechnician = currentUser.role === 'Staff';
    const stampLayout = isTechnician 
        ? [
            { title: 'Dibuat Oleh', name: currentUser.name, division: getDivisionForUser(currentUser.name) },
            { title: 'Logistik', name: logisticAdmin?.name, division: getDivisionForUser(logisticAdmin?.name || '') },
            { title: 'Mengetahui', name: ceo?.name, division: getDivisionForUser(ceo?.name || '') }
          ]
        : [
            { title: 'Dibuat Oleh', name: currentUser.name, division: getDivisionForUser(currentUser.name) },
            { title: 'Teknisi', name: technician, division: getDivisionForUser(technician) },
            { title: 'Mengetahui', name: ceo?.name, division: getDivisionForUser(ceo?.name || '') }
          ];

    return (
        <>
            <form id={formId} onSubmit={handleSubmit} className="space-y-6">
                <Letterhead />
                 <div className="text-center">
                    <h3 className="text-xl font-bold uppercase text-tm-dark">Berita Acara Instalasi</h3>
                </div>
                <section className="p-4 border-t border-b">
                    <h4 className="font-semibold text-gray-800 border-b pb-1 mb-4">Informasi Dokumen</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label className="block text-sm font-medium text-gray-700">Tanggal Instalasi</label><DatePicker id="instDate" selectedDate={installationDate} onDateChange={setInstallationDate} /></div>
                        <div><label className="block text-sm font-medium text-gray-700">Teknisi</label><CustomSelect options={technicianOptions} value={technician} onChange={setTechnician} /></div>
                        <div><label className="block text-sm font-medium text-gray-700">No. Dokumen</label><input type="text" value={docNumber} readOnly className="w-full mt-1 p-2 bg-gray-100 border rounded-md text-gray-600" /></div>
                        <div><label className="block text-sm font-medium text-gray-700">No. Request Terkait (Opsional)</label><input type="text" value={requestNumber} onChange={e => setRequestNumber(e.target.value)} className="w-full mt-1 p-2 bg-white border border-gray-300 rounded-md shadow-sm" placeholder="Contoh: REQ-123"/></div>
                    </div>
                </section>
                <section>
                    <h4 className="font-semibold text-gray-800 border-b pb-1 mb-4">Informasi Pelanggan</h4>
                    <CustomSelect options={customerOptions} value={selectedCustomerId} onChange={setSelectedCustomerId} isSearchable placeholder="Cari pelanggan..." disabled={!!prefillCustomerId}/>
                    {selectedCustomer && (
                        <div className="mt-4 overflow-hidden border border-gray-200 rounded-lg">
                            <table className="w-full text-left text-sm">
                                <tbody>
                                    <tr className="border-b">
                                        <td className="p-3 font-medium text-gray-500 bg-gray-50 w-1/3">Nama Pelanggan</td>
                                        <td className="p-3 font-semibold text-gray-800">{selectedCustomer.name}</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-3 font-medium text-gray-500 bg-gray-50">ID Pelanggan</td>
                                        <td className="p-3 font-mono text-gray-600">{selectedCustomer.id}</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-3 font-medium text-gray-500 bg-gray-50">Alamat</td>
                                        <td className="p-3 text-gray-600">{selectedCustomer.address}</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-3 font-medium text-gray-500 bg-gray-50">Kontak</td>
                                        <td className="p-3 text-gray-600">{selectedCustomer.phone}</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 font-medium text-gray-500 bg-gray-50">Layanan</td>
                                        <td className="p-3 text-gray-600">{selectedCustomer.servicePackage}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
                <section>
                    <h4 className="font-semibold text-gray-800 border-b pb-1 mb-4">Aset & Material Terpasang</h4>
                    {/* Assets */}
                    <div className="p-4 border rounded-lg bg-gray-50/50">
                        <h5 className="font-semibold text-gray-700 mb-2">Perangkat Terpasang</h5>
                        <CustomSelect options={installableAssets.map(a => ({ value: a.id, label: `${a.name} (SN: ${a.serialNumber || 'N/A'})`}))} value="" onChange={handleAddAsset} placeholder="Tambah perangkat dari gudang..." isSearchable/>
                        <div className="mt-2 space-y-2">
                            {assetsInstalled.map(asset => (
                                <div key={asset.assetId} className="flex items-center justify-between p-2 text-sm bg-white border rounded-md"><span className="font-medium">{asset.assetName} <span className="font-mono text-xs">({asset.assetId})</span></span><button type="button" onClick={() => handleRemoveAsset(asset.assetId)} className="p-1 text-red-500 rounded-full hover:bg-red-100"><TrashIcon className="w-4 h-4" /></button></div>
                            ))}
                        </div>
                    </div>
                    {/* Materials */}
                    <div className="p-4 mt-4 border rounded-lg bg-gray-50/50">
                        <h5 className="font-semibold text-gray-700 mb-2">Material Terpakai</h5>
                        <div className="space-y-3">
                            {materialsUsed.map(material => (
                                <div key={material.id} className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-6"><CustomSelect options={materialOptions} value={material.modelKey} onChange={v => handleMaterialChange(material.id, 'modelKey', v)} isSearchable placeholder="Pilih material..."/></div>
                                    <div className="col-span-4 relative">
                                        <input type="number" value={material.quantity} onChange={e => handleMaterialChange(material.id, 'quantity', e.target.value)} min="1" className="block w-full px-3 py-2 pr-12 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg shadow-sm" placeholder="Jumlah"/>
                                        <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-gray-500 pointer-events-none">{material.unit}</span>
                                    </div>
                                    <div className="col-span-2"><button type="button" onClick={() => handleRemoveMaterial(material.id)} className="w-full h-10 flex items-center justify-center text-red-500 bg-white border rounded-lg shadow-sm hover:bg-red-50"><TrashIcon className="w-5 h-5"/></button></div>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={handleAddMaterial} className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-tm-accent rounded-md shadow-sm hover:bg-tm-primary"><PlusIcon/>Tambah Material</button>
                    </div>
                </section>

                <section className="pt-8 mt-8 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-3 text-center text-sm gap-6">
                        {stampLayout.map(stamp => (
                            <div key={stamp.title}>
                                <p className="font-semibold text-gray-600">{stamp.title},</p>
                                <div className="flex items-center justify-center mt-2 h-28">
                                    {stamp.name ? (
                                        <SignatureStamp 
                                            signerName={stamp.name} 
                                            signatureDate={installationDate?.toISOString() || ''} 
                                            signerDivision={stamp.division} 
                                        />
                                    ) : (
                                        <div className="w-40 h-24 border-2 border-dashed rounded-md flex items-center justify-center text-gray-400 italic">
                                            Menunggu
                                        </div>
                                    )}
                                </div>
                                <p className="pt-1 mt-2 border-t border-gray-400">({stamp.name || '.........................'})</p>
                            </div>
                        ))}
                    </div>
                </section>

                 <div ref={footerRef} className="flex justify-end pt-5 mt-5 space-x-3 border-t">
                    <ActionButtons formId={formId} />
                </div>
            </form>
             <FloatingActionBar isVisible={!isFooterVisible}>
                <ActionButtons formId={formId} />
            </FloatingActionBar>
        </>
    );
};

// Helper component for DetailPage
const DetailItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div><dt className="text-sm font-medium text-gray-500">{label}</dt><dd className="mt-1 text-gray-900">{children}</dd></div>
);


// FIX: Add missing InstallationDetailPage component
const InstallationDetailPage: React.FC<{
    installation: Installation;
    onBackToList: () => void;
    onShowPreview: (data: PreviewData) => void;
    assets: Asset[];
    customers: Customer[];
    users: User[];
    divisions: Division[];
}> = ({ installation, onBackToList, onShowPreview, assets, customers, users, divisions }) => {
    const customer = useMemo(() => customers.find(c => c.id === installation.customerId), [customers, installation.customerId]);
    
    const getDivisionForUser = (userName: string): string | undefined => {
        const user = users.find(u => u.name === userName);
        if (user && user.divisionId) {
            return divisions.find(d => d.id === user.divisionId)?.name;
        }
        return undefined;
    };

    const isTechnician = users.find(u => u.name === installation.createdBy)?.role === 'Staff';
    const stampLayout = isTechnician 
        ? [
            { title: 'Dibuat Oleh', name: installation.createdBy, division: getDivisionForUser(installation.createdBy || '') },
            { title: 'Logistik', name: installation.technician, division: getDivisionForUser(installation.technician) }, // Assuming technician is filled by logistic here
            { title: 'Mengetahui', name: installation.acknowledger, division: getDivisionForUser(installation.acknowledger || '') }
          ]
        : [
            { title: 'Dibuat Oleh', name: installation.createdBy, division: getDivisionForUser(installation.createdBy || '') },
            { title: 'Teknisi', name: installation.technician, division: getDivisionForUser(installation.technician) },
            { title: 'Mengetahui', name: installation.acknowledger, division: getDivisionForUser(installation.acknowledger || '') }
          ];


    return (
    <DetailPageLayout
        title={`Detail Instalasi: ${installation.docNumber}`}
        onBack={onBackToList}
    >
        <div className="p-8 bg-white border rounded-lg shadow-sm">
            <Letterhead />
            <div className="text-center my-8">
                <h3 className="text-xl font-bold uppercase text-tm-dark">Berita Acara Instalasi</h3>
                <p className="text-sm text-tm-secondary">Dokumen : {installation.docNumber}</p>
            </div>
            
            <section className="space-y-4 text-sm mb-6">
                <h4 className="font-semibold text-gray-800 border-b pb-1 mb-4">Informasi Dokumen</h4>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DetailItem label="Nomor Dokumen">{installation.docNumber}</DetailItem>
                    <DetailItem label="Nomor Request Terkait">{installation.requestNumber || '-'}</DetailItem>
                    <DetailItem label="Tanggal Instalasi">{new Date(installation.installationDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</DetailItem>
                    <DetailItem label="Teknisi">{installation.technician}</DetailItem>
                </dl>
            </section>
            
            <section className="mt-6 pt-6 border-t">
                 <h4 className="font-semibold text-gray-800 border-b pb-1 mb-4">Informasi Pelanggan</h4>
                <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-left text-sm">
                        <tbody>
                            <tr className="border-b">
                                <td className="p-3 font-medium text-gray-500 w-1/3">Nama Pelanggan</td>
                                <td className="p-3 font-semibold text-gray-800">
                                    {customer ? <ClickableLink onClick={() => onShowPreview({ type: 'customer', id: customer.id })}>{customer.name}</ClickableLink> : '-'}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <td className="p-3 font-medium text-gray-500">ID Pelanggan</td>
                                <td className="p-3 font-mono text-gray-600">{customer?.id || '-'}</td>
                            </tr>
                            <tr className="border-b">
                                <td className="p-3 font-medium text-gray-500">Alamat</td>
                                <td className="p-3 text-gray-600">{customer?.address || '-'}</td>
                            </tr>
                            <tr className="border-b">
                                <td className="p-3 font-medium text-gray-500">Kontak</td>
                                <td className="p-3 text-gray-600">{customer?.phone || '-'}</td>
                            </tr>
                            <tr className="border-b">
                                <td className="p-3 font-medium text-gray-500">Layanan</td>
                                <td className="p-3 text-gray-600">{customer?.servicePackage || '-'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>
            
            <section className="mt-6 pt-6 border-t">
                <h4 className="font-semibold text-gray-800 mb-4">Aset Terpasang</h4>
                <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                            <tr>
                                <th className="p-3 w-10">No.</th>
                                <th className="p-3">Nama Aset</th>
                                <th className="p-3">ID Aset</th>
                                <th className="p-3">Serial Number</th>
                                <th className="p-3">MAC Address</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {installation.assetsInstalled.map((asset, index) => {
                                const fullAsset = assets.find(a => a.id === asset.assetId);
                                return (
                                <tr key={asset.assetId} className="border-b">
                                    <td className="p-3 text-center text-gray-800">{index + 1}.</td>
                                    <td className="p-3 font-semibold text-gray-800">
                                        <ClickableLink onClick={() => onShowPreview({ type: 'asset', id: asset.assetId })}>
                                            {asset.assetName}
                                        </ClickableLink>
                                    </td>
                                    <td className="p-3 font-mono text-gray-600">{asset.assetId}</td>
                                    <td className="p-3 font-mono text-gray-600">{asset.serialNumber || 'N/A'}</td>
                                    <td className="p-3 font-mono text-gray-600">{fullAsset?.macAddress || 'N/A'}</td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </section>
            
            {installation.materialsUsed && installation.materialsUsed.length > 0 && (
                 <section className="mt-6 pt-6 border-t">
                    <h4 className="font-semibold text-gray-800 mb-4">Material Terpakai</h4>
                    <div className="overflow-x-auto border rounded-lg">
                       <table className="min-w-full text-left text-sm">
                            <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                                <tr>
                                    <th className="p-3 w-10">No.</th>
                                    <th className="p-3">Nama Material</th>
                                    <th className="p-3">ID Aset</th>
                                    <th className="p-3">Brand</th>
                                    <th className="p-3">Jumlah</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {installation.materialsUsed.map((material, index) => (
                                    <tr key={index} className="border-b">
                                        <td className="p-3 text-center text-gray-800">{index + 1}.</td>
                                        <td className="p-3 font-semibold text-gray-800">{material.itemName}</td>
                                        <td className="p-3 font-mono text-gray-600">{material.materialAssetId || 'N/A'}</td>
                                        <td className="p-3 text-gray-600">{material.brand}</td>
                                        <td className="p-3 font-medium text-gray-800">{material.quantity} {material.unit}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            <section className="pt-8 mt-8 border-t">
                <div className="grid grid-cols-1 md:grid-cols-3 text-center text-sm gap-6">
                    {stampLayout.map(stamp => (
                        <div key={stamp.title}>
                            <p className="font-semibold text-gray-600">{stamp.title},</p>
                            <div className="flex items-center justify-center mt-2 h-28">
                                {stamp.name ? (
                                    <SignatureStamp
                                        signerName={stamp.name}
                                        signatureDate={installation.installationDate}
                                        signerDivision={stamp.division}
                                    />
                                ) : (
                                    <div className="w-40 h-24 border-2 border-dashed rounded-md flex items-center justify-center text-gray-400 italic">
                                        Menunggu
                                    </div>
                                )}
                            </div>
                            <p className="pt-1 mt-2 border-t border-gray-400">({stamp.name || '.........................'})</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    </DetailPageLayout>
)};


const InstallationFormPage: React.FC<InstallationFormPageProps> = (props) => {
    const { currentUser: propUser, pageInitialState, onShowPreview, setActivePage } = props;
    const prefillCustomerId = pageInitialState?.prefillCustomer;
    const openDetailForId = pageInitialState?.openDetailForId;
    
    // Stores
    const installations = useTransactionStore((state) => state.installations);
    const addInstallation = useTransactionStore((state) => state.addInstallation);
    
    const assets = useAssetStore((state) => state.assets);
    const assetCategories = useAssetStore((state) => state.categories);
    const updateAsset = useAssetStore((state) => state.updateAsset);

    const customers = useMasterDataStore((state) => state.customers);
    const updateCustomer = useMasterDataStore((state) => state.updateCustomer);
    
    const users = useMasterDataStore((state) => state.users);
    const divisions = useMasterDataStore((state) => state.divisions);
    
    const storeUser = useAuthStore((state) => state.currentUser);
    const currentUser = storeUser || propUser;

    const [view, setView] = useState<'list' | 'form' | 'detail'>('list');
    const [selectedInstallation, setSelectedInstallation] = useState<Installation | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const addNotification = useNotification();
    
    // Filter State
    const initialFilterState = { technician: '', startDate: null, endDate: null };
    const [filters, setFilters] = useState<{ technician: string; startDate: Date | null; endDate: Date | null; }>(initialFilterState);
    const [tempFilters, setTempFilters] = useState(filters);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const filterPanelRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
                setIsFilterPanelOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => { document.removeEventListener("mousedown", handleClickOutside); };
    }, [filterPanelRef]);

    const activeFilterCount = useMemo(() => {
        return Object.values(filters).filter(Boolean).length;
    }, [filters]);

    const handleResetFilters = () => {
        setFilters(initialFilterState);
        setTempFilters(initialFilterState);
        setIsFilterPanelOpen(false);
    };

    const handleApplyFilters = () => {
        setFilters(tempFilters);
        setIsFilterPanelOpen(false);
    };
    
    const handleRemoveFilter = (key: keyof typeof filters) => {
        setFilters((prev) => ({ ...prev, [key]: key === 'startDate' || key === 'endDate' ? null : "" }));
        setTempFilters((prev) => ({ ...prev, [key]: key === 'startDate' || key === 'endDate' ? null : "" }));
    };

    const technicianOptions = useMemo(() => {
         // Fix: Explicitly type techNames as string array to prevent 'unknown' type inference in CustomSelect options.
         const techNames: string[] = Array.from(new Set(users.filter(u => u.divisionId === 3).map(u => u.name)));
         return techNames.map(name => ({ value: name, label: name }));
    }, [users]);


    useEffect(() => {
        if (prefillCustomerId) {
            setView('form');
        } else if (openDetailForId) {
            const installationToView = installations.find(i => i.id === openDetailForId);
            if (installationToView) {
                setSelectedInstallation(installationToView);
                setView('detail');
            } else {
                addNotification(`Laporan instalasi dengan ID ${openDetailForId} tidak ditemukan.`, 'error');
            }
        }
    }, [prefillCustomerId, openDetailForId, installations, addNotification]);

    const handleSetView = (newView: 'list' | 'form' | 'detail') => {
        if (newView === 'list') {
            setSelectedInstallation(null);
            // Clear any prefill state by navigating back to the list
            setActivePage('customer-installation-form');
        }
        setView(newView);
    };
    
    const handleShowDetails = (installation: Installation) => {
        setSelectedInstallation(installation);
        setView('detail');
    };

    const handleSave = async (installationData: Omit<Installation, 'id' | 'status'>) => {
        const newInstallation: Installation = {
            ...installationData,
            id: `INST-${String(installations.length + 1).padStart(3, '0')}`,
            status: ItemStatus.COMPLETED,
        };
        
        await addInstallation(newInstallation);

        // Update assets status and location
        for (const item of installationData.assetsInstalled) {
            if (item.assetId) {
                await updateAsset(item.assetId, {
                    status: AssetStatus.IN_USE,
                    currentUser: installationData.customerId,
                    location: `Terpasang di: ${installationData.customerName}`,
                    activityLog: [
                         // Append log if possible or handled by store update logic
                    ]
                });
                // Note: activity log appending is simplified here for mock store.
                // In real app, backend handles it.
            }
        }

        // Update customer's installed materials
        if (installationData.materialsUsed && installationData.materialsUsed.length > 0) {
             const customer = customers.find(c => c.id === installationData.customerId);
             if (customer) {
                 const existingMaterials = customer.installedMaterials || [];
                 const updatedMaterials = [...existingMaterials];

                 installationData.materialsUsed!.forEach((newMat) => {
                    const existingMatIndex = updatedMaterials.findIndex(
                      (em) => em.itemName === newMat.itemName && em.brand === newMat.brand
                    );
                    if (existingMatIndex > -1) {
                      updatedMaterials[existingMatIndex] = {
                        ...updatedMaterials[existingMatIndex],
                        quantity: updatedMaterials[existingMatIndex].quantity + newMat.quantity,
                      };
                    } else {
                      updatedMaterials.push({
                        ...newMat,
                        installationDate: installationData.installationDate,
                      });
                    }
                 });
                 
                 await updateCustomer(customer.id, { installedMaterials: updatedMaterials });
             }
        }

        addNotification(`Berita acara instalasi ${newInstallation.docNumber} berhasil dibuat.`, 'success');
        handleSetView('list');
    };

    const filteredInstallations = useMemo(() => {
        let tempInstallations = installations;
        if (currentUser.role === 'Staff') {
            tempInstallations = tempInstallations.filter(inst => inst.technician === currentUser.name);
        }
        return tempInstallations
            .filter(inst => {
                const searchLower = searchQuery.toLowerCase();
                return inst.docNumber.toLowerCase().includes(searchLower) ||
                       inst.customerName.toLowerCase().includes(searchLower) ||
                       inst.technician.toLowerCase().includes(searchLower);
            })
            .filter(inst => {
                let isMatch = true;
                if (filters.technician) isMatch = isMatch && inst.technician === filters.technician;
                if (filters.startDate) {
                     const start = new Date(filters.startDate); start.setHours(0,0,0,0);
                     const instDate = new Date(inst.installationDate); instDate.setHours(0,0,0,0);
                     isMatch = isMatch && instDate >= start;
                }
                if (filters.endDate) {
                     const end = new Date(filters.endDate); end.setHours(23,59,59,999);
                     const instDate = new Date(inst.installationDate);
                     isMatch = isMatch && instDate <= end;
                }
                return isMatch;
            });
    }, [installations, searchQuery, currentUser, filters]);

    const { items: sortedInstallations, requestSort, sortConfig } = useSortableData<Installation>(filteredInstallations, { key: 'installationDate', direction: 'descending' });

    const paginatedInstallations = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedInstallations.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedInstallations, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedInstallations.length / itemsPerPage);

    if (view === 'form') {
        return (
            <div className="p-4 sm:p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold text-tm-dark">Buat Laporan Instalasi</h1>
                    <button onClick={() => setView('list')} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Kembali ke Daftar</button>
                </div>
                <div className="p-4 sm:p-6 bg-white border border-gray-200/80 rounded-xl shadow-md pb-24">
                    <InstallationForm 
                        currentUser={currentUser}
                        customers={customers}
                        assets={assets}
                        users={users}
                        installations={installations}
                        assetCategories={assetCategories}
                        divisions={divisions}
                        onSave={handleSave}
                        onCancel={() => handleSetView('list')}
                        prefillCustomerId={prefillCustomerId}
                    />
                </div>
            </div>
        );
    }
    
    if (view === 'detail' && selectedInstallation) {
        return <InstallationDetailPage 
                    installation={selectedInstallation} 
                    onBackToList={() => handleSetView('list')} 
                    onShowPreview={onShowPreview} 
                    assets={assets}
                    customers={customers}
                    users={users}
                    divisions={divisions}
                />;
    }

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                <h1 className="text-3xl font-bold text-tm-dark">Manajemen Instalasi</h1>
                <button onClick={() => setView('form')} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover">
                    <FileSignatureIcon className="w-4 h-4" />
                    Buat Laporan Baru
                </button>
            </div>
            <div className="p-4 mb-4 bg-white border border-gray-200/80 rounded-xl shadow-md">
                <div className="flex flex-wrap items-center gap-4">
                     <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"> <SearchIcon className="w-5 h-5 text-gray-400" /> </div>
                        <input type="text" placeholder="Cari No. Dokumen, Pelanggan, Teknisi..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-10 py-2 pl-10 pr-4 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-tm-accent focus:border-tm-accent" />
                    </div>
                    <div className="relative" ref={filterPanelRef}>
                        <button
                            onClick={() => { setTempFilters(filters); setIsFilterPanelOpen(p => !p); }}
                            className={`inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-semibold transition-all duration-200 border rounded-lg shadow-sm sm:w-auto 
                                ${activeFilterCount > 0 ? 'bg-tm-light border-tm-accent text-tm-primary' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}
                            `}
                        >
                            <FilterIcon className="w-4 h-4" /> <span>Filter</span> {activeFilterCount > 0 && <span className="px-1.5 py-0.5 text-[10px] font-bold text-white rounded-full bg-tm-primary">{activeFilterCount}</span>}
                        </button>
                        {isFilterPanelOpen && (
                            <>
                                <div onClick={() => setIsFilterPanelOpen(false)} className="fixed inset-0 z-20 bg-black/25 sm:hidden" />
                                <div className="fixed top-32 inset-x-4 z-30 origin-top rounded-xl border border-gray-200 bg-white shadow-lg sm:absolute sm:top-full sm:inset-x-auto sm:right-0 sm:mt-2 sm:w-72">
                                    <div className="flex items-center justify-between p-4 border-b">
                                        <h3 className="text-lg font-semibold text-gray-800">Filter Instalasi</h3>
                                        <button onClick={() => setIsFilterPanelOpen(false)} className="p-1 text-gray-400 rounded-full hover:bg-gray-100"><CloseIcon className="w-5 h-5"/></button>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Teknisi</label>
                                            <CustomSelect options={[{value: '', label: 'Semua Teknisi'}, ...technicianOptions]} value={tempFilters.technician} onChange={v => setTempFilters(f => ({...f, technician: v}))} />
                                        </div>
                                         <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Tanggal Mulai</label>
                                            <DatePicker id="filterStartDate" selectedDate={tempFilters.startDate} onDateChange={date => setTempFilters(f => ({...f, startDate: date}))} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Tanggal Akhir</label>
                                            <DatePicker id="filterEndDate" selectedDate={tempFilters.endDate} onDateChange={date => setTempFilters(f => ({...f, endDate: date}))} />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 border-t">
                                        <button onClick={handleResetFilters} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Reset</button>
                                        <button onClick={handleApplyFilters} className="px-4 py-2 text-sm font-semibold text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover">Terapkan</button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* ACTIVE FILTER CHIPS */}
                {activeFilterCount > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 animate-fade-in-up mt-3">
                        {filters.technician && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-full">
                                Teknisi: <span className="font-bold">{filters.technician}</span>
                                <button onClick={() => handleRemoveFilter('technician')} className="p-0.5 ml-1 rounded-full hover:bg-blue-200 text-blue-500"><CloseIcon className="w-3 h-3" /></button>
                            </span>
                        )}
                        {(filters.startDate || filters.endDate) && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-100 rounded-full">
                                Tanggal: <span className="font-bold">{filters.startDate ? new Date(filters.startDate).toLocaleDateString('id-ID') : '...'} - {filters.endDate ? new Date(filters.endDate).toLocaleDateString('id-ID') : '...'}</span>
                                <button onClick={() => { handleRemoveFilter('startDate'); handleRemoveFilter('endDate'); }} className="p-0.5 ml-1 rounded-full hover:bg-purple-200 text-purple-500"><CloseIcon className="w-3 h-3" /></button>
                            </span>
                        )}
                         <button onClick={handleResetFilters} className="text-xs text-gray-500 hover:text-red-600 hover:underline px-2 py-1">Hapus Semua</button>
                    </div>
                )}
            </div>
            
            <div className="overflow-hidden bg-white border border-gray-200/80 rounded-xl shadow-md">
                <div className="overflow-x-auto custom-scrollbar">
                    {paginatedInstallations.length > 0 ? (
                        <InstallationTable installations={paginatedInstallations} onDetailClick={handleShowDetails} sortConfig={sortConfig} requestSort={requestSort} />
                    ) : (
                        <div className="py-12 text-center text-gray-500"><InboxIcon className="w-12 h-12 mx-auto text-gray-300" /><p className="mt-2 font-semibold">Tidak ada data instalasi.</p></div>
                    )}
                </div>
                {sortedInstallations.length > 0 && <PaginationControls currentPage={currentPage} totalPages={totalPages} totalItems={sortedInstallations.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} startIndex={(currentPage - 1) * itemsPerPage} endIndex={(currentPage - 1) * itemsPerPage + paginatedInstallations.length} />}
            </div>
        </div>
    );
};

export default InstallationFormPage;
