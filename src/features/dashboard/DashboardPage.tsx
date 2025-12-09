import React, { useMemo, useState, useEffect } from 'react';
import { AssetStatus, ItemStatus, Page, PreviewData, User, LoanRequestStatus } from '../../types';
import { Skeleton } from '../../components/ui/Skeleton';
import { ActionableItemsList } from './components/ActionableItemsList';
import { AssetMatrix } from './components/AssetMatrix';
import { AssetStatusDonutChart, CategoryBarChart, SpendingTrendChart, TechnicianLeaderboard } from './components/DashboardCharts';
import { StockAlertWidget } from './components/StockAlertWidget';
import { WarrantyAlertWidget } from './components/WarrantyAlertWidget';
import { CategorySummaryWidget } from './components/CategorySummaryWidget';
import { RequestIcon } from '../../components/icons/RequestIcon';
import { InfoIcon } from '../../components/icons/InfoIcon';
import { ArchiveBoxIcon } from '../../components/icons/ArchiveBoxIcon';
import { RegisterIcon } from '../../components/icons/RegisterIcon';
import { CheckIcon } from '../../components/icons/CheckIcon';
import { BsClockHistory, BsLayers, BsCurrencyDollar, BsBoxSeam, BsGraphUp } from 'react-icons/bs';
import Modal from '../../components/ui/Modal';
import { ExclamationTriangleIcon } from '../../components/icons/ExclamationTriangleIcon';

// Stores
import { useAssetStore } from '../../stores/useAssetStore';
import { useRequestStore } from '../../stores/useRequestStore';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { useMasterDataStore } from '../../stores/useMasterDataStore';

// Helpers
const formatCurrencyShort = (value: number): string => {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} M`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Jt`;
    return value.toLocaleString('id-ID');
};

const formatCurrencyFull = (value: number): string => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
};

interface DashboardProps {
    currentUser: User;
    setActivePage: (page: Page, filters?: any) => void;
    onShowPreview: (data: PreviewData) => void;
}

// --- COMPONENT: MINI STAT (URGENCY) ---
const UrgencyCard: React.FC<{ label: string; value: string; icon: any; color: string; subtext?: string; onClick?: () => void }> = ({ label, value, icon: Icon, color, subtext, onClick }) => {
    return (
        <div 
            onClick={onClick}
            className={`relative overflow-hidden bg-white p-5 rounded-xl shadow-sm border-l-4 ${color.replace('bg-', 'border-')} border-y border-r border-gray-100 group hover:-translate-y-1 transition-all duration-200 ${onClick ? 'cursor-pointer' : ''}`}
        >
            <div className="flex justify-between items-start z-10 relative">
                <div>
                    <p className="text-xs font-bold text-gray-500 tracking-wider uppercase">{label}</p>
                    <h3 className={`text-2xl font-extrabold mt-1 ${color.replace('bg-', 'text-')}`}>{value}</h3>
                    {subtext && <p className="text-xs text-gray-400 mt-1 font-medium">{subtext}</p>}
                </div>
                <div className={`p-2 rounded-lg ${color} bg-opacity-10 text-current`}>
                    <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT: MACRO STAT (EXECUTIVE) ---
const MacroStat: React.FC<{ label: string; value: string; icon: any; subValue?: string; tooltip?: string }> = ({ label, value, icon: Icon, subValue, tooltip }) => (
    <div className="flex items-center p-4 bg-white border border-gray-100 rounded-xl shadow-sm" title={tooltip}>
        <div className="flex-shrink-0 p-3 bg-blue-50 text-tm-primary rounded-xl">
            <Icon className="w-6 h-6" />
        </div>
        <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="text-xl font-bold text-gray-900">{value}</p>
            {subValue && <p className="text-xs text-gray-400 mt-0.5">{subValue}</p>}
        </div>
    </div>
);

// --- COMPONENT: FEATURE STAT (MICRO) ---
const FeatureStat: React.FC<{ title: string; items: { label: string; value: number; color: string }[]; onClick?: () => void }> = ({ title, items, onClick }) => (
    <div onClick={onClick} className={`bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center ${onClick ? 'cursor-pointer hover:border-tm-primary/30 transition-colors' : ''}`}>
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{title}</h4>
        <div className="space-y-3">
            {items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">{item.label}</span>
                    <span className={`text-sm font-bold px-2 py-0.5 rounded ${item.color}`}>{item.value}</span>
                </div>
            ))}
        </div>
    </div>
);

export default function DashboardPage(props: DashboardProps): React.ReactElement {
    const { currentUser, setActivePage, onShowPreview } = props;
    
    // Fetch Data from Stores
    const assets = useAssetStore((state) => state.assets);
    const assetCategories = useAssetStore((state) => state.categories);
    const requests = useRequestStore((state) => state.requests);
    const loanRequests = useRequestStore((state) => state.loanRequests);
    const handovers = useTransactionStore((state) => state.handovers);
    const dismantles = useTransactionStore((state) => state.dismantles);
    const maintenances = useTransactionStore((state) => state.maintenances);
    const installations = useTransactionStore((state) => state.installations);
    const customers = useMasterDataStore((state) => state.customers);
    const divisions = useMasterDataStore((state) => state.divisions);

    const [isComputing, setIsComputing] = useState(true);
    const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

    // --- 1. CALCULATE MACRO METRICS (EXECUTIVE) ---
    const macroMetrics = useMemo(() => {
        const totalValue = assets.reduce((sum, a) => sum + (a.purchasePrice || 0), 0);
        const totalStockItems = assets.filter(a => a.status === AssetStatus.IN_STORAGE).length;
        const totalActiveItems = assets.filter(a => a.status === AssetStatus.IN_USE).length;
        
        // Count distinct models
        let totalModels = 0;
        assetCategories.forEach(c => c.types.forEach(t => totalModels += (t.standardItems?.length || 0)));

        return {
            totalValue,
            totalAssets: assets.length,
            totalStockItems,
            totalActiveItems,
            totalCategories: assetCategories.length,
            totalModels
        };
    }, [assets, assetCategories]);

    // --- 2. CALCULATE URGENCY METRICS (RISK) ---
    const urgencyMetrics = useMemo(() => {
        const pendingRequests = requests.filter(r => {
            if (currentUser.role === 'Staff') return false;
            if (currentUser.role === 'Admin Logistik' && r.status === ItemStatus.PENDING) return true;
            if (currentUser.role === 'Admin Purchase' && r.status === ItemStatus.LOGISTIC_APPROVED) return true;
            if (currentUser.role === 'Super Admin' && [ItemStatus.PENDING, ItemStatus.LOGISTIC_APPROVED, ItemStatus.AWAITING_CEO_APPROVAL].includes(r.status)) return true;
            return false;
        }).length;

        const overdueLoans = loanRequests.filter(lr => lr.status === LoanRequestStatus.OVERDUE).length;
        const unprocessedDamage = assets.filter(a => a.status === AssetStatus.DAMAGED).length;
        
        // Critical Stock (Simplified)
        const stockMap = new Map<string, number>();
        assets.filter(a => a.status === AssetStatus.IN_STORAGE).forEach(a => {
             const key = `${a.name}|${a.brand}`;
             stockMap.set(key, (stockMap.get(key) || 0) + 1);
        });
        let criticalStockCount = 0;
        assetCategories.forEach(cat => cat.types.forEach(t => t.standardItems?.forEach(item => {
             const key = `${item.name}|${item.brand}`;
             if (!stockMap.has(key) || stockMap.get(key) === 0) criticalStockCount++;
        })));

        return { pendingRequests, overdueLoans, unprocessedDamage, criticalStockCount };
    }, [assets, requests, loanRequests, currentUser, assetCategories]);

    // --- 3. CALCULATE FEATURE DEEP-DIVE METRICS ---
    const featureMetrics = useMemo(() => {
        // Repairs
        const internalRepairs = assets.filter(a => a.status === AssetStatus.UNDER_REPAIR).length;
        const vendorRepairs = assets.filter(a => a.status === AssetStatus.OUT_FOR_REPAIR).length;
        
        // Requests Breakdown
        const urgentRequests = requests.filter(r => r.order.type === 'Urgent' && r.status !== ItemStatus.COMPLETED && r.status !== ItemStatus.REJECTED).length;
        const projectRequests = requests.filter(r => r.order.type === 'Project Based' && r.status !== ItemStatus.COMPLETED && r.status !== ItemStatus.REJECTED).length;
        
        // Movements (Last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentHandovers = handovers.filter(h => new Date(h.handoverDate) >= thirtyDaysAgo).length;
        const recentDismantles = dismantles.filter(d => new Date(d.dismantleDate) >= thirtyDaysAgo).length;

        return {
            repairs: { internal: internalRepairs, vendor: vendorRepairs },
            requests: { urgent: urgentRequests, project: projectRequests },
            movements: { handovers: recentHandovers, dismantles: recentDismantles }
        };
    }, [assets, requests, handovers, dismantles]);
    
    // --- 4. NEW ANALYTICS (SPENDING & PERFORMANCE) ---
    const analyticsData = useMemo(() => {
        // Spending Trend (Last 6 months)
        const spendingMap = new Map<string, number>();
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = d.toLocaleString('id-ID', { month: 'short' });
            months.push(key);
            spendingMap.set(key, 0);
        }
        
        assets.forEach(a => {
             if (a.purchaseDate) {
                 const pDate = new Date(a.purchaseDate);
                 const pMonth = pDate.toLocaleString('id-ID', { month: 'short' });
                 if (spendingMap.has(pMonth)) {
                     spendingMap.set(pMonth, spendingMap.get(pMonth)! + (a.purchasePrice || 0));
                 }
             }
        });
        
        const spendingTrend = months.map(m => ({ month: m, value: spendingMap.get(m) || 0 }));

        // Technician Performance
        const techCount = new Map<string, number>();
        maintenances.forEach(m => {
            if (m.technician) techCount.set(m.technician, (techCount.get(m.technician) || 0) + 1);
        });
        installations.forEach(i => {
             if (i.technician) techCount.set(i.technician, (techCount.get(i.technician) || 0) + 1);
        });
        
        const topTechnicians = Array.from(techCount.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return { spendingTrend, topTechnicians };

    }, [assets, maintenances, installations]);


    // Activity Feed
    const allActivities = useMemo(() => {
         const activities: { id: string; user: string; action: React.ReactNode; timestamp: string; date: Date; icon: any; previewData: PreviewData }[] = [];
        requests.slice(0, 10).forEach(req => {
             activities.push({ id: `req-${req.id}`, user: req.requester, action: <>Request <strong>#{req.id}</strong></>, date: new Date(req.requestDate), timestamp: req.requestDate, icon: RequestIcon, previewData: { type: 'request', id: req.id } });
        });
        assets.slice(0, 10).forEach(asset => {
            activities.push({ id: `ast-${asset.id}`, user: asset.recordedBy, action: <>Aset <strong>{asset.name}</strong></>, date: new Date(asset.registrationDate), timestamp: asset.registrationDate, icon: RegisterIcon, previewData: { type: 'asset', id: asset.id } });
        });
        return activities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 8);
    }, [requests, assets]);

    useEffect(() => {
        const timer = setTimeout(() => setIsComputing(false), 600);
        return () => clearTimeout(timer);
    }, []);

    if (isComputing) {
        return (
            <div className="p-8 space-y-8">
                <div className="grid grid-cols-4 gap-6">
                    <Skeleton height={80} className="rounded-xl" /><Skeleton height={80} className="rounded-xl" /><Skeleton height={80} className="rounded-xl" /><Skeleton height={80} className="rounded-xl" />
                </div>
                <div className="grid grid-cols-4 gap-6">
                     <Skeleton height={120} className="rounded-xl" /><Skeleton height={120} className="rounded-xl" /><Skeleton height={120} className="rounded-xl" /><Skeleton height={120} className="rounded-xl" />
                </div>
                 <Skeleton height={200} className="rounded-2xl" />
            </div>
        );
    }

    // --- STAFF VIEW ---
    if (currentUser.role === 'Staff' || currentUser.role === 'Leader') {
         const myAssets = assets.filter(a => a.currentUser === currentUser.name);
         const myRequests = requests.filter(r => r.requester === currentUser.name);
         return (
             <div className="p-6 md:p-8 space-y-8 bg-gray-50/50 min-h-screen">
                 <header className="flex flex-col md:flex-row justify-between items-end gap-4">
                     <div><h1 className="text-3xl font-bold text-tm-dark">Halo, {currentUser.name}!</h1><p className="text-gray-500 mt-2 text-lg">Panel aset pribadi Anda.</p></div>
                 </header>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div onClick={() => setActivePage('stock')} className="bg-blue-600 text-white p-8 rounded-3xl cursor-pointer hover:shadow-xl transition-all"><h3 className="text-5xl font-bold">{myAssets.length}</h3><p className="text-blue-100 mt-2">Aset Saya</p></div>
                     <div onClick={() => setActivePage('request')} className="bg-white p-8 rounded-3xl border cursor-pointer hover:shadow-lg transition-all"><h3 className="text-5xl font-bold text-gray-800">{myRequests.filter(r => r.status !== ItemStatus.COMPLETED).length}</h3><p className="text-gray-500 mt-2">Request Aktif</p></div>
                 </div>
             </div>
         );
    }

    // --- ADMIN / SUPER ADMIN DASHBOARD ---

    return (
        <div className="p-4 sm:p-6 md:p-8 space-y-8 bg-gray-50/30 min-h-screen font-sans">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 pb-2">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Pusat Analitik Terpadu</h1>
                    <p className="text-sm text-gray-500 mt-1">Tinjauan menyeluruh inventori aset dan operasional.</p>
                </div>
                <div className="text-right hidden md:block">
                    <p className="text-sm font-bold text-gray-800">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
            </div>

             {/* STOCK ALERT WIDGET */}
            <StockAlertWidget assets={assets} setActivePage={setActivePage} />

            {/* LAYER 1: EXECUTIVE SUMMARY (MACRO) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MacroStat 
                    label="Total Nilai Aset" 
                    value={formatCurrencyShort(macroMetrics.totalValue)} 
                    subValue={formatCurrencyFull(macroMetrics.totalValue)}
                    tooltip="Total harga pembelian seluruh aset aktif"
                    icon={BsCurrencyDollar} 
                />
                <MacroStat 
                    label="Total Aset Fisik" 
                    value={macroMetrics.totalAssets.toLocaleString('id-ID')} 
                    subValue={`${macroMetrics.totalActiveItems} Digunakan / ${macroMetrics.totalStockItems} Stok`}
                    icon={BsBoxSeam} 
                />
                <MacroStat 
                    label="Variasi Model" 
                    value={macroMetrics.totalModels.toLocaleString('id-ID')} 
                    subValue={`Dari ${macroMetrics.totalCategories} Kategori Utama`}
                    icon={BsLayers} 
                />
                <MacroStat 
                    label="Cakupan Operasional" 
                    value={`${customers.length} Klien`}
                    subValue={`${divisions.length} Divisi Internal`}
                    icon={ArchiveBoxIcon} 
                />
            </div>

            {/* LAYER 2: URGENCY MATRIX (RISK) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <UrgencyCard 
                    label="Persetujuan Tertunda" 
                    value={urgencyMetrics.pendingRequests.toString()} 
                    icon={CheckIcon} 
                    color="bg-amber-500" 
                    subtext="Menghambat Proses"
                    onClick={() => setActivePage('request', { status: 'awaiting-approval' })}
                />
                <UrgencyCard 
                    label="Peminjaman Terlambat" 
                    value={urgencyMetrics.overdueLoans.toString()} 
                    icon={BsClockHistory} 
                    color="bg-rose-500" 
                    subtext="Risiko Kehilangan"
                    onClick={() => setActivePage('request-pinjam', { status: 'Terlambat' })}
                />
                <UrgencyCard 
                    label="Laporan Kerusakan Baru" 
                    value={urgencyMetrics.unprocessedDamage.toString()} 
                    icon={ExclamationTriangleIcon} 
                    color="bg-orange-500" 
                    subtext="Perlu Tindakan"
                    onClick={() => setActivePage('repair')}
                />
                <UrgencyCard 
                    label="Stok Item Habis" 
                    value={urgencyMetrics.criticalStockCount.toString()} 
                    icon={ArchiveBoxIcon} 
                    color="bg-red-600" 
                    subtext="Segera Restock"
                    onClick={() => setActivePage('stock', { outOfStockOnly: true })}
                />
            </div>

            {/* LAYER 3: FEATURE DEEP-DIVE STATS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FeatureStat 
                    title="Status Perbaikan Aset"
                    items={[
                        { label: 'Internal (Teknisi)', value: featureMetrics.repairs.internal, color: 'bg-blue-100 text-blue-700' },
                        { label: 'Vendor (Eksternal)', value: featureMetrics.repairs.vendor, color: 'bg-purple-100 text-purple-700' }
                    ]}
                    onClick={() => setActivePage('repair')}
                />
                <FeatureStat 
                    title="Kategori Request Aktif"
                    items={[
                        { label: 'Urgent / Darurat', value: featureMetrics.requests.urgent, color: 'bg-red-100 text-red-700' },
                        { label: 'Project Based', value: featureMetrics.requests.project, color: 'bg-indigo-100 text-indigo-700' }
                    ]}
                    onClick={() => setActivePage('request')}
                />
                <FeatureStat 
                    title="Mutasi Aset (30 Hari)"
                    items={[
                        { label: 'Handover Internal', value: featureMetrics.movements.handovers, color: 'bg-green-100 text-green-700' },
                        { label: 'Dismantle Pelanggan', value: featureMetrics.movements.dismantles, color: 'bg-orange-100 text-orange-700' }
                    ]}
                />
            </div>

            {/* LAYER 4: ANALYTICS & TRENDS (NEW) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto">
                 <div className="lg:col-span-2 bg-white p-6 border border-gray-100 rounded-2xl shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-gray-800">Tren Pembelian Aset (6 Bulan)</h3>
                        <BsGraphUp className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-h-0">
                        <SpendingTrendChart data={analyticsData.spendingTrend} />
                    </div>
                </div>
                <div className="lg:col-span-1 bg-white p-6 border border-gray-100 rounded-2xl shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-base font-bold text-gray-800">Komposisi Status</h3>
                        <InfoIcon className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-h-0 flex items-center justify-center">
                        <AssetStatusDonutChart assets={assets} />
                    </div>
                </div>         
            </div>

            {/* LAYER 5: VISUALIZATION & DETAILED MATRICES */}
            
            {/* Charts */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 h-auto">
                <div className="lg:col-span-3 bg-white p-6 border border-gray-100 rounded-2xl shadow-sm flex flex-col">
                    <WarrantyAlertWidget assets={assets} />
                     <div className="flex-1">
                        <AssetMatrix assets={assets} categories={assetCategories} onCellClick={(cat, status) => setActivePage('registration', { category: cat, status: status })} />
                    </div>

                </div>
                <div className="lg:col-span-3">
                     <CategorySummaryWidget assets={assets} categories={assetCategories} />
                </div>
            </div>

            {/* Data Matrices */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                <div className="xl:col-span-2 flex flex-col gap-6 h-full">
                    <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                         <ActionableItemsList currentUser={currentUser} setActivePage={setActivePage} onShowPreview={onShowPreview} />
                    </div>
                </div>

                {/* Action Hub / Activity Feed */}
                <div className="xl:col-span-2 flex flex-col gap-6 h-full">
                    <div className="h-auto bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-white">
                            <h3 className="font-bold text-gray-800 text-sm">Jejak Audit Terkini</h3>
                            <button onClick={() => setIsActivityModalOpen(true)} className="text-xs text-tm-primary font-semibold hover:underline">Lihat Semua</button>
                        </div>
                        <div className="overflow-y-auto custom-scrollbar p-2">
                            <div className="space-y-1">
                                {allActivities.map((act) => (
                                    <div key={act.id} onClick={() => onShowPreview(act.previewData)} className="flex gap-4 items-center p-3 hover:bg-gray-50 cursor-pointer group transition-all rounded-xl">
                                        <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 text-gray-400 border border-gray-100 group-hover:text-tm-primary group-hover:border-blue-100 group-hover:bg-blue-50">
                                            <act.icon className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-gray-700 leading-tight group-hover:text-tm-primary transition-colors line-clamp-1">{act.action}</p>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">{act.user}</span>
                                                <span className="text-[10px] text-gray-400">{new Date(act.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

             <Modal
                isOpen={isActivityModalOpen}
                onClose={() => setIsActivityModalOpen(false)}
                title="Semua Aktivitas"
                size="lg"
                hideDefaultCloseButton >

                 <div className="max-h-[70vh] overflow-y-auto p-4 space-y-2">
                    {allActivities.map((act) => (
                         <div key={act.id} onClick={() => {onShowPreview(act.previewData); setIsActivityModalOpen(false)}} className="flex gap-4 items-center p-4 hover:bg-gray-50 rounded-xl cursor-pointer border border-gray-100 hover:border-gray-300 transition-all">
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-tm-primary flex items-center justify-center border border-blue-100">
                                <act.icon className="w-5 h-5" />
                            </div>
                            
                            <div>
                                <p className="text-sm font-medium text-gray-900">{act.action}</p>
                                <p className="text-xs text-gray-500 mt-1">{act.user} • {new Date(act.timestamp).toLocaleString()}</p>
                            </div>
                        </div>
                    ))}
                 </div>
                 <div className="p-4 border-t flex justify-end bg-gray-50 rounded-b-xl">
                     <button onClick={() => setIsActivityModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm">Tutup</button>
                 </div>
            </Modal>
        </div>
    );
}