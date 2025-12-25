
import React from 'react';
import { LoanRequest, LoanRequestStatus, User } from '../../../../types';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { InfoIcon } from '../../../../components/icons/InfoIcon';
import { ChevronsLeftIcon } from '../../../../components/icons/ChevronsLeftIcon';
import { ChevronsRightIcon } from '../../../../components/icons/ChevronsRightIcon';
import { PencilIcon } from '../../../../components/icons/PencilIcon';
import { CloseIcon } from '../../../../components/icons/CloseIcon';
import { HandoverIcon } from '../../../../components/icons/HandoverIcon';
import { CheckIcon } from '../../../../components/icons/CheckIcon';
import { DismantleIcon } from '../../../../components/icons/DismantleIcon';
import { SpinnerIcon } from '../../../../components/icons/SpinnerIcon';

interface LoanActionSidebarProps {
    loanRequest: LoanRequest;
    currentUser: User;
    isLoading: boolean;
    isExpanded: boolean;
    onToggleVisibility: () => void;
    onOpenAssignment: () => void;
    onReject: (request: LoanRequest) => void;
    onOpenReturnConfirmation: () => void;
    onInitiateReturn: () => void; // MODIFIED: Simplified to a void function call
    onInitiateHandoverFromLoan: (request: LoanRequest) => void;
}

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

export const LoanActionSidebar: React.FC<LoanActionSidebarProps> = (props) => {
    const { loanRequest, currentUser, isLoading, onReject, onOpenReturnConfirmation, onInitiateReturn, onInitiateHandoverFromLoan, isExpanded, onToggleVisibility, onOpenAssignment } = props;

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
            if (isRequester) {
                actions = <ActionButton onClick={() => onInitiateReturn()} disabled={isLoading} text="Kembalikan Aset" icon={DismantleIcon} color="primary" />;
            } else if (isAdmin) {
                 actions = (
                    <div className="text-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <InfoIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm font-semibold text-gray-700">Sedang Dipinjam</p>
                        <p className="text-xs text-gray-500 mt-1">Tombol konfirmasi akan muncul setelah peminjam mengajukan pengembalian.</p>
                    </div>
                );
            }
            break;
        case LoanRequestStatus.AWAITING_RETURN:
            if (isAdmin) {
                actions = <ActionButton onClick={onOpenReturnConfirmation} disabled={isLoading} text="Konfirmasi Pengembalian" icon={CheckIcon} color="success" />;
            } else {
                 // For Requester and others: Show info that return is in progress
                 actions = (
                    <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <SpinnerIcon className="w-8 h-8 mx-auto mb-3 text-blue-500 animate-spin" />
                        <p className="text-sm font-bold text-blue-800">Menunggu Konfirmasi Admin</p>
                        <p className="text-xs text-blue-600 mt-1">
                            Anda telah mengajukan pengembalian. Admin Logistik sedang memverifikasi fisik aset.
                        </p>
                    </div>
                );
            }
            break;
        case LoanRequestStatus.RETURNED:
             actions = (
                <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckIcon className="w-10 h-10 mx-auto mb-2 text-green-600" />
                    <p className="text-sm font-bold text-green-800">Pengembalian Selesai</p>
                    <p className="text-xs text-green-600 mt-1">Seluruh aset telah diterima kembali oleh Logistik.</p>
                </div>
            );
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
