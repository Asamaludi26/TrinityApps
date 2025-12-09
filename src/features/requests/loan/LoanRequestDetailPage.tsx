
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { LoanRequest, User, Asset, Division, PreviewData, LoanRequestStatus, AssetStatus, AssetCategory, ParsedScanResult } from '../../../types';
import { DetailPageLayout } from '../../../components/layout/DetailPageLayout';
import { Letterhead } from '../../../components/ui/Letterhead';
import { SignatureStamp } from '../../../components/ui/SignatureStamp';
import { ApprovalStamp } from '../../../components/ui/ApprovalStamp';
import { RejectionStamp } from '../../../components/ui/RejectionStamp';
import { ClickableLink } from '../../../components/ui/ClickableLink';
import { InfoIcon } from '../../../components/icons/InfoIcon';
import { SpinnerIcon } from '../../../components/icons/SpinnerIcon';
import { CheckIcon } from '../../../components/icons/CheckIcon';
import { CloseIcon } from '../../../components/icons/CloseIcon';
import { HandoverIcon } from '../../../components/icons/HandoverIcon';
import { ChevronsLeftIcon } from '../../../components/icons/ChevronsLeftIcon';
import { ChevronsRightIcon } from '../../../components/icons/ChevronsRightIcon';
import { PrintIcon } from '../../../components/icons/PrintIcon';
import { DownloadIcon } from '../../../components/icons/DownloadIcon';
import { useNotification } from '../../../providers/NotificationProvider';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import { DismantleIcon } from '../../../components/icons/DismantleIcon';
import { QrCodeIcon } from '../../../components/icons/QrCodeIcon';
import Modal from '../../../components/ui/Modal';
import { TrashIcon } from '../../../components/icons/TrashIcon';
import { PencilIcon } from '../../../components/icons/PencilIcon';

interface LoanRequestDetailPageProps {
    loanRequest: LoanRequest;
    currentUser: User;
    assets: Asset[];
    users: User[];
    divisions: Division[];
    assetCategories: AssetCategory[];
    onBackToList: () => void;
    onShowPreview: (data: PreviewData) => void;
    onAssignAndApprove: (request: LoanRequest, result: { itemStatuses: any, assignedAssetIds: any }) => void;
    onReject: (request: LoanRequest) => void;
    onConfirmReturn: (request: LoanRequest, assetIds: string[]) => void;
    onInitiateReturn: (request: LoanRequest) => void;
    onInitiateHandoverFromLoan: (loanRequest: LoanRequest) => void;
    isLoading: boolean;
    setIsGlobalScannerOpen: (isOpen: boolean) => void;
    setScanContext: (context: 'global' | 'form') => void;
    setFormScanCallback: (callback: ((data: ParsedScanResult) => void) | null) => void;
}

const ActionButton: React.FC<{ onClick?: () => void, text: string, icon?: React.FC<{className?:string}>, color: 'primary'|'success'|'danger'|'info'|'secondary', disabled?: boolean }> = ({ onClick, text, icon: Icon, color, disabled }) => {
    const colors = {
        primary: "bg-tm-primary hover:bg-tm-primary-hover text-white",
        success: "bg-success hover:bg-green-700 text-white",
        danger: "bg-danger hover:bg-red-700 text-white",
        info: "bg-info hover:bg-blue-700 text-white",
        secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800",
    };
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed ${colors[color]}`}
        >
            {disabled && <SpinnerIcon className="w-4 h-4" />}
            {Icon && <Icon className="w-4 h-4" />}
            {text}
        </button>
    );
};

const LoanStatusIndicator: React.FC<{ status: LoanRequestStatus }> = ({ status }) => {
    const statusDetails: Record<string, { label: string, className: string }> = {
        [LoanRequestStatus.PENDING]: { label: 'Menunggu Persetujuan', className: 'bg-warning-light text-warning-text' },
        [LoanRequestStatus.APPROVED]: { label: 'Disetujui', className: 'bg-sky-100 text-sky-700' },
        [LoanRequestStatus.ON_LOAN]: { label: 'Dipinjam', className: 'bg-info-light text-info-text' },
        [LoanRequestStatus.RETURNED]: { label: 'Dikembalikan', className: 'bg-success-light text-success-text' },
        [LoanRequestStatus.REJECTED]: { label: 'Ditolak', className: 'bg-danger-light text-danger-text' },
        [LoanRequestStatus.OVERDUE]: { label: 'Terlambat', className: 'bg-red-200 text-red-800' },
        [LoanRequestStatus.AWAITING_RETURN]: { label: 'Menunggu Pengembalian', className: 'bg-blue-100 text-blue-800' },
    };
    const details = statusDetails[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${details.className}`}>
            {details.label}
        </span>
    );
};

type ItemState = {
    approvedQty: number;
    reason: string;
    assignedAssets: string[]; // array of asset IDs
};

// --- COMPONENT BARU: Panel Penetapan Aset (Inline) ---
const AssignmentPanel: React.FC<{
    request: LoanRequest;
    availableAssets: Asset[];
    onConfirm: (result: { itemStatuses: any, assignedAssetIds: any }) => void;
    onCancel: () => void;
    setIsGlobalScannerOpen: (isOpen: boolean) => void;
    setScanContext: (context: 'global' | 'form') => void;
    setFormScanCallback: (callback: ((data: ParsedScanResult) => void) | null) => void;
}> = ({ request, availableAssets, onConfirm, onCancel, setIsGlobalScannerOpen, setScanContext, setFormScanCallback }) => {

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
            if (!current) {
                console.error(`State for loan item #${itemId} not found during asset selection.`);
                return prev;
            }
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
                 // Explicitly typing s as ItemState to fix "Property does not exist on type 'unknown'" error
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
            // Explicit typing to ensure properties are accessible
            const itemState: ItemState | undefined = itemsState[item.id];
            if (!itemState) {
                addNotification(`Data internal untuk item ${item.itemName} tidak ditemukan. Silakan coba lagi.`, 'error');
                isValid = false;
                break;
            }

            const isReduced = itemState.approvedQty < item.quantity;
            
            if (isReduced && !itemState.reason.trim()) {
                addNotification(`Harap isi alasan revisi/penolakan untuk ${item.itemName}.`, 'error');
                isValid = false;
                break;
            }

            if (itemState.approvedQty > 0) {
                if (itemState.assignedAssets.some(a => !a)) {
                    addNotification(`Harap pilih aset untuk semua slot yang disetujui pada ${item.itemName}.`, 'error');
                    isValid = false;
                    break;
                }
                const uniqueAssets = new Set(itemState.assignedAssets);
                if (uniqueAssets.size !== itemState.assignedAssets.length) {
                     addNotification(`Terdeteksi duplikasi aset pada ${item.itemName}.`, 'error');
                     isValid = false;
                     break;
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
            
            if (itemState.approvedQty > 0) {
                resultAssignedAssets[item.id] = itemState.assignedAssets;
            }
        }

        if (isValid) {
            onConfirm({ itemStatuses: resultItemStatuses, assignedAssetIds: resultAssignedAssets });
        }
    };

    return (
        <div className="bg-white border-2 border-blue-100 rounded-xl shadow-xl animate-fade-in-up relative">
            {/* HEADER PANEL */}
            <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex justify-between items-center rounded-t-xl">
                <div>
                    <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                        <CheckIcon className="w-6 h-6 text-blue-700"/> Panel Penetapan & Persetujuan Aset
                    </h3>
                    <p className="text-sm text-blue-700 mt-1">
                        Tinjau permintaan, sesuaikan jumlah jika perlu, dan tetapkan aset dari gudang.
                    </p>
                </div>
                <button onClick={onCancel} className="p-2 hover:bg-blue-100 rounded-full text-blue-700 transition-colors">
                    <CloseIcon className="w-6 h-6"/>
                </button>
            </div>
            
            <div className="p-6 space-y-8">
                {request.items.map(item => {
                    const state = itemsState[item.id] || { approvedQty: item.quantity, reason: '', assignedAssets: [] };
                    const isReduced = state.approvedQty < item.quantity;
                    const matchingAssets = availableAssets.filter(a => a.name === item.itemName && a.brand === item.brand);
                    // Explicit type for s
                    const allCurrentlyAssigned = Object.values(itemsState).flatMap((s: ItemState) => s.assignedAssets).filter(Boolean);

                    return (
                        <div key={item.id} className="border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow bg-white relative">
                            {/* ITEM HEADER & CONTROLS */}
                            <div className="p-5 bg-white rounded-t-xl">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    {/* Left: Item Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-lg text-gray-900">{item.itemName}</h4>
                                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                            <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600 font-medium">{item.brand}</span>
                                            <span>&bull;</span>
                                            <span>Diminta: <strong className="text-gray-900">{item.quantity} unit</strong></span>
                                        </div>
                                        {item.keterangan && (
                                            <p className="mt-2 text-sm text-gray-500 italic border-l-2 border-gray-300 pl-2">"{item.keterangan}"</p>
                                        )}
                                    </div>

                                    {/* Right: Controls */}
                                    <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                         <div className="flex flex-col items-end">
                                             <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Disetujui</label>
                                             <div className="flex items-center">
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    max={item.quantity}
                                                    value={state.approvedQty.toString()}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        const num = val === '' ? 0 : parseInt(val, 10);
                                                        handleQtyChange(item.id, isNaN(num) ? 0 : num);
                                                    }}
                                                    onFocus={(e) => e.target.select()}
                                                    className="w-20 h-9 text-center text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-tm-primary focus:border-tm-primary outline-none transition-shadow"
                                                />
                                                <span className="ml-2 text-sm font-medium text-gray-500">unit</span>
                                             </div>
                                         </div>
                                         <div className="h-10 w-px bg-gray-300 mx-2"></div>
                                         <button 
                                            onClick={() => handleRejectItem(item.id)} 
                                            className="flex flex-col items-center justify-center px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                                            title="Tolak Item Ini"
                                         >
                                            <CloseIcon className="w-5 h-5 mb-0.5"/>
                                            <span className="text-xs font-bold">Tolak</span>
                                         </button>
                                    </div>
                                </div>
                            </div>

                            {/* ASSET SELECTION AREA */}
                            {state.approvedQty > 0 ? (
                                <div className="bg-gray-50 p-5 border-t border-gray-100 relative z-10">
                                    <div className="mb-3 flex items-center justify-between">
                                        <h5 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                            <InfoIcon className="w-4 h-4 text-tm-primary"/>
                                            Pilih {state.approvedQty} Unit Aset
                                        </h5>
                                        <span className="text-xs text-gray-500">Stok Tersedia: {matchingAssets.length}</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 gap-4">
                                        {Array.from({length: state.approvedQty}).map((_, idx) => {
                                            const currentVal = state.assignedAssets[idx] || '';
                                            const options = matchingAssets
                                                .filter(a => !allCurrentlyAssigned.includes(a.id) || a.id === currentVal)
                                                .map(a => ({ value: a.id, label: `${a.name} (${a.id}) ${a.serialNumber ? `- SN: ${a.serialNumber}` : ''}` }));

                                            return (
                                                <div key={idx} className="flex items-center gap-3">
                                                    <div className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded-full text-xs font-bold text-gray-500 shadow-sm">
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <CustomSelect 
                                                            options={options}
                                                            value={currentVal}
                                                            onChange={(val) => handleAssetSelect(item.id, idx, val)}
                                                            isSearchable
                                                            placeholder={`Pilih Aset #${idx+1}`}
                                                            emptyStateMessage="Stok tidak tersedia"
                                                        />
                                                    </div>
                                                    <button 
                                                        onClick={() => handleStartScan(item.id, idx)}
                                                        className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-blue-50 text-gray-600 hover:text-tm-primary hover:border-tm-primary transition-all shadow-sm"
                                                        title="Scan QR Code"
                                                    >
                                                        <QrCodeIcon className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-red-50 p-4 border-t border-red-100 flex items-center gap-3 text-red-800">
                                    <CloseIcon className="w-5 h-5"/>
                                    <span className="font-medium text-sm">Item ini ditolak sepenuhnya. Tidak ada aset yang akan diberikan.</span>
                                </div>
                            )}

                            {/* REASON INPUT (IF REVISED) */}
                            {isReduced && (
                                <div className="p-5 bg-amber-50 border-t border-amber-200 animate-fade-in-down">
                                    <label className="block text-xs font-bold text-amber-800 mb-2 uppercase tracking-wide">
                                        Alasan Revisi/Penolakan <span className="text-red-600">*</span>
                                    </label>
                                    <div className="relative">
                                        <PencilIcon className="absolute top-3 left-3 w-5 h-5 text-amber-600 pointer-events-none" />
                                        <input 
                                            type="text" 
                                            value={state.reason}
                                            onChange={e => handleReasonChange(item.id, e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 text-sm border border-amber-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder-amber-700/40 shadow-sm"
                                            placeholder="Contoh: Stok gudang tidak mencukupi, Budget terbatas..."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {/* FOOTER ACTIONS */}
            <div className="bg-gray-50 px-6 py-5 border-t border-gray-200 flex justify-end gap-3 rounded-b-xl">
                <button onClick={onCancel} className="px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-all">
                    Batal
                </button>
                <button onClick={handleSubmit} className="px-6 py-2.5 text-sm font-bold text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover flex items-center gap-2 transition-all transform active:scale-95">
                    <CheckIcon className="w-5 h-5" />
                    Simpan & Terapkan
                </button>
            </div>
        </div>
    );
};

// Modified ActionSidebar to toggle the panel
const ActionSidebar: React.FC<LoanRequestDetailPageProps & { isExpanded: boolean; onToggleVisibility: () => void; onOpenAssignment: () => void; }> = 
({ loanRequest, currentUser, isLoading, onReject, onConfirmReturn, onInitiateReturn, onInitiateHandoverFromLoan, isExpanded, onToggleVisibility, onOpenAssignment }) => {
    
    if (!isExpanded) {
        return (
            <div className="flex flex-col items-center pt-4 space-y-4">
                <button onClick={onToggleVisibility} className="flex items-center justify-center w-10 h-10 bg-white border border-gray-300 rounded-full shadow-md text-gray-500 hover:bg-gray-100 hover:text-tm-primary transition-all">
                    <ChevronsRightIcon className="w-5 h-5" />
                </button>
            </div>
        );
    }

    const isAdmin = currentUser.role === 'Admin Logistik' || currentUser.role === 'Super Admin';
    const isRequester = currentUser.name === loanRequest.requester;
    let actions: React.ReactNode = null;

    switch (loanRequest.status) {
        case LoanRequestStatus.PENDING:
            if (isAdmin) {
                actions = (
                    <div className="space-y-2">
                        <ActionButton onClick={onOpenAssignment} disabled={isLoading} text="Tinjau & Tetapkan" icon={PencilIcon} color="success" />
                        <ActionButton onClick={() => onReject(loanRequest)} disabled={isLoading} text="Tolak Semua" icon={CloseIcon} color="danger" />
                    </div>
                );
            }
            break;
        case LoanRequestStatus.APPROVED:
            if (isAdmin) {
                actions = <ActionButton onClick={() => onInitiateHandoverFromLoan(loanRequest)} disabled={isLoading} text="Buat Dokumen Handover" icon={HandoverIcon} color="primary" />;
            }
            break;
        case LoanRequestStatus.ON_LOAN:
        case LoanRequestStatus.OVERDUE:
            if (isAdmin) {
                actions = <ActionButton onClick={() => onConfirmReturn(loanRequest, [])} disabled={isLoading} text="Konfirmasi Pengembalian" icon={CheckIcon} color="primary" />;
            } else if (isRequester) {
                actions = <ActionButton onClick={() => onInitiateReturn(loanRequest)} disabled={isLoading} text="Kembalikan Aset" icon={DismantleIcon} color="primary" />;
            }
            break;
        case LoanRequestStatus.AWAITING_RETURN:
            if (isAdmin) {
                actions = <ActionButton onClick={() => onConfirmReturn(loanRequest, [])} disabled={isLoading} text="Konfirmasi Pengembalian" icon={CheckIcon} color="primary" />;
            } else if (isRequester) {
                 actions = (
                    <div className="text-center p-4 bg-blue-50/70 border border-blue-200/60 rounded-lg">
                        <SpinnerIcon className="w-10 h-10 mx-auto mb-3 text-blue-500 animate-spin" />
                        <p className="text-sm font-semibold text-gray-800">Menunggu Konfirmasi</p>
                        <p className="text-xs text-gray-500 mt-1">Admin Logistik akan segera mengkonfirmasi penerimaan aset.</p>
                    </div>
                );
            }
            break;
        default:
            actions = (
                <div className="text-center p-4 bg-gray-50/70 border border-gray-200/60 rounded-lg">
                    <CheckIcon className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm font-semibold text-gray-800">Proses Selesai</p>
                    <p className="text-xs text-gray-500 mt-1">Tidak ada aksi lebih lanjut untuk permintaan ini.</p>
                </div>
            );
    }

    return (
        <div className="p-5 bg-white border border-gray-200/80 rounded-xl shadow-sm">
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><InfoIcon className="w-5 h-5 text-gray-400" /><h3 className="text-base font-semibold text-gray-800">Status & Aksi</h3></div>
                    <div className="mt-2"><LoanStatusIndicator status={loanRequest.status} /></div>
                </div>
                <button onClick={onToggleVisibility} className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-gray-400 rounded-full hover:bg-gray-100 hover:text-gray-800"><ChevronsLeftIcon className="w-5 h-5" /></button>
            </div>
            <div className="mt-4 pt-4 border-t">{actions}</div>
        </div>
    );
};

// Reuse ReturnSelectionModal
export const ReturnSelectionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    request: LoanRequest;
    assets: Asset[];
    onConfirm: (assetIds: string[]) => void;
    initialSelectedIds?: string[];
}> = ({ isOpen, onClose, request, assets, onConfirm, initialSelectedIds = [] }) => {
    const [selected, setSelected] = useState<string[]>([]);
    
    useEffect(() => {
        if (isOpen) {
            setSelected(initialSelectedIds);
        }
    }, [isOpen, initialSelectedIds]);
    
    const loanedAssetIds = Object.values(request.assignedAssetIds || {}).flat();
    const returnedIds = request.returnedAssetIds || [];
    const activeLoanedIds = loanedAssetIds.filter(id => !returnedIds.includes(id));
    const activeAssets = assets.filter(a => activeLoanedIds.includes(a.id));

    const toggle = (id: string) => {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Pilih Aset yang Dikembalikan" size="md"
            footerContent={
                <>
                    <button onClick={onClose} className="px-4 py-2 text-sm bg-white border rounded hover:bg-gray-50">Batal</button>
                    <button onClick={() => onConfirm(selected)} disabled={selected.length === 0} className="px-4 py-2 text-sm text-white bg-tm-primary rounded hover:bg-tm-primary-hover disabled:bg-gray-300">Konfirmasi ({selected.length})</button>
                </>
            }
        >
            <div className="space-y-2 max-h-64 overflow-y-auto p-2">
                {activeAssets.length > 0 ? activeAssets.map(asset => (
                    <div key={asset.id} onClick={() => toggle(asset.id)} className={`p-3 border rounded cursor-pointer flex justify-between items-center ${selected.includes(asset.id) ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'}`}>
                        <div>
                            <p className="font-semibold">{asset.name}</p>
                            <p className="text-xs text-gray-500">{asset.id}</p>
                        </div>
                        {selected.includes(asset.id) && <CheckIcon className="w-5 h-5 text-tm-primary" />}
                    </div>
                )) : <p className="text-center text-gray-500">Semua aset sudah dikembalikan.</p>}
            </div>
        </Modal>
    );
};


const LoanRequestDetailPage: React.FC<LoanRequestDetailPageProps> = (props) => {
    const { loanRequest, currentUser, assets, users, divisions, assetCategories, onAssignAndApprove, setIsGlobalScannerOpen, setScanContext, setFormScanCallback, onConfirmReturn, onShowPreview } = props;
    const [isActionSidebarExpanded, setIsActionSidebarExpanded] = useState(true);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    
    // NEW STATE for Inline Panel Visibility
    const [isAssignmentPanelOpen, setIsAssignmentPanelOpen] = useState(false);

    const printRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const addNotification = useNotification();
    
    const availableAssetsForLoan = useMemo(() => assets.filter(a => a.status === AssetStatus.IN_STORAGE), [assets]);
    const panelRef = useRef<HTMLDivElement>(null);

    const getDivisionForUser = (userName: string): string => {
        const user = users.find(u => u.name === userName);
        if (!user || !user.divisionId) return '';
        const division = divisions.find(d => d.id === user.divisionId);
        return division ? `Divisi ${division.name}` : '';
    };

    const handlePrint = () => { window.print(); };

    const handleDownloadPdf = () => {
        if (!printRef.current) return;
        setIsDownloading(true);
        const { jsPDF } = (window as any).jspdf;
        const html2canvas = (window as any).html2canvas;

        html2canvas(printRef.current, { scale: 2, useCORS: true, logging: false, })
            .then((canvas: HTMLCanvasElement) => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const imgHeight = (canvas.height * pdfWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
                pdf.save(`LoanRequest-${loanRequest.id}.pdf`);
                setIsDownloading(false);
                addNotification('PDF berhasil diunduh.', 'success');
            }).catch(() => {
                addNotification('Gagal membuat PDF.', 'error');
                setIsDownloading(false);
            });
    };
    
    const handleOpenAssignment = () => {
        setIsAssignmentPanelOpen(true);
        // Smooth scroll to panel
        setTimeout(() => {
            panelRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleAssignmentConfirm = (result: { itemStatuses: any, assignedAssetIds: any }) => {
        onAssignAndApprove(loanRequest, result);
        setIsAssignmentPanelOpen(false);
    };

    return (
        <DetailPageLayout
            title={`Detail Pinjam: ${loanRequest.id}`}
            onBack={props.onBackToList}
            headerActions={
                 <div className="flex items-center gap-2">
                    <button onClick={handlePrint} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border rounded-lg shadow-sm hover:bg-gray-50"><PrintIcon className="w-4 h-4"/> Cetak</button>
                    <button onClick={handleDownloadPdf} disabled={isDownloading} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover disabled:bg-tm-primary/70">{isDownloading ? <SpinnerIcon className="w-4 h-4"/> : <DownloadIcon className="w-4 h-4" />}{isDownloading ? 'Mengunduh...' : 'Unduh PDF'}</button>
                </div>
            }
            mainColClassName={isActionSidebarExpanded ? 'lg:col-span-8' : 'lg:col-span-11'}
            asideColClassName={isActionSidebarExpanded ? 'lg:col-span-4' : 'lg:col-span-1'}
            aside={
                <ActionSidebar 
                    {...props} 
                    isExpanded={isActionSidebarExpanded} 
                    onToggleVisibility={() => setIsActionSidebarExpanded(p => !p)} 
                    onOpenAssignment={handleOpenAssignment}
                    onConfirmReturn={() => setIsReturnModalOpen(true)} 
                />
            }
        >
            <div className="space-y-8">
                <div ref={printRef} className="p-8 bg-white border border-gray-200/80 rounded-xl shadow-sm space-y-8">
                    <Letterhead />
                    <div className="text-center">
                        <h3 className="text-xl font-bold uppercase text-tm-dark">Surat Permintaan Peminjaman Aset</h3>
                        <p className="text-sm text-tm-secondary">Nomor: ${loanRequest.id}</p>
                    </div>

                    <section><dl className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2 text-sm">
                        <div><label className="block font-medium text-gray-500">Tanggal</label><p className="font-semibold text-gray-800">{new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(loanRequest.requestDate))}</p></div>
                        <div><label className="block font-medium text-gray-500">Nama Pemohon</label><p className="font-semibold text-gray-800">{loanRequest.requester}</p></div>
                        <div><label className="block font-medium text-gray-500">Divisi</label><p className="font-semibold text-gray-800">{loanRequest.division}</p></div>
                        <div><label className="block font-medium text-gray-500">No Dokumen</label><p className="font-semibold text-gray-800">{loanRequest.id}</p></div>
                    </dl></section>
                    
                    <section>
                        <h4 className="font-semibold text-gray-800 border-b pb-1 mb-2">Detail Aset yang Diminta</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                                    <tr>
                                        <th className="p-2 w-10">No.</th>
                                        <th className="p-2">Nama Barang</th>
                                        <th className="p-2 text-center">Jumlah</th>
                                        <th className="p-2">Tgl Kembali</th>
                                        <th className="p-2">Catatan / Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loanRequest.items.map((item, index) => {
                                        const category = assetCategories.find(c => c.types.some(t => t.standardItems?.some(si => si.name === item.itemName && si.brand === item.brand)));
                                        const type = category?.types.find(t => t.standardItems?.some(si => si.name === item.itemName && si.brand === item.brand));
                                        const unitOfMeasure = type?.unitOfMeasure || 'unit';
                                        
                                        const itemStatus = loanRequest.itemStatuses?.[item.id];
                                        const isRejected = itemStatus?.status === 'rejected';
                                        const isPartial = itemStatus?.status === 'partial';
                                        const approvedQty = itemStatus ? itemStatus.approvedQuantity : item.quantity;

                                        return (
                                            <tr key={item.id} className={`border-b ${isRejected ? 'bg-red-50 text-gray-400' : ''}`}>
                                                <td className="p-2 text-center">{index + 1}.</td>
                                                <td className="p-2 font-semibold">
                                                    <span className={isRejected ? 'line-through' : 'text-gray-800'}>{item.itemName} - {item.brand}</span>
                                                    {isRejected && <span className="ml-2 text-xs text-white bg-red-500 px-1.5 rounded">DITOLAK</span>}
                                                    {isPartial && <span className="ml-2 text-xs text-white bg-amber-500 px-1.5 rounded">DIREVISI</span>}
                                                </td>
                                                <td className="p-2 text-center font-medium">
                                                    {isPartial || isRejected ? (
                                                        <span><s className="text-xs text-gray-400">{item.quantity}</s> <strong>{approvedQty}</strong></span>
                                                    ) : (
                                                        <span>{item.quantity}</span>
                                                    )} {unitOfMeasure}
                                                </td>
                                                <td className="p-2 text-gray-600">
                                                    {item.returnDate 
                                                        ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(item.returnDate)) 
                                                        : <span className="italic text-gray-500">Belum ditentukan</span>}
                                                </td>
                                                <td className="p-2 text-xs italic">
                                                    "{item.keterangan || '-'}"
                                                    {itemStatus?.reason && <div className="mt-1 font-bold not-italic text-amber-700">Admin: {itemStatus.reason}</div>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                    
                    {loanRequest.assignedAssetIds && Object.keys(loanRequest.assignedAssetIds).length > 0 && (
                        <section>
                            <h4 className="font-semibold text-gray-800 border-b pb-1 mb-2">Aset yang Dipinjamkan</h4>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                                        <tr>
                                            <th className="p-2 w-10">No.</th>
                                            <th className="p-2">Nama Aset</th>
                                            <th className="p-2">ID Aset</th>
                                            <th className="p-2">Serial Number</th>
                                            <th className="p-2">MAC Address</th>
                                            <th className="p-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.values(loanRequest.assignedAssetIds).flat().map((assetId: string, index) => {
                                            const asset = assets.find(a => a.id === assetId);
                                            if (!asset) return null;
                                            const isReturned = loanRequest.returnedAssetIds?.includes(assetId);
                                            const category = assetCategories.find(c => c.name === asset.category);
                                            const type = category?.types.find(t => t.name === asset.type);
                                            const isBulk = type?.trackingMethod === 'bulk';

                                            return (
                                                <tr key={assetId} className="border-b">
                                                    <td className="p-2 text-center text-gray-800">{index + 1}.</td>
                                                    <td className="p-2 font-semibold text-gray-800">
                                                        <ClickableLink onClick={() => onShowPreview({ type: 'asset', id: assetId })}>
                                                            {asset.name}
                                                        </ClickableLink>
                                                    </td>
                                                    <td className="p-2 font-mono text-gray-600">{assetId}</td>
                                                    <td className="p-2 font-mono text-gray-600">
                                                        {isBulk ? '-' : (asset.serialNumber || <i className="text-gray-400">Unit Satuan</i>)}
                                                    </td>
                                                    <td className="p-2 font-mono text-gray-600">{asset.macAddress || 'N/A'}</td>
                                                    <td className="p-2 text-center">
                                                        {isReturned ? <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded font-semibold">Dikembalikan</span> : <span className="text-xs bg-blue-50 text-blue-800 px-2 py-0.5 rounded">Dipinjam</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {loanRequest.notes && (<section><h4 className="font-semibold text-gray-800 border-b pb-1 mb-2">Alasan Peminjaman</h4><p className="text-sm text-gray-700 italic p-3 bg-gray-50 border rounded-md">"{loanRequest.notes}"</p></section>)}
                    
                    <section className="pt-8"><h4 className="font-semibold text-gray-800 border-b pb-1 mb-6">Persetujuan</h4><div className="grid grid-cols-1 text-sm text-center gap-y-6 sm:grid-cols-2">
                        <div><p className="font-semibold text-gray-600">Pemohon,</p><div className="flex items-center justify-center mt-2 h-28"><SignatureStamp signerName={loanRequest.requester} signatureDate={loanRequest.requestDate} signerDivision={getDivisionForUser(loanRequest.requester)} /></div><p className="pt-1 mt-2 border-t border-gray-400">({loanRequest.requester})</p></div>
                        <div><p className="font-semibold text-gray-600">Mengetahui (Admin Logistik),</p><div className="flex items-center justify-center mt-2 h-28">
                            {loanRequest.status === LoanRequestStatus.REJECTED && loanRequest.approver && <RejectionStamp rejectorName={loanRequest.approver} rejectionDate={loanRequest.approvalDate!} />}
                            {loanRequest.status !== LoanRequestStatus.PENDING && loanRequest.status !== LoanRequestStatus.REJECTED && loanRequest.approver && <ApprovalStamp approverName={loanRequest.approver} approvalDate={loanRequest.approvalDate!} />}
                            {loanRequest.status === LoanRequestStatus.PENDING && <span className="italic text-gray-400">Menunggu Persetujuan</span>}
                        </div><p className="pt-1 mt-2 border-t border-gray-400">({loanRequest.approver || '.........................'})</p></div>
                    </div></section>
                </div>

                {/* INLINE ASSIGNMENT PANEL */}
                {isAssignmentPanelOpen && (
                    <div ref={panelRef}>
                        <AssignmentPanel 
                            request={loanRequest} 
                            availableAssets={availableAssetsForLoan} 
                            onConfirm={handleAssignmentConfirm} 
                            onCancel={() => setIsAssignmentPanelOpen(false)}
                            setIsGlobalScannerOpen={setIsGlobalScannerOpen}
                            setScanContext={setScanContext}
                            setFormScanCallback={setFormScanCallback}
                        />
                    </div>
                )}
            </div>
            
            {/* Modals (Return Only now) */}
            <ReturnSelectionModal
                isOpen={isReturnModalOpen}
                onClose={() => setIsReturnModalOpen(false)}
                request={loanRequest}
                assets={assets}
                onConfirm={(assetIds) => {
                    onConfirmReturn(loanRequest, assetIds);
                    setIsReturnModalOpen(false);
                }}
            />
        </DetailPageLayout>
    );
};

export default LoanRequestDetailPage;
