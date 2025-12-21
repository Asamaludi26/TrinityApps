
import React from 'react';
import { Request, User, ItemStatus } from '../../../../types';
import { InfoIcon } from '../../../../components/icons/InfoIcon';
import { ChevronsLeftIcon } from '../../../../components/icons/ChevronsLeftIcon';
import { ChevronsRightIcon } from '../../../../components/icons/ChevronsRightIcon';
import { RequestStatusIndicator } from './RequestStatus';

// Import split components
import { 
    PendingActions, 
    LogisticApprovedActions, 
    FinalApprovalActions, 
    ProcurementActions, 
    ArrivalActions, 
    TerminalActions 
} from './actions/RequestActionPanels';

interface RequestStatusSidebarProps {
    request: Request;
    currentUser: User;
    isLoading: boolean;
    isExpanded: boolean;
    onToggleVisibility: () => void;
    
    // UI Props (Modals & Forms) - Still needed for UI interaction
    onOpenReviewModal: () => void;
    onOpenFollowUpModal: (req: Request) => void;
    onOpenCancellationModal: () => void;
    onFinalSubmit: () => void;
    isPurchaseFormValid: boolean;
    onFollowUpToCeo: (req: Request) => void;
    onStartProcurement: () => void;
    onRequestProgressUpdate: (id: string) => void;
    onOpenStaging: (req: Request) => void;
    onInitiateHandoverFromRequest: (req: Request) => void;
}

export const RequestStatusSidebar: React.FC<RequestStatusSidebarProps> = (props) => {
    const { request, onToggleVisibility, isExpanded } = props;
    
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

    const renderContent = () => {
        switch (request.status) {
            case ItemStatus.PENDING:
                return <PendingActions {...props} uiProps={props} />;
            case ItemStatus.LOGISTIC_APPROVED:
                return <LogisticApprovedActions {...props} uiProps={props} />;
            case ItemStatus.AWAITING_CEO_APPROVAL:
                return <FinalApprovalActions {...props} uiProps={props} />;
            case ItemStatus.APPROVED:
            case ItemStatus.PURCHASING:
            case ItemStatus.IN_PROGRESS:
            case ItemStatus.IN_DELIVERY:
                return <ProcurementActions {...props} uiProps={props} />;
            case ItemStatus.ARRIVED:
            case ItemStatus.AWAITING_HANDOVER:
                return <ArrivalActions {...props} uiProps={props} />;
            case ItemStatus.COMPLETED:
            case ItemStatus.REJECTED:
            case ItemStatus.CANCELLED:
                return <TerminalActions request={request} />;
            default:
                return null;
        }
    };
    
    return (
        <div className="p-5 bg-white border border-gray-200/80 rounded-xl shadow-sm">
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <InfoIcon className="w-5 h-5 text-gray-400" />
                        <h3 className="text-base font-semibold text-gray-800">Status & Aksi</h3>
                    </div>
                    <div className="mt-2">
                        <RequestStatusIndicator status={request.status} />
                    </div>
                </div>
                <button
                    onClick={onToggleVisibility}
                    className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-gray-400 rounded-full hover:bg-gray-100 hover:text-gray-800">
                    <ChevronsLeftIcon className="w-5 h-5" />
                </button>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                {renderContent()}
            </div>
        </div>
    );
};
