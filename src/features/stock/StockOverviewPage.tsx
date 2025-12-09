import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Asset, AssetStatus, Page, PreviewData, AssetCategory, Handover, User, AssetCondition, Division, LoanRequest, LoanRequestStatus, Request } from '../../types';
import { useSortableData, SortConfig } from '../../hooks/useSortableData';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { SearchIcon } from '../../components/icons/SearchIcon';
import { InboxIcon } from '../../components/icons/InboxIcon';
import { SortIcon } from '../../components/icons/SortIcon';
import { SortAscIcon } from '../../components/icons/SortAscIcon';
import { SortDescIcon } from '../../components/icons/SortDescIcon';
import { AssetIcon } from '../../components/icons/AssetIcon';
import { ExclamationTriangleIcon } from '../../components/icons/ExclamationTriangleIcon';
import { RequestIcon } from '../../components/icons/RequestIcon';
import { ClickableLink } from '../../components/ui/ClickableLink';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { CloseIcon } from '../../components/icons/CloseIcon';
import { FilterIcon } from '../../components/icons/FilterIcon';
import { HistoryIcon } from '../../components/icons/HistoryIcon';
import { DollarIcon } from '../../components/icons/DollarIcon';
import { PencilIcon } from '../../components/icons/PencilIcon';
import { CheckIcon } from '../../components/icons/CheckIcon';
import { ArchiveBoxIcon } from '../../components/icons/ArchiveBoxIcon';
import { UsersIcon } from '../../components/icons/UsersIcon';
import { WrenchIcon } from '../../components/icons/WrenchIcon';
import { EyeIcon } from '../../components/icons/EyeIcon';
import { getStatusClass as getAssetStatusClass } from '../assetRegistration/RegistrationPage';
import { BsUpcScan, BsCalendarCheck, BsTag, BsShieldCheck } from 'react-icons/bs';
import { CopyIcon } from '../../components/icons/CopyIcon';
import { useNotification } from '../../providers/NotificationProvider';
import { Checkbox } from '../../components/ui/Checkbox';
import { JournalCheckIcon } from '../../components/icons/JournalCheckIcon';
import { SummaryCard } from '../dashboard/components/SummaryCard';
import { DismantleIcon } from '../../components/icons/DismantleIcon';
import { SpinnerIcon } from '../../components/icons/SpinnerIcon';

import { useAssetStore } from '../../stores/useAssetStore';
import { useMasterDataStore } from '../../stores/useMasterDataStore';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { useRequestStore } from '../../stores/useRequestStore';


interface StockOverviewPageProps {
    currentUser: User;
    setActivePage: (page: Page, filters?: any) => void;
    onShowPreview: (data: PreviewData) => void;
    initialFilters?: any;
    onClearInitialFilters: () => void;
    onReportDamage: (asset: Asset) => void;
}

interface StockItem {
    name: string;
    category: string;
    brand: string;
    inStorage: number;
    inUse: number;
    damaged: number;
    total: number;
    valueInStorage: number;
    unitOfMeasure?: string;
    trackingMethod?: 'individual' | 'bulk';
}

const LOW_STOCK_DEFAULT = 5;

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

const StockSortableHeader: React.FC<{
    children: React.ReactNode;
    columnKey: keyof StockItem;
    sortConfig: SortConfig<StockItem> | null;
    requestStockSort: (key: keyof StockItem) => void;
    className?: string;
}> = ({ children, columnKey, sortConfig, requestStockSort, className }) => {
    const isSorted = sortConfig?.key === columnKey;
    const direction = isSorted ? sortConfig.direction : undefined;

    const getSortIcon = () => {
        if (!isSorted) return <SortIcon className="w-4 h-4 text-gray-400" />;
        if (direction === 'ascending') return <SortAscIcon className="w-4 h-4 text-tm-accent" />;
        return <SortDescIcon className="w-4 h-4 text-tm-accent" />;
    };

    return (
        <th scope="col" className={`px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500 ${className}`}>
            <button onClick={() => requestStockSort(columnKey)} className="flex items-center space-x-1 group">
                <span>{children}</span>
                <span className="opacity-50 group-hover:opacity-100">{getSortIcon()}</span>
            </button>
        </th>
    );
};


const getConditionInfo = (condition: AssetCondition) => {
    switch (condition) {
        case AssetCondition.BRAND_NEW:
        case AssetCondition.GOOD:
        case AssetCondition.USED_OKAY:
            return { Icon: CheckIcon, color: 'text-success' };
        case AssetCondition.MINOR_DAMAGE:
            return { Icon: WrenchIcon, color: 'text-warning-text' };
        case AssetCondition.MAJOR_DAMAGE:
        case AssetCondition.FOR_PARTS:
            return { Icon: WrenchIcon, color: 'text-danger-text' };
        default:
            return { Icon: WrenchIcon, color: 'text-gray-500' };
    }
};

const InfoItem: React.FC<{ icon: React.FC<{className?:string}>; label: string; children: React.ReactNode; }> = ({ icon: Icon, label, children }) => (
    <div>
        <dt className="flex items-center text-xs font-medium text-gray-500">
            <Icon className="w-4 h-4 mr-2" />
            <span>{label}</span>
        </dt>
        <dd className="mt-1 text-sm font-semibold text-gray-800 break-words">{children}</dd>
    </div>
);

const AssetCard: React.FC<{
    asset: Asset;
    dateReceived: string | null;
    onShowDetail: (data: PreviewData) => void;
    onReportDamage: (asset: Asset) => void;
    isLoaned?: boolean;
    loanId?: string;
    returnDate?: string | null;
    onReturn?: () => void;
}> = ({ asset, dateReceived, onShowDetail, onReportDamage, isLoaned, loanId, returnDate, onReturn }) => {
    const addNotification = useNotification();
    const ConditionIcon = getConditionInfo(asset.condition).Icon;
    const conditionColor = getConditionInfo(asset.condition).color;

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        addNotification(`${label} berhasil disalin!`, 'success');
    };

    return (
        <div className="flex flex-col bg-white border border-gray-200/80 rounded-xl shadow-sm transition-all duration-300 hover:shadow-lg hover:border-tm-accent/50">
            <div className="p-4 border-b">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-tm-dark leading-tight">{asset.name}</h3>
                        {isLoaned && (
                            <div className="mt-1.5 flex items-center gap-2 px-2 py-1 text-xs font-semibold text-purple-800 bg-purple-100 rounded-full w-fit">
                                <JournalCheckIcon className="w-4 h-4" />
                                <span>Aset Pinjaman</span>
                            </div>
                        )}
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getAssetStatusClass(asset.status)}`}>
                        {asset.status}
                    </span>
                </div>
                 <p className="flex items-center gap-2 mt-1 text-xs font-mono text-gray-500">
                    {asset.id}
                    <button onClick={() => copyToClipboard(asset.id, 'ID Aset')} title="Salin ID Aset" className="text-gray-400 hover:text-tm-primary">
                        <CopyIcon className="w-3.5 h-3.5" />
                    </button>
                </p>
            </div>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 p-4 flex-grow">
                <InfoItem icon={BsTag} label="Kategori">{asset.category}</InfoItem>
                {isLoaned ? (
                    <InfoItem icon={BsCalendarCheck} label="Tgl Pengembalian">
                        {returnDate 
                            ? new Date(returnDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) 
                            : <span className="italic">Belum ditentukan</span>}
                    </InfoItem>
                ) : (
                    <InfoItem icon={BsCalendarCheck} label="Tgl Diterima">{dateReceived || 'N/A'}</InfoItem>
                )}
                <InfoItem icon={BsUpcScan} label="Nomor Seri">
                    {asset.serialNumber ? (
                         <span className="flex items-center gap-1.5 font-mono">
                            <span className="truncate" title={asset.serialNumber}>{asset.serialNumber}</span>
                            <button onClick={() => copyToClipboard(asset.serialNumber!, 'Nomor Seri')} title="Salin Nomor Seri" className="text-gray-400 hover:text-tm-primary">
                                <CopyIcon className="w-3.5 h-3.5" />
                            </button>
                        </span>
                    ) : '-'}
                </InfoItem>
                <InfoItem icon={ConditionIcon} label="Kondisi">
                    <span className={conditionColor}>{asset.condition}</span>
                </InfoItem>
            </div>
             <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50/50 border-t rounded-b-xl">
                <button
                    onClick={() => onShowDetail({ type: 'asset', id: asset.id })}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-tm-primary transition-colors bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-tm-light"
                >
                    <EyeIcon className="w-4 h-4"/>
                    Detail
                </button>
                
                {isLoaned ? (
                    asset.status === AssetStatus.AWAITING_RETURN ? (
                        <button
                            disabled
                            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-blue-800 transition-colors bg-blue-100 border border-blue-100 rounded-lg shadow-sm cursor-not-allowed"
                        >
                            <SpinnerIcon className="w-4 h-4 animate-spin"/>
                            Proses Pengembalian
                        </button>
                    ) : (
                        <button
                            onClick={onReturn}
                            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-white transition-colors bg-purple-600 border border-purple-600 rounded-lg shadow-sm hover:bg-purple-700"
                        >
                            <DismantleIcon className="w-4 h-4"/>
                            Kembalikan
                        </button>
                    )
                ) : (
                    <button
                        onClick={() => onReportDamage(asset)}
                        disabled={asset.status === AssetStatus.DAMAGED}
                        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-white transition-colors bg-amber-500 border border-amber-500 rounded-lg shadow-sm hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        <WrenchIcon className="w-4 h-4"/>
                        Laporkan
                    </button>
                )}
            </div>
        </div>
    );
};


const StockOverviewPage: React.FC<StockOverviewPageProps> = ({ currentUser, setActivePage, onShowPreview, initialFilters, onClearInitialFilters, onReportDamage }) => {
    // --- Data from Stores ---
    const assets = useAssetStore((state) => state.assets);
    const assetCategories = useAssetStore((state) => state.categories);
    const users = useMasterDataStore((state) => state.users);
    const divisions = useMasterDataStore((state) => state.divisions);
    const handovers = useTransactionStore((state) => state.handovers);
    const requests = useRequestStore((state) => state.requests);
    const loanRequests = useRequestStore((state) => state.loanRequests);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(9); // Adjusted for card layout
    const [thresholds, setThresholds] = useState<Record<string, number>>({});
    const [editingThresholdKey, setEditingThresholdKey] = useState<string | null>(null);
    const [tempThreshold, setTempThreshold] = useState<string>('');

    const initialFilterState = { category: '', brand: '', lowStockOnly: false, outOfStockOnly: false, status: '', condition: '' };
    const [filters, setFilters] = useState(initialFilterState);
    const [tempFilters, setTempFilters] = useState(filters);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const filterPanelRef = useRef<HTMLDivElement>(null);

    const handleThresholdChange = (key: string, value: number) => {
        const newThreshold = Math.max(0, value); // Ensure threshold is not negative
        setThresholds(prev => ({ ...prev, [key]: newThreshold }));
    };

    useEffect(() => {
        if (initialFilters) {
            setFilters(prev => ({...prev, ...initialFilters}));
            onClearInitialFilters();
        }
    }, [initialFilters, onClearInitialFilters]);

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
        return Object.values(filters).filter(value => {
            if (typeof value === 'boolean') return value;
            return !!value;
        }).length;
    }, [filters]);

    const handleApplyFilters = () => {
        setFilters(tempFilters);
        setIsFilterPanelOpen(false);
    };

    const handleResetFilters = () => {
        setFilters(initialFilterState);
        setTempFilters(initialFilterState);
        setIsFilterPanelOpen(false);
    };
    
    // --- STAFF-SPECIFIC LOGIC ---
    const { myAssets, loanedAssetDetails } = useMemo(() => {
        if (currentUser.role !== 'Staff') return { myAssets: [], loanedAssetDetails: new Map() };

        // 1. Permanently assigned assets
        const permanentlyAssigned = assets.filter(a => a.currentUser === currentUser.name);

        // 2. Loaned assets (Exclude returned ones)
        const myActiveLoans = loanRequests.filter(
            lr => lr.requester === currentUser.name && 
                  (lr.status === LoanRequestStatus.ON_LOAN || lr.status === LoanRequestStatus.OVERDUE || lr.status === LoanRequestStatus.AWAITING_RETURN)
        );

        const loanedAssetIds = myActiveLoans.flatMap(lr => {
             const allAssigned = Object.values(lr.assignedAssetIds || {}).flat();
             const returnedIds = lr.returnedAssetIds || [];
             return allAssigned.filter(id => !returnedIds.includes(id));
        });
        
        const loanedAssets = assets.filter(a => loanedAssetIds.includes(a.id));

        // 3. Combine and deduplicate
        const allMyAssetsMap = new Map<string, Asset>();
        permanentlyAssigned.forEach(a => allMyAssetsMap.set(a.id, a));
        loanedAssets.forEach(a => allMyAssetsMap.set(a.id, a));

        const finalMyAssets = Array.from(allMyAssetsMap.values());
        
        // 4. Create a map for loaned asset details (like return date)
        const finalLoanedAssetDetails = new Map<string, { returnDate: string | null, loanId: string }>();
        myActiveLoans.forEach(loan => {
            loan.items.forEach(item => {
                const assignedIds = loan.assignedAssetIds?.[item.id] || [];
                const returnedIds = loan.returnedAssetIds || [];
                
                assignedIds.forEach(assetId => {
                    if (!returnedIds.includes(assetId)) {
                        finalLoanedAssetDetails.set(assetId, { returnDate: item.returnDate || null, loanId: loan.id });
                    }
                });
            });
        });

        return { myAssets: finalMyAssets, loanedAssetDetails: finalLoanedAssetDetails };
    }, [assets, currentUser, loanRequests]);


    const filteredMyAssets = useMemo(() => {
        if (currentUser.role !== 'Staff') return [];
        return myAssets
            .filter(asset => {
                const searchLower = searchQuery.toLowerCase();
                return (
                    asset.name.toLowerCase().includes(searchLower) ||
                    asset.id.toLowerCase().includes(searchLower) ||
                    asset.brand.toLowerCase().includes(searchLower) ||
                    (asset.serialNumber && asset.serialNumber.toLowerCase().includes(searchLower))
                );
            })
            .filter(asset => filters.category ? asset.category === filters.category : true)
            .filter(asset => filters.status ? asset.status === filters.status : true)
            .filter(asset => {
                if (!filters.condition) return true;
                if (filters.condition === 'GOOD') return [AssetCondition.GOOD, AssetCondition.BRAND_NEW, AssetCondition.USED_OKAY].includes(asset.condition);
                if (filters.condition === 'ATTENTION') return [AssetCondition.MINOR_DAMAGE, AssetCondition.MAJOR_DAMAGE, AssetCondition.FOR_PARTS].includes(asset.condition);
                return true;
            });
    }, [myAssets, currentUser, searchQuery, filters]);

    const { items: sortedMyAssets, requestSort: requestMyAssetsSort, sortConfig: myAssetsSortConfig } = useSortableData(filteredMyAssets, { key: 'name', direction: 'ascending' });
    
    const myAssetsTotalItems = sortedMyAssets.length;
    const myAssetsTotalPages = Math.ceil(myAssetsTotalItems / itemsPerPage);
    const myAssetsStartIndex = (currentPage - 1) * itemsPerPage;
    const myAssetsPaginated = sortedMyAssets.slice(myAssetsStartIndex, myAssetsStartIndex + itemsPerPage);

    const staffSummary = useMemo(() => {
        if (currentUser.role !== 'Staff') return null;
        return {
            total: myAssets.length,
            goodCondition: myAssets.filter(a => [AssetCondition.GOOD, AssetCondition.BRAND_NEW, AssetCondition.USED_OKAY].includes(a.condition)).length,
            needsAttention: myAssets.filter(a => [AssetCondition.MINOR_DAMAGE, AssetCondition.MAJOR_DAMAGE, AssetCondition.FOR_PARTS].includes(a.condition)).length,
        }
    }, [myAssets, currentUser.role]);

    const getDateReceived = (assetId: string, staffName: string): string | null => {
        const relevantHandovers = handovers
            .filter(h => h.penerima === staffName && h.items.some(item => item.assetId === assetId))
            .sort((a, b) => new Date(b.handoverDate).getTime() - new Date(a.handoverDate).getTime());
        
        if (relevantHandovers.length > 0) {
            return new Date(relevantHandovers[0].handoverDate).toLocaleDateString('id-ID', {
                day: '2-digit', month: 'long', year: 'numeric'
            });
        }
        return null;
    };


    // --- ADMIN/MANAGER-SPECIFIC LOGIC ---
    const aggregatedStock = useMemo<StockItem[]>(() => {
        if (currentUser.role === 'Staff') return [];
        
        const stockMap = new Map<string, StockItem>();
        
        const isLeader = currentUser.role === 'Leader' && currentUser.divisionId;
        const userDivisionId = currentUser.divisionId;
        
        const divisionUserNames = isLeader ? new Set(users.filter(u => u.divisionId === userDivisionId).map(u => u.name)) : new Set();
        const allowedCategoryNames = isLeader ? new Set(
            assetCategories
                .filter(cat => cat.associatedDivisions.length === 0 || cat.associatedDivisions.includes(userDivisionId!))
                .map(cat => cat.name)
        ) : new Set();

        const activeAssets = assets.filter(asset => asset.status !== AssetStatus.DECOMMISSIONED);

        activeAssets.forEach(asset => {
             const key = `${asset.name}|${asset.brand}`;
            if (!stockMap.has(key)) {
                const category = assetCategories.find(c => c.name === asset.category);
                const type = category?.types.find(t => t.name === asset.type);
                stockMap.set(key, { 
                    name: asset.name, 
                    category: asset.category, 
                    brand: asset.brand, 
                    inStorage: 0, 
                    inUse: 0, 
                    damaged: 0, 
                    total: 0, 
                    valueInStorage: 0,
                    unitOfMeasure: type?.unitOfMeasure || 'unit',
                    trackingMethod: type?.trackingMethod || 'individual',
                });
            }
        });

        if (isLeader) {
            activeAssets.forEach(asset => {
                const isRelevantInStorage = asset.status === AssetStatus.IN_STORAGE && allowedCategoryNames.has(asset.category);
                const isRelevantInUseOrDamaged = asset.status !== AssetStatus.IN_STORAGE && asset.currentUser && divisionUserNames.has(asset.currentUser);

                if (isRelevantInStorage || isRelevantInUseOrDamaged) {
                    const key = `${asset.name}|${asset.brand}`;
                    const current = stockMap.get(key)!;
                    current.total++;
                    switch (asset.status) {
                        case AssetStatus.IN_STORAGE: 
                            current.inStorage++;
                            if (asset.purchasePrice) current.valueInStorage += asset.purchasePrice;
                            break;
                        case AssetStatus.IN_USE: current.inUse++; break;
                        case AssetStatus.DAMAGED:
                        case AssetStatus.UNDER_REPAIR:
                        case AssetStatus.OUT_FOR_REPAIR:
                            current.damaged++; break;
                    }
                }
            });
        } else { // Admins and SuperAdmins
             activeAssets.forEach(asset => {
                const key = `${asset.name}|${asset.brand}`;
                const current = stockMap.get(key)!;
                current.total++;
                switch (asset.status) {
                    case AssetStatus.IN_STORAGE:
                        current.inStorage++;
                        if (asset.purchasePrice) current.valueInStorage += asset.purchasePrice;
                        break;
                    case AssetStatus.IN_USE: current.inUse++; break;
                    case AssetStatus.DAMAGED:
                    case AssetStatus.UNDER_REPAIR:
                    case AssetStatus.OUT_FOR_REPAIR:
                        current.damaged++; break;
                }
            });
        }

        return Array.from(stockMap.values()).filter(item => item.total > 0);

    }, [assets, assetCategories, currentUser, users, divisions]);
    
    const summaryData = useMemo(() => {
        if (currentUser.role === 'Staff') return null;
        const lowStockItems = aggregatedStock.filter(item => {
            const key = `${item.name}|${item.brand}`;
            const threshold = thresholds[key] ?? LOW_STOCK_DEFAULT;
            return item.inStorage > 0 && item.inStorage <= threshold;
        }).length;
        const outOfStockItems = aggregatedStock.filter(item => item.inStorage === 0).length;
        const totalValueInStorage = aggregatedStock.reduce((sum, item) => sum + item.valueInStorage, 0);
        
        return { 
            totalTypes: aggregatedStock.length, 
            lowStockItems, 
            outOfStockItems, 
            totalValueInStorage,
        };
    }, [aggregatedStock, thresholds, currentUser.role]);

    const formatCurrencyShort = (value: number): string => {
        if (value >= 1_000_000_000) {
            return `${(value / 1_000_000_000).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Miliar`;
        }
        if (value >= 1_000_000) {
            return `${(value / 1_000_000).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Juta`;
        }
        if (value >= 1000) {
            return `${(value / 1000).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Ribu`;
        }
        return value.toLocaleString('id-ID');
    };

    const fullStockValue = summaryData ? `Rp ${summaryData.totalValueInStorage.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : 'Rp 0';
    const shortStockValue = summaryData ? `Rp ${formatCurrencyShort(summaryData.totalValueInStorage)}` : 'Rp 0';

    const filterOptions = useMemo(() => {
        const categories = [...new Set(aggregatedStock.map(item => item.category))];
        const brands = [...new Set(aggregatedStock.map(item => item.brand))];
        return { categories, brands };
    }, [aggregatedStock]);
    
    const filteredStock = useMemo(() => {
        if (currentUser.role === 'Staff') return [];
        return aggregatedStock
            .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.brand.toLowerCase().includes(searchQuery.toLowerCase()))
            .filter(item => filters.category ? item.category === filters.category : true)
            .filter(item => filters.brand ? item.brand === filters.brand : true)
            .filter(item => {
                if (!filters.lowStockOnly && !filters.outOfStockOnly) return true;
                const key = `${item.name}|${item.brand}`;
                const threshold = thresholds[key] ?? LOW_STOCK_DEFAULT;
                if (filters.lowStockOnly) return item.inStorage > 0 && item.inStorage <= threshold;
                if (filters.outOfStockOnly) return item.inStorage === 0;
                return true;
            });
    }, [aggregatedStock, searchQuery, filters, thresholds, currentUser.role]);

    const { items: sortedStock, requestSort: requestStockSort, sortConfig: stockSortConfig } = useSortableData(filteredStock, { key: 'name', direction: 'ascending' });
    
    const totalItems = sortedStock.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedStock = sortedStock.slice(startIndex, endIndex);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filters, itemsPerPage]);

    if (currentUser.role === 'Staff') {
        const staffCategoryOptions = useMemo(() => [
            { value: '', label: 'Semua Kategori' },
            ...[...new Set(myAssets.map(a => a.category))].map(c => ({ value: c, label: c }))
        ], [myAssets]);
        const staffStatusOptions = useMemo(() => [
            { value: '', label: 'Semua Status' },
            ...[...new Set(myAssets.map(a => a.status))].map(s => ({ value: s, label: s }))
        ], [myAssets]);

        return (
            <div className="p-4 sm:p-6 md:p-8 space-y-8">
                <h1 className="text-3xl font-bold text-tm-dark">Aset Saya</h1>
                
                {staffSummary && (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        <SummaryCard title="Total Aset Saya" value={staffSummary.total} icon={ArchiveBoxIcon} color="blue" isActive={!filters.condition} onClick={() => setFilters(f => ({...f, condition: ''}))} />
                        <SummaryCard title="Kondisi Baik" value={staffSummary.goodCondition} icon={BsShieldCheck} color="green" isActive={filters.condition === 'GOOD'} onClick={() => setFilters(f => ({...f, condition: 'GOOD'}))} />
                        <SummaryCard title="Perlu Perhatian" value={staffSummary.needsAttention} icon={ExclamationTriangleIcon} color="amber" isActive={filters.condition === 'ATTENTION'} onClick={() => setFilters(f => ({...f, condition: 'ATTENTION'}))} />
                    </div>
                )}
                
                <div className="p-4 bg-white border border-gray-200/80 rounded-xl shadow-md">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-grow">
                            <SearchIcon className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 top-1/2 left-3" />
                            <input type="text" placeholder="Cari nama, ID, brand, atau SN..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-10 py-2 pl-10 pr-4 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-tm-accent focus:border-tm-accent" />
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <CustomSelect options={staffCategoryOptions} value={filters.category} onChange={v => setFilters(f => ({...f, category: v}))} placeholder="Filter Kategori" />
                            </div>
                            <div className="flex-1">
                                <CustomSelect options={staffStatusOptions} value={filters.status} onChange={v => setFilters(f => ({...f, status: v}))} placeholder="Filter Status" />
                            </div>
                        </div>
                    </div>
                </div>

                {myAssetsPaginated.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {myAssetsPaginated.map(asset => {
                                const isLoaned = loanedAssetDetails.has(asset.id);
                                const loanDetails = isLoaned ? loanedAssetDetails.get(asset.id) : null;
                                return (
                                    <AssetCard
                                        key={asset.id}
                                        asset={asset}
                                        dateReceived={isLoaned ? null : getDateReceived(asset.id, currentUser.name)}
                                        onShowDetail={onShowPreview}
                                        onReportDamage={onReportDamage}
                                        isLoaned={isLoaned}
                                        returnDate={loanDetails?.returnDate || null}
                                        onReturn={isLoaned && loanDetails ? () => setActivePage('return-form', {
                                            loanId: loanDetails.loanId,
                                            assetId: asset.id
                                        }) : undefined}
                                    />
                                );
                            })}
                        </div>
                         <PaginationControls 
                             currentPage={currentPage} 
                             totalPages={myAssetsTotalPages} 
                             totalItems={myAssetsTotalItems} 
                             itemsPerPage={itemsPerPage} 
                             onPageChange={setCurrentPage} 
                             onItemsPerPageChange={setItemsPerPage} 
                             startIndex={myAssetsStartIndex} 
                             endIndex={myAssetsStartIndex + myAssetsPaginated.length} 
                         />
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500 bg-white border-2 border-dashed rounded-xl">
                        <InboxIcon className="w-16 h-16 text-gray-300" />
                        <p className="mt-4 text-lg font-semibold">{searchQuery || Object.values(filters).some(Boolean) ? 'Aset Tidak Ditemukan' : 'Anda Belum Memiliki Aset'}</p>
                        <p className="mt-1 text-sm">{searchQuery || Object.values(filters).some(Boolean) ? 'Coba ubah kata kunci atau filter pencarian Anda.' : 'Aset yang Anda pegang akan muncul di sini. Jika Anda membutuhkan aset, silakan buat permintaan.'}</p>
                        <button onClick={() => setActivePage('request')} className="inline-flex items-center justify-center gap-2 mt-4 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover">
                           <RequestIcon className="w-4 h-4" /> Buat Request Aset Baru
                        </button>
                    </div>
                )}
            </div>
        );
    }
    
    return (
        <div className="p-4 sm:p-6 md:p-8 space-y-8">
            <h1 className="text-3xl font-bold text-tm-dark">Stok Aset</h1>
            
            {summaryData && (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <SummaryCard title="Total Tipe Aset" value={summaryData.totalTypes} icon={AssetIcon} color="blue" />
                    <SummaryCard 
                        title="Total Nilai Stok Gudang" 
                        value={shortStockValue}
                        tooltipText={fullStockValue}
                        icon={DollarIcon}
                        color="green" 
                    />
                    <SummaryCard title="Stok Menipis" value={summaryData.lowStockItems} icon={ExclamationTriangleIcon} color="amber" onClick={() => { 
                        const newFilterState = !filters.lowStockOnly;
                        setFilters(f => ({ ...initialFilterState, lowStockOnly: newFilterState }));
                        setTempFilters(f => ({ ...initialFilterState, lowStockOnly: newFilterState })); 
                    }} isActive={filters.lowStockOnly} />
                    <SummaryCard title="Stok Habis" value={summaryData.outOfStockItems} icon={InboxIcon} color="red" onClick={() => {
                         const newFilterState = !filters.outOfStockOnly;
                         setFilters(f => ({ ...initialFilterState, outOfStockOnly: newFilterState }));
                         setTempFilters(f => ({ ...initialFilterState, outOfStockOnly: newFilterState }));
                    }} isActive={filters.outOfStockOnly} />
                </div>
            )}
            
            <div className="p-4 bg-white border border-gray-200/80 rounded-xl shadow-md">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <SearchIcon className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Cari nama atau brand aset..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-10 py-2 pl-10 pr-10 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-tm-accent focus:border-tm-accent"
                        />
                         {searchQuery && (
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                <button type="button" onClick={() => setSearchQuery('')} className="p-1 text-gray-400 rounded-full hover:bg-gray-200 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-tm-accent" aria-label="Hapus pencarian">
                                    <CloseIcon className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="relative" ref={filterPanelRef}>
                        <button
                            onClick={() => { setTempFilters(filters); setIsFilterPanelOpen(p => !p); }}
                            className="inline-flex items-center justify-center gap-2 w-full h-10 px-4 text-sm font-semibold text-gray-700 transition-all duration-200 bg-white border border-gray-300 rounded-lg shadow-sm sm:w-auto hover:bg-gray-50"
                        >
                            <FilterIcon className="w-4 h-4" /> <span>Filter</span> {activeFilterCount > 0 && <span className="px-2 py-0.5 text-xs font-bold text-white rounded-full bg-tm-primary">{activeFilterCount}</span>}
                        </button>
                        {isFilterPanelOpen && (
                           <>
                                <div onClick={() => setIsFilterPanelOpen(false)} className="fixed inset-0 z-20 bg-black/25 sm:hidden" />
                                <div className="fixed top-32 inset-x-4 z-30 origin-top rounded-xl border border-gray-200 bg-white shadow-lg sm:absolute sm:top-full sm:inset-x-auto sm:right-0 sm:mt-2 sm:w-72">
                                    <div className="flex items-center justify-between p-4 border-b">
                                        <h3 className="text-lg font-semibold text-gray-800">Filter Stok</h3>
                                        <button onClick={() => setIsFilterPanelOpen(false)} className="p-1 text-gray-400 rounded-full hover:bg-gray-100"><CloseIcon className="w-5 h-5"/></button>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Kategori</label>
                                            <CustomSelect
                                                options={[{ value: '', label: 'Semua Kategori' }, ...filterOptions.categories.map(c => ({ value: c, label: c }))]}
                                                value={tempFilters.category}
                                                onChange={v => setTempFilters(f => ({...f, category: v}))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Brand</label>
                                            <CustomSelect
                                                options={[{ value: '', label: 'Semua Brand' }, ...filterOptions.brands.map(b => ({ value: b, label: b }))]}
                                                value={tempFilters.brand}
                                                onChange={v => setTempFilters(f => ({...f, brand: v}))}
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center p-2 -m-2 rounded-md hover:bg-gray-50">
                                                <Checkbox
                                                    id="low-stock-filter"
                                                    checked={tempFilters.lowStockOnly}
                                                    onChange={e => setTempFilters(f => ({...f, lowStockOnly: e.target.checked, outOfStockOnly: e.target.checked ? false : f.outOfStockOnly }))}
                                                />
                                                <label htmlFor="low-stock-filter" className="ml-3 text-sm font-medium text-gray-700 cursor-pointer">
                                                    Hanya stok menipis
                                                </label>
                                            </div>
                                             <div className="flex items-center p-2 -m-2 rounded-md hover:bg-gray-50 mt-2">
                                                <Checkbox
                                                    id="out-of-stock-filter"
                                                    checked={tempFilters.outOfStockOnly}
                                                    onChange={e => setTempFilters(f => ({...f, outOfStockOnly: e.target.checked, lowStockOnly: e.target.checked ? false : f.lowStockOnly }))}
                                                />
                                                <label htmlFor="out-of-stock-filter" className="ml-3 text-sm font-medium text-gray-700 cursor-pointer">
                                                    Hanya stok habis
                                                </label>
                                            </div>
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
                 {activeFilterCount > 0 && (
                    <div className="pt-4 mt-4 border-t border-gray-200">
                       <p className="text-sm text-gray-600">
                           Menampilkan <span className="font-semibold text-tm-dark">{sortedStock.length}</span> dari <span className="font-semibold text-tm-dark">{aggregatedStock.length}</span> total tipe aset yang cocok.
                       </p>
                    </div>
                )}
            </div>
            
            <div className="overflow-hidden bg-white border border-gray-200/80 rounded-xl shadow-md">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <StockSortableHeader columnKey="name" sortConfig={stockSortConfig} requestStockSort={requestStockSort}>Nama Aset</StockSortableHeader>
                                <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-center text-gray-500">Ambang Batas</th>
                                <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-center text-gray-500">Di Gudang</th>
                                <StockSortableHeader columnKey="valueInStorage" sortConfig={stockSortConfig} requestStockSort={requestStockSort} className="text-right">Nilai Stok (Rp)</StockSortableHeader>
                                <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-center text-gray-500">Digunakan</th>
                                <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-center text-gray-500">Rusak</th>
                                <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-center text-gray-500">Total</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Aksi</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedStock.length > 0 ? (
                                paginatedStock.map(item => {
                                    const key = `${item.name}|${item.brand}`;
                                    const threshold = thresholds[key] ?? LOW_STOCK_DEFAULT;
                                    const isOutOfStock = item.inStorage === 0;
                                    const isLowStock = !isOutOfStock && item.inStorage <= threshold;
                                    
                                    const storagePercentage = item.total > 0 ? (item.inStorage / item.total) * 100 : 0;
                                    const barColorClass = isOutOfStock ? 'bg-danger/80' : isLowStock ? 'bg-warning/80' : 'bg-success/80';
                                    
                                    const rowClass = isOutOfStock ? 'bg-red-50/50' : isLowStock ? 'bg-amber-50/50' : '';

                                    return (
                                        <tr key={key} className={`${rowClass} hover:bg-gray-50 transition-colors`}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <a
                                                        href="#"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setActivePage('registration', { name: item.name, brand: item.brand });
                                                        }}
                                                        className="text-sm font-semibold text-gray-900 hover:text-tm-primary hover:underline"
                                                    >
                                                        {item.name}
                                                    </a>
                                                    {item.trackingMethod === 'bulk' ? (
                                                        <span className="px-2 py-0.5 text-xs font-semibold text-purple-800 bg-purple-100 rounded-full">Bulk</span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 text-xs font-semibold text-gray-700 bg-gray-100 rounded-full">Individual</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-500">{item.brand} &bull; {item.category}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-center whitespace-nowrap">
                                                {editingThresholdKey === key ? (
                                                    <div className="flex items-center justify-center gap-1">
                                                        <input
                                                            type="number"
                                                            value={tempThreshold}
                                                            onChange={(e) => {
                                                                const value = e.target.value;
                                                                if (value === '') {
                                                                    setTempThreshold('');
                                                                    return;
                                                                }
                                                                const numValue = parseInt(value, 10);
                                                                if (!isNaN(numValue) && numValue >= 0) {
                                                                    setTempThreshold(String(numValue));
                                                                }
                                                            }}
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    const finalValue = parseInt(tempThreshold, 10) || 0;
                                                                    handleThresholdChange(key, finalValue);
                                                                    setEditingThresholdKey(null);
                                                                } else if (e.key === 'Escape') {
                                                                    setEditingThresholdKey(null);
                                                                }
                                                            }}
                                                            className="w-16 h-8 text-sm font-semibold text-center text-gray-900 bg-white border border-tm-primary rounded-md shadow-sm outline-none ring-2 ring-tm-accent"
                                                        />
                                                        <button 
                                                            onClick={() => {
                                                                const finalValue = parseInt(tempThreshold, 10) || 0;
                                                                handleThresholdChange(key, finalValue);
                                                                setEditingThresholdKey(null);
                                                            }}
                                                            className="p-1.5 text-success-text bg-success-light rounded-md hover:bg-green-200"
                                                        >
                                                            <CheckIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div 
                                                        onClick={() => {
                                                            setTempThreshold(String(threshold));
                                                            setEditingThresholdKey(key);
                                                        }}
                                                        className="group relative flex items-center justify-center w-16 h-8 px-2 py-1 mx-auto font-semibold text-gray-800 transition-colors rounded-md cursor-pointer hover:bg-gray-200"
                                                    >
                                                        <span>{threshold}</span>
                                                        <PencilIcon className="absolute w-3 h-3 text-gray-500 transition-opacity opacity-0 right-1 group-hover:opacity-100" />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-center whitespace-nowrap">
                                                <ClickableLink 
                                                    onClick={() => onShowPreview({ type: 'stockItemAssets', id: `${item.name}|${item.brand}|${AssetStatus.IN_STORAGE}` })}
                                                    className="flex flex-col items-center justify-center gap-1.5 !text-gray-800"
                                                >
                                                    <div className={`flex items-center gap-2 font-bold ${isOutOfStock ? 'text-danger-text' : isLowStock ? 'text-warning-text' : 'text-success-text'}`}>
                                                        <ArchiveBoxIcon className="w-4 h-4"/>
                                                        <span>{item.inStorage}</span>
                                                        <span className="text-xs font-normal text-gray-500">{item.unitOfMeasure}</span>
                                                    </div>
                                                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden" title={`${storagePercentage.toFixed(0)}% dari total`}>
                                                        <div className={`h-full rounded-full ${barColorClass}`} style={{ width: `${storagePercentage}%` }}></div>
                                                    </div>
                                                </ClickableLink>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-right text-gray-800 whitespace-nowrap">
                                                {item.valueInStorage.toLocaleString('id-ID')}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-center text-gray-800 whitespace-nowrap">
                                                <ClickableLink
                                                    onClick={() => onShowPreview({ type: 'stockItemAssets', id: `${item.name}|${item.brand}|${AssetStatus.IN_USE}` })}
                                                    className="flex items-center justify-center gap-2 !text-gray-800"
                                                >
                                                    <UsersIcon className="w-4 h-4"/>
                                                    <span>{item.inUse} <span className="text-xs font-normal text-gray-500">{item.unitOfMeasure}</span></span>
                                                </ClickableLink>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-center text-gray-800 whitespace-nowrap">
                                                <ClickableLink
                                                    onClick={() => onShowPreview({ type: 'stockItemAssets', id: `${item.name}|${item.brand}|${AssetStatus.DAMAGED}` })}
                                                    className="flex items-center justify-center gap-2 !text-gray-800"
                                                >
                                                    <WrenchIcon className="w-4 h-4"/>
                                                    <span>{item.damaged} <span className="text-xs font-normal text-gray-500">{item.unitOfMeasure}</span></span>
                                                </ClickableLink>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-center text-gray-900 whitespace-nowrap">
                                                 <ClickableLink onClick={() => onShowPreview({ type: 'stockItemAssets', id: `${item.name}|${item.brand}|ALL` })} className="!text-gray-900">
                                                    {item.total} <span className="text-xs font-normal text-gray-500">{item.unitOfMeasure}</span>
                                                </ClickableLink>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <button 
                                                        onClick={() => onShowPreview({ type: 'stockHistory', id: `${item.name}|${item.brand}` })}
                                                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors bg-gray-100 rounded-md shadow-sm hover:bg-gray-200"
                                                    >
                                                        <HistoryIcon className="w-4 h-4" />
                                                        Riwayat
                                                    </button>
                                                    <button 
                                                        onClick={() => setActivePage('request', { prefillItem: { name: item.name, brand: item.brand } })}
                                                        className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white rounded-md shadow-sm transition-colors
                                                            ${(isOutOfStock || isLowStock) ? 'bg-amber-500 hover:bg-amber-600' : 'bg-tm-accent hover:bg-tm-primary'}`
                                                        }
                                                    >
                                                        <RequestIcon className="w-4 h-4" />
                                                        Request
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <InboxIcon className="w-12 h-12 text-gray-400" />
                                            <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak Ada Data Stok</h3>
                                            <p className="mt-1 text-sm text-gray-500">Ubah filter atau catat aset baru untuk memulai.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
                    startIndex={startIndex}
                    endIndex={endIndex}
                />
            </div>
        </div>
    );
};

export default StockOverviewPage;