
import React, { useMemo } from 'react';
import { Asset, AssetCategory, AssetStatus } from '../../../types';
import { CategoryIcon } from '../../../components/icons/CategoryIcon';
import { UsersIcon } from '../../../components/icons/UsersIcon';
import { ArchiveBoxIcon } from '../../../components/icons/ArchiveBoxIcon';

interface CategorySummaryWidgetProps {
    assets: Asset[];
    categories: AssetCategory[];
}

export const CategorySummaryWidget: React.FC<CategorySummaryWidgetProps> = ({ assets, categories }) => {
    
    const categoryStats = useMemo(() => {
        return categories.map(cat => {
            const catAssets = assets.filter(a => a.category === cat.name);
            const totalAssets = catAssets.length;
            
            // Hitung Model (Types & Standard Items)
            let totalModels = 0;
            cat.types.forEach(t => totalModels += (t.standardItems?.length || 0));

            // Hitung Valuasi
            const totalValue = catAssets.reduce((sum, a) => sum + (a.purchasePrice || 0), 0);

            // Hitung Utilisasi
            const inUseCount = catAssets.filter(a => a.status === AssetStatus.IN_USE).length;
            const inStorageCount = catAssets.filter(a => a.status === AssetStatus.IN_STORAGE).length;
            const utilizationRate = totalAssets > 0 ? (inUseCount / totalAssets) * 100 : 0;

            return {
                id: cat.id,
                name: cat.name,
                totalModels,
                totalAssets,
                totalValue,
                inUseCount,
                inStorageCount,
                utilizationRate
            };
        }).sort((a, b) => b.totalValue - a.totalValue); // Urutkan berdasarkan nilai tertinggi
    }, [assets, categories]);

    const formatCurrency = (value: number) => {
        if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)} M`;
        if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(0)} Jt`;
        return `Rp ${value.toLocaleString('id-ID')}`;
    };

    return (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] overflow-hidden flex flex-col h-full">
            <div className="px-6 py-5 border-b border-gray-50 flex items-center gap-3 bg-white">
                <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                    <CategoryIcon className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Analisis Kategori</h3>
                    <p className="text-sm text-gray-500">Performa dan valuasi per kategori aset</p>
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar p-0">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 sticky top-0 z-10 text-xs uppercase text-gray-500 font-semibold">
                        <tr>
                            <th className="px-6 py-3">Kategori</th>
                            <th className="px-4 py-3 text-center">Unit</th>
                            <th className="px-4 py-3 text-right">Valuasi</th>
                            <th className="px-6 py-3 w-1/3">Utilisasi (Pakai vs Stok)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                        {categoryStats.map((stat) => (
                            <tr key={stat.id} className="hover:bg-gray-50/80 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-800 group-hover:text-tm-primary transition-colors">{stat.name}</div>
                                    <div className="text-xs text-gray-400 mt-0.5">{stat.totalModels} Model Terdaftar</div>
                                </td>
                                <td className="px-4 py-4 text-center font-medium text-gray-700">
                                    {stat.totalAssets}
                                </td>
                                <td className="px-4 py-4 text-right font-mono font-medium text-gray-600">
                                    {formatCurrency(stat.totalValue)}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-between mb-1 text-xs">
                                        <span className="text-blue-600 font-semibold flex items-center gap-1"><UsersIcon className="w-3 h-3"/> {stat.inUseCount}</span>
                                        <span className="text-gray-400">{Math.round(stat.utilizationRate)}%</span>
                                        <span className="text-emerald-600 font-semibold flex items-center gap-1">{stat.inStorageCount} <ArchiveBoxIcon className="w-3 h-3"/></span>
                                    </div>
                                    <div className="w-full h-2 bg-emerald-100 rounded-full overflow-hidden flex">
                                        <div 
                                            className="h-full bg-blue-500 rounded-full" 
                                            style={{ width: `${stat.utilizationRate}%` }}
                                        ></div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {categoryStats.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-400 italic">
                                    Belum ada data kategori.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
