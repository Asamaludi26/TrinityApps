
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Customer, CustomerStatus, Asset, User, AssetStatus, InstalledMaterial, AssetCategory } from '../../../types';
import DatePicker from '../../../components/ui/DatePicker';
import { useNotification } from '../../../providers/NotificationProvider';
import FloatingActionBar from '../../../components/ui/FloatingActionBar';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import { SpinnerIcon } from '../../../components/icons/SpinnerIcon';
import { UsersIcon } from '../../../components/icons/UsersIcon';
import { WrenchIcon } from '../../../components/icons/WrenchIcon';
import { CustomerIcon } from '../../../components/icons/CustomerIcon';
import { AssetIcon } from '../../../components/icons/AssetIcon';
import { SearchIcon } from '../../../components/icons/SearchIcon';
import { InboxIcon } from '../../../components/icons/InboxIcon';
import { PlusIcon } from '../../../components/icons/PlusIcon';
import { TrashIcon } from '../../../components/icons/TrashIcon';

interface CustomerFormProps {
    customer: Customer | null;
    assets: Asset[];
    onSave: (
        formData: Omit<Customer, 'id' | 'activityLog'>,
        newlyAssignedAssetIds: string[],
        unassignedAssetIds: string[]
    ) => void;
    onCancel: () => void;
    assetCategories: AssetCategory[];
}

const FormSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className }) => (
    <div className={`pt-6 border-t border-gray-200 first:pt-0 first:border-t-0 ${className}`}>
        <div className="flex items-center mb-4">
            {icon}
            <h3 className="text-lg font-semibold text-tm-dark">{title}</h3>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {children}
        </div>
    </div>
);

const CustomerForm: React.FC<CustomerFormProps> = ({ customer, assets, onSave, onCancel, assetCategories }) => {
    type MaterialFormItem = {
        tempId: number;
        modelKey: string; // "itemName|brand"
        quantity: number | '';
        unit: string;
    };

    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<CustomerStatus>(CustomerStatus.ACTIVE);
    const [installationDate, setInstallationDate] = useState<Date | null>(new Date());
    const [servicePackage, setServicePackage] = useState('');
    
    const [emailError, setEmailError] = useState('');
    const [addressError, setAddressError] = useState('');
    
    const [initialAssignedAssetIds, setInitialAssignedAssetIds] = useState<string[]>([]);
    const [assignedAssetIds, setAssignedAssetIds] = useState<string[]>([]);
    const [materials, setMaterials] = useState<MaterialFormItem[]>([]);

    const [isLoading, setIsLoading] = useState(false);
    const footerRef = useRef<HTMLDivElement>(null);
    const [isFooterVisible, setIsFooterVisible] = useState(true);
    const formId = "customer-form";
    const addNotification = useNotification();

    const availableAssets = useMemo(() => {
        return assets.filter(asset => {
            if (asset.status !== AssetStatus.IN_STORAGE) {
                return false;
            }
            const category = assetCategories.find(c => c.name === asset.category);
            const type = category?.types.find(t => t.name === asset.type);
            // Default to 'individual' tracking if trackingMethod is not specified.
            // The filter should only include assets that are NOT bulk.
            return type?.trackingMethod !== 'bulk';
        });
    }, [assets, assetCategories]);
    
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
        if (customer) {
            setName(customer.name);
            setAddress(customer.address);
            setPhone(customer.phone);
            setEmail(customer.email);
            setStatus(customer.status);
            setInstallationDate(new Date(customer.installationDate));
            setServicePackage(customer.servicePackage.replace(/\D/g, ''));
            
            const currentAssets = assets.filter(a => a.currentUser === customer.id).map(a => a.id);
            setInitialAssignedAssetIds(currentAssets);
            setAssignedAssetIds(currentAssets);

            setMaterials((customer.installedMaterials || []).map((m, i) => ({
                tempId: Date.now() + i,
                modelKey: `${m.itemName}|${m.brand}`,
                quantity: m.quantity,
                unit: m.unit,
            })));
        } else {
            setName(''); setAddress(''); setPhone(''); setEmail('');
            setStatus(CustomerStatus.ACTIVE); setInstallationDate(new Date()); setServicePackage('');
            setInitialAssignedAssetIds([]); setAssignedAssetIds([]);
            setMaterials([]);
        }
    }, [customer, assets]);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => setIsFooterVisible(entry.isIntersecting), { threshold: 0.1 });
        const currentRef = footerRef.current;
        if (currentRef) observer.observe(currentRef);
        return () => { if (currentRef) observer.unobserve(currentRef); };
    }, []);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const numericValue = e.target.value.replace(/[^\d+]/g, '');
        setPhone(numericValue);
    };

    const handlePackageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setServicePackage(e.target.value.replace(/\D/g, ''));
    };

    const validateForm = () => {
        let isValid = true;
        if (email && !/\S+@\S+\.\S+/.test(email)) {
            setEmailError('Format email tidak valid.');
            isValid = false;
        } else {
            setEmailError('');
        }
        if (address && address.trim().length < 10) {
            setAddressError('Alamat terlalu pendek, harap isi lebih lengkap.');
            isValid = false;
        } else {
            setAddressError('');
        }
        return isValid;
    };

    const handleAddAsset = (assetId: string) => {
        if (assetId && !assignedAssetIds.includes(assetId)) {
            setAssignedAssetIds(prev => [...prev, assetId]);
        }
    };

    const handleRemoveAsset = (assetId: string) => {
        setAssignedAssetIds(prev => prev.filter(id => id !== assetId));
    };
    
    const handleAddMaterial = () => {
        setMaterials(prev => [...prev, { tempId: Date.now(), modelKey: '', quantity: 1, unit: 'pcs' }]);
    };
    const handleRemoveMaterial = (tempId: number) => {
        setMaterials(prev => prev.filter(m => m.tempId !== tempId));
    };
    const handleMaterialChange = (tempId: number, field: keyof MaterialFormItem, value: any) => {
        setMaterials(prev => prev.map(item => {
            if (item.tempId === tempId) {
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
        if (!validateForm()) {
            addNotification('Harap perbaiki data yang tidak valid pada formulir.', 'error');
            return;
        }
        setIsLoading(true);

        const newlyAssigned = assignedAssetIds.filter(id => !initialAssignedAssetIds.includes(id));
        const unassigned = initialAssignedAssetIds.filter(id => !assignedAssetIds.includes(id));
        
        const finalMaterials: InstalledMaterial[] = materials
            .filter(m => m.modelKey && m.quantity && Number(m.quantity) > 0)
            .map(m => {
                const [name, brand] = m.modelKey.split('|');
                return {
                    itemName: name,
                    brand: brand,
                    quantity: Number(m.quantity),
                    unit: m.unit,
                    installationDate: customer?.installedMaterials?.find(em => `${em.itemName}|${em.brand}` === m.modelKey)?.installationDate || new Date().toISOString().split('T')[0],
                };
            });

        setTimeout(() => { // Simulate API call
            onSave({
                name, address, phone, email, status,
                installationDate: installationDate ? installationDate.toISOString().split('T')[0] : '',
                servicePackage: servicePackage ? `${servicePackage} Mbps` : '',
                installedMaterials: finalMaterials,
            }, newlyAssigned, unassigned);
            setIsLoading(false);
        }, 1000);
    };
    
    const ActionButtons: React.FC<{ formId?: string }> = ({ formId }) => (
        <>
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
            <button type="submit" form={formId} disabled={isLoading} className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover disabled:bg-tm-primary/70">
                {isLoading && <SpinnerIcon className="w-4 h-4 mr-2" />}
                {customer ? 'Simpan Perubahan' : 'Tambah Pelanggan'}
            </button>
        </>
    );

    return (
        <>
            <form id={formId} onSubmit={handleSubmit} className="space-y-4">
                 <FormSection title="Informasi Kontak" icon={<UsersIcon className="w-6 h-6 mr-3 text-tm-primary" />}>
                     <div className="md:col-span-2">
                        <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">Nama Pelanggan</label>
                        <input type="text" id="customerName" value={name} onChange={e => setName(e.target.value)} required className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-tm-accent focus:border-tm-accent sm:text-sm" />
                    </div>
                    <div>
                        <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700">Telepon</label>
                        <input type="tel" id="customerPhone" value={phone} onChange={handlePhoneChange} required className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-tm-accent focus:border-tm-accent sm:text-sm" placeholder="+62..." />
                    </div>
                    <div>
                        <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700">Email</label>
                        <input type="email" id="customerEmail" value={email} onChange={e => setEmail(e.target.value)} onBlur={validateForm} required className={`block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border rounded-lg shadow-sm focus:outline-none focus:ring-tm-accent focus:border-tm-accent sm:text-sm ${emailError ? 'border-red-500' : 'border-gray-300'}`} />
                        {emailError && <p className="mt-1 text-xs text-red-600">{emailError}</p>}
                    </div>
                </FormSection>

                 <FormSection title="Alamat Lengkap" icon={<CustomerIcon className="w-6 h-6 mr-3 text-tm-primary" />}>
                    <div className="md:col-span-2">
                        <label htmlFor="customerAddress" className="block text-sm font-medium text-gray-700">Alamat</label>
                        <textarea id="customerAddress" value={address} onChange={e => setAddress(e.target.value)} onBlur={validateForm} required rows={3} className={`block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border rounded-lg shadow-sm focus:outline-none focus:ring-tm-accent focus:border-tm-accent sm:text-sm ${addressError ? 'border-red-500' : 'border-gray-300'}`} />
                        {addressError && <p className="mt-1 text-xs text-red-600">{addressError}</p>}
                    </div>
                </FormSection>

                <FormSection title="Detail Layanan & Status" icon={<WrenchIcon className="w-6 h-6 mr-3 text-tm-primary" />}>
                     <div>
                        <label htmlFor="customerPackage" className="block text-sm font-medium text-gray-700">Paket Layanan</label>
                        <div className="relative mt-1">
                            <input type="text" id="customerPackage" value={servicePackage} onChange={handlePackageChange} placeholder="Contoh: 50" required className="block w-full px-3 py-2 pr-12 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-tm-accent focus:border-tm-accent sm:text-sm" />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">Mbps</span>
                            </div>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="installationDate" className="block text-sm font-medium text-gray-700">Tanggal Instalasi</label>
                        <div className="mt-1"><DatePicker id="installationDate" selectedDate={installationDate} onDateChange={setInstallationDate} /></div>
                    </div>
                    <div>
                        <label htmlFor="customerStatus" className="block text-sm font-medium text-gray-700">Status</label>
                        <div className="mt-1">
                            <CustomSelect
                                options={Object.values(CustomerStatus).map(s => ({ value: s, label: s }))}
                                value={status}
                                onChange={value => setStatus(value as CustomerStatus)}
                            />
                        </div>
                    </div>
                </FormSection>
                
                <FormSection title="Kelola Aset Terpasang (Perangkat)" icon={<AssetIcon className="w-6 h-6 mr-3 text-tm-primary" />}>
                    <div className="md:col-span-2">
                        <p className="text-sm text-gray-600 mb-2">Daftar perangkat yang memiliki nomor seri dan dilacak secara individual.</p>
                        <CustomSelect
                            isSearchable
                            options={availableAssets.filter(a => !assignedAssetIds.includes(a.id)).map(a => ({
                                value: a.id,
                                label: `${a.name} (${a.id}) - SN: ${a.serialNumber || 'N/A'}`
                            }))}
                            value={''}
                            onChange={handleAddAsset}
                            placeholder="Cari dan pilih aset dari gudang untuk dipasang..."
                            emptyStateMessage="Tidak ada aset tersedia di gudang."
                        />
                        <div className="mt-4 space-y-2">
                            {assignedAssetIds.map(assetId => {
                                const asset = assets.find(a => a.id === assetId);
                                if (!asset) return null;
                                return (
                                    <div key={assetId} className="flex items-center justify-between p-2 text-sm text-gray-700 bg-gray-100 border border-gray-200 rounded-md">
                                        <span className="truncate">{asset.name} ({asset.id})</span>
                                        <button type="button" onClick={() => handleRemoveAsset(assetId)} className="p-1 text-red-500 rounded-full hover:bg-red-100 hover:text-red-700">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })}
                            {assignedAssetIds.length === 0 && (
                                <p className="text-xs text-center text-gray-500 py-2">Belum ada perangkat yang dipasang.</p>
                            )}
                        </div>
                    </div>
                </FormSection>

                <FormSection title="Kelola Material Terpakai" icon={<WrenchIcon className="w-6 h-6 mr-3 text-tm-primary" />}>
                    <div className="md:col-span-2">
                        <p className="text-sm text-gray-600 mb-4">Daftar material habis pakai yang digunakan (misal: kabel, konektor). Anda dapat mengubah kuantitas atau menghapus item yang ada.</p>
                        <div className="space-y-3">
                            {materials.map((material, index) => (
                                <div key={material.tempId} className="relative grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-2 p-3 bg-gray-100/60 border rounded-lg items-end">
                                    <div className="md:col-span-6">
                                        <label className="block text-xs font-medium text-gray-500">Material</label>
                                        <CustomSelect 
                                            options={materialOptions} 
                                            value={material.modelKey} 
                                            onChange={value => handleMaterialChange(material.tempId, 'modelKey', value)}
                                            isSearchable
                                            placeholder="Pilih material..."
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="block text-xs font-medium text-gray-500">Jumlah</label>
                                        <input 
                                            type="number" 
                                            value={material.quantity}
                                            onChange={(e) => handleMaterialChange(material.tempId, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                                            min="1"
                                            className="block w-full px-3 py-2 mt-1 text-gray-900 bg-white border border-gray-300 rounded-lg shadow-sm sm:text-sm"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-gray-500">Satuan</label>
                                        <input type="text" readOnly value={material.unit} className="block w-full px-3 py-2 mt-1 text-gray-700 bg-gray-200/60 border border-gray-300 rounded-lg shadow-sm" />
                                    </div>
                                    <div className="md:col-span-1">
                                        <button type="button" onClick={() => handleRemoveMaterial(material.tempId)} className="flex items-center justify-center w-full h-10 text-gray-500 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-red-100 hover:text-red-500">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={handleAddMaterial} className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-tm-accent rounded-md shadow-sm hover:bg-tm-primary">
                            <PlusIcon className="w-4 h-4"/>Tambah Material
                        </button>
                         {materials.length === 0 && (
                            <p className="text-xs text-center text-gray-500 py-4 border-t mt-4">Belum ada material yang ditambahkan.</p>
                        )}
                    </div>
                </FormSection>

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

export default CustomerForm;
