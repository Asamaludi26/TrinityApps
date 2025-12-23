
import React, { useState, useEffect } from 'react';
import { LoanRequest, Asset, AssetCategory, ParsedScanResult } from '../../../../types';
import { useNotification } from '../../../../providers/NotificationProvider';
import { CloseIcon } from '../../../../components/icons/CloseIcon';
import { CheckIcon } from '../../../../components/icons/CheckIcon';
import { InfoIcon } from '../../../../components/icons/InfoIcon';
import { QrCodeIcon } from '../../../../components/icons/QrCodeIcon';
import { CustomSelect } from '../../../../components/ui/CustomSelect';
import { PencilIcon } from '../../../../components/icons/PencilIcon';
import { BsLightningFill, BsBoxSeam } from 'react-icons/bs';

type ItemState = {
    approvedQty: number;
    reason: string;
    assignedAssets: string[]; // array of asset IDs
};

interface AssignmentPanelProps {
    request: LoanRequest;
    availableAssets: Asset[];
    assetCategories: AssetCategory[];
    onConfirm: (result: { itemStatuses: any, assignedAssetIds: any }) => void;
    onCancel: () => void;
    setIsGlobalScannerOpen: (isOpen: boolean) => void;
    setScanContext: (context: 'global' | 'form') => void;
    setFormScanCallback: (callback: ((data: ParsedScanResult) => void) | null) => void;
}

export const AssignmentPanel: React.FC<AssignmentPanelProps> = ({
    request,
    availableAssets,
    assetCategories,
    onConfirm,
    onCancel,
    setIsGlobalScannerOpen,
    setScanContext,
    setFormScanCallback
}) => {
    const [itemsState, setItemsState] = useState<Record<number, ItemState>>({});
    const addNotification = useNotification();

    useEffect(() => {
        const initial: Record<number, ItemState> = {};
        request.items.forEach(item => {
            initial[item.id] = {
                approvedQty: item.quantity,
                reason: '',
                assignedAssets: Array(item.quantity).fill('')
            };
        });
        setItemsState(initial);
    }, [request]);

    const handleQtyChange = (itemId: number, qty: number) => {
        const maxQty = request.items.find(i => i.id === itemId)?.quantity || 0;
        const validQty = Math.min(Math.max(0, qty), maxQty);
        
        setItemsState(prev => {
            const current = prev[itemId];
            if (!current) return prev;
            const newAssets = [...current.assignedAssets];
            if (validQty > newAssets.length) {
                newAssets.push(...Array(validQty - newAssets.length).fill(''));
            } else {
                newAssets.splice(validQty);
            }
            return { ...prev, [itemId]: { ...current, approvedQty: validQty, assignedAssets: newAssets } };
        });
    };

    const handleRejectItem = (itemId: number) => {
        handleQtyChange(itemId, 0);
    };

    const handleReasonChange = (itemId: number, reason: string) => {
        setItemsState(prev => ({ ...prev, [itemId]: { ...prev[itemId], reason } }));
    };

    const handleAssetSelect = (itemId: number, index: number, assetId: string) => {
         setItemsState(prev => {
            const current = prev[itemId];
            if (!current) return prev;
            const newAssets = [...current.assignedAssets];
            newAssets[index] = assetId;
            return { ...prev, [itemId]: { ...current, assignedAssets: newAssets } };
        });
    };

    const handleStartScan = (itemId: number, index: number) => {
        setScanContext('form');
        setFormScanCallback(() => (data: ParsedScanResult) => {
            let assetIdToSet: string | undefined = undefined;
            if (data.id) assetIdToSet = availableAssets.find(a => a.id === data.id)?.id;
            else if (data.serialNumber) assetIdToSet = availableAssets.find(a => a.serialNumber === data.serialNumber)?.id;

            if (assetIdToSet) {
                 const allAssigned = Object.values(itemsState).flatMap((s: ItemState) => s.assignedAssets);
                 if (allAssigned.includes(assetIdToSet)) {
                     addNotification('Aset sudah dipilih untuk slot lain.', 'error');
                     return;
                 }
                 handleAssetSelect(itemId, index, assetIdToSet);
                 addNotification('Aset berhasil dipindai.', 'success');
            } else {
                addNotification('Aset tidak ditemukan atau tidak tersedia.', 'error');
            }
        });
        setIsGlobalScannerOpen(true);
    };

    const handleSubmit = () => {
        let isValid = true;
        const resultItemStatuses: Record<number, any> = {};
        const resultAssignedAssets: Record<number, string[]> = {};

        for (const item of request.items) {
            const itemState: ItemState | undefined = itemsState[item.id];
            if (!itemState) {
                addNotification(`Data internal untuk item ${item.itemName} tidak ditemukan.`, 'error');
                isValid = false;
                break;
            }

            const matchingAssets = availableAssets.filter(a => a.name === item.itemName && a.brand === item.brand);
            const category = assetCategories.find(c => c.name === matchingAssets[0]?.category);
            const type = category?.types.find(t => t.name === matchingAssets[0]?.type);
            const isBulk = type?.trackingMethod === 'bulk';

            const isReduced = itemState.approvedQty < item.quantity;
            
            if (isReduced && !itemState.reason.trim()) {
                addNotification(`Harap isi alasan revisi/penolakan untuk ${item.itemName}.`, 'error');
                isValid = false;
                break;
            }

            if (itemState.approvedQty > 0) {
                if (isBulk) {
                    if (matchingAssets.length < itemState.approvedQty) {
                         addNotification(`Stok ${item.itemName} tidak mencukupi.`, 'error');
                         isValid = false;
                         break;
                    }
                    resultAssignedAssets[item.id] = matchingAssets.slice(0, itemState.approvedQty).map(a => a.id);
                } else {
                    if (itemState.assignedAssets.some(a => !a)) {
                        addNotification(`Harap pilih aset untuk semua slot pada ${item.itemName}.`, 'error');
                        isValid = false;
                        break;
                    }
                    const uniqueAssets = new Set(itemState.assignedAssets);
                    if (uniqueAssets.size !== itemState.assignedAssets.length) {
                         addNotification(`Terdeteksi duplikasi aset pada ${item.itemName}.`, 'error');
                         isValid = false;
                         break;
                    }
                    resultAssignedAssets[item.id] = itemState.assignedAssets;
                }
            }

            let status = 'approved';
            if (itemState.approvedQty === 0) status = 'rejected';
            else if (itemState.approvedQty < item.quantity) status = 'partial';

            resultItemStatuses[item.id] = {
                status,
                reason: itemState.reason,
                approvedQuantity: itemState.approvedQty
            };
        }

        if (isValid) {
            onConfirm({ itemStatuses: resultItemStatuses, assignedAssetIds: resultAssignedAssets });
        }
    };

    return (
        <div className="bg-white border-2 border-blue-100 rounded-xl shadow-xl animate-fade-in-up relative">
            <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex justify-between items-center rounded-t-xl">
                <div>
                    <h3 className="text-base sm:text-lg font-bold text-blue-900 flex items-center gap-2">
                        <CheckIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-700"/> Panel Penetapan
                    </h3>
                    <p className="text-xs sm:text-sm text-blue-700 mt-1">
                        Tinjau & tetapkan aset dari gudang.
                    </p>
                </div>
                <button onClick={onCancel} className="p-2 hover:bg-blue-100 rounded-full text-blue-700 transition-colors">
                    <CloseIcon className="w-5 h-5 sm:w-6 sm:h-6"/>
                </button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {request.items.map(item => {
                    const state = itemsState[item.id] || { approvedQty: item.quantity, reason: '', assignedAssets: [] };
                    const isReduced = state.approvedQty < item.quantity;
                    const matchingAssets = availableAssets.filter(a => a.name === item.itemName && a.brand === item.brand);
                    const allCurrentlyAssigned = Object.values(itemsState).flatMap((s: ItemState) => s.assignedAssets).filter(Boolean);

                    const sampleAsset = matchingAssets[0];
                    const category = assetCategories.find(c => c.name === sampleAsset?.category);
                    const type = category?.types.find(t => t.name === sampleAsset?.type);
                    const isBulk = type?.trackingMethod === 'bulk';
                    const unitLabel = type?.unitOfMeasure || 'unit';

                    return (
                        <div key={item.id} className="border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow bg-white relative">
                            <div className="p-4 sm:p-5 bg-white rounded-t-xl">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-bold text-base sm:text-lg text-gray-900 break-words">{item.itemName}</h4>
                                            {isBulk ? (
                                                <span className="px-2 py-0.5 text-[10px] font-bold text-orange-700 bg-orange-100 rounded-full flex items-center gap-1 whitespace-nowrap">
                                                    <BsLightningFill className="w-3 h-3"/> Material
                                                </span>
                                            ) : (
                                                 <span className="px-2 py-0.5 text-[10px] font-bold text-blue-700 bg-blue-100 rounded-full flex items-center gap-1 whitespace-nowrap">
                                                    <BsBoxSeam className="w-3 h-3"/> Device
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 flex-wrap">
                                            <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600 font-medium text-xs">{item.brand}</span>
                                            <span>&bull;</span>
                                            <span className="text-xs">Diminta: <strong className="text-gray-900">{item.quantity} {unitLabel}</strong></span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-100 w-full md:w-auto justify-between md:justify-start">
                                         <div className="flex flex-col items-start md:items-end">
                                             <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Disetujui</label>
                                             <div className="flex items-center">
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    max={item.quantity}
                                                    value={state.approvedQty.toString()}
                                                    onChange={e => handleQtyChange(item.id, parseInt(e.target.value) || 0)}
                                                    className="w-16 sm:w-20 h-8 sm:h-9 text-center text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-tm-primary focus:border-tm-primary outline-none transition-shadow"
                                                />
                                                <span className="ml-2 text-xs sm:text-sm font-medium text-gray-500">{unitLabel}</span>
                                             </div>
                                         </div>
                                         <div className="h-8 w-px bg-gray-300 mx-1"></div>
                                         <button 
                                            onClick={() => handleRejectItem(item.id)} 
                                            className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                                         >
                                            <CloseIcon className="w-5 h-5 mb-0.5"/>
                                            <span className="text-[10px] sm:text-xs font-bold">Tolak</span>
                                         </button>
                                    </div>
                                </div>
                            </div>

                            {state.approvedQty > 0 ? (
                                <div className="bg-gray-50 p-4 sm:p-5 border-t border-gray-100 relative z-10">
                                    <div className="mb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
                                        <h5 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                            <InfoIcon className="w-4 h-4 text-tm-primary"/>
                                            {isBulk ? 'Alokasi Stok Material' : `Pilih ${state.approvedQty} Unit Aset`}
                                        </h5>
                                        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">Stok Tersedia: <strong>{matchingAssets.length} {unitLabel}</strong></span>
                                    </div>
                                    
                                    {isBulk ? (
                                        <div className="p-3 sm:p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
                                            <BsLightningFill className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                                            <div className="text-sm text-orange-800">
                                                <p className="font-semibold">Penugasan Otomatis</p>
                                                <p className="mt-1 text-xs sm:text-sm">
                                                    Item ini adalah material/bulk. Sistem akan secara otomatis mengalokasikan <strong>{state.approvedQty} {unitLabel}</strong> dari stok yang tersedia.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-3">
                                            {Array.from({length: state.approvedQty}).map((_, idx) => {
                                                const currentVal = state.assignedAssets[idx] || '';
                                                const options = matchingAssets
                                                    .filter(a => !allCurrentlyAssigned.includes(a.id) || a.id === currentVal)
                                                    .map(a => ({ value: a.id, label: `${a.name} (${a.id}) ${a.serialNumber ? `- SN: ${a.serialNumber}` : ''}` }));

                                                return (
                                                    <div key={idx} className="flex items-center gap-2 sm:gap-3">
                                                        <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white border border-gray-300 rounded-full text-xs font-bold text-gray-500 shadow-sm flex-shrink-0">{idx + 1}</div>
                                                        <div className="flex-1 min-w-0">
                                                            <CustomSelect 
                                                                options={options}
                                                                value={currentVal}
                                                                onChange={(val) => handleAssetSelect(item.id, idx, val)}
                                                                isSearchable
                                                                placeholder={`Pilih Aset #${idx+1}`}
                                                            />
                                                        </div>
                                                        <button 
                                                            onClick={() => handleStartScan(item.id, idx)}
                                                            className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-blue-50 text-gray-600 hover:text-tm-primary transition-all shadow-sm flex-shrink-0"
                                                            title="Scan QR"
                                                        >
                                                            <QrCodeIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-red-50 p-4 border-t border-red-100 flex items-center gap-3 text-red-800">
                                    <CloseIcon className="w-5 h-5"/>
                                    <span className="font-medium text-sm">Item ini ditolak sepenuhnya.</span>
                                </div>
                            )}

                            {isReduced && (
                                <div className="p-4 sm:p-5 bg-amber-50 border-t border-amber-200 animate-fade-in-down">
                                    <label className="block text-xs font-bold text-amber-800 mb-2 uppercase tracking-wide">
                                        Alasan Revisi/Penolakan <span className="text-red-600">*</span>
                                    </label>
                                    <div className="relative">
                                        <PencilIcon className="absolute top-3 left-3 w-5 h-5 text-amber-600 pointer-events-none" />
                                        <input 
                                            type="text" 
                                            value={state.reason}
                                            onChange={e => handleReasonChange(item.id, e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 text-sm border border-amber-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                            placeholder="Contoh: Stok gudang tidak mencukupi..."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            <div className="bg-gray-50 px-6 py-5 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-3 rounded-b-xl">
                <button onClick={onCancel} className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 order-2 sm:order-1">Batal</button>
                <button onClick={handleSubmit} className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover flex items-center justify-center gap-2 order-1 sm:order-2">
                    <CheckIcon className="w-5 h-5" /> Simpan & Terapkan
                </button>
            </div>
        </div>
    );
};
