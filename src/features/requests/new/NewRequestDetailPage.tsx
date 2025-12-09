
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Request, ItemStatus, RequestItem, User, AssetStatus, Asset, PreviewData, AssetCategory, PurchaseDetails, Activity, Division } from '../../../types';
import { DetailPageLayout } from '../../../components/layout/DetailPageLayout';
import { Letterhead } from '../../../components/ui/Letterhead';
import { MegaphoneIcon } from '../../../components/icons/MegaphoneIcon';
import { InfoIcon } from '../../../components/icons/InfoIcon';
import { SpinnerIcon } from '../../../components/icons/SpinnerIcon';
import { CheckIcon } from '../../../components/icons/CheckIcon';
import { RequestStatusIndicator, OrderIndicator } from './components/RequestStatus';
import { ApprovalStamp } from '../../../components/ui/ApprovalStamp';
import { RejectionStamp } from '../../../components/ui/RejectionStamp';
import { SignatureStamp } from '../../../components/ui/SignatureStamp';
import DatePicker from '../../../components/ui/DatePicker';
import { ShoppingCartIcon } from '../../../components/icons/ShoppingCartIcon';
import { TruckIcon } from '../../../components/icons/TruckIcon';
import { ArchiveBoxIcon } from '../../../components/icons/ArchiveBoxIcon';
import { RegisterIcon } from '../../../components/icons/RegisterIcon';
import { HandoverIcon } from '../../../components/icons/HandoverIcon';
import { BellIcon } from '../../../components/icons/BellIcon';
import { ClickableLink } from '../../../components/ui/ClickableLink';
import { CloseIcon } from '../../../components/icons/CloseIcon';
import { ChevronsRightIcon } from '../../../components/icons/ChevronsRightIcon';
import { ChevronsLeftIcon } from '../../../components/icons/ChevronsLeftIcon';
import { ChevronDownIcon } from '../../../components/icons/ChevronDownIcon';
import { DownloadIcon } from '../../../components/icons/DownloadIcon';
import { PrintIcon } from '../../../components/icons/PrintIcon';
import { Avatar } from '../../../components/ui/Avatar';
import Modal from '../../../components/ui/Modal';
import { PencilIcon } from '../../../components/icons/PencilIcon';
import { TrashIcon } from '../../../components/icons/TrashIcon';
import { SendIcon } from '../../../components/icons/SendIcon';
import { ReplyIcon } from '../../../components/icons/ReplyIcon';
import { hasPermission } from '../../../utils/permissions';
import { useRequestStore } from '../../../stores/useRequestStore';
import { useNotification } from '../../../providers/NotificationProvider';

interface RequestDetailPageProps {
    request: Request;
    currentUser: User;
    assets: Asset[];
    users: User[];
    divisions: Division[];
    onBackToList: () => void;
    onShowPreview: (data: any) => void;
    
    // Action handlers passed from Parent (Page)
    onOpenReviewModal: () => void;
    onOpenCancellationModal: () => void;
    onOpenFollowUpModal: (req: Request) => void;
    onLogisticApproval: (id: string) => void;
    onSubmitForCeoApproval: (id: string, data: Record<number, Omit<PurchaseDetails, 'filledBy' | 'fillDate'>>) => void;
    onFinalCeoApproval: (id: string) => void;
    onStartProcurement: () => void;
    onUpdateRequestStatus: (status: ItemStatus) => void;
    onOpenStaging: (req: Request) => void;
    onCeoDisposition: (id: string) => void;
    onAcknowledgeProgressUpdate: () => void;
    onRequestProgressUpdate: (id: string) => void;
    onFollowUpToCeo: (req: Request) => void;
    onInitiateHandoverFromRequest: (req: Request) => void;
    isLoading: boolean;
    assetCategories: AssetCategory[];
}

// Helper: ActionButton Component for consistent UI
const ActionButton: React.FC<{ onClick?: () => void, text: string, icon?: React.FC<{className?:string}>, color: 'primary'|'success'|'danger'|'info'|'secondary'|'special', disabled?: boolean }> = ({ onClick, text, icon: Icon, color, disabled }) => {
    const colors = {
        primary: "bg-tm-primary hover:bg-tm-primary-hover text-white",
        success: "bg-success hover:bg-green-700 text-white",
        danger: "bg-danger hover:bg-red-700 text-white",
        info: "bg-info hover:bg-blue-700 text-white",
        secondary: "bg-gray-600 hover:bg-gray-700 text-white",
        special: "bg-purple-600 hover:bg-purple-700 text-white",
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

// Check if user has permission to view price
const canViewPrice = (user: User) => hasPermission(user, 'requests:approve:purchase');

// --- Timeline Component ---
const TimelineStep: React.FC<{
    icon: React.FC<{ className?: string }>;
    title: string;
    status: 'completed' | 'current' | 'upcoming';
    details?: React.ReactNode;
}> = ({ icon: Icon, title, status, details }) => {
    const statusClasses = {
        completed: { iconBg: 'bg-tm-primary', iconText: 'text-white', text: 'text-tm-dark font-semibold' },
        current: { iconBg: 'bg-tm-accent ring-4 ring-tm-accent/20', iconText: 'text-white', text: 'text-tm-primary font-bold' },
        upcoming: { iconBg: 'bg-gray-200', iconText: 'text-gray-400', text: 'text-gray-400' },
    };
    const currentStatus = statusClasses[status];

    return (
        <div className="flex flex-col items-center text-center w-24 md:w-28">
            <div className={`relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center z-10 ${currentStatus.iconBg} transition-colors duration-300`}>
                {status === 'current' && <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping bg-tm-accent"></span>}
                <Icon className={`w-5 h-5 ${currentStatus.iconText}`} />
            </div>
            <p className={`mt-2 text-xs md:text-sm ${currentStatus.text} transition-colors duration-300`}>{title}</p>
            {details}
        </div>
    );
};

// --- Procurement Progress Card ---
const ProcurementProgressCard: React.FC<{ request: Request, assets: Asset[] }> = ({ request, assets }) => {
    const registeredAssets = assets.filter(a => a.poNumber === request.id || a.woRoIntNumber === request.id);
    const lastRegistrationDate = registeredAssets.length > 0 && request.isRegistered
        ? new Date(Math.max(...registeredAssets.map(a => new Date(a.registrationDate).getTime()))).toISOString()
        : null;

    const order: ItemStatus[] = [ ItemStatus.APPROVED, ItemStatus.PURCHASING, ItemStatus.IN_DELIVERY, ItemStatus.ARRIVED, ItemStatus.AWAITING_HANDOVER, ItemStatus.COMPLETED ];
    
    const getStepStatus = (stepStatus: ItemStatus): 'completed' | 'current' | 'upcoming' => {
        if (request.status === ItemStatus.REJECTED || request.status === ItemStatus.CANCELLED) {
            return 'upcoming';
        }
        if (request.status === ItemStatus.COMPLETED) {
            return 'completed';
        }

        const requestIndex = order.indexOf(request.status);
        const stepIndex = order.indexOf(stepStatus);

        if (requestIndex === -1) return 'upcoming';

        if (stepIndex < requestIndex) return 'completed';
        if (stepIndex === requestIndex) return 'current';
        
        return 'upcoming';
    };
    
    const isStarted = order.includes(request.status) || request.status === ItemStatus.COMPLETED;
    
    const steps = [
        { status: ItemStatus.APPROVED, label: 'Disetujui', icon: CheckIcon, date: request.finalApprovalDate },
        { status: ItemStatus.PURCHASING, label: 'Pengadaan', icon: ShoppingCartIcon, date: request.purchaseDetails ? new Date(Math.max(...Object.values(request.purchaseDetails).map((d: PurchaseDetails) => new Date(d.purchaseDate).getTime()))).toISOString() : null },
        { status: ItemStatus.IN_DELIVERY, label: 'Pengiriman', icon: TruckIcon, date: request.actualShipmentDate || null },
        { status: ItemStatus.ARRIVED, label: 'Tiba', icon: ArchiveBoxIcon, date: request.arrivalDate },
        { status: ItemStatus.AWAITING_HANDOVER, label: 'Dicatat', icon: RegisterIcon, date: lastRegistrationDate },
        { status: ItemStatus.COMPLETED, label: 'Diserahkan', icon: HandoverIcon, date: request.completionDate || null }
    ];

    const renderDetails = (step: typeof steps[0], status: 'completed' | 'current' | 'upcoming') => {
        if (status === 'upcoming' || !step.date) return null;
        return <p className="text-xs text-gray-500 mt-0.5">{new Date(step.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</p>;
    };

    return (
        <section>
            <div className="bg-white border border-gray-200/80 rounded-xl shadow-sm">
                <div className="p-6 border-b">
                    <h4 className="font-semibold text-gray-800">Progres Pengadaan</h4>
                </div>
                <div className="p-6 overflow-x-auto custom-scrollbar">
                    <div className="flex items-start min-w-[700px]">
                        {steps.map((step, index) => {
                            const status = getStepStatus(step.status);
                            const isPrevStepDone = index > 0 ? getStepStatus(steps[index - 1].status) === 'completed' : isStarted;
                            
                            return (
                                <React.Fragment key={step.status}>
                                    <TimelineStep
                                        icon={step.icon}
                                        title={step.label}
                                        status={status}
                                        details={renderDetails(step, status)}
                                    />
                                    {index < steps.length - 1 && (
                                        <div className={`flex-1 h-1 mt-5 -mx-1 sm:-mx-2 ${isPrevStepDone ? 'bg-tm-primary' : 'bg-gray-200'} transition-colors duration-500`}></div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
                <div className="p-6 border-t bg-gray-50/50">
                    <h5 className="text-sm font-semibold text-gray-700 mb-3">Rangkuman Progres</h5>
                    <dl className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6 text-xs">
                        {request.estimatedDeliveryDate && <div><dt className="text-gray-500">Estimasi Tiba</dt><dd className="font-medium text-gray-800">{new Date(request.estimatedDeliveryDate).toLocaleDateString('id-ID')}</dd></div>}
                        {request.arrivalDate && <div><dt className="text-gray-500">Tiba Aktual</dt><dd className="font-medium text-gray-800">{new Date(request.arrivalDate).toLocaleDateString('id-ID')}</dd></div>}
                        {request.receivedBy && <div><dt className="text-gray-500">Diterima oleh</dt><dd className="font-medium text-gray-800">{request.receivedBy}</dd></div>}
                        {lastRegistrationDate && <div><dt className="text-gray-500">Tanggal Dicatat</dt><dd className="font-medium text-gray-800">{new Date(lastRegistrationDate).toLocaleDateString('id-ID')}</dd></div>}
                        {request.completionDate && <div><dt className="text-gray-500">Tanggal Diserahkan</dt><dd className="font-medium text-gray-800">{new Date(request.completionDate).toLocaleDateString('id-ID')}</dd></div>}
                        {request.completedBy && <div><dt className="text-gray-500">Diserahkan oleh</dt><dd className="font-medium text-gray-800">{request.completedBy}</dd></div>}
                    </dl>
                </div>
            </div>
        </section>
    );
};

// --- Approval Stamps Component ---
const ApprovalProgress: React.FC<{ request: Request }> = ({ request }) => {
    if (request.status === ItemStatus.REJECTED && request.rejectedBy && request.rejectionDate) {
        return (
            <div className="flex flex-col items-center justify-center py-4">
                <RejectionStamp
                    rejectorName={request.rejectedBy}
                    rejectionDate={request.rejectionDate}
                    rejectorDivision={request.rejectedByDivision || 'N/A'}
                />
            </div>
        );
    }

    if (request.status === ItemStatus.COMPLETED && request.completedBy && request.completionDate) {
        return (
            <div className="flex flex-col items-center justify-center py-4">
                <div className="relative flex flex-col items-center justify-center w-36 h-24 p-1 text-blue-600 border-2 border-blue-500 rounded-md transform -rotate-12 bg-blue-50 bg-opacity-50">
                    <p className="text-lg font-black tracking-wider uppercase opacity-80">SELESAI</p>
                    <p className="text-xs font-semibold whitespace-nowrap">{request.completedBy}</p>
                    <p className="text-[10px] mt-0.5">{new Date(request.completionDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
            </div>
        )
    }

    const requesterDivision = `Divisi ${request.division}`;

    return (
        <div className="grid grid-cols-3 pt-4 text-center gap-x-2 sm:gap-x-4 justify-around">
            {/* Requester */}
            <div className="flex flex-col items-center">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Pemohon</p>
                <div className="flex items-center justify-center w-full mt-5 min-h-20">
                    <SignatureStamp 
                        signerName={request.requester} 
                        signatureDate={request.requestDate} 
                        signerDivision={requesterDivision} 
                    />
                </div>
                <p className="pt-1 mt-2 w-full text-xs text-gray-700 border-gray-300 truncate" title={request.requester}>
                    ( {request.requester} )
                </p>
            </div>

            {/* Logistic Approver */}
            <div className="flex flex-col items-center">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Admin Logistik</p>
                <div className="flex items-center justify-center w-full mt-5 min-h-20 text-center">
                    {request.logisticApprover ? (
                        <ApprovalStamp 
                            approverName={request.logisticApprover} 
                            approvalDate={request.logisticApprovalDate!} 
                            approverDivision="Logistik"
                        />
                    ) : (
                         <div className="flex flex-col items-center justify-center w-36 h-24 p-1 text-gray-400 border-2 border-dashed border-gray-300 rounded-md bg-gray-50/50">
                            <span className="text-sm italic">Menunggu</span>
                        </div>
                    )}
                </div>
                <p className="pt-1 mt-2 w-full text-xs text-gray-700 truncate" title={request.logisticApprover || ''}>
                     {request.logisticApprover || '.........................'} 
                </p>
            </div>

            {/* Final Approver */}
            <div className="flex flex-col items-center">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">CEO</p>
                <div className="flex items-center justify-center w-full mt-5 min-h-20 text-center">
                    {request.finalApprover ? (
                        <ApprovalStamp 
                            approverName={request.finalApprover} 
                            approvalDate={request.finalApprovalDate!} 
                            approverDivision="Manajemen"
                        />
                    ) : (
                         <div className="flex flex-col items-center justify-center w-36 h-24 p-1 text-gray-400 border-2 border-dashed border-gray-300 rounded-md bg-gray-50/50">
                            <span className="text-sm italic">Menunggu</span>
                        </div>
                    )}
                </div>
                <p className="pt-1 mt-2 w-full text-xs text-gray-700 border-gray-300 truncate" title={request.finalApprover || ''}>
                    {request.finalApprover || '.........................'} 
                </p>
            </div>
        </div>
    );
};

// --- Sidebar Component ---
const StatusAndActionSidebar: React.FC<RequestDetailPageProps & {
    isExpanded: boolean;
    onToggleVisibility: () => void;
    onFinalSubmit: () => void;
    isPurchaseFormValid: boolean;
}> = (props) => {
    const {
        request, currentUser, isLoading, onToggleVisibility, isExpanded,
        onLogisticApproval, onOpenCancellationModal, onOpenFollowUpModal, onOpenReviewModal,
        onFinalSubmit, isPurchaseFormValid, onFinalCeoApproval, onStartProcurement,
        onUpdateRequestStatus, onOpenStaging, onCeoDisposition, onAcknowledgeProgressUpdate,
        onRequestProgressUpdate, onFollowUpToCeo, onInitiateHandoverFromRequest
    } = props;
    
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

    const isRequester = currentUser.name === request.requester;
    const canApproveLogistic = hasPermission(currentUser, 'requests:approve:logistic');
    const canApprovePurchase = hasPermission(currentUser, 'requests:approve:purchase');
    const canApproveFinal = hasPermission(currentUser, 'requests:approve:final');
    const canManageAssets = hasPermission(currentUser, 'assets:create');
    const canManageHandover = hasPermission(currentUser, 'assets:handover');

    const renderActions = () => {
        const commonActions = [];
        if (isRequester && [ItemStatus.PENDING, ItemStatus.LOGISTIC_APPROVED].includes(request.status)) {
            commonActions.push(<ActionButton key="followup" onClick={() => onOpenFollowUpModal(request)} text="Follow Up" color="secondary" icon={BellIcon} />);
        }

        switch (request.status) {
            case ItemStatus.PENDING:
                if (isRequester) return <ActionButton onClick={onOpenCancellationModal} text="Batalkan Permintaan" color="danger" icon={CloseIcon} />;
                if (canApproveLogistic || canApproveFinal) {
                    return (
                        <div className="space-y-2">
                            <ActionButton onClick={() => onLogisticApproval(request.id)} disabled={isLoading} text="Setujui (Logistik)" color="success" icon={CheckIcon} />
                            <ActionButton onClick={onOpenReviewModal} disabled={isLoading} text="Revisi / Tolak" color="secondary" icon={PencilIcon} />
                        </div>
                    );
                }
                break;
            
            case ItemStatus.LOGISTIC_APPROVED:
                if (canApprovePurchase) {
                    const actions = [
                        <ActionButton key="submit" onClick={onFinalSubmit} disabled={isLoading || !isPurchaseFormValid} text="Submit ke CEO" color="primary" icon={CheckIcon} />,
                        <ActionButton key="reject" onClick={onOpenReviewModal} disabled={isLoading} text="Revisi / Tolak" color="secondary" icon={PencilIcon} />
                    ];
                    if (!request.ceoFollowUpSent) {
                        actions.push(<ActionButton key="followup-ceo" onClick={() => onFollowUpToCeo(request)} disabled={isLoading} text="Follow Up ke CEO" color="secondary" icon={BellIcon} />);
                    }
                    return <div className="space-y-2">{actions}</div>;
                }
                if (canApproveFinal && !request.isPrioritizedByCEO) {
                    return <ActionButton onClick={() => onCeoDisposition(request.id)} disabled={isLoading} text="Prioritaskan (Disposisi)" color="special" icon={MegaphoneIcon} />;
                }
                return commonActions.length > 0 ? <>{commonActions}</> : null;

            case ItemStatus.AWAITING_CEO_APPROVAL:
                if (canApproveFinal) {
                    return (
                        <div className="space-y-2">
                            <ActionButton onClick={() => onFinalCeoApproval(request.id)} disabled={isLoading} text="Beri Persetujuan Final" color="success" icon={CheckIcon} />
                            <ActionButton onClick={onOpenReviewModal} disabled={isLoading} text="Revisi / Tolak" color="secondary" icon={PencilIcon} />
                        </div>
                    );
                }
                return null;
            
            case ItemStatus.APPROVED:
                if (canApprovePurchase) {
                    return <ActionButton onClick={onStartProcurement} disabled={isLoading} text="Mulai Proses Pengadaan" color="primary" icon={ShoppingCartIcon} />;
                }
                return null;

            case ItemStatus.PURCHASING:
                if (canApprovePurchase) {
                     return <ActionButton onClick={() => onUpdateRequestStatus(ItemStatus.IN_DELIVERY)} disabled={isLoading} text="Tandai Sedang Dikirim" color="primary" icon={TruckIcon} />;
                }
                if (canApproveFinal && !request.progressUpdateRequest?.isAcknowledged) {
                    return <ActionButton onClick={() => onRequestProgressUpdate(request.id)} disabled={isLoading} text="Minta Update Progres" color="info" icon={InfoIcon} />;
                }
                return null;

            case ItemStatus.IN_DELIVERY:
                 if (canApprovePurchase || canApproveLogistic) {
                     return <ActionButton onClick={() => onUpdateRequestStatus(ItemStatus.ARRIVED)} disabled={isLoading} text="Tandai Barang Tiba" color="primary" icon={ArchiveBoxIcon} />;
                }
                if (canApproveFinal && !request.progressUpdateRequest?.isAcknowledged) {
                    return <ActionButton onClick={() => onRequestProgressUpdate(request.id)} disabled={isLoading} text="Minta Update Progres" color="info" icon={InfoIcon} />;
                }
                return null;

            case ItemStatus.ARRIVED:
                 if (canManageAssets || canApproveFinal) {
                     return <ActionButton onClick={() => onOpenStaging(request)} disabled={isLoading} text="Catat Sebagai Aset" color="primary" icon={RegisterIcon} />;
                }
                return null;
            
            case ItemStatus.AWAITING_HANDOVER:
                 if (canManageHandover || canApproveFinal) {
                     return <ActionButton onClick={() => onInitiateHandoverFromRequest(request)} disabled={isLoading} text="Buat Berita Acara Handover" color="primary" icon={HandoverIcon} />;
                }
                return null;
            
            case ItemStatus.COMPLETED:
            case ItemStatus.REJECTED:
            case ItemStatus.CANCELLED:
                 return (
                    <div className="text-center p-4 bg-gray-50/70 border border-gray-200/60 rounded-lg">
                        <CheckIcon className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                        <p className="text-sm font-semibold text-gray-800">Proses Selesai</p>
                        <p className="text-xs text-gray-500 mt-1">Tidak ada aksi lebih lanjut untuk permintaan ini.</p>
                    </div>
                );

            default:
                return null;
        }
    };
    
    return (
        <>
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
                
                <div className="mt-4 pt-4 border-t space-y-3">
                    {renderActions()}
                </div>
            </div>
        </>
    );
};

const PreviewItem: React.FC<{ label: string; value?: React.ReactNode; children?: React.ReactNode; fullWidth?: boolean; }> = ({ label, value, children, fullWidth = false }) => (
    <div className={fullWidth ? 'sm:col-span-full' : ''}><dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</dt><dd className="mt-1 text-gray-800">{value || children || '-'}</dd></div>
);

interface ItemPurchaseDetailsFormProps {
    item: RequestItem;
    approvedQuantity: number;
    onChange: (details: Omit<PurchaseDetails, 'filledBy' | 'fillDate'>) => void;
    isDisabled?: boolean;
}

const ItemPurchaseDetailsForm: React.FC<ItemPurchaseDetailsFormProps> = ({ item, approvedQuantity, onChange, isDisabled = false }) => {
    const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
    const [vendor, setVendor] = useState('');
    const [poNumber, setPoNumber] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [purchaseDate, setPurchaseDate] = useState<Date | null>(new Date());
    const [warrantyEndDate, setWarrantyEndDate] = useState<Date | null>(null);
    const [warrantyPeriod, setWarrantyPeriod] = useState<number | ''>('');
    const [isExpanded, setIsExpanded] = useState(!isDisabled);

    useEffect(() => {
        if (purchaseDate && warrantyPeriod && warrantyPeriod > 0) {
            const d = new Date(purchaseDate);
            const expectedMonth = (Number(d.getMonth()) + Number(warrantyPeriod)) % 12;
            d.setMonth(Number(d.getMonth()) + Number(warrantyPeriod));
            if (d.getMonth() !== expectedMonth) {
                d.setDate(0);
            }
            setWarrantyEndDate(d);
        }
    }, [purchaseDate, warrantyPeriod]);
    
    const handleWarrantyEndDateChange = (date: Date | null) => {
        setWarrantyEndDate(date);

        if (purchaseDate && date && date > purchaseDate) {
            const pDate = new Date(purchaseDate);
            let months = (date.getFullYear() - pDate.getFullYear()) * 12 + (Number(date.getMonth()) - Number(pDate.getMonth()));
            
            if (date.getDate() < pDate.getDate()) {
                months--;
            }
    
            setWarrantyPeriod(months <= 0 ? '' : months);
        } else {
            setWarrantyPeriod('');
        }
    };

    useEffect(() => {
        onChange({
            purchasePrice: Number(purchasePrice),
            vendor,
            poNumber,
            invoiceNumber,
            purchaseDate: purchaseDate!.toISOString().split('T')[0],
            warrantyEndDate: warrantyEndDate ? warrantyEndDate.toISOString().split('T')[0] : null,
        });
    }, [purchasePrice, vendor, poNumber, invoiceNumber, purchaseDate, warrantyEndDate, onChange]);

    return (
        <div className={`border border-gray-200 rounded-lg shadow-sm transition-colors ${isDisabled ? 'bg-gray-100/70' : 'bg-white'}`}>
            <button
                type="button"
                onClick={() => !isDisabled && setIsExpanded(p => !p)}
                disabled={isDisabled}
                className={`flex items-center justify-between w-full p-3 font-semibold text-left text-gray-700 ${isDisabled ? 'cursor-not-allowed' : 'hover:bg-gray-100'} ${isExpanded && !isDisabled ? 'bg-gray-50/70' : ''}`}
            >
                <span className={`${isDisabled ? 'line-through text-gray-500' : ''}`}>
                    {item.itemName} ({item.itemTypeBrand}) - {approvedQuantity} unit
                </span>
                <div className="flex items-center gap-2">
                    {isDisabled && <span className="px-2 py-0.5 text-xs font-bold text-white bg-danger rounded-full">DITOLAK</span>}
                    {!isDisabled && <ChevronDownIcon className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />}
                </div>
            </button>
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded && !isDisabled ? 'max-h-[1000px]' : 'max-h-0'}`}>
                <fieldset disabled={isDisabled}>
                    <div className="p-4 space-y-4 text-sm border-t">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="font-medium text-gray-700">Harga Beli Total (Rp) <span className="text-danger">*</span></label>
                                <div className="relative mt-1">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                        <span className="text-gray-500 sm:text-sm">Rp</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={purchasePrice === '' ? '' : purchasePrice.toLocaleString('id-ID')}
                                        onChange={e => {
                                            const numericValue = e.target.value.replace(/\D/g, '');
                                            setPurchasePrice(numericValue === '' ? '' : Number(numericValue));
                                        }}
                                        required
                                        className="block w-full py-2 pl-8 pr-3 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg shadow-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="font-medium text-gray-700">Vendor <span className="text-danger">*</span></label>
                                <input type="text" value={vendor} onChange={e => setVendor(e.target.value)} required className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg shadow-sm" />
                            </div>
                            <div>
                                <label className="font-medium text-gray-700">No. Purchase Order <span className="text-danger">*</span></label>
                                <input type="text" value={poNumber} onChange={e => setPoNumber(e.target.value)} required className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg shadow-sm" />
                            </div>
                            <div>
                                <label className="font-medium text-gray-700">No. Faktur <span className="text-danger">*</span></label>
                                <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} required className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg shadow-sm" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-1">
                            <div>
                                <label className="font-medium text-gray-700">Masa Garansi (bulan)</label>
                                <input
                                    type="number"
                                    value={warrantyPeriod}
                                    onChange={e => setWarrantyPeriod(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                                    min="0"
                                    className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                            <div className="sm:col-span-3">
                                <label className="block font-medium text-gray-700">Tanggal Beli <span className="text-danger">*</span></label>
                                <DatePicker id={`pd-${item.id}`} selectedDate={purchaseDate} onDateChange={setPurchaseDate} disableFutureDates />
                            </div>
        
                            <div className="sm:col-span-3">
                                <label className="block font-medium text-gray-700">Akhir Garansi</label>
                                <DatePicker id={`we-${item.id}`} selectedDate={warrantyEndDate} onDateChange={handleWarrantyEndDateChange} />
                            </div>
                        </div>
                    </div>
                </fieldset>
            </div>
        </div>
    );
};

const PurchaseDetailsView: React.FC<{ request: Request, details: Record<number, PurchaseDetails>, currentUser: User }> = ({ request, details, currentUser }) => (
    <section>
        <h4 className="font-semibold text-gray-800 border-b pb-1 mb-2">Detail Pembelian</h4>
        <div className="overflow-x-auto -mx-2">
            <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                    <tr>
                        <th className="p-3">Nama Barang</th>
                        {/* Conditionally render Price header */}
                        {canViewPrice(currentUser) && <th className="p-3 text-right">Harga</th>}
                        <th className="p-3">Vendor</th>
                        <th className="p-3">Tgl Beli</th>
                        <th className="p-3">Akhir Garansi</th>
                        <th className="p-3">No. PO / Faktur</th>
                        <th className="p-3">Diisi Oleh</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {request.items.map(item => {
                        const isRejected = request.itemStatuses?.[item.id]?.approvedQuantity === 0;
                        const itemDetails = details[item.id];

                        if (isRejected) {
                            return (
                                <tr key={item.id} className="bg-red-50/60 text-gray-500">
                                    <td className="p-3 font-semibold">
                                        <div className="flex items-center gap-2">
                                            <span className="line-through">{item.itemName}</span>
                                            <span className="px-2 py-0.5 text-xs font-bold text-white bg-danger rounded-full no-underline">DITOLAK</span>
                                        </div>
                                    </td>
                                    <td colSpan={6} className="p-3 italic">
                                        {request.itemStatuses?.[item.id]?.reason || 'Item ditolak saat proses review.'}
                                    </td>
                                </tr>
                            );
                        }
                        
                        if (itemDetails) {
                             return (
                                <tr key={item.id} className="bg-white">
                                    <td className="p-3 font-semibold text-gray-800">{item.itemName || 'N/A'}</td>
                                    {canViewPrice(currentUser) && (
                                        <td className="p-3 text-right font-mono text-gray-800">Rp {(itemDetails.purchasePrice as unknown as number).toLocaleString('id-ID')}</td>
                                    )}
                                    <td className="p-3 text-gray-600">{itemDetails.vendor}</td>
                                    <td className="p-3 text-gray-600 whitespace-nowrap">{new Date(itemDetails.purchaseDate).toLocaleDateString('id-ID')}</td>
                                    <td className="p-3 text-gray-600 whitespace-nowrap">{itemDetails.warrantyEndDate ? new Date(itemDetails.warrantyEndDate).toLocaleDateString('id-ID') : '-'}</td>
                                    <td className="p-3 text-gray-600">
                                        <div className="font-mono">{itemDetails.poNumber}</div>
                                        <div className="text-xs text-gray-500">{itemDetails.invoiceNumber}</div>
                                    </td>
                                    <td className="p-3 text-gray-600">
                                        <div>{itemDetails.filledBy}</div>
                                        <div className="text-xs text-gray-500">{new Date(itemDetails.fillDate).toLocaleDateString('id-ID')}</div>
                                    </td>
                                </tr>
                            );
                        }

                        return null;
                    })}
                </tbody>
            </table>
        </div>
    </section>
);

// --- Comment Thread Component ---
const CommentThread: React.FC<{
    activities: Activity[];
    allActivities: Activity[];
    level: number;
    onStartReply: (activity: Activity) => void;
    onStartEdit: (activity: Activity) => void;
    onDelete: (activity: Activity) => void;
    currentUser: User;
    editingActivityId: number | null;
    editText: string;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
    onSetEditText: (text: string) => void;
}> = ({ activities, allActivities, level, onStartReply, onStartEdit, onDelete, currentUser, editingActivityId, editText, onSaveEdit, onCancelEdit, onSetEditText }) => {
    const editInputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const textarea = editInputRef.current;
        if (textarea) {
            textarea.focus();
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
            textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
        }
    }, [editingActivityId]);

    const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSaveEdit();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            onCancelEdit();
        }
    };
    
    const formatRelativeTime = (isoDate: string) => {
        const date = new Date(isoDate);
        const now = new Date();
        const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
        if (diffSeconds < 60) return `${diffSeconds}d lalu`;
        const diffMinutes = Math.round(diffSeconds / 60);
        if (diffMinutes < 60) return `${diffMinutes}m lalu`;
        const diffHours = Math.round(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours}j lalu`;
        return `${Math.round(diffHours / 24)}h lalu`;
    };

    return (
        <div className="space-y-4">
            {activities.map(activity => {
                const replies = allActivities.filter(reply => reply.parentId === activity.id).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                const isEditingThis = editingActivityId === activity.id;

                if (activity.type === 'status_change') {
                    return (
                        <div key={activity.id} className="relative text-center my-6">
                            <hr />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="bg-white px-3 text-xs text-gray-500 font-medium">{formatRelativeTime(activity.timestamp)}</span>
                            </div>
                        </div>
                    );
                }

                if (activity.type === 'revision') {
                    return (
                        <div key={activity.id} className={`flex items-start space-x-3 ${level > 0 ? 'ml-10' : ''}`}>
                            <Avatar name={activity.author} className="w-10 h-10 flex-shrink-0" />
                            <div className="flex-1">
                                <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-lg shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <PencilIcon className="w-4 h-4 text-amber-700" />
                                            <p className="text-sm font-semibold text-gray-800">{activity.author} memberikan revisi</p>
                                        </div>
                                        <p className="text-xs text-gray-400" title={new Date(activity.timestamp).toLocaleString('id-ID')}>{formatRelativeTime(activity.timestamp)}</p>
                                    </div>
                                    <div className="mt-2 space-y-2">
                                        {activity.payload.revisions?.map((rev, index) => {
                                            const rejectedQuantity = rev.originalQuantity - rev.approvedQuantity;
                                            const isFullyRejected = rev.approvedQuantity === 0;

                                            return (
                                                <div key={index} className="text-sm border-t border-amber-200/80 pt-2 first:border-t-0 first:pt-0">
                                                    <p className="font-semibold text-gray-700">{rev.itemName}</p>
                                                    
                                                    {isFullyRejected ? (
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="font-semibold text-danger-text">Ditolak:</span>
                                                            <span className="text-gray-600">{rev.originalQuantity} diajukan,</span>
                                                            <span className="font-bold text-danger-text">{rejectedQuantity} ditolak</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                                                            <span className="font-semibold text-amber-800">Revisi:</span>
                                                            <span className="text-gray-600">{rev.originalQuantity} diajukan,</span>
                                                            <span className="font-bold text-success-text">{rev.approvedQuantity} disetujui,</span>
                                                            <span className="font-bold text-danger-text">{rejectedQuantity} ditolak</span>
                                                        </div>
                                                    )}

                                                    <p className="text-xs text-gray-600 italic mt-1">Alasan: "{rev.reason}"</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                return (
                    <div key={activity.id} className="relative">
                        {level > 0 && <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>}
                        <div className={`flex items-start space-x-3 ${level > 0 ? 'ml-10' : ''}`}>
                            <Avatar name={activity.author} className="w-10 h-10 flex-shrink-0" />
                            <div className="flex-1">
                                {isEditingThis ? (
                                     <div>
                                        <textarea
                                            ref={editInputRef}
                                            value={editText}
                                            onChange={e => {
                                                onSetEditText(e.target.value);
                                                if (editInputRef.current) {
                                                    editInputRef.current.style.height = 'auto';
                                                    editInputRef.current.style.height = `${editInputRef.current.scrollHeight}px`;
                                                }
                                            }}
                                            onKeyDown={handleEditKeyDown}
                                            rows={1}
                                            style={{ overflow: 'hidden' }}
                                            className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg shadow-sm resize-none focus:ring-2 focus:ring-tm-accent focus:border-tm-accent"
                                        />
                                        <div className="flex items-center gap-2 mt-2">
                                            <button onClick={onSaveEdit} className="px-3 py-1 text-xs font-semibold text-white bg-tm-primary rounded-md">Simpan</button>
                                            <button onClick={onCancelEdit} className="px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200 rounded-md">Batal</button>
                                            <span className="text-xs text-gray-500">
                                                <kbd className="px-1 py-0.5 text-xs font-semibold text-gray-800 bg-gray-200 rounded-sm">Enter</kbd> untuk simpan, <kbd className="px-1 py-0.5 text-xs font-semibold text-gray-800 bg-gray-200 rounded-sm">Esc</kbd> untuk batal.
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative p-3 bg-gray-50 border border-gray-200/80 rounded-lg shadow-sm group">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-semibold text-gray-800">{activity.author}</p>
                                                <p className="text-xs text-gray-400" title={new Date(activity.timestamp).toLocaleString('id-ID')}>{formatRelativeTime(activity.timestamp)}</p>
                                            </div>
                                            <div className="absolute top-2 right-2 flex items-center gap-1 p-1 bg-white/50 border border-gray-200/0 rounded-full opacity-0 group-hover:opacity-100 group-hover:border-gray-200/100 transition-all duration-200">
                                                
                                                    <button onClick={() => onStartReply(activity)} className="p-1.5 text-gray-500 rounded-full hover:bg-gray-200"><ReplyIcon className="w-4 h-4"/></button>
                                               
                                                {currentUser.name === activity.author && (
                                                    <>
                                                        
                                                            <button onClick={() => onStartEdit(activity)} className="p-1.5 text-gray-500 rounded-full hover:bg-gray-200"><PencilIcon className="w-4 h-4"/></button>
                                                        
                                                        
                                                            <button onClick={() => onDelete(activity)} className="p-1.5 text-red-500 rounded-full hover:bg-red-100"><TrashIcon className="w-4 h-4"/></button>
                                                        
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{activity.payload.text}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        {replies.length > 0 && (
                            <div className="mt-4">
                                <CommentThread
                                    activities={replies}
                                    allActivities={allActivities}
                                    level={level + 1}
                                    onStartReply={onStartReply}
                                    onStartEdit={onStartEdit}
                                    onDelete={onDelete}
                                    currentUser={currentUser}
                                    editingActivityId={editingActivityId}
                                    editText={editText}
                                    onSaveEdit={onSaveEdit}
                                    onCancelEdit={onCancelEdit}
                                    onSetEditText={onSetEditText}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// --- Main Page Component ---
const NewRequestDetailPage: React.FC<RequestDetailPageProps> = (props) => {
    const { request: initialRequest, currentUser, assets, onBackToList, onShowPreview, users, onSubmitForCeoApproval, assetCategories, onUpdateRequestStatus, onOpenReviewModal, isLoading } = props;
    const [isActionSidebarExpanded, setIsActionSidebarExpanded] = useState(true);
    const [itemPurchaseDetails, setItemPurchaseDetails] = useState<Record<number, Omit<PurchaseDetails, 'filledBy' | 'fillDate'>>>({});
    const [isDownloading, setIsDownloading] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);
    const addNotification = useNotification();
    
    // Store Integration for Live Updates
    const storeRequests = useRequestStore((state) => state.requests);
    const updateRequest = useRequestStore((state) => state.updateRequest);
    
    // Use memo to get the freshest data from store, fallback to prop if not found
    const request = useMemo(
        () => storeRequests.find(r => r.id === initialRequest.id) || initialRequest,
        [storeRequests, initialRequest.id]
    );

    const [newComment, setNewComment] = useState('');
    const [editingActivityId, setEditingActivityId] = useState<number | null>(null);
    const [editText, setEditText] = useState('');
    const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);
    const [replyingTo, setReplyingTo] = useState<Activity | null>(null);
    const commentInputRef = useRef<HTMLTextAreaElement>(null);

    const adjustTextareaHeight = () => {
        if (commentInputRef.current) {
            commentInputRef.current.style.height = 'auto';
            commentInputRef.current.style.height = `${commentInputRef.current.scrollHeight}px`;
        }
    };

    useEffect(() => {
        adjustTextareaHeight();
    }, [newComment]);

    useEffect(() => {
        if (replyingTo && commentInputRef.current) {
            commentInputRef.current.focus();
        }
    }, [replyingTo]);
    
    const handleAddComment = async () => {
        if (newComment.trim() === '') return;
        const newActivity: Activity = {
            id: Date.now(),
            author: currentUser.name,
            timestamp: new Date().toISOString(),
            type: 'comment',
            parentId: replyingTo ? replyingTo.id : undefined,
            payload: { text: newComment.trim() }
        };
        const updatedActivityLog = [newActivity, ...(request.activityLog || [])];
        
        await updateRequest(request.id, { activityLog: updatedActivityLog });
        setNewComment('');
        setReplyingTo(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (newComment.trim()) {
                handleAddComment();
            }
        }
    };
    
    const handleStartEdit = (activity: Activity) => {
        setEditingActivityId(activity.id);
        setEditText(activity.payload.text || '');
        setReplyingTo(null);
    };
    
    const handleCancelEdit = () => {
        setEditingActivityId(null);
        setEditText('');
    };

    const handleSaveEdit = async () => {
        if (!editingActivityId || editText.trim() === '') return;
        
        const updatedLog = (request.activityLog || []).map(act => 
            act.id === editingActivityId ? { ...act, payload: { ...act.payload, text: editText.trim() } } : act
        );
        await updateRequest(request.id, { activityLog: updatedLog });

        addNotification('Komentar berhasil diperbarui.', 'success');
        handleCancelEdit();
    };
    
    const handleDelete = async () => {
        if (!activityToDelete) return;
        const updatedLog = (request.activityLog || []).filter(act => act.id !== activityToDelete.id);
        await updateRequest(request.id, { activityLog: updatedLog });
        addNotification('Komentar berhasil dihapus.', 'success');
        setActivityToDelete(null);
    };

    const handleStartReply = (activity: Activity) => {
        setReplyingTo(activity);
        setEditingActivityId(null);
    };

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) {
            addNotification('Konten untuk dicetak tidak ditemukan.', 'error');
            return;
        }

        const printWindow = window.open('', '_blank', 'height=800,width=800');
        if (!printWindow) {
            addNotification('Gagal membuka jendela cetak. Mohon izinkan pop-up untuk situs ini.', 'error');
            return;
        }

        // Inline tailwind config for print window
        const tailwindConfigObject = {
            theme: {
                extend: {
                    fontFamily: { sans: ['Inter', 'sans-serif'] },
                    colors: {
                        'tm-primary': '#1D4ED8', 'tm-secondary': '#6B7280', 'tm-dark': '#111827',
                        success: { DEFAULT: '#16A34A', light: '#DCFCE7', text: '#15803D' },
                        danger: { DEFAULT: '#DC2626', light: '#FEE2E2', text: '#B91C1C' },
                        warning: { DEFAULT: '#FBBF24', light: '#FEF3C7', text: '#B45309' },
                        info: { DEFAULT: '#2563EB', light: '#DBEAFE', text: '#1E40AF' },
                        'green-50': '#f0fdf4', 'green-500': '#22c55e', 'green-600': '#16a34a', 'green-700': '#15803d',
                        'red-50': '#fef2f2', 'red-500': '#ef4444', 'red-600': '#dc2626', 'red-700': '#b91c1c',
                        'blue-50': '#eff6ff', 'blue-400': '#60a5fa', 'blue-500': '#3b82f6', 'blue-600': '#2563eb'
                    }
                }
            }
        };

        printWindow.document.write(`
            <html>
                <head>
                    <title>Cetak Dokumen - ${request.id}</title>
                    <script src="https://cdn.tailwindcss.com"><\/script>
                    <script>
                      tailwind.config = ${JSON.stringify(tailwindConfigObject)};
                    <\/script>
                    <link rel="stylesheet" href="https://rsms.me/inter/inter.css">
                    <style>
                        @media print {
                            @page { size: A4; margin: 20mm; }
                            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                        }
                        body { font-family: 'Inter', sans-serif; }
                    </style>
                </head>
                <body class="bg-white">
                    ${printContent.innerHTML}
                </body>
            </html>
        `);

        printWindow.document.close();
        
        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            }, 500);
        };
    };

    const handleDownloadPdf = () => {
        if (!printRef.current) return;
        setIsDownloading(true);
    
        const { jsPDF } = (window as any).jspdf;
        const html2canvas = (window as any).html2canvas;
    
        html2canvas(printRef.current, {
            scale: 2,
            useCORS: true,
            logging: false,
        }).then((canvas: HTMLCanvasElement) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });
    
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const canvasRatio = canvasWidth / canvasHeight;
            
            let imgWidth = pdfWidth;
            let imgHeight = pdfWidth / canvasRatio;
    
            if (imgHeight > pdfHeight) {
                imgHeight = pdfHeight;
                imgWidth = pdfHeight * canvasRatio;
            }
    
            const xOffset = (pdfWidth - imgWidth) / 2;
    
            pdf.addImage(imgData, 'PNG', xOffset, 0, imgWidth, imgHeight);
            pdf.save(`Request-${request.id}.pdf`);
            setIsDownloading(false);
            addNotification('PDF berhasil diunduh.', 'success');
        }).catch((err: any) => {
            console.error("Error generating PDF:", err);
            addNotification('Gagal membuat PDF. Silakan coba lagi.', 'error');
            setIsDownloading(false);
        });
    };

    const isPurchaseFormValid = useMemo(() => {
        if (request.status !== ItemStatus.LOGISTIC_APPROVED || currentUser.role !== 'Admin Purchase') {
            return true;
        }

        const approvedItems = request.items.filter(item => {
            const itemStatus = request.itemStatuses?.[item.id];
            return itemStatus === undefined || itemStatus.approvedQuantity > 0;
        });

        if (approvedItems.length === 0) {
            return false;
        }

        return approvedItems.every(item => {
            const detail = itemPurchaseDetails[item.id];
            return detail &&
                   detail.purchasePrice && detail.purchasePrice > 0 &&
                   detail.vendor.trim() !== '' &&
                   detail.poNumber.trim() !== '' &&
                   detail.invoiceNumber.trim() !== '' &&
                   detail.purchaseDate;
        });
    }, [itemPurchaseDetails, request.items, request.itemStatuses, request.status, currentUser.role]);

    const calculatedTotalValue = useMemo(() => {
        if (request.status === ItemStatus.LOGISTIC_APPROVED && hasPermission(currentUser, 'requests:approve:purchase')) {
            return Object.values(itemPurchaseDetails).reduce((sum: number, details: Omit<PurchaseDetails, 'filledBy' | 'fillDate'>) => {
                const price = Number(details.purchasePrice) || 0;
                return sum + price;
            }, 0);
        }
        
        if (request.purchaseDetails) {
            return Object.values(request.purchaseDetails).reduce((sum: number, details: PurchaseDetails) => {
                const price = Number(details.purchasePrice) || 0;
                return sum + price;
            }, 0);
        }
    
        return request.totalValue;
    }, [request, itemPurchaseDetails, currentUser]);
    
    const handlePurchaseDetailChange = (itemId: number, details: Omit<PurchaseDetails, 'filledBy' | 'fillDate'>) => {
        setItemPurchaseDetails(prev => ({
            ...prev,
            [itemId]: details,
        }));
    };

    const handleFinalSubmitForApproval = () => {
        if (!isPurchaseFormValid) {
            addNotification('Harap isi semua detail pembelian yang wajib diisi untuk item yang disetujui.', 'error');
            return;
        }
        onSubmitForCeoApproval(request.id, itemPurchaseDetails);
    };

    const showProcurement = request && [ItemStatus.APPROVED, ItemStatus.PURCHASING, ItemStatus.IN_DELIVERY, ItemStatus.ARRIVED, ItemStatus.AWAITING_HANDOVER, ItemStatus.COMPLETED].includes(request.status);

    const isCommentDisabled = [ItemStatus.COMPLETED, ItemStatus.REJECTED, ItemStatus.CANCELLED].includes(request.status);

    return (
        <DetailPageLayout
            title={`Detail Request: ${request.id}`}
            onBack={onBackToList}
            headerActions={
                 <div className="flex items-center gap-2 no-print">
                    <button onClick={handlePrint} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border rounded-lg shadow-sm hover:bg-gray-50">
                        <PrintIcon className="w-4 h-4"/> Cetak
                    </button>
                    <button onClick={handleDownloadPdf} disabled={isDownloading} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover disabled:bg-tm-primary/70">
                        {isDownloading ? <SpinnerIcon className="w-4 h-4"/> : <DownloadIcon className="w-4 h-4" />}
                        {isDownloading ? 'Mengunduh...' : 'Unduh PDF'}
                    </button>
                </div>
            }
            mainColClassName={isActionSidebarExpanded ? 'lg:col-span-8' : 'lg:col-span-11'}
            asideColClassName={isActionSidebarExpanded ? 'lg:col-span-4' : 'lg:col-span-1'}
            aside={
                <StatusAndActionSidebar 
                    {...props} 
                    request={request} // Pass the live request object
                    isExpanded={isActionSidebarExpanded} 
                    onToggleVisibility={() => setIsActionSidebarExpanded(prev => !prev)}
                    onFinalSubmit={handleFinalSubmitForApproval}
                    isPurchaseFormValid={isPurchaseFormValid}
                />
            }
        >
            <div className="space-y-8">
                <div ref={printRef} className="p-6 bg-white border border-gray-200/80 rounded-xl shadow-sm space-y-8">
                    <Letterhead />

                    {request.isPrioritizedByCEO && (
                        <div className="p-3 flex items-start gap-3 text-sm bg-purple-50 border border-purple-200 rounded-md text-purple-800">
                            <MegaphoneIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <p>
                                <strong>Perhatian:</strong> Permintaan ini telah diprioritaskan oleh CEO pada <strong>{new Date(request.ceoDispositionDate!).toLocaleString('id-ID')}</strong> untuk segera diproses.
                            </p>
                        </div>
                    )}
                    
                    {request.progressUpdateRequest && !request.progressUpdateRequest.isAcknowledged && currentUser.role === 'Admin Purchase' && (
                        <div className="p-4 flex items-start gap-4 text-sm bg-blue-50 border border-blue-200 rounded-md text-blue-800 no-print">
                            <InfoIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold">Perhatian: Update Progres Diminta</p>
                                <p className="mt-1">
                                    <span className="font-semibold">{request.progressUpdateRequest.requestedBy}</span> meminta update progres untuk permintaan ini pada {new Date(request.progressUpdateRequest.requestDate).toLocaleString('id-ID')}.
                                </p>
                                <button
                                    onClick={props.onAcknowledgeProgressUpdate}
                                    disabled={props.isLoading}
                                    className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover"
                                >
                                    {props.isLoading ? <SpinnerIcon /> : <CheckIcon />}
                                    Tandai Sudah Dilihat
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="text-center">
                        <h3 className="text-xl font-bold uppercase text-tm-dark">Surat Permintaan Pembelian Barang</h3>
                        <p className="text-sm text-tm-secondary">Nomor Dokumen: {request.docNumber || request.id}</p>
                    </div>
                    
                    <section>
                        <h4 className="font-semibold text-gray-800 border-b pb-1 mb-2">Detail Dokumen</h4>
                        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-3 text-sm">
                            <PreviewItem label="Tanggal Request" value={new Date(request.requestDate).toLocaleString('id-ID')} />
                            <PreviewItem label="Pemohon" value={request.requester} />
                            <PreviewItem label="Divisi" value={request.division} />
                            <PreviewItem label="Tipe Order">
                                <OrderIndicator order={request.order} />
                            </PreviewItem>
                            <PreviewItem label="Status Saat Ini">
                                <RequestStatusIndicator status={request.status} />
                            </PreviewItem>
                            {request.order.type === 'Project Based' && (
                                <PreviewItem label="Nama Proyek" value={request.order.project} />
                            )}
                        </dl>
                        {request.order.type === 'Urgent' && (
                            <div className="mt-4">
                                <PreviewItem label="Justifikasi Urgent" fullWidth>
                                    <p className="p-3 text-sm bg-amber-50 border border-amber-200 rounded-md italic">
                                        "{request.order.justification}"
                                    </p>
                                </PreviewItem>
                            </div>
                        )}
                    </section>
                    
                    <section>
                        <h4 className="font-semibold text-gray-800 border-b pb-1 mb-2">Rincian Barang yang Diminta</h4>
                        <div className="overflow-x-auto">
                             <table className="w-full text-left text-sm">
                                <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                                    <tr>
                                        <th className="p-3 w-10">No.</th>
                                        <th className="p-3">Nama Barang</th>
                                        <th className="p-3">Tipe/Brand</th>
                                        <th className="p-3 text-center w-40">Jumlah</th>
                                        <th className="p-3">Keterangan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {request.items.map((item, index) => {
                                        const itemStatus = request.itemStatuses?.[item.id];
                                        const approvedQuantity = itemStatus?.approvedQuantity;
                                        const isAdjusted = typeof approvedQuantity === 'number';

                                        const isPartiallyApproved = isAdjusted && approvedQuantity > 0 && approvedQuantity < item.quantity;
                                        const isRejected = isAdjusted && approvedQuantity === 0;
                                        
                                        let rowClass = 'border-b';
                                        if (isRejected) rowClass += ' bg-red-50/60';
                                        else if (isPartiallyApproved) rowClass += ' bg-amber-50/60';

                                        let unitOfMeasure = 'unit';
                                        const foundType = assetCategories
                                            .flatMap(cat => cat.types)
                                            .find(type => 
                                                type.standardItems?.some(stdItem => 
                                                    stdItem.name === item.itemName && stdItem.brand === item.itemTypeBrand
                                                )
                                            );
                                        
                                        if (foundType && foundType.unitOfMeasure) {
                                            unitOfMeasure = foundType.unitOfMeasure;
                                        }
                                        
                                        return (
                                            <tr key={item.id} className={rowClass}>
                                                <td className={`p-3 text-center align-top ${isRejected ? 'text-gray-500' : 'text-gray-800'}`}>
                                                    {isRejected ? <s className="text-gray-400">{index + 1}.</s> : `${index + 1}.`}
                                                </td>
                                                <td className="p-3 font-semibold align-top">
                                                    <div className={`flex items-center gap-2 ${isRejected ? 'text-danger-text' : 'text-gray-800'}`}>
                                                        <span className={isRejected ? 'line-through' : ''}>{item.itemName}</span>
                                                        {isPartiallyApproved && <span className="px-2 py-0.5 text-xs font-bold text-white bg-amber-500 rounded-full">Direvisi</span>}
                                                        {isRejected && <span className="px-2 py-0.5 text-xs font-bold text-white bg-danger rounded-full">Ditolak</span>}
                                                    </div>
                                                </td>
                                                <td className={`p-3 align-top ${isRejected ? 'text-gray-500 line-through' : 'text-gray-600'}`}>{item.itemTypeBrand}</td>
                                                <td className="p-3 text-center font-medium align-top">
                                                    <div className="flex flex-col items-center leading-tight">
                                                        {isAdjusted ? (
                                                            <>
                                                                <s className="text-xs text-gray-500">{item.quantity}</s>
                                                                <strong className={`text-base ${isRejected ? 'text-danger-text' : 'text-amber-700'}`}>{approvedQuantity}</strong>
                                                            </>
                                                        ) : (
                                                            <strong className="text-base text-gray-800">{item.quantity}</strong>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-gray-600">{unitOfMeasure}</span>
                                                </td>
                                                <td className={`p-3 text-xs italic align-top ${isRejected ? 'text-gray-500 line-through' : 'text-gray-600'}`}>"{item.keterangan}"</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {canViewPrice(currentUser) && (
                                     <tfoot className="bg-gray-100">
                                        <tr>
                                            <td colSpan={5} className="p-2 text-center font-bold text-gray-800">
                                                Total Harga: Rp. {calculatedTotalValue.toLocaleString('id-ID')}
                                            </td>
                                        </tr>
                                     </tfoot>
                                )}
                            </table>
                        </div>
                    </section>

                    {/* Updated condition to use permission check */}
                    {request.status === ItemStatus.LOGISTIC_APPROVED && hasPermission(currentUser, 'requests:approve:purchase') && (
                        <section className="p-4 mt-6 border-t-2 border-dashed no-print">
                            <h4 className="font-semibold text-gray-800 border-b pb-1 mb-4">Formulir Detail Pembelian</h4>
                            <div className="space-y-4">
                                {request.items.map(item => {
                                    const approvedQuantity = request.itemStatuses?.[item.id]?.approvedQuantity ?? item.quantity;
                                    const isRejected = approvedQuantity === 0;
                                    return (
                                        <ItemPurchaseDetailsForm
                                            key={item.id}
                                            item={item}
                                            approvedQuantity={approvedQuantity}
                                            onChange={(details) => handlePurchaseDetailChange(item.id, details)}
                                            isDisabled={isRejected}
                                        />
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {request.purchaseDetails && canViewPrice(currentUser) && (
                        <PurchaseDetailsView request={request} details={request.purchaseDetails} currentUser={currentUser} />
                    )}

                    {request.isRegistered && (
                        <section className="pt-4 text-sm border-t">
                            <span className="font-semibold text-gray-600">Aset Terkait: </span>
                            {assets.filter(a => a.woRoIntNumber === request.id).map(asset => (
                                <ClickableLink key={asset.id} onClick={() => onShowPreview({ type: 'asset', id: asset.id })}>
                                    {asset.id}
                                </ClickableLink>
                            ))}
                        </section>
                    )}

                     <div className="flex items-center gap-2 pb-3 mb-4 border-b">
                        <h3 className="text-base font-semibold text-gray-800">Progres Persetujuan</h3>
                    </div>
                    <ApprovalProgress request={request} />
                </div>
                
                {showProcurement && <ProcurementProgressCard request={request} assets={assets} />}

                 <div className="mt-8 bg-white border border-gray-200/80 rounded-xl shadow-sm no-print">
                    <div className="p-6">
                        <h3 className="text-lg font-semibold text-gray-800">Aktivitas & Diskusi</h3>
                        <p className="text-sm text-gray-500 mt-1">Diskusikan atau lihat riwayat aktivitas terkait permintaan ini.</p>
                    </div>
                    <div className="p-6 pt-0">
                        {/* New Comment Form */}
                        <div className="flex items-start space-x-3">
                            <Avatar name={currentUser.name} className="w-10 h-10 flex-shrink-0" />
                            <div className="flex-1">
                                {replyingTo && (
                                    <div className="mb-2 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 border rounded-md">
                                        Membalas kepada <span className="font-semibold">{replyingTo.author}</span>
                                        <button onClick={() => setReplyingTo(null)} className="ml-2 text-red-500 hover:underline font-semibold">[Batal]</button>
                                    </div>
                                )}
                                <div className="relative">
                                    <textarea
                                        ref={commentInputRef}
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        rows={1}
                                        style={{ overflow: 'hidden' }}
                                        className="block w-full px-4 py-2.5 pr-14 text-sm text-gray-900 placeholder:text-gray-500 bg-gray-50 border border-gray-300 rounded-full shadow-sm resize-none focus:ring-2 focus:ring-tm-accent focus:border-tm-accent disabled:bg-gray-200/50"
                                        placeholder={isCommentDisabled ? "Diskusi telah ditutup untuk permintaan ini." : "Tulis komentar..."}
                                        disabled={isCommentDisabled}
                                    />
                                    {!isCommentDisabled && (
                                        <button
                                            onClick={handleAddComment}
                                            disabled={!newComment.trim()}
                                            className="absolute bottom-1.5 right-1.5 p-2 text-white bg-tm-primary rounded-full shadow-sm hover:bg-tm-primary-hover disabled:bg-tm-primary/60 disabled:cursor-not-allowed"
                                        >
                                            <SendIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                {!isCommentDisabled && (
                                    <p className="mt-2 text-xs text-gray-500">
                                        Tekan <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-200 rounded-sm">Enter</kbd> untuk mengirim.
                                        <kbd className="ml-2 px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-200 rounded-sm">Shift</kbd> + <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-200 rounded-sm">Enter</kbd> untuk baris baru.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Activity List */}
                    <div className="px-6 pb-6">
                        <CommentThread
                            activities={(request.activityLog || []).filter(a => !a.parentId).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())}
                            allActivities={request.activityLog || []}
                            level={0}
                            onStartReply={handleStartReply}
                            onStartEdit={handleStartEdit}
                            onDelete={setActivityToDelete}
                            currentUser={currentUser}
                            editingActivityId={editingActivityId}
                            editText={editText}
                            onSaveEdit={handleSaveEdit}
                            onCancelEdit={handleCancelEdit}
                            onSetEditText={setEditText}
                        />
                    </div>
                </div>
            </div>

            {activityToDelete && (
                <Modal isOpen={!!activityToDelete} onClose={() => setActivityToDelete(null)} title="Hapus Komentar?" size="sm" zIndex="z-[70]"
                    footerContent={<><button onClick={() => setActivityToDelete(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button><button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-danger rounded-lg shadow-sm hover:bg-red-700">Ya, Hapus</button></>}>
                    <p className="text-sm text-gray-600">Anda yakin ingin menghapus komentar ini secara permanen?</p>
                </Modal>
            )}
        </DetailPageLayout>
    );
};

export default NewRequestDetailPage;
