
import React, { useState, useEffect, useMemo } from 'react';
import { LoanRequest, Asset } from '../../../../types';
import Modal from '../../../../components/ui/Modal';
import { CheckIcon } from '../../../../components/icons/CheckIcon';
import { AssetStatus } from '../../../../types';

interface ReturnSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: LoanRequest;
    assets: Asset[];
    onConfirm: (assetIds: string[]) => void;
    initialSelectedIds?: string[];
}

export const ReturnSelectionModal: React.FC<ReturnSelectionModalProps> = ({ 
    isOpen, onClose, request, assets, onConfirm, initialSelectedIds = [] 
}) => {
    const [selected, setSelected] = useState<string[]>([]);
    
    // Derive list of assets that are part of this loan
    const loanedAssetIds = useMemo(() => Object.values(request.assignedAssetIds || {}).flat(), [request]);
    const returnedIds = useMemo(() => request.returnedAssetIds || [], [request]);
    
    // Assets that haven't been FULLY returned (completed) yet
    const activeLoanedIds = useMemo(() => loanedAssetIds.filter(id => !returnedIds.includes(id)), [loanedAssetIds, returnedIds]);
    
    // Get full asset objects
    const activeAssets = useMemo(() => assets.filter(a => activeLoanedIds.includes(a.id)), [assets, activeLoanedIds]);

    useEffect(() => {
        if (isOpen) {
            // Auto-select all remaining assets by default to speed up the process
            // Unless initialSelectedIds is provided
            if (initialSelectedIds.length > 0) {
                setSelected(initialSelectedIds);
            } else {
                setSelected(activeLoanedIds);
            }
        }
    }, [isOpen, initialSelectedIds, activeLoanedIds]);

    const toggle = (id: string) => {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Pilih Aset yang Dikembalikan" size="md"
            footerContent={
                <>
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
                    <button onClick={() => onConfirm(selected)} disabled={selected.length === 0} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover disabled:bg-gray-300">
                        Konfirmasi ({selected.length}) Item
                    </button>
                </>
            }
        >
            <div className="space-y-1 max-h-80 overflow-y-auto p-1">
                {activeAssets.length > 0 ? activeAssets.map(asset => {
                    const isSelected = selected.includes(asset.id);
                    const isAwaiting = asset.status === AssetStatus.AWAITING_RETURN;
                    
                    return (
                        <div 
                            key={asset.id} 
                            onClick={() => toggle(asset.id)} 
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border transition-all duration-200
                                ${isSelected 
                                    ? 'bg-blue-50 border-tm-primary ring-1 ring-tm-primary/20' 
                                    : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`
                            }
                        >
                            <div className="flex-1 min-w-0 pr-4">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <p className={`text-sm font-semibold ${isSelected ? 'text-tm-primary' : 'text-gray-900'}`}>{asset.name}</p>
                                    {isAwaiting && (
                                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase text-orange-700 bg-orange-100 rounded-full border border-orange-200">
                                            Menunggu
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 font-mono">{asset.id} {asset.serialNumber ? `• SN: ${asset.serialNumber}` : ''}</p>
                            </div>
                            
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors
                                ${isSelected ? 'bg-tm-primary border-tm-primary' : 'bg-white border-gray-300'}`
                            }>
                                {isSelected && <CheckIcon className="w-3.5 h-3.5 text-white" />}
                            </div>
                        </div>
                    );
                }) : (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                        <p className="text-sm font-medium">Semua aset sudah dikembalikan.</p>
                    </div>
                )}
            </div>
            {activeAssets.length > 0 && (
                <p className="text-xs text-gray-500 mt-3 px-1">
                    Tip: Aset yang ditandai "Menunggu" telah diajukan pengembaliannya oleh Staff.
                </p>
            )}
        </Modal>
    );
};
