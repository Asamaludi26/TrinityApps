
import React, { useMemo } from 'react';
import { Customer, Page, User, ActivityLogEntry, AssetStatus, InstalledMaterial } from '../../../types';
import FormPageLayout from '../../../components/layout/FormPageLayout';
import CustomerForm from './CustomerForm';
import { useNotification } from '../../../providers/NotificationProvider';

// Stores
import { useMasterDataStore } from '../../../stores/useMasterDataStore';
import { useAssetStore } from '../../../stores/useAssetStore';

interface CustomerFormPageProps {
    currentUser: User;
    setActivePage: (page: Page, filters?: any) => void;
    pageInitialState?: { customerId?: string };
    // Legacy props (optional/ignored)
    customers?: Customer[];
    setCustomers?: any;
    assets?: any;
    assetCategories?: any;
    onUpdateAsset?: any;
}

const CustomerFormPage: React.FC<CustomerFormPageProps> = (props) => {
    const { currentUser, setActivePage, pageInitialState } = props;
    
    // Use Stores
    const customers = useMasterDataStore((state) => state.customers);
    const setCustomers = (data: Customer[]) => useMasterDataStore.setState({ customers: data }); // Direct helper or use update actions
    const addCustomer = useMasterDataStore((state) => state.addCustomer);
    const updateCustomer = useMasterDataStore((state) => state.updateCustomer);
    
    const assets = useAssetStore((state) => state.assets);
    const assetCategories = useAssetStore((state) => state.categories);
    const updateAsset = useAssetStore((state) => state.updateAsset);
    
    const customerToEdit = useMemo(() => {
        if (pageInitialState?.customerId) {
            return customers.find(c => c.id === pageInitialState.customerId) || null;
        }
        return null;
    }, [customers, pageInitialState]);

    const isEditing = !!customerToEdit;
    const addNotification = useNotification();

    // Helper function untuk memproses konsumsi material
    const processMaterialConsumption = async (materials: InstalledMaterial[], customerId: string, customerAddress: string) => {
        for (const mat of materials) {
            // 1. Cari kategori/tipe untuk material ini untuk cek tracking method
            // (Disederhanakan: Kita asumsikan material di form sudah terfilter sebagai bulk/material)
            
            // 2. Cari stok tersedia (FIFO - First In First Out logic sederhana)
            const availableStock = assets
                .filter(a => 
                    a.name === mat.itemName && 
                    a.brand === mat.brand && 
                    a.status === AssetStatus.IN_STORAGE
                )
                .sort((a, b) => new Date(a.registrationDate).getTime() - new Date(b.registrationDate).getTime()); // Ambil stok terlama dulu

            // 3. Tentukan jumlah yang harus "dikonsumsi" dari stok
            // Catatan: Untuk item kontinu (misal kabel roll), logika ini mengasumsikan 1 unit stok = 1 unit pemakaian
            // Di sistem produksi nyata, perlu field 'quantity' pada tabel Asset untuk pengurangan parsial.
            // Di sini kita ambil N item stok dan ubah statusnya.
            const quantityToConsume = Math.min(mat.quantity, availableStock.length);

            if (quantityToConsume > 0) {
                const itemsToUpdate = availableStock.slice(0, quantityToConsume);
                for (const item of itemsToUpdate) {
                    await updateAsset(item.id, {
                        status: AssetStatus.IN_USE, // Material terpasang
                        currentUser: customerId,
                        location: `Terpasang di: ${customerAddress}`,
                        activityLog: [] // Store akan handle append log
                    });
                }
                
                // Jika stok kurang dari permintaan (misal kabel meteran yang tidak 1:1 dengan stok asset ID),
                // kita biarkan tercatat di Customer tapi stok fisik di sistem habis.
                if (mat.quantity > availableStock.length) {
                    console.warn(`Stok sistem tidak mencukupi untuk ${mat.itemName}. Diminta: ${mat.quantity}, Tersedia: ${availableStock.length}`);
                }
            }
        }
    };

    const handleSaveCustomer = async (
        formData: Omit<Customer, 'id' | 'activityLog'>,
        newlyAssignedAssetIds: string[],
        unassignedAssetIds: string[]
    ) => {
        // --- 1. Update Assets Side Effects (Aset Tetap/Perangkat) ---
        for (const assetId of unassignedAssetIds) {
            await updateAsset(assetId, {
                currentUser: null,
                location: 'Gudang Inventori',
                status: AssetStatus.IN_STORAGE,
                activityLog: []
            });
        }

        const targetCustomerId = isEditing ? customerToEdit.id : `TMI-${String(1000 + customers.length + 1).padStart(5, '0')}`;

        for (const assetId of newlyAssignedAssetIds) {
            await updateAsset(assetId, {
                currentUser: targetCustomerId,
                location: `Terpasang di: ${formData.address}`,
                status: AssetStatus.IN_USE,
            });
        }

        // --- 2. Update Assets Side Effects (Material Habis Pakai) ---
        // Logika Baru: Mengurangi stok berdasarkan material yang diinput
        if (formData.installedMaterials && formData.installedMaterials.length > 0) {
            // Hitung delta material (hanya yang baru ditambah jika edit, atau semua jika baru)
            // Untuk penyederhanaan di prototype ini, kita proses semua material yang ada di list form
            // Idealnya kita bandingkan dengan state sebelumnya.
            // Namun, karena Material di form ini biasanya "Snapshot" kondisi saat ini, 
            // kita asumsikan user menambahkan material baru lewat form ini.
            
            // Filter material yang tanggal instalasinya "hari ini" (baru ditambahkan di sesi ini)
            const today = new Date().toISOString().split('T')[0];
            const newMaterials = formData.installedMaterials.filter(m => m.installationDate.startsWith(today));
            
            if (newMaterials.length > 0) {
                await processMaterialConsumption(newMaterials, targetCustomerId, formData.address);
            }
        }

        // --- 3. Update Customer ---
        if (isEditing) {
            await updateCustomer(customerToEdit.id, formData);
            addNotification('Data pelanggan dan material berhasil diperbarui.', 'success');
            setActivePage('customer-detail', { customerId: customerToEdit.id });
        } else {
            const newCustomer: Customer = {
                ...formData,
                id: targetCustomerId,
                activityLog: [{
                    id: `log-create-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    user: currentUser.name,
                    action: 'Pelanggan Dibuat',
                    details: 'Data pelanggan baru telah ditambahkan.'
                }]
            };

            await addCustomer(newCustomer);
            addNotification('Pelanggan baru berhasil ditambahkan.', 'success');
            setActivePage('customer-detail', { customerId: targetCustomerId });
        }
    };

    return (
        <FormPageLayout title={isEditing ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}>
            <CustomerForm
                customer={customerToEdit}
                assets={assets}
                assetCategories={assetCategories}
                onSave={handleSaveCustomer}
                onCancel={() => setActivePage(isEditing ? 'customer-detail' : 'customers', { customerId: customerToEdit?.id })}
            />
        </FormPageLayout>
    );
};

export default CustomerFormPage;
