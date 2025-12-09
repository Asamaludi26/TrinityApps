
import React from 'react';
import { Asset, AssetStatus } from '../../../types';
import { BsShieldExclamation } from 'react-icons/bs';

interface WarrantyAlertWidgetProps {
    assets: Asset[];
}

export const WarrantyAlertWidget: React.FC<WarrantyAlertWidgetProps> = ({ assets }) => {
    const expiringAssets = assets.filter(asset => {
        if (!asset.warrantyEndDate || asset.status === AssetStatus.DECOMMISSIONED) return false;
        const today = new Date();
        const warrantyDate = new Date(asset.warrantyEndDate);
        const diffTime = warrantyDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 30;
    }).sort((a, b) => new Date(a.warrantyEndDate!).getTime() - new Date(b.warrantyEndDate!).getTime()).slice(0, 5);

    if (expiringAssets.length === 0) return null;

    return (
        <div className="bg-white border border-amber-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
             <div className="px-5 py-4 border-b border-amber-50 bg-amber-50/30 flex items-center gap-3">
                 <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg">
                     <BsShieldExclamation className="w-4 h-4" />
                 </div>
                 <h3 className="text-sm font-bold text-amber-900">Garansi Segera Habis</h3>
             </div>
             <div className="p-4 space-y-3">
                 {expiringAssets.map(asset => {
                     const daysLeft = Math.ceil((new Date(asset.warrantyEndDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                     return (
                         <div key={asset.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-amber-50/50 border border-amber-100/50">
                             <div>
                                 <p className="font-semibold text-gray-800 truncate max-w-[150px]">{asset.name}</p>
                                 <p className="text-gray-500">{asset.id}</p>
                             </div>
                             <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{daysLeft} hari</span>
                         </div>
                     );
                 })}
             </div>
        </div>
    );
};
