
import React, { useState, useEffect, useMemo } from 'react';
import { LoanRequest, Asset, AssetStatus, AssetCondition } from '../../../../types';
import Modal from '../../../../components/ui/Modal';
import { CheckIcon } from '../../../../components/icons/CheckIcon';
import { SearchIcon } from '../../../../components/icons/SearchIcon';
import { AssetIcon } from '../../../../components/icons/AssetIcon';
import { InboxIcon } from '../../../../components/icons/InboxIcon';
import { Checkbox } from '../../../../components/ui/Checkbox';
import { InfoIcon } from '../../../../components/icons/InfoIcon';

interface ReturnSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: LoanRequest;
    assets: Asset[];
    onConfirm: (assetIds: string[]) => void;
    targetStatus?: AssetStatus; 
    title?: string;
}

export const ReturnSelectionModal: React.FC<ReturnSelectionModalProps> = ({ 
    isOpen, onClose, request, assets, onConfirm, targetStatus, title
}) => {
    const [selected, setSelected] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const loanAssets = useMemo(() => {
        const validIds = Object.values(request.assignedAssetIds || {}).flat();
        return assets.filter(a => validIds.includes(a.id));
    }, [request, assets]);

    const displayAssets = useMemo(() => {
        if (!targetStatus) return loanAssets;
        return loanAssets.filter(a => a.status === targetStatus);
    }, [loanAssets, targetStatus]);

    const filteredAssets = useMemo(() => {
        if (!searchQuery) return displayAssets;
        const lowerQ = searchQuery.toLowerCase();
        return displayAssets.filter(asset => 
            asset.name.toLowerCase().includes(lowerQ) ||
            asset.id.toLowerCase().includes(lowerQ) ||
            (asset.serialNumber && asset.serialNumber.toLowerCase().includes(lowerQ))
        );
    }, [displayAssets, searchQuery]);

    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            setSelected(displayAssets.map(a => a.id));
        } else {
            setSelected([]);
        }
    }, [isOpen, displayAssets]);

    const toggle = (id: string) => {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selected.length === displayAssets.length) {
            setSelected([]);
        } else {
            setSelected(displayAssets.map(a => a.id));
        }
    };

    const isAllSelected = displayAssets.length > 0 && selected.length === displayAssets.length;
    
    const isApprovalMode = targetStatus === AssetStatus.AWAITING_RETURN;
    const themeColor = isApprovalMode ? 'green' : 'blue';
    const buttonBg = isApprovalMode ? 'bg-green-600 hover:bg-green-700' : 'bg-tm-primary hover:bg-tm-primary-hover';

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={title || "Pilih Aset"} 
            size="lg"
            hideDefaultCloseButton={true}
            footerContent={
                <div className="flex justify-between items-center w-full">
                    <div className="text-xs text-gray-500 hidden sm:block">
                        <strong>{selected.length}</strong> aset dipilih dari <strong>{displayAssets.length}</strong> tersedia.
                    </div>
                    <div className="flex gap-3 ml-auto">
                        <button 
                            onClick={onClose} 
                            className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl shadow-sm hover:bg-gray-50 transition-colors"
                        >
                            Batal
                        </button>
                        <button 
                            onClick={() => onConfirm(selected)} 
                            disabled={selected.length === 0} 
                            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-lg transition-all transform active:scale-95 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed ${buttonBg}`}
                        >
                            <CheckIcon className="w-4 h-4" />
                            Konfirmasi ({selected.length})
                        </button>
                    </div>
                </div>
            }
        >
            <div className="space-y-4">
                <div className={`border p-4 rounded-xl flex items-start gap-3 bg-${themeColor}-50 border-${themeColor}-200`}>
                    <InfoIcon className={`w-5 h-5 mt-0.5 flex-shrink-0 text-${themeColor}-600`} />
                    <div>
                        <p className={`text-sm font-bold text-${themeColor}-800`}>
                            {isApprovalMode ? "Verifikasi Fisik (Approval)" : "Pengajuan Pengembalian (Request)"}
                        </p>
                        <p className={`text-xs mt-1 leading-relaxed text-${themeColor}-700`}>
                            {isApprovalMode 
                                ? "Pastikan aset fisik telah diterima sebelum melakukan konfirmasi." 
                                : "Pilih aset yang ingin Anda kembalikan untuk membuat formulir pengembalian."}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-grow">
                        <SearchIcon className="absolute w-5 h-5 text-gray-400 top-1/2 left-3.5 transform -translate-y-1/2" />
                        <input 
                            type="text" 
                            placeholder="Cari nama, ID, atau SN..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-tm-primary/20 focus:border-tm-primary outline-none transition-all"
                        />
                    </div>
                    <div 
                        className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                        onClick={toggleSelectAll}
                    >
                        <Checkbox id="select-all-toggle" checked={isAllSelected} onChange={() => {}} />
                        <label className="text-xs font-bold text-gray-700 cursor-pointer pointer-events-none">Pilih Semua</label>
                    </div>
                </div>

                <div className="max-h-[50vh] overflow-y-auto custom-scrollbar px-1 py-1 space-y-2">
                    {filteredAssets.length > 0 ? (
                        filteredAssets.map(asset => {
                            const isSelected = selected.includes(asset.id);
                            
                            return (
                                <div 
                                    key={asset.id} 
                                    onClick={() => toggle(asset.id)} 
                                    className={`group relative flex items-center p-3 rounded-xl cursor-pointer border-2 transition-all duration-200 select-none
                                        ${isSelected 
                                            ? `bg-${themeColor}-50/60 border-${themeColor}-500 shadow-sm` 
                                            : 'bg-white border-gray-100 hover:border-gray-300'}`
                                    }
                                >
                                    <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center mr-4 transition-colors
                                        ${isSelected ? `bg-${themeColor}-600 text-white` : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'}`}>
                                        {isSelected ? <CheckIcon className="w-6 h-6" /> : <AssetIcon className="w-6 h-6" />}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-bold truncate ${isSelected ? 'text-gray-900' : 'text-gray-800'}`}>
                                            {asset.name}
                                        </p>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1 text-xs text-gray-500 font-mono">
                                            <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 w-fit">{asset.id}</span>
                                            {asset.serialNumber && <span className="truncate text-gray-400">SN: {asset.serialNumber}</span>}
                                        </div>
                                    </div>

                                    <div className="ml-3">
                                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all
                                            ${isSelected ? `bg-${themeColor}-600 border-${themeColor}-600` : 'bg-white border-gray-300 group-hover:border-gray-400'}`}>
                                            {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200">
                            <InboxIcon className="w-10 h-10 text-gray-300 mb-2" />
                            <p className="text-sm font-medium text-gray-600">
                                {searchQuery ? 'Aset tidak ditemukan.' : 'Tidak ada aset yang sesuai kriteria.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
