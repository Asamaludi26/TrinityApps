import React, { useMemo, useState } from 'react';
import { Asset, AssetStatus, Page } from '../../../types';
import { ExclamationTriangleIcon } from '../../../components/icons/ExclamationTriangleIcon';
import { ShoppingCartIcon } from '../../../components/icons/ShoppingCartIcon';
import { InboxIcon } from '../../../components/icons/InboxIcon';
import { ArchiveBoxIcon } from '../../../components/icons/ArchiveBoxIcon';

interface StockAlertWidgetProps {
    assets: Asset[];
    setActivePage: (page: Page, filters?: any) => void;
}

type StockItem = {
    name: string;
    brand: string;
    category: string;
    count: number;
};

const LOW_STOCK_THRESHOLD = 5;

export const StockAlertWidget: React.FC<StockAlertWidgetProps> = ({ assets, setActivePage }) => {
    const [activeTab, setActiveTab] = useState<'critical' | 'low'>('critical');

    const stockData = useMemo(() => {
        const stockMap = new Map<string, StockItem>();

        assets.forEach(asset => {
            const key = `${asset.name}|${asset.brand}`;
            if (!stockMap.has(key)) {
                stockMap.set(key, { 
                    name: asset.name, 
                    brand: asset.brand, 
                    category: asset.category, 
                    count: 0 
                });
            }
            
            if (asset.status === AssetStatus.IN_STORAGE) {
                stockMap.get(key)!.count++;
            }
        });

        const allItems = Array.from(stockMap.values());
        
        const critical = allItems.filter(item => item.count === 0);
        const low = allItems.filter(item => item.count > 0 && item.count <= LOW_STOCK_THRESHOLD);

        return { critical, low };
    }, [assets]);

    const itemsToDisplay = activeTab === 'critical' ? stockData.critical : stockData.low;
    const isEmpty = itemsToDisplay.length === 0;
    
    // Colors based on severity
    const themeColor = activeTab === 'critical' ? 'red' : 'amber';
    const bgSoft = activeTab === 'critical' ? 'bg-red-50' : 'bg-amber-50';
    const textStrong = activeTab === 'critical' ? 'text-red-700' : 'text-amber-700';
    const borderSoft = activeTab === 'critical' ? 'border-red-100' : 'border-amber-100';

    return (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${bgSoft} ${textStrong}`}>
                        <ExclamationTriangleIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">Peringatan Stok</h3>
                        <p className="text-sm text-gray-500">Pantau ketersediaan aset yang kritis</p>
                    </div>
                </div>
                
                {/* Elegant Tabs */}
                <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                    <button
                        onClick={() => setActiveTab('critical')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                            activeTab === 'critical' 
                                ? 'bg-white text-red-600 shadow-sm ring-1 ring-black/5' 
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${activeTab === 'critical' ? 'bg-red-500' : 'bg-gray-300'}`}></span>
                        Habis ({stockData.critical.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('low')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                            activeTab === 'low' 
                                ? 'bg-white text-amber-600 shadow-sm ring-1 ring-black/5' 
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${activeTab === 'low' ? 'bg-amber-500' : 'bg-gray-300'}`}></span>
                        Menipis ({stockData.low.length})
                    </button>
                </div>
            </div>

            {/* List Content - Grid Layout for Full Width */}
            <div className="p-6 bg-white/50">
                {!isEmpty ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {itemsToDisplay.map((item, idx) => (
                            <div 
                                key={`${item.name}-${idx}`} 
                                className={`flex items-center justify-between p-4 bg-white border border-gray-100 hover:border-${themeColor}-200 hover:shadow-md hover:shadow-${themeColor}-100/20 rounded-xl transition-all group relative overflow-hidden`}
                            >
                                {/* Side accent bar */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${activeTab === 'critical' ? 'bg-red-500' : 'bg-amber-400'}`}></div>
                                
                                <div className="min-w-0 flex-1 pr-4 pl-2">
                                    <p className="text-sm font-bold text-gray-800 truncate" title={item.name}>{item.name}</p>
                                    <p className="text-xs text-gray-500 truncate mt-0.5">{item.brand}</p>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                                        item.count === 0 
                                            ? 'bg-red-50 text-red-700 border-red-100' 
                                            : 'bg-amber-50 text-amber-700 border-amber-100'
                                    }`}>
                                        <ArchiveBoxIcon className="w-3.5 h-3.5" />
                                        {item.count}
                                    </div>
                                    
                                    <button
                                        onClick={() => setActivePage('request', { prefillItem: { name: item.name, brand: item.brand } })}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                        title="Buat Request Restock"
                                    >
                                        <ShoppingCartIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center text-gray-400 space-y-3 py-12 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                        <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-green-500 shadow-sm border border-green-100">
                            <InboxIcon className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-700">Stok Aman</p>
                            <p className="text-xs mt-1 text-gray-500">Tidak ada item {activeTab === 'critical' ? 'habis' : 'menipis'} saat ini. Kerja bagus!</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
