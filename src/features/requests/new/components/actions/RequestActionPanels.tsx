
import React from 'react';
import { Request, User, ItemStatus } from '../../../../../types';
import { ActionButton } from '../../../../../components/ui/ActionButton';
import { CheckIcon } from '../../../../../components/icons/CheckIcon';
import { PencilIcon } from '../../../../../components/icons/PencilIcon';
import { BellIcon } from '../../../../../components/icons/BellIcon';
import { CloseIcon } from '../../../../../components/icons/CloseIcon';
import { MegaphoneIcon } from '../../../../../components/icons/MegaphoneIcon';
import { ShoppingCartIcon } from '../../../../../components/icons/ShoppingCartIcon';
import { TruckIcon } from '../../../../../components/icons/TruckIcon';
import { ArchiveBoxIcon } from '../../../../../components/icons/ArchiveBoxIcon';
import { RegisterIcon } from '../../../../../components/icons/RegisterIcon';
import { HandoverIcon } from '../../../../../components/icons/HandoverIcon';
import { InfoIcon } from '../../../../../components/icons/InfoIcon';
import { BsHourglassSplit } from 'react-icons/bs';
import { hasPermission } from '../../../../../utils/permissions';
import { LABELS } from '../../../../../constants/labels';
import { useRequestStore } from '../../../../../stores/useRequestStore'; // Direct Store Access

// --- SHARED WAITING CARD ---
export const WaitingStateCard: React.FC<{ title: string; message: string; icon?: React.FC<{className?:string}> }> = ({ title, message, icon: Icon = BsHourglassSplit }) => (
    <div className="flex flex-col items-center justify-center p-6 text-center bg-gray-50 border border-gray-200 rounded-lg animate-fade-in-up">
        <div className="relative mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 z-10 relative">
                <Icon className="w-6 h-6" />
            </div>
            <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
        </div>
        <h4 className="font-bold text-gray-800">{title}</h4>
        <p className="text-xs text-gray-500 mt-1 max-w-[200px] leading-relaxed">{message}</p>
    </div>
);

// --- 1. PENDING ACTIONS ---
export const PendingActions: React.FC<{ request: Request; currentUser: User; uiProps: any }> = ({ request, currentUser, uiProps }) => {
    const updateRequest = useRequestStore(state => state.updateRequest);
    const { onOpenReviewModal, onOpenFollowUpModal, onOpenCancellationModal, isLoading } = uiProps;

    const canApprove = hasPermission(currentUser, 'requests:approve:logistic') || hasPermission(currentUser, 'requests:approve:final');
    const isRequester = currentUser.name === request.requester;

    const handleLogisticApproval = () => {
        updateRequest(request.id, { 
            status: ItemStatus.LOGISTIC_APPROVED, 
            logisticApprover: currentUser.name, 
            logisticApprovalDate: new Date().toISOString() 
        });
    };

    if (canApprove) {
        return (
            <div className="space-y-3">
                <ActionButton onClick={handleLogisticApproval} disabled={isLoading} text={LABELS.BTN_APPROVE_LOGISTIC} color="success" icon={CheckIcon} />
                <ActionButton onClick={onOpenReviewModal} disabled={isLoading} text={LABELS.BTN_REVISE_REJECT} color="secondary" icon={PencilIcon} />
            </div>
        );
    } 
    if (isRequester) {
        return (
            <div className="space-y-3">
                 <ActionButton onClick={() => onOpenFollowUpModal(request)} text={LABELS.BTN_FOLLOW_UP} color="info" icon={BellIcon} />
                 <ActionButton onClick={onOpenCancellationModal} text={LABELS.BTN_CANCEL_REQUEST} color="danger" icon={CloseIcon} />
            </div>
        );
    }
    return <WaitingStateCard title={LABELS.MSG_WAITING_LOGISTIC} message={LABELS.MSG_DESC_WAITING_LOGISTIC} />;
};

// --- 2. LOGISTIC APPROVED / PURCHASE ACTIONS ---
export const LogisticApprovedActions: React.FC<{ request: Request; currentUser: User; uiProps: any }> = ({ request, currentUser, uiProps }) => {
    const updateRequest = useRequestStore(state => state.updateRequest);
    const { onOpenReviewModal, onFollowUpToCeo, onFinalSubmit, isPurchaseFormValid, isLoading } = uiProps;

    const canApprovePurchase = hasPermission(currentUser, 'requests:approve:purchase');
    const canApproveFinal = hasPermission(currentUser, 'requests:approve:final');

    const handleCeoDisposition = () => {
        updateRequest(request.id, { isPrioritizedByCEO: true, ceoDispositionDate: new Date().toISOString() });
    };

    if (canApprovePurchase) {
        return (
            <div className="space-y-3">
                <ActionButton 
                    onClick={onFinalSubmit} 
                    disabled={isLoading || !isPurchaseFormValid} 
                    text={LABELS.BTN_SUBMIT_CEO} 
                    color="primary" 
                    icon={CheckIcon} 
                    title={!isPurchaseFormValid ? LABELS.TOOLTIP_PURCHASE_INCOMPLETE : LABELS.TOOLTIP_SUBMIT_FINAL}
                />
                <ActionButton onClick={onOpenReviewModal} disabled={isLoading} text={LABELS.BTN_REVISE_REJECT} color="secondary" icon={PencilIcon} />
                {!request.ceoFollowUpSent && (
                    <ActionButton onClick={() => onFollowUpToCeo(request)} disabled={isLoading} text={LABELS.BTN_FOLLOW_UP_CEO} color="secondary" icon={BellIcon} />
                )}
            </div>
        );
    }
    if (canApproveFinal && !request.isPrioritizedByCEO) {
         return (
            <div className="space-y-3">
                <ActionButton onClick={handleCeoDisposition} disabled={isLoading} text={LABELS.BTN_PRIORITIZE} color="special" icon={MegaphoneIcon} />
                <div className="pt-2 border-t border-gray-100">
                     <WaitingStateCard title={LABELS.MSG_WAITING_PURCHASE_DETAIL} message={LABELS.MSG_DESC_WAITING_PURCHASE} />
                </div>
            </div>
         );
    }
    return <WaitingStateCard title={LABELS.MSG_IN_PURCHASE_PROCESS} message={LABELS.MSG_DESC_IN_PURCHASE} />;
};

// --- 3. FINAL APPROVAL ACTIONS ---
export const FinalApprovalActions: React.FC<{ request: Request; currentUser: User; uiProps: any }> = ({ request, currentUser, uiProps }) => {
    const updateRequest = useRequestStore(state => state.updateRequest);
    const { onOpenReviewModal, isPurchaseFormValid, isLoading } = uiProps;
    const canApproveFinal = hasPermission(currentUser, 'requests:approve:final');

    const handleFinalCeoApproval = () => {
        updateRequest(request.id, { 
            status: ItemStatus.APPROVED, 
            finalApprover: currentUser.name, 
            finalApprovalDate: new Date().toISOString() 
        });
    };

    if (canApproveFinal) {
         return (
            <div className="space-y-3">
                <ActionButton 
                    onClick={handleFinalCeoApproval} 
                    disabled={isLoading || !isPurchaseFormValid} 
                    text={LABELS.BTN_APPROVE_FINAL} 
                    color="success" 
                    icon={CheckIcon}
                    title={!isPurchaseFormValid ? LABELS.TOOLTIP_CEO_INCOMPLETE : LABELS.TOOLTIP_CEO_APPROVE}
                />
                <ActionButton onClick={onOpenReviewModal} disabled={isLoading} text={LABELS.BTN_REVISE_REJECT} color="danger" icon={CloseIcon} />
            </div>
        );
    }
    return <WaitingStateCard title={LABELS.MSG_WAITING_CEO} message={LABELS.MSG_DESC_WAITING_CEO} />;
};

// --- 4. PROCUREMENT PROCESS ACTIONS ---
export const ProcurementActions: React.FC<{ request: Request; currentUser: User; uiProps: any }> = ({ request, currentUser, uiProps }) => {
    const updateRequest = useRequestStore(state => state.updateRequest);
    const { onStartProcurement, onRequestProgressUpdate, isLoading } = uiProps;

    const canApprovePurchase = hasPermission(currentUser, 'requests:approve:purchase');
    const canApproveFinal = hasPermission(currentUser, 'requests:approve:final');
    const canApproveLogistic = hasPermission(currentUser, 'requests:approve:logistic');

    if (request.status === ItemStatus.APPROVED) {
        if (canApprovePurchase) {
             return <ActionButton onClick={onStartProcurement} disabled={isLoading} text={LABELS.BTN_START_PROCUREMENT} color="primary" icon={ShoppingCartIcon} />;
        }
        return <WaitingStateCard title={LABELS.MSG_READY_PROCUREMENT} message={LABELS.MSG_DESC_READY_PROCUREMENT} />;
    }

    if (request.status === ItemStatus.PURCHASING || request.status === ItemStatus.IN_PROGRESS) {
        if (canApprovePurchase) {
             return <ActionButton onClick={() => updateRequest(request.id, { status: ItemStatus.IN_DELIVERY })} disabled={isLoading} text={LABELS.BTN_MARK_DELIVERY} color="primary" icon={TruckIcon} />;
        }
        if (canApproveFinal && !request.progressUpdateRequest?.isAcknowledged) {
             return <ActionButton onClick={() => onRequestProgressUpdate(request.id)} disabled={isLoading} text={LABELS.BTN_REQ_PROGRESS} color="info" icon={InfoIcon} />;
        }
        return <WaitingStateCard title={LABELS.MSG_ORDERING} message={LABELS.MSG_DESC_ORDERING} icon={ShoppingCartIcon} />;
    }
    
    if (request.status === ItemStatus.IN_DELIVERY) {
         if (canApprovePurchase || canApproveLogistic) {
              return <ActionButton onClick={() => updateRequest(request.id, { status: ItemStatus.ARRIVED })} disabled={isLoading} text={LABELS.BTN_MARK_ARRIVED} color="primary" icon={ArchiveBoxIcon} />;
         }
         return <WaitingStateCard title={LABELS.MSG_DELIVERING} message={LABELS.MSG_DESC_DELIVERING} icon={TruckIcon} />;
    }

    return null;
};

// --- 5. ARRIVAL & HANDOVER ACTIONS ---
export const ArrivalActions: React.FC<{ request: Request; currentUser: User; uiProps: any }> = ({ request, currentUser, uiProps }) => {
    const { onOpenStaging, onInitiateHandoverFromRequest, isLoading } = uiProps;
    const canManageAssets = hasPermission(currentUser, 'assets:create');
    const canManageHandover = hasPermission(currentUser, 'assets:handover');
    const canApproveFinal = hasPermission(currentUser, 'requests:approve:final'); // CEO bisa bypass

    if (request.status === ItemStatus.ARRIVED) {
        if (canManageAssets || canApproveFinal) {
            return <ActionButton onClick={() => onOpenStaging(request)} disabled={isLoading} text={LABELS.BTN_REGISTER_ASSET} color="primary" icon={RegisterIcon} />;
        }
        return <WaitingStateCard title={LABELS.MSG_ARRIVED} message={LABELS.MSG_DESC_ARRIVED} icon={ArchiveBoxIcon} />;
    }

    if (request.status === ItemStatus.AWAITING_HANDOVER) {
         if (canManageHandover || canApproveFinal) {
             return <ActionButton onClick={() => onInitiateHandoverFromRequest(request)} disabled={isLoading} text={LABELS.BTN_CREATE_HANDOVER} color="primary" icon={HandoverIcon} />;
         }
         return <WaitingStateCard title={LABELS.MSG_READY_HANDOVER} message={LABELS.MSG_DESC_READY_HANDOVER} icon={CheckIcon} />;
    }

    return null;
};

// --- 6. TERMINAL ACTIONS ---
export const TerminalActions: React.FC<{ request: Request }> = ({ request }) => {
    let icon = CheckIcon;
    let color = "text-green-500";
    let title = "Permintaan Selesai";

    if (request.status === ItemStatus.REJECTED) {
        icon = CloseIcon; color = "text-red-500"; title = "Permintaan Ditolak";
    } else if (request.status === ItemStatus.CANCELLED) {
        icon = CloseIcon; color = "text-gray-400"; title = "Permintaan Dibatalkan";
    }

    const Icon = icon;

    return (
        <div className="text-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <Icon className={`w-10 h-10 mx-auto mb-2 ${color}`} />
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            <p className="text-xs text-gray-500 mt-1">Tidak ada aksi lebih lanjut untuk permintaan ini.</p>
        </div>
    );
};
