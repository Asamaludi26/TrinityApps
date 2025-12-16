
import React from 'react';
import { Dismantle, User, ItemStatus } from '../../../../types';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { InfoIcon } from '../../../../components/icons/InfoIcon';
import { ChevronsLeftIcon } from '../../../../components/icons/ChevronsLeftIcon';
import { ChevronsRightIcon } from '../../../../components/icons/ChevronsRightIcon';
import { CheckIcon } from '../../../../components/icons/CheckIcon';

interface DismantleStatusSidebarProps {
    dismantle: Dismantle;
    currentUser: User;
    isLoading: boolean;
    isExpanded: boolean;
    onToggleVisibility: () => void;
    onComplete: () => void;
}

const DismantleStatusIndicator: React.FC<{ status: ItemStatus }> = ({ status }) => {
    const statusDetails: Record<string, { label: string, className: string }> = {
        [ItemStatus.COMPLETED]: { label: 'Selesai', className: 'bg-success-light text-success-text' },
        [ItemStatus.IN_PROGRESS]: { label: 'Menunggu Penerimaan Gudang', className: 'bg-warning-light text-warning-text' },
    };

    const details = statusDetails[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${details.className}`}>
            {details.label}
        </span>
    );
};

export const DismantleStatusSidebar: React.FC<DismantleStatusSidebarProps> = ({ 
    dismantle, currentUser, isLoading, onComplete, isExpanded, onToggleVisibility 
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

    const canComplete = dismantle.status === ItemStatus.IN_PROGRESS && (currentUser.role === 'Admin Logistik' || currentUser.role === 'Super Admin');

    return (
        <div className="p-5 bg-white border border-gray-200/80 rounded-xl shadow-sm">
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <InfoIcon className="w-5 h-5 text-gray-400" />
                        <h3 className="text-base font-semibold text-gray-800">Status & Aksi</h3>
                    </div>
                     <div className="mt-2">
                        <DismantleStatusIndicator status={dismantle.status} />
                    </div>
                </div>
                <button
                    onClick={onToggleVisibility}
                    className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-gray-400 rounded-full hover:bg-gray-100 hover:text-gray-800">
                    <ChevronsLeftIcon className="w-5 h-5" />
                </button>
            </div>
            
            <div className="mt-4 pt-4 border-t">
                {canComplete ? (
                     <ActionButton onClick={onComplete} disabled={isLoading} text="Acknowledge & Complete" icon={CheckIcon} color="success" />
                ) : (
                    <div className="text-center p-4 bg-gray-50/70 border border-gray-200/60 rounded-lg">
                        <CheckIcon className="w-10 h-10 mx-auto mb-3 text-success" />
                        <p className="text-sm font-semibold text-gray-800">Proses Selesai</p>
                        <p className="text-xs text-gray-500 mt-1">Dismantle ini telah selesai diproses.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
