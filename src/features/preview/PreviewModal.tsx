
import React, { useState, useEffect, useMemo } from 'react';
import { Asset, Customer, User, Request, Handover, Dismantle, Division, AssetStatus, PreviewData, ActivityLogEntry, AssetCategory, UserRole } from '../../types';
import Modal from '../../components/ui/Modal';
import { ClickableLink } from '../../components/ui/ClickableLink';
import { ChevronLeftIcon } from '../../components/icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../../components/icons/ChevronRightIcon';
import { getStatusClass as getRequestStatusClass } from '../requests/new/components/RequestStatus';
import { getStatusClass as getAssetStatusClass } from '../assetRegistration/RegistrationPage';
import { getStatusClass as getCustomerStatusClass } from '../customers/list/CustomerListPage';
import { PencilIcon } from '../../components/icons/PencilIcon';
import { ArrowDownIcon } from '../../components/icons/ArrowDownIcon';
import { ArrowUpIcon } from '../../components/icons/ArrowUpIcon';
import { RegisterIcon } from '../../components/icons/RegisterIcon';
import { HandoverIcon } from '../../components/icons/HandoverIcon';
import { CustomerIcon } from '../../components/icons/CustomerIcon';
import { DismantleIcon } from '../../components/icons/DismantleIcon';
import { TagIcon } from '../../components/icons/TagIcon';
import { InfoIcon } from '../../components/icons/InfoIcon';
import { DownloadIcon } from '../../components/icons/DownloadIcon';
import { EyeIcon } from '../../components/icons/EyeIcon';
import { CopyIcon } from '../../components/icons/CopyIcon';
import { Tooltip } from '../../components/ui/Tooltip';
import { WrenchIcon } from '../../components/icons/WrenchIcon';
import { SpinnerIcon } from '../../components/icons/SpinnerIcon';
import { CheckIcon } from '../../components/icons/CheckIcon';
import { ExclamationTriangleIcon } from '../../components/icons/ExclamationTriangleIcon';
import { TrashIcon } from '../../components/icons/TrashIcon';
import { UsersIcon } from '../../components/icons/UsersIcon';
import { calculateAssetDepreciation } from '../../utils/depreciation';
import { DollarIcon } from '../../components/icons/DollarIcon';

// Stores
import { useAssetStore } from '../../stores/useAssetStore';
import { useRequestStore } from '../../stores/useRequestStore';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { useMasterDataStore } from '../../stores/useMasterDataStore';

interface PreviewModalProps {
    currentUser: User;
    previewData: PreviewData | null;
    onClose: () => void;
    onShowPreview: (data: PreviewData) => void;
    onEditItem: (data: PreviewData) => void;
    
    // Callback props for actions (still passed from App.tsx/Parents for now)
    onInitiateHandover: (asset: Asset) => void;
    onInitiateDismantle: (asset: Asset) => void;
    onInitiateInstallation: (asset: Asset) => void;
    onReportDamage: (asset: Asset) => void;
    onStartRepair: (asset: Asset) => void;
    onMarkAsRepaired: (asset: Asset) => void;
    onDecommission: (asset: Asset) => void;
    onReceiveFromRepair: (asset: Asset) => void;
    onAddProgressUpdate: (asset: Asset) => void;
    
    // Legacy props kept for type compatibility but mostly unused
    assets?: Asset[];
    customers?: Customer[];
    users?: User[];
    requests?: Request[];
    handovers?: Handover[];
    dismantles?: Dismantle[];
    divisions?: Division[];
    assetCategories?: AssetCategory[];
}

const PreviewItem: React.FC<{ label: string; value?: React.ReactNode; children?: React.ReactNode; fullWidth?: boolean }> = ({ label, value, children, fullWidth = false }) => (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</dt>
        <dd className="mt-1 text-sm text-gray-800">{value || children || '-'}</dd>
    </div>
);

const canViewPrice = (role: UserRole) => ['Admin Purchase', 'Super Admin'].includes(role);

// Local helper for role badge styling
const getRoleClass = (role: User['role']) => {
    switch(role) {
        case 'Super Admin': return 'bg-purple-100 text-purple-800';
        case 'Admin Logistik': return 'bg-info-light text-info-text';
        case 'Admin Purchase': return 'bg-teal-100 text-teal-800';
        case 'Leader': return 'bg-sky-100 text-sky-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

const RepairStatusCard: React.FC<{ asset: Asset }> = ({ asset }) => {
    const repairInfo = useMemo(() => {
        const reportLog = [...(asset.activityLog || [])].reverse().find(log => log.action === 'Kerusakan Dilaporkan');
        const startLog = [...(asset.activityLog || [])].reverse().find(log => log.action === 'Proses Perbaikan Dimulai');

        const originalReport = reportLog?.details.match(/deskripsi: "(.*?)"/)?.[1] || 'Tidak ada deskripsi.';
        const reporter = reportLog?.user || 'N/A';
        const reportDate = reportLog ? new Date(reportLog.timestamp).toLocaleString('id-ID') : 'N/A';
        
        const technician = startLog?.details.match(/oleh (.*?)\./)?.[1] || null;
        const estimatedDate = startLog?.details.match(/selesai: (.*?)\./)?.[1] || null;

        return { originalReport, reporter, reportDate, technician, estimatedDate };
    }, [asset.activityLog]);

    const isUnderRepair = asset.status === AssetStatus.UNDER_REPAIR;

    return (
        <div className={`p-4 rounded-lg border-l-4 ${isUnderRepair ? 'bg-blue-50 border-blue-500' : 'bg-amber-50 border-amber-500'}`}>
            <div className="flex items-center gap-3 mb-3">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${isUnderRepair ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                    {isUnderRepair ? <SpinnerIcon className="animate-spin" /> : <WrenchIcon />}
                </div>
                <h3 className="text-lg font-bold text-gray-800">
                    Status Perbaikan: <span className={isUnderRepair ? 'text-blue-700' : 'text-amber-700'}>{isUnderRepair ? 'Dalam Perbaikan' : 'Menunggu Aksi Admin'}</span>
                </h3>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                <PreviewItem label="Dilaporkan oleh" value={repairInfo.reporter} />
                <PreviewItem label="Tanggal Laporan" value={repairInfo.reportDate} />
                <PreviewItem label="Deskripsi Laporan" fullWidth>
                    <p className="italic text-gray-600">"{repairInfo.originalReport}"</p>
                </PreviewItem>
                {isUnderRepair && (
                    <>
                        <PreviewItem label="Ditangani oleh" value={repairInfo.technician || 'N/A'} />
                        <PreviewItem label="Estimasi Selesai" value={repairInfo.estimatedDate || 'N/A'} />
                    </>
                )}
            </dl>
        </div>
    );
};

const DepreciationCard: React.FC<{ asset: Asset }> = ({ asset }) => {
    const depreciation = useMemo(() => calculateAssetDepreciation(asset), [asset]);

    if (!depreciation) return null;

    return (
        <div className="p-4 mt-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
                <DollarIcon className="w-5 h-5 text-green-700" />
                <h3 className="text-sm font-bold text-green-800">Estimasi Nilai Aset (Depresiasi)</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
                 <div>
                    <p className="text-xs text-green-600">Nilai Perolehan</p>
                    <p className="font-semibold text-gray-800">Rp {depreciation.initialValue.toLocaleString('id-ID')}</p>
                 </div>
                 <div>
                    <p className="text-xs text-green-600">Nilai Buku Saat Ini</p>
                    <p className="font-bold text-green-800 text-lg">Rp {depreciation.currentValue.toLocaleString('id-ID')}</p>
                 </div>
                 <div>
                    <p className="text-xs text-green-600">Umur Ekonomis</p>
                    <p className="text-gray-800">{depreciation.usefulLifeYears} Tahun ({depreciation.monthsPassed} bulan berjalan)</p>
                 </div>
                 <div>
                    <p className="text-xs text-green-600">Penyusutan per Bulan</p>
                    <p className="text-gray-800">Rp {depreciation.monthlyDepreciation.toLocaleString('id-ID')}</p>
                 </div>
            </div>
            {depreciation.isFullyDepreciated && (
                <div className="mt-3 px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded inline-block">
                    Aset telah habis masa manfaat ekonomisnya
                </div>
            )}
        </div>
    );
};


const PreviewModal: React.FC<PreviewModalProps> = (props) => {
    const { 
        currentUser,
        previewData, onClose, onShowPreview, onEditItem,
        onInitiateHandover, onInitiateDismantle, onInitiateInstallation, onReportDamage, onStartRepair, onMarkAsRepaired, onDecommission,
        onReceiveFromRepair, onAddProgressUpdate
    } = props;
    
    // Stores
    const assets = useAssetStore(state => state.assets);
    const assetCategories = useAssetStore(state => state.categories);
    const requests = useRequestStore(state => state.requests);
    const handovers = useTransactionStore(state => state.handovers);
    const dismantles = useTransactionStore(state => state.dismantles);
    const customers = useMasterDataStore(state => state.customers);
    const users = useMasterDataStore(state => state.users);
    const divisions = useMasterDataStore(state => state.divisions);

    const [history, setHistory] = useState<PreviewData[]>([]);
    const [activeAssetTab, setActiveAssetTab] = useState<'details' | 'history' | 'attachments'>('details');


    useEffect(() => {
        if (previewData && !history.some(h => h.id === previewData.id && h.type === previewData.type)) {
            setHistory(prev => [...prev, previewData]);
        } else if (!previewData) {
            setHistory([]);
        }

        if (previewData?.type === 'asset') {
            setActiveAssetTab('details');
        }

    }, [previewData, history]);

    const handleBreadcrumbClick = (index: number) => {
        const targetData = history[index];
        setHistory(prev => prev.slice(0, index + 1));
    };
    
    const handleClose = () => {
        setHistory([]);
        onClose();
    };

    const currentData = history.length > 0 ? history[history.length - 1] : null;

    const getDisplayName = (data: PreviewData) => {
        let item: any = null;
        
        switch(data.type) {
            case 'asset': item = assets.find(i => i.id === data.id); return item?.name || `Aset ${data.id}`;
            case 'customer': item = customers.find(i => i.id === data.id); return item?.name || `Pelanggan ${data.id}`;
            case 'user': item = users.find(i => i.id === data.id || i.name === data.id); return item?.name || `Pengguna ${data.id}`;
            case 'request': return `Request ${data.id}`;
            case 'handover': item = handovers.find(i => i.id === data.id); return `Handover ${item?.docNumber || data.id}`;
            case 'dismantle': return `Dismantle ${data.id}`;
            case 'customerAssets': item = customers.find(i => i.id === data.id); return `Aset Milik ${item?.name || data.id}`;
            case 'stockItemAssets': {
                return 'Detail Stok Aset';
            }
            case 'stockHistory': {
                const [name] = (data.id as string).split('|');
                return `Riwayat Stok: ${name}`;
            }
            default: return 'Detail';
        }
    };

    const renderContent = () => {
        if (!currentData) return null;
        
        const statusMap: Record<string, string> = {
            [AssetStatus.IN_STORAGE]: 'Disimpan',
            [AssetStatus.IN_USE]: 'Digunakan',
            [AssetStatus.UNDER_REPAIR]: 'Dalam Perbaikan',
            [AssetStatus.DAMAGED]: 'Rusak',
        };

        switch (currentData.type) {
            case 'asset':
                const asset = assets.find(a => a.id === currentData.id);
                if (!asset) return <p className="text-gray-700">Aset tidak ditemukan.</p>;

                const getLogIcon = (action: string) => {
                    const iconClass = "w-4 h-4 text-blue-800";
                    if (action.includes('Dicatat')) return <RegisterIcon className={iconClass} />;
                    if (action.includes('Serah Terima')) return <HandoverIcon className={iconClass} />;
                    if (action.includes('Instalasi')) return <CustomerIcon className={iconClass} />;
                    if (action.includes('Dismantle')) return <DismantleIcon className={iconClass} />;
                    if (action.includes('Diperbarui')) return <PencilIcon className={iconClass} />;
                    if (action.includes('Status')) return <TagIcon className={iconClass} />;
                    if (action.includes('Kerusakan Dilaporkan')) return <WrenchIcon className={iconClass} />;
                    if (action.includes('Perbaikan Dimulai')) return <SpinnerIcon className={`${iconClass} animate-spin`} />;
                    if (action.includes('Perbaikan Selesai')) return <CheckIcon className={iconClass} />;
                    return <InfoIcon className={iconClass} />;
                };

                return (
                    <div>
                        <div className="border-b border-gray-200">
                            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                                <button onClick={() => setActiveAssetTab('details')} className={`py-3 px-1 border-b-2 text-sm font-medium ${activeAssetTab === 'details' ? 'border-tm-primary text-tm-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                    Detail
                                </button>
                                <button onClick={() => setActiveAssetTab('history')} className={`py-3 px-1 border-b-2 text-sm font-medium ${activeAssetTab === 'history' ? 'border-tm-primary text-tm-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                    Riwayat
                                </button>
                                <button onClick={() => setActiveAssetTab('attachments')} className={`py-3 px-1 border-b-2 text-sm font-medium ${activeAssetTab === 'attachments' ? 'border-tm-primary text-tm-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                    Lampiran
                                </button>
                            </nav>
                        </div>
                        <div className="py-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {[AssetStatus.DAMAGED, AssetStatus.UNDER_REPAIR, AssetStatus.OUT_FOR_REPAIR].includes(asset.status) && (
                                <div className="mb-6"><RepairStatusCard asset={asset} /></div>
                            )}
                            {activeAssetTab === 'details' && (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">Informasi Dasar</h3>
                                        <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                            <PreviewItem label="ID Aset" value={asset.id} />
                                            <PreviewItem label="Kategori" value={asset.category} />
                                            <PreviewItem label="Tipe" value={asset.type} />
                                            <PreviewItem label="Brand" value={asset.brand} />
                                            <PreviewItem label="Nomor Seri">
                                                <div className="flex items-center gap-2 font-mono">
                                                    <span>{asset.serialNumber || '-'}</span>
                                                    {asset.serialNumber && <button onClick={() => navigator.clipboard.writeText(asset.serialNumber!)} title="Salin" className="text-gray-400 hover:text-tm-primary"><CopyIcon className="w-3 h-3"/></button>}
                                                </div>
                                            </PreviewItem>
                                            <PreviewItem label="MAC Address">
                                                <div className="flex items-center gap-2 font-mono">
                                                    <span>{asset.macAddress || '-'}</span>
                                                     {asset.macAddress && <button onClick={() => navigator.clipboard.writeText(asset.macAddress!)} title="Salin" className="text-gray-400 hover:text-tm-primary"><CopyIcon className="w-3 h-3"/></button>}
                                                </div>
                                            </PreviewItem>
                                        </dl>
                                    </div>
                                    {canViewPrice(currentUser.role) && (
                                        <div>
                                            <h3 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">Informasi Pembelian</h3>
                                            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                                <PreviewItem label="Tgl Pembelian" value={asset.purchaseDate} />
                                                <PreviewItem label="Harga Beli" value={asset.purchasePrice ? `Rp ${asset.purchasePrice.toLocaleString('id-ID')}` : '-'} />
                                                <PreviewItem label="Vendor" value={asset.vendor} />
                                                <PreviewItem label="Akhir Garansi" value={asset.warrantyEndDate} />
                                                <PreviewItem label="No. PO" value={<ClickableLink onClick={() => onShowPreview({type: 'request', id: asset.poNumber!})}>{asset.poNumber}</ClickableLink>} />
                                                <PreviewItem label="No. Invoice" value={asset.invoiceNumber} />
                                            </dl>
                                            <DepreciationCard asset={asset} />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">Status & Lokasi</h3>
                                        <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                            <PreviewItem label="Status Saat Ini" value={<span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getAssetStatusClass(asset.status)}`}>{asset.status}</span>} />
                                            <PreviewItem label="Kondisi" value={asset.condition} />
                                            <PreviewItem label="Lokasi" value={asset.location} />
                                            <PreviewItem label="Detail Lokasi" value={asset.locationDetail} />
                                            <PreviewItem label="Pengguna Saat Ini">
                                                {asset.currentUser?.startsWith('TMI-') ? (<ClickableLink onClick={() => onShowPreview({type: 'customer', id: asset.currentUser!})}>{customers.find(c => c.id === asset.currentUser)?.name || asset.currentUser}</ClickableLink>) : asset.currentUser ? (<ClickableLink onClick={() => onShowPreview({type: 'user', id: asset.currentUser!})}>{asset.currentUser}</ClickableLink>) : '-'}
                                            </PreviewItem>
                                            <PreviewItem label="Dicatat oleh" value={asset.recordedBy} fullWidth />
                                            <PreviewItem label="Catatan" value={asset.notes} fullWidth />
                                        </dl>
                                    </div>
                                </div>
                            )}
                            {activeAssetTab === 'history' && (
                                 <ol className="relative ml-4 border-l border-gray-200">                  
                                    {asset.activityLog.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((log) => (
                                    <li key={log.id} className="mb-6 ml-6">
                                        <span className="absolute flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full -left-4 ring-4 ring-white">
                                            {getLogIcon(log.action)}
                                        </span>
                                        <time className="block mb-1 text-xs font-normal leading-none text-gray-500">{new Date(log.timestamp).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</time>
                                        <h3 className="text-sm font-semibold text-gray-900">{log.action}</h3>
                                        <p className="text-sm font-normal text-gray-600">
                                            {log.details} oleh <ClickableLink onClick={() => onShowPreview({ type: 'user', id: log.user })}>{log.user}</ClickableLink>.
                                        </p>
                                        {log.referenceId && (
                                            <div className="mt-1.5">
                                                <ClickableLink onClick={() => onShowPreview({ type: log.referenceId?.startsWith('HO') ? 'handover' : log.referenceId?.startsWith('DSM') ? 'dismantle' : 'request', id: log.referenceId! })} title={`Lihat detail untuk ${log.referenceId}`}>
                                                    Lihat Dokumen: {log.referenceId}
                                                </ClickableLink>
                                            </div>
                                        )}
                                    </li>
                                    ))}
                                </ol>
                            )}
                             {activeAssetTab === 'attachments' && (
                                <div className="space-y-3">
                                    {asset.attachments.length > 0 ? asset.attachments.map(att => (
                                        <div key={att.id} className="flex items-center justify-between p-3 text-sm bg-gray-50 border rounded-lg">
                                            <div>
                                                <p className="font-semibold text-gray-800">{att.name}</p>
                                                <p className="text-xs text-gray-500">{att.type === 'image' ? 'Gambar' : 'Dokumen PDF'}</p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <a href={att.url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-500 rounded-full hover:bg-gray-200" title="Lihat"><EyeIcon className="w-4 h-4" /></a>
                                                <a href={att.url} download={att.name} className="p-2 text-gray-500 rounded-full hover:bg-gray-200" title="Unduh"><DownloadIcon className="w-4 h-4" /></a>
                                            </div>
                                        </div>
                                    )) : <p className="text-sm text-center text-gray-500 py-4">Tidak ada lampiran.</p>}
                                </div>
                            )}
                        </div>
                    </div>
                );
            
            case 'customer':
                const customer = customers.find(c => c.id === currentData.id);
                 if (!customer) return <p className="text-gray-700">Pelanggan tidak ditemukan.</p>;
                return (
                     <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                        <PreviewItem label="ID Pelanggan" value={customer.id} />
                        <PreviewItem label="Status" value={<span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getCustomerStatusClass(customer.status)}`}>{customer.status}</span>} />
                        <PreviewItem label="Telepon" value={customer.phone} />
                        <PreviewItem label="Email" value={customer.email} />
                        <PreviewItem label="Alamat" value={customer.address} fullWidth/>
                        <PreviewItem label="Aset Terpasang" fullWidth>
                           <ClickableLink onClick={() => onShowPreview({type: 'customerAssets', id: customer.id})}>Lihat {assets.filter(a => a.currentUser === customer.id).length} aset</ClickableLink>
                        </PreviewItem>
                    </dl>
                );
            
            case 'customerAssets':
                const customerForAssets = customers.find(c => c.id === currentData.id);
                if (!customerForAssets) return <p className="text-gray-700">Pelanggan tidak ditemukan.</p>;
                const customerAssets = assets.filter(a => a.currentUser === customerForAssets.id);
                return (
                    <div>
                        <h4 className="mb-4 pb-2 text-lg font-semibold text-gray-900 border-b">Aset untuk {customerForAssets.name}:</h4>
                        <ul className="space-y-2">
                            {customerAssets.length > 0 ? customerAssets.map(asset => (
                                <li key={asset.id} className="p-2 text-sm border rounded-md bg-gray-50">
                                   <ClickableLink onClick={() => onShowPreview({type: 'asset', id: asset.id})}>{asset.name} ({asset.id})</ClickableLink>
                                </li>
                            )) : <p className="text-sm text-gray-500">Tidak ada aset terpasang.</p>}
                        </ul>
                    </div>
                );

            case 'stockItemAssets': {
                const [name, brand, status] = (currentData.id as string).split('|');
                if (!name || !brand || !status) return <p className="text-gray-700">Data stok tidak valid.</p>;

                const stockAssets = assets.filter(a => 
                    a.name === name && 
                    a.brand === brand && 
                    (status === 'ALL' ? a.status !== AssetStatus.DECOMMISSIONED : a.status === status)
                );
                
                const statusLabel = status === 'ALL' ? 'Total' : statusMap[status as AssetStatus] || status;
                const title = `Aset ${statusLabel}: ${name}`;

                return (
                    <div>
                        <h4 className="mb-4 text-lg font-semibold text-gray-900">{title} ({stockAssets.length})</h4>
                        <ul className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar -mx-2 px-2">
                            {stockAssets.length > 0 ? stockAssets.map(asset => (
                                <li key={asset.id} className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <ClickableLink onClick={() => onShowPreview({ type: 'asset', id: asset.id })}>
                                            <span className="font-bold text-gray-800">{asset.id}</span>
                                        </ClickableLink>
                                        <p className="text-xs text-gray-500 font-mono mt-1 truncate" title={`SN: ${asset.serialNumber}`}>
                                            SN: {asset.serialNumber}
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0 mt-2 sm:mt-0">
                                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getAssetStatusClass(asset.status)}`}>
                                            {statusMap[asset.status] || asset.status}
                                        </span>
                                    </div>
                                </li>
                            )) : <p className="py-8 text-sm text-center text-gray-500">Tidak ada aset yang cocok.</p>}
                        </ul>
                    </div>
                );
            }
            
            case 'stockHistory': {
                const [name, brand] = (currentData.id as string).split('|');
                if (!name || !brand) return <p className="text-gray-700">Data riwayat stok tidak valid.</p>;

                type Movement = ActivityLogEntry & { direction: 'IN' | 'OUT', assetId: string };
                
                const movements: Movement[] = assets
                    .filter(a => a.name === name && a.brand === brand)
                    .flatMap(asset => 
                        asset.activityLog
                            .filter(log => ['Aset Dicatat', 'Serah Terima Internal', 'Instalasi Pelanggan', 'Dismantle Selesai'].includes(log.action))
                            .map(log => {
                                let direction: 'IN' | 'OUT' = 'IN';
                                if (['Serah Terima Internal', 'Instalasi Pelanggan'].includes(log.action)) {
                                    direction = 'OUT';
                                }
                                return { ...log, direction, assetId: asset.id };
                            })
                    )
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                const title = getDisplayName(currentData);
                
                 return (
                    <div>
                        <h4 className="mb-4 pb-2 text-lg font-semibold text-gray-900 border-b">{title} ({movements.length} Transaksi)</h4>
                        <ul className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {movements.length > 0 ? movements.map(log => {
                                const isOut = log.direction === 'OUT';
                                const DirectionIcon = isOut ? ArrowUpIcon : ArrowDownIcon;
                                const colorClass = isOut ? 'text-amber-600' : 'text-green-600';
                                const bgClass = isOut ? 'bg-amber-100' : 'bg-green-100';

                                return (
                                <li key={log.id} className="flex items-start gap-3 p-3 text-sm border-b">
                                    <div className={`flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-full ${bgClass} ${colorClass}`}>
                                        <DirectionIcon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-gray-800">{log.action}</span>
                                            <span className="text-xs font-medium text-gray-500">{new Date(log.timestamp).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year:'numeric'})}</span>
                                        </div>
                                        <p className="text-xs text-gray-600 mt-0.5">{log.details}</p>
                                        <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
                                            <ClickableLink onClick={() => onShowPreview({type: 'asset', id: log.assetId})}>{log.assetId}</ClickableLink>
                                            {log.referenceId && (
                                                <ClickableLink onClick={() => onShowPreview({type: log.referenceId?.startsWith('HO') ? 'handover' : log.referenceId?.startsWith('DSM') ? 'dismantle' : 'request', id: log.referenceId!})}>
                                                   Ref: {log.referenceId}
                                                </ClickableLink>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            )}) : <p className="py-8 text-sm text-center text-gray-500">Tidak ada riwayat pergerakan stok.</p>}
                        </ul>
                    </div>
                );
            }

            case 'user':
                 const user = users.find(u => u.id === currentData.id || u.name === currentData.id); // Allow lookup by name
                 if (!user) return <p className="text-gray-700">Pengguna tidak ditemukan.</p>;
                 const divisionName = user.divisionId ? divisions.find(d => d.id === user.divisionId)?.name : 'N/A';
                 return (
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                        <PreviewItem label="Email" value={user.email} />
                        <PreviewItem label="Role">
                            <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleClass(user.role)}`}>
                                {user.role}
                            </span>
                        </PreviewItem>
                        <PreviewItem label="Divisi" value={divisionName} />
                    </dl>
                 );

            case 'request':
                const request = requests.find(r => r.id === currentData.id);
                if (!request) return <p className="text-gray-700">Request tidak ditemukan.</p>;
                 return (
                    <div className="space-y-4">
                        <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-3">
                            <PreviewItem label="Tanggal" value={request.requestDate} />
                            <PreviewItem label="Pemohon" value={request.requester} />
                            <PreviewItem label="Status" value={<span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getRequestStatusClass(request.status)}`}>{request.status}</span>} />
                        </dl>
                        <div>
                            <h4 className="text-sm font-semibold text-gray-600 uppercase border-b pb-2 mb-2">Item yang Diminta</h4>
                            <ul className="mt-2 space-y-2">
                               {request.items.map(item => (
                                   <li key={item.id} className="p-3 text-sm border rounded-md bg-gray-50">
                                       <div className="flex items-start justify-between">
                                           <div className="flex-1 pr-4">
                                               <p className="font-semibold text-gray-800">{item.itemName}</p>
                                               <p className="text-xs text-gray-500">{item.itemTypeBrand}</p>
                                           </div>
                                           <p className="font-bold text-tm-primary">{item.quantity} unit</p>
                                       </div>
                                       {item.keterangan && (
                                           <p className="mt-2 pt-2 text-xs text-gray-600 border-t border-gray-200 italic">
                                               "{item.keterangan}"
                                           </p>
                                       )}
                                   </li>
                               ))}
                            </ul>
                        </div>
                    </div>
                 );
            
            case 'handover':
                const handover = handovers.find(h => h.id === currentData.id);
                if (!handover) return <p className="text-gray-700">Handover tidak ditemukan.</p>;
                return (
                     <div className="space-y-4">
                        <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                            <PreviewItem label="No. Dokumen" value={handover.docNumber} />
                            <PreviewItem label="Tanggal" value={handover.handoverDate} />
                            <PreviewItem label="No. Referensi" value={handover.woRoIntNumber || '-'} />
                            <PreviewItem label="Status" value={<span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getRequestStatusClass(handover.status)}`}>{handover.status}</span>} />
                            <PreviewItem label="Menyerahkan" value={<ClickableLink onClick={() => onShowPreview({type: 'user', id: handover.menyerahkan})}>{handover.menyerahkan}</ClickableLink>} />
                            <PreviewItem label="Penerima" value={<ClickableLink onClick={() => onShowPreview({type: 'user', id: handover.penerima})}>{handover.penerima}</ClickableLink>} />
                        </dl>
                        <div>
                            <h4 className="text-sm font-semibold text-gray-600 uppercase border-b pb-2 mb-2">Item</h4>
                            <ul className="mt-2 space-y-2">
                               {handover.items.map(item => (
                                   <li key={item.id} className="p-2 text-xs border rounded-md bg-gray-50">
                                        <ClickableLink onClick={() => onShowPreview({type: 'asset', id: item.assetId!})}>{item.itemName} ({item.assetId})</ClickableLink>
                                   </li>
                               ))}
                            </ul>
                        </div>
                    </div>
                );

            case 'dismantle':
                const dismantle = dismantles.find(d => d.id === currentData.id);
                 if (!dismantle) return <p className="text-gray-700">Dismantle tidak ditemukan.</p>;
                return (
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                        <PreviewItem label="Tanggal" value={dismantle.dismantleDate} />
                        <PreviewItem label="Teknisi" value={<ClickableLink onClick={() => onShowPreview({type: 'user', id: dismantle.technician})}>{dismantle.technician}</ClickableLink>} />
                        <PreviewItem label="Pelanggan" value={<ClickableLink onClick={() => onShowPreview({type: 'customer', id: dismantle.customerId})}>{dismantle.customerName}</ClickableLink>} />
                        <PreviewItem label="Aset Ditarik" value={<ClickableLink onClick={() => onShowPreview({type: 'asset', id: dismantle.assetId})}>{dismantle.assetName}</ClickableLink>} />
                        <PreviewItem label="Kondisi" value={dismantle.retrievedCondition} />
                    </dl>
                );

            default:
                return <p className="text-gray-700">Tipe pratinjau tidak dikenal.</p>;
        }
    };
    
    const canEdit = currentUser.role !== 'Staff' && currentData && ['asset', 'customer'].includes(currentData.type);
    
    const renderFooter = () => {
        if (!currentData) return null;

        const baseButtons = (
            <div>
                {history.length > 1 ? (
                    <button type="button" onClick={() => handleBreadcrumbClick(history.length - 2)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">
                        <ChevronLeftIcon className="w-4 h-4" /> Kembali
                    </button>
                ) : (
                    <button type="button" onClick={handleClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Tutup</button>
                )}
            </div>
        );

        if (currentData.type === 'asset') {
            const asset = assets.find(a => a.id === currentData.id);
            if (!asset) return baseButtons;
            const category = assetCategories.find(c => c.name === asset.category);
            const canBeInstalled = category?.isCustomerInstallable;
            const isAdmin = currentUser.role === 'Admin Logistik' || currentUser.role === 'Super Admin';
            const isOwner = currentUser.name === asset.currentUser;
            const canReportDamage = isOwner && ![AssetStatus.DAMAGED, AssetStatus.UNDER_REPAIR, AssetStatus.OUT_FOR_REPAIR].includes(asset.status);

            return (
                <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center w-full gap-3">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        {baseButtons}
                        {canEdit && (
                            <button type="button" onClick={() => onEditItem(currentData)} className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 transition-all duration-200 bg-white border rounded-lg shadow-sm hover:bg-gray-50">
                                <PencilIcon className="w-4 h-4" /> Edit
                            </button>
                        )}
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 w-full sm:w-auto">
                        {canReportDamage && (
                            <button onClick={() => { onReportDamage(asset); handleClose(); }} className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-500 rounded-lg shadow-sm hover:bg-amber-600">
                                <WrenchIcon className="w-4 h-4"/> Laporkan Kerusakan
                            </button>
                        )}
                         {isAdmin && asset.status === AssetStatus.DAMAGED && (
                            <button onClick={() => { onStartRepair(asset); handleClose(); }} className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700">
                                <SpinnerIcon className="w-4 h-4"/> Mulai Proses Perbaikan
                            </button>
                         )}
                         {isAdmin && [AssetStatus.UNDER_REPAIR, AssetStatus.OUT_FOR_REPAIR].includes(asset.status) && (
                            <button onClick={() => { onAddProgressUpdate(asset); handleClose(); }} className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700">
                                <InfoIcon className="w-4 h-4"/> Tambah Update
                            </button>
                         )}
                         {isAdmin && asset.status === AssetStatus.OUT_FOR_REPAIR && (
                            <button onClick={() => { onReceiveFromRepair(asset); handleClose(); }} className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700">
                                <CheckIcon className="w-4 h-4"/> Terima Aset
                            </button>
                         )}
                         {isAdmin && asset.status === AssetStatus.UNDER_REPAIR && (
                            <div className="flex flex-col sm:flex-row gap-2 w-full">
                                <button onClick={() => { onMarkAsRepaired(asset); handleClose(); }} className="w-full justify-center inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700">
                                    <CheckIcon className="w-4 h-4"/> Tandai Selesai Diperbaiki
                                </button>
                                <button onClick={() => { onDecommission(asset); handleClose(); }} className="w-full justify-center inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg shadow-sm hover:bg-red-700">
                                    <TrashIcon className="w-4 h-4"/> Tandai Diberhentikan
                                </button>
                            </div>
                        )}
                        {asset.status === AssetStatus.IN_STORAGE && (
                            <>
                                <button onClick={() => { onInitiateHandover(asset); handleClose(); }} className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white transition-colors bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700">
                                    <HandoverIcon className="w-4 h-4"/> Serah Terima Internal
                                </button>
                                {canBeInstalled ? (
                                    <button onClick={() => { onInitiateInstallation(asset); handleClose(); }} className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white transition-colors bg-green-600 rounded-lg shadow-sm hover:bg-green-700">
                                        <CustomerIcon className="w-4 h-4"/> Pasang ke Pelanggan
                                    </button>
                                ) : (
                                    <Tooltip text="Kategori aset ini tidak dapat diinstal ke pelanggan.">
                                        <div className="w-full sm:w-auto">{/* Wrapper for Tooltip */}
                                            <button disabled className="w-full justify-center inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gray-400 rounded-lg cursor-not-allowed">
                                                <CustomerIcon className="w-4 h-4"/> Pasang ke Pelanggan
                                            </button>
                                        </div>
                                    </Tooltip>
                                )}
                            </>
                        )}
                        {asset.status === AssetStatus.IN_USE && asset.currentUser?.startsWith('TMI-') && (
                            <button onClick={() => { onInitiateDismantle(asset); handleClose(); }} className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white transition-colors bg-red-600 rounded-lg shadow-sm hover:bg-red-700">
                                <DismantleIcon className="w-4 h-4"/> Tarik dari Pelanggan
                            </button>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div className="flex items-center justify-between w-full">
                {baseButtons}
                {canEdit && (
                    <button type="button" onClick={() => onEditItem(currentData)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover">
                        <PencilIcon className="w-4 h-4" /> Edit
                    </button>
                )}
            </div>
        );
    };

    return (
        <Modal
            isOpen={!!previewData}
            onClose={handleClose}
            title={history.length > 1 ? '' : (currentData ? getDisplayName(currentData) : 'Pratinjau')}
            size={currentData?.type === 'asset' ? '3xl' : 'xl'}
            zIndex="z-[60]"
            hideDefaultCloseButton={true}
            footerContent={renderFooter()}
            disableContentPadding={currentData?.type === 'asset'}
        >
            {history.length > 1 && (
                <nav className={`flex items-center text-sm font-medium text-gray-500 mb-4 ${currentData?.type === 'asset' ? 'px-6 -mt-2' : '-mt-2'}`} aria-label="Breadcrumb">
                    {history.map((item, index) => (
                        <React.Fragment key={`${item.type}-${item.id}-${index}`}>
                            {index > 0 && <ChevronRightIcon className="w-4 h-4 mx-1 text-gray-400" />}
                            <button 
                                onClick={() => handleBreadcrumbClick(index)} 
                                className={`truncate max-w-[150px] ${index === history.length - 1 ? 'text-tm-primary font-semibold' : 'hover:underline'}`}
                                disabled={index === history.length - 1}
                            >
                                {getDisplayName(item)}
                            </button>
                        </React.Fragment>
                    ))}
                </nav>
            )}
            <div className={`${currentData?.type === 'asset' ? 'px-6' : ''}`}>
                {renderContent()}
            </div>
        </Modal>
    );
};

export default PreviewModal;
