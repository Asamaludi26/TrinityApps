
import React from 'react';
import { AssetReturn, AssetReturnStatus, User } from '../../../../types';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { InfoIcon } from '../../../../components/icons/InfoIcon';
import { ChevronsRightIcon } from '../../../../components/icons/ChevronsRightIcon';
import { CheckIcon } from '../../../../components/icons/CheckIcon';
import { CloseIcon } from '../../../../components/icons/CloseIcon';
import { ChevronsLeftIcon } from '../../../../components/icons/ChevronsLeftIcon';

interface ReturnStatusSidebarProps {
    returnDocument: AssetReturn;
    currentUser: User;
    isLoading: boolean;
    isExpanded: boolean;
    onToggleVisibility: () => void;
    onApprove: () => void;
    onReject: () => void;
    isApprovalMode?: boolean;
}

const ReturnStatusIndicator: React.FC<{ status: AssetReturnStatus }> = ({ status }) => {
    const statusDetails: Record<string, { label: string, className: string }> = {
        [AssetReturnStatus.APPROVED]: { label: 'Disetujui', className: 'bg-emerald-100 text-emerald-700' },
        [AssetReturnStatus.REJECTED]: { label: 'Ditolak', className: 'bg-red-100 text-red-700' },
        [AssetReturnStatus.PENDING_APPROVAL]: { label: 'Menunggu Persetujuan', className: 'bg-amber-100 text-amber-700' }
    };

    const details = statusDetails[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${details.className}`}>
            {details.label}
        </span>
    );
};

export const ReturnStatusSidebar: React.FC<ReturnStatusSidebarProps> = ({ 
    returnDocument, currentUser, isLoading, onApprove, onReject, isExpanded, onToggleVisibility, isApprovalMode
}) => {
    
    if (!isExpanded) {
        return (
            <div className="flex flex-col items-center pt-4 space-y-4">
                <button
                    onClick={onToggleVisibility}
                    className="flex items-center justify-center w-10 h-10 bg-white border border-gray-300 rounded-full shadow-md text-gray-500 hover:bg-gray-100 hover:text-tm-primary transition-all">
                    <ChevronsRightIcon className="w-5 h-5" />
                </button>
            </div>
        );
    }

    const isAdmin = currentUser.role === 'Admin Logistik' || currentUser.role === 'Super Admin';
    const canAct = returnDocument.status === AssetReturnStatus.PENDING_APPROVAL && isAdmin;

    return (
        <div className="p-5 bg-white border border-gray-200/80 rounded-xl shadow-sm">
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <InfoIcon className="w-5 h-5 text-gray-400" />
                        <h3 className="text-base font-semibold text-gray-800">Status & Aksi</h3>
                    </div>
                     <div className="mt-2">
                        <ReturnStatusIndicator status={returnDocument.status} />
                    </div>
                </div>
                <button
                    onClick={onToggleVisibility}
                    className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-gray-400 rounded-full hover:bg-gray-100 hover:text-gray-800">
                    <ChevronsLeftIcon className="w-5 h-5" />
                </button>
            </div>
            
            <div className="mt-4 pt-4 border-t space-y-3">
                {canAct ? (
                    <>
                        <div className="p-3 bg-blue-50 text-xs text-blue-700 rounded-lg mb-3">
                            <p className="font-semibold mb-1">Verifikasi Kondisi Aset</p>
                            <p>Pastikan fisik aset telah diterima dan kondisi sesuai dengan laporan ({returnDocument.returnedCondition}) sebelum menyetujui.</p>
                        </div>
                        <ActionButton onClick={onApprove} disabled={isLoading} text={isApprovalMode ? "Konfirmasi Penerimaan" : "Terima & Setujui"} icon={CheckIcon} color="success" />
                        <ActionButton onClick={onReject} disabled={isLoading} text="Tolak Pengembalian" icon={CloseIcon} color="danger" />
                    </>
                ) : (
                    <div className="text-center p-4 bg-gray-50/70 border border-gray-200/60 rounded-lg">
                        {returnDocument.status === AssetReturnStatus.APPROVED ? (
                            <>
                                <CheckIcon className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
                                <p className="text-sm font-semibold text-gray-800">Pengembalian Selesai</p>
                                <p className="text-xs text-gray-500 mt-1">Aset telah kembali ke stok gudang.</p>
                            </>
                        ) : returnDocument.status === AssetReturnStatus.REJECTED ? (
                            <>
                                <CloseIcon className="w-10 h-10 mx-auto mb-3 text-red-500" />
                                <p className="text-sm font-semibold text-gray-800">Pengembalian Ditolak</p>
                                <p className="text-xs text-gray-500 mt-1">Silakan cek alasan penolakan.</p>
                            </>
                        ) : (
                            <>
                                <InfoIcon className="w-10 h-10 mx-auto mb-3 text-amber-500" />
                                <p className="text-sm font-semibold text-gray-800">Menunggu Admin</p>
                                <p className="text-xs text-gray-500 mt-1">Menunggu verifikasi Admin Logistik.</p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
