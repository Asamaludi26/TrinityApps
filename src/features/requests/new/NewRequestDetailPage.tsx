
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import { ClickableLink } from '../../../components/ui/ClickableLink';
import { CloseIcon } from '../../../components/icons/CloseIcon';
import { ChevronDownIcon } from '../../../components/icons/ChevronDownIcon';
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
import { RequestStatusSidebar } from './components/RequestStatusSidebar';
import { BsPerson, BsBuilding, BsCalendarEvent, BsHash, BsFileEarmarkText } from 'react-icons/bs';

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

// Check if user has permission to view price
const canViewPrice = (user: User) => hasPermission(user, 'requests:approve:purchase');

// --- Visual Components ---

const TimelineStep: React.FC<{
    icon: React.FC<{ className?: string }>;
    title: string;
    status: 'completed' | 'current' | 'upcoming';
    details?: React.ReactNode;
}> = ({ icon: Icon, title, status, details }) => {
    const statusClasses = {
        completed: { iconBg: 'bg-tm-primary', iconText: 'text-white', text: 'text-tm-dark font-bold' },
        current: { iconBg: 'bg-white border-2 border-tm-primary text-tm-primary', iconText: 'text-tm-primary', text: 'text-tm-primary font-extrabold' },
        upcoming: { iconBg: 'bg-slate-100 border border-slate-200', iconText: 'text-slate-400', text: 'text-slate-400 font-medium' },
    };
    const currentStatus = statusClasses[status];

    return (
        <div className="flex flex-col items-center text-center w-24 md:w-28 flex-shrink-0 group relative z-10">
            <div className={`relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm ${currentStatus.iconBg}`}>
                {status === 'current' && <span className="absolute inline-flex w-full h-full rounded-full opacity-20 animate-ping bg-tm-primary"></span>}
                <Icon className={`w-5 h-5 ${currentStatus.iconText}`} />
            </div>
            <p className={`mt-3 text-[10px] uppercase tracking-wider ${currentStatus.text} transition-colors duration-300`}>{title}</p>
            {details}
        </div>
    );
};

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

        if (requestIndex === -1) {
            if (request.status === ItemStatus.IN_PROGRESS && stepStatus === ItemStatus.PURCHASING) return 'current';
            return 'upcoming';
        }

        if (stepIndex < requestIndex) return 'completed';
        if (stepIndex === requestIndex) return 'current';
        
        return 'upcoming';
    };
    
    const isStarted = order.includes(request.status) || request.status === ItemStatus.COMPLETED || request.status === ItemStatus.IN_PROGRESS;
    
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
        return <p className="text-[10px] font-bold text-slate-500 mt-1 whitespace-nowrap bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">{new Date(step.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</p>;
    };

    return (
        <section>
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-[0.08em] flex items-center gap-2">
                         <span className="w-1.5 h-1.5 rounded-full bg-tm-primary"></span>
                         Lacak Progres Pengadaan
                    </h4>
                </div>
                <div className="p-8 overflow-x-auto custom-scrollbar">
                    <div className="flex items-start justify-between min-w-[600px] sm:min-w-0 px-2 relative">
                        {/* Connecting Line Background */}
                        <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-100 -z-0"></div>
                        
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
                                        <div className={`flex-1 h-0.5 mt-5 z-0 relative ${isPrevStepDone ? 'bg-tm-primary' : 'bg-slate-200'} transition-colors duration-700 delay-100`}></div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
};

const ApprovalProgress: React.FC<{ request: Request }> = ({ request }) => {
    if (request.status === ItemStatus.REJECTED && request.rejectedBy && request.rejectionDate) {
        return (
            <div className="flex flex-col items-center justify-center py-4 bg-red-50/50 rounded-xl border border-red-100 mt-4">
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
            <div className="flex flex-col items-center justify-center py-4 bg-blue-50/30 rounded-xl border border-blue-100 mt-4">
                <div className="relative flex flex-col items-center justify-center w-36 h-24 p-1 text-blue-600 border-2 border-blue-500 rounded-md transform -rotate-12 bg-blue-50/80 shadow-sm">
                    <p className="text-lg font-black tracking-widest uppercase opacity-80">SELESAI</p>
                    <p className="text-xs font-bold whitespace-nowrap">{request.completedBy}</p>
                    <p className="text-[10px] mt-0.5 font-mono">{new Date(request.completionDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
            </div>
        )
    }

    const requesterDivision = `Divisi ${request.division}`;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 pt-6 text-center gap-y-8 gap-x-2 sm:gap-x-4 justify-around mt-4 border-t border-slate-100">
            {/* Requester */}
            <div className="flex flex-col items-center">
                <p className="text-[10px] font-bold text-slate-800 uppercase tracking-widest mb-4">Pemohon</p>
                <div className="flex items-center justify-center w-full min-h-24">
                    <SignatureStamp 
                        signerName={request.requester} 
                        signatureDate={request.requestDate} 
                        signerDivision={requesterDivision} 
                    />
                </div>
                <div className="mt-3 w-full border-t border-slate-300 pt-1">
                     <p className="text-xs font-normal text-slate-800">{request.requester}</p>
                </div>
            </div>

            {/* Logistic Approver */}
            <div className="flex flex-col items-center">
                <p className="text-[10px] font-bold text-slate-800 uppercase tracking-widest mb-4">Logistik</p>
                <div className="flex items-center justify-center w-full min-h-24 text-center">
                    {request.logisticApprover ? (
                        <ApprovalStamp 
                            approverName={request.logisticApprover} 
                            approvalDate={request.logisticApprovalDate!} 
                            approverDivision="Logistik"
                        />
                    ) : (
                         <div className="flex flex-col items-center justify-center w-32 h-20 p-2 text-slate-300 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                            <span className="text-[10px] italic font-medium uppercase tracking-wide">Menunggu</span>
                        </div>
                    )}
                </div>
                <div className="mt-3 w-full border-t border-slate-300 pt-1">
                    <p className="text-xs font-normal text-slate-800">{request.logisticApprover || '...................'}</p>
                </div>
            </div>

            {/* Final Approver */}
            <div className="flex flex-col items-center">
                <p className="text-[10px] font-bold text-slate-800 uppercase tracking-widest mb-4">Manajemen</p>
                <div className="flex items-center justify-center w-full min-h-24 text-center">
                    {request.finalApprover ? (
                        <ApprovalStamp 
                            approverName={request.finalApprover} 
                            approvalDate={request.finalApprovalDate!} 
                            approverDivision="Manajemen"
                        />
                    ) : (
                         <div className="flex flex-col items-center justify-center w-32 h-20 p-2 text-slate-300 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                            <span className="text-[10px] italic font-medium uppercase tracking-wide">Menunggu</span>
                        </div>
                    )}
                </div>
                <div className="mt-3 w-full border-t border-slate-300 pt-1">
                     <p className="text-xs font-normal text-slate-800">{request.finalApprover || '...................'}</p>
                </div>
            </div>
        </div>
    );
};

const PreviewItem: React.FC<{ label: string; value?: React.ReactNode; children?: React.ReactNode; fullWidth?: boolean; }> = ({ label, value, children, fullWidth = false }) => (
    <div className={`flex flex-col ${fullWidth ? 'sm:col-span-full' : ''}`}>
        <dt className="text-[10px] font-bold text-slate-800 uppercase tracking-widest mb-1.5">{label}</dt>
        <dd className="text-sm font-normal text-slate-600 break-words leading-relaxed">{value || children || '-'}</dd>
    </div>
);

interface ItemPurchaseDetailsFormProps {
    item: RequestItem;
    approvedQuantity: number;
    onChange: (details: Omit<PurchaseDetails, 'filledBy' | 'fillDate'>) => void;
    isDisabled?: boolean;
    initialData?: Omit<PurchaseDetails, 'filledBy' | 'fillDate'>;
}

const ItemPurchaseDetailsForm: React.FC<ItemPurchaseDetailsFormProps> = ({ item, approvedQuantity, onChange, isDisabled = false, initialData }) => {
    const [purchasePrice, setPurchasePrice] = useState<number | ''>(initialData?.purchasePrice ?? '');
    const [vendor, setVendor] = useState(initialData?.vendor ?? '');
    const [poNumber, setPoNumber] = useState(initialData?.poNumber ?? '');
    const [invoiceNumber, setInvoiceNumber] = useState(initialData?.invoiceNumber ?? '');
    const [purchaseDate, setPurchaseDate] = useState<Date | null>(initialData?.purchaseDate ? new Date(initialData.purchaseDate) : new Date());
    const [warrantyEndDate, setWarrantyEndDate] = useState<Date | null>(initialData?.warrantyEndDate ? new Date(initialData.warrantyEndDate) : null);
    
    const getInitialWarrantyPeriod = () => {
        if (initialData?.purchaseDate && initialData?.warrantyEndDate) {
            const start = new Date(initialData.purchaseDate);
            const end = new Date(initialData.warrantyEndDate);
            if (end > start) {
                return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
            }
        }
        return '';
    };

    const [warrantyPeriod, setWarrantyPeriod] = useState<number | ''>(getInitialWarrantyPeriod());
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
        <div className={`border border-slate-200 rounded-lg shadow-sm transition-all duration-300 ${isDisabled ? 'bg-slate-50 opacity-60' : 'bg-white hover:border-tm-primary/50'}`}>
            <button
                type="button"
                onClick={() => !isDisabled && setIsExpanded(p => !p)}
                disabled={isDisabled}
                className={`flex items-center justify-between w-full p-4 font-semibold text-left text-slate-700 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${isExpanded && !isDisabled ? 'bg-slate-50/70 border-b border-slate-100' : ''}`}
            >
                <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-lg text-sm font-bold shadow-sm ${isDisabled ? 'bg-slate-200 text-slate-500' : 'bg-tm-primary text-white'}`}>
                        {approvedQuantity}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                             <span className={`text-sm font-bold ${isDisabled ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                {item.itemName} 
                            </span>
                            {isDisabled && <span className="px-2 py-0.5 text-[10px] font-bold uppercase text-white bg-red-500 rounded-full tracking-wider">Ditolak</span>}
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5 bg-slate-100 px-2 py-0.5 rounded w-fit">{item.itemTypeBrand}</p>
                    </div>
                </div>
                {!isDisabled && <ChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />}
            </button>
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded && !isDisabled ? 'max-h-[1000px]' : 'max-h-0'}`}>
                <fieldset disabled={isDisabled}>
                    <div className="p-5 space-y-5 text-sm">
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Harga Beli Total (Rp) <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                        <span className="text-slate-500 font-normal text-xs">Rp</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={purchasePrice === '' ? '' : purchasePrice.toLocaleString('id-ID')}
                                        onChange={e => {
                                            const numericValue = e.target.value.replace(/\D/g, '');
                                            setPurchasePrice(numericValue === '' ? '' : Number(numericValue));
                                        }}
                                        required
                                        className="block w-full py-2.5 pl-10 pr-3 text-slate-900 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-tm-primary/20 focus:border-tm-primary transition-all font-normal"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Vendor <span className="text-red-500">*</span></label>
                                <input type="text" value={vendor} onChange={e => setVendor(e.target.value)} required className="block w-full px-3 py-2.5 text-slate-900 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-tm-primary/20 focus:border-tm-primary transition-all font-normal" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">No. Purchase Order <span className="text-red-500">*</span></label>
                                <input type="text" value={poNumber} onChange={e => setPoNumber(e.target.value)} required className="block w-full px-3 py-2.5 text-slate-900 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-tm-primary/20 focus:border-tm-primary transition-all font-normal" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">No. Faktur <span className="text-red-500">*</span></label>
                                <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} required className="block w-full px-3 py-2.5 text-slate-900 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-tm-primary/20 focus:border-tm-primary transition-all font-normal" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
                             <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Tanggal Beli <span className="text-red-500">*</span></label>
                                <DatePicker id={`pd-${item.id}`} selectedDate={purchaseDate} onDateChange={setPurchaseDate} disableFutureDates />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Masa Garansi (bulan)</label>
                                <input
                                    type="number"
                                    value={warrantyPeriod}
                                    onChange={e => setWarrantyPeriod(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                                    min="0"
                                    className="block w-full px-3 py-2 text-slate-900 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-tm-primary/20 focus:border-tm-primary transition-all font-normal"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Akhir Garansi</label>
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
        <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
            <ShoppingCartIcon className="w-5 h-5 text-tm-primary" />
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Detail Realisasi Pembelian</h4>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
            <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    <tr>
                        <th className="p-3">Nama Barang</th>
                        {canViewPrice(currentUser) && <th className="p-3 text-right">Harga Satuan</th>}
                        <th className="p-3">Vendor</th>
                        <th className="p-3">Tgl Beli</th>
                        <th className="p-3">Akhir Garansi</th>
                        <th className="p-3">Dokumen</th>
                        <th className="p-3">Diisi Oleh</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {request.items.map(item => {
                        const isRejected = request.itemStatuses?.[item.id]?.approvedQuantity === 0;
                        const itemDetails = details[item.id];

                        if (isRejected) {
                            return (
                                <tr key={item.id} className="bg-red-50/30 text-slate-400">
                                    <td className="p-3 font-semibold">
                                        <div className="flex items-center gap-2">
                                            <span className="line-through decoration-red-400">{item.itemName}</span>
                                            <span className="px-1.5 py-0.5 text-[9px] font-bold text-white bg-red-500 rounded uppercase">Ditolak</span>
                                        </div>
                                    </td>
                                    <td colSpan={6} className="p-3 text-xs italic">
                                        {request.itemStatuses?.[item.id]?.reason || 'Item ditolak saat proses review.'}
                                    </td>
                                </tr>
                            );
                        }
                        
                        if (itemDetails) {
                             return (
                                <tr key={item.id} className="bg-white hover:bg-slate-50/50 transition-colors">
                                    <td className="p-3 font-bold text-slate-800">{item.itemName || 'N/A'}</td>
                                    {canViewPrice(currentUser) && (
                                        <td className="p-3 text-right font-mono font-normal text-slate-700">Rp {(itemDetails.purchasePrice as unknown as number).toLocaleString('id-ID')}</td>
                                    )}
                                    <td className="p-3 text-slate-600 font-normal">{itemDetails.vendor}</td>
                                    <td className="p-3 text-slate-600 whitespace-nowrap">{new Date(itemDetails.purchaseDate).toLocaleDateString('id-ID')}</td>
                                    <td className="p-3 text-slate-600 whitespace-nowrap">{itemDetails.warrantyEndDate ? new Date(itemDetails.warrantyEndDate).toLocaleDateString('id-ID') : '-'}</td>
                                    <td className="p-3 text-slate-600 text-xs">
                                        <div className="font-mono font-normal bg-slate-100 px-1.5 py-0.5 rounded w-fit mb-1 border border-slate-200 text-slate-700">{itemDetails.poNumber}</div>
                                        <div className="text-slate-400 font-mono">{itemDetails.invoiceNumber}</div>
                                    </td>
                                    <td className="p-3 text-slate-600 text-xs">
                                        <div className="font-normal text-slate-700">{itemDetails.filledBy}</div>
                                        <div className="text-slate-400">{new Date(itemDetails.fillDate).toLocaleDateString('id-ID')}</div>
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
        <div className="space-y-4 relative">
            {activities.map(activity => {
                const replies = allActivities.filter(reply => reply.parentId === activity.id).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                const isEditingThis = editingActivityId === activity.id;

                if (activity.type === 'status_change') {
                    return (
                        <div key={activity.id} className="relative text-center my-8">
                            <hr className="border-slate-200 absolute top-1/2 left-0 w-full -z-10" />
                            <span className="bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-100 rounded-full py-0.5">{formatRelativeTime(activity.timestamp)}</span>
                        </div>
                    );
                }

                if (activity.type === 'revision') {
                    return (
                        <div key={activity.id} className={`flex items-start space-x-3 ${level > 0 ? 'ml-10' : ''}`}>
                             <div className="relative">
                                {/* Vertical Line for Thread */}
                                {replies.length > 0 && <div className="absolute top-8 left-1/2 w-0.5 h-full bg-slate-200 -z-10"></div>}
                                <Avatar name={activity.author} className="w-8 h-8 flex-shrink-0 text-xs shadow-sm ring-2 ring-white" />
                            </div>
                            <div className="flex-1">
                                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl shadow-sm relative">
                                    {/* Triangle Pointer */}
                                    <div className="absolute top-3 -left-1.5 w-3 h-3 bg-amber-50/70 border-l border-t border-amber-200 transform -rotate-45"></div>
                                    
                                    <div className="flex items-center justify-between mb-3 relative z-10">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1 bg-amber-100 text-amber-700 rounded-md">
                                                <PencilIcon className="w-3 h-3" />
                                            </div>
                                            <p className="text-xs font-bold text-slate-800">{activity.author} <span className="font-normal text-slate-500">memberikan revisi</span></p>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-bold">{formatRelativeTime(activity.timestamp)}</p>
                                    </div>
                                    <div className="space-y-3 relative z-10">
                                        {activity.payload.revisions?.map((rev, index) => {
                                            const rejectedQuantity = rev.originalQuantity - rev.approvedQuantity;
                                            const isFullyRejected = rev.approvedQuantity === 0;

                                            return (
                                                <div key={index} className="text-sm border-t border-amber-200/50 pt-2 first:border-t-0 first:pt-0">
                                                    <p className="font-bold text-slate-800 text-xs mb-1">{rev.itemName}</p>
                                                    
                                                    {isFullyRejected ? (
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded uppercase text-[10px] border border-red-100">Ditolak</span>
                                                            <span className="text-slate-400 line-through font-medium">{rev.originalQuantity} diajukan</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                                            <span className="font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded uppercase text-[10px] border border-amber-200">Revisi</span>
                                                            <span className="text-slate-400 line-through font-medium">{rev.originalQuantity} diajukan</span>
                                                            <span className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">{rev.approvedQuantity} disetujui</span>
                                                        </div>
                                                    )}

                                                    <p className="text-xs text-amber-900/80 italic mt-2 bg-white/50 p-2 rounded border border-amber-100/50">"{rev.reason}"</p>
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
                    <div key={activity.id} className="relative group">
                        <div className={`flex items-start space-x-3 ${level > 0 ? 'ml-10' : ''}`}>
                            <div className="relative">
                                {/* Vertical Line for Thread */}
                                {replies.length > 0 && <div className="absolute top-8 left-1/2 w-0.5 h-full bg-slate-200 -z-10"></div>}
                                <Avatar name={activity.author} className="w-8 h-8 flex-shrink-0 text-xs shadow-sm ring-2 ring-white" />
                            </div>
                            
                            <div className="flex-1">
                                {isEditingThis ? (
                                     <div className="bg-white border border-tm-primary ring-2 ring-tm-primary/10 rounded-xl p-3 shadow-md z-20 relative">
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
                                            className="block w-full text-sm text-slate-800 bg-transparent border-none p-0 focus:ring-0 resize-none placeholder:text-slate-400"
                                        />
                                        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100">
                                            <button onClick={onSaveEdit} className="px-3 py-1 text-xs font-bold text-white bg-tm-primary rounded-md shadow-sm hover:bg-tm-primary-hover">Simpan</button>
                                            <button onClick={onCancelEdit} className="px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-md">Batal</button>
                                            <span className="text-[10px] text-slate-400 ml-auto">
                                                Tekan <kbd className="font-sans font-bold">Enter</kbd>
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all z-10">
                                        {/* Triangle Pointer */}
                                        <div className="absolute top-3 -left-1.5 w-3 h-3 bg-white border-l border-t border-slate-200 transform -rotate-45 group-hover:border-slate-300 transition-colors"></div>

                                        <div className="flex items-center justify-between mb-1 relative z-10">
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs font-bold text-slate-900">{activity.author}</p>
                                                <span className="text-[10px] font-medium text-slate-400">{formatRelativeTime(activity.timestamp)}</span>
                                            </div>
                                            
                                            {/* Action Buttons - Visible on Hover */}
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => onStartReply(activity)} className="p-1 text-slate-400 hover:text-tm-primary hover:bg-blue-50 rounded" title="Balas"><ReplyIcon className="w-3.5 h-3.5"/></button>
                                                {currentUser.name === activity.author && (
                                                    <>
                                                        <button onClick={() => onStartEdit(activity)} className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded" title="Edit"><PencilIcon className="w-3.5 h-3.5"/></button>
                                                        <button onClick={() => onDelete(activity)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Hapus"><TrashIcon className="w-3.5 h-3.5"/></button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed relative z-10">{activity.payload.text}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        {replies.length > 0 && (
                            <div className="mt-3">
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

// --- NewRequestDetailPage Component ---
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

    // Initialize Purchase Details State
    useEffect(() => {
        if (request.purchaseDetails) {
            const initial: Record<number, Omit<PurchaseDetails, 'filledBy' | 'fillDate'>> = {};
            Object.entries(request.purchaseDetails).forEach(([itemId, details]) => {
                const d = details as PurchaseDetails;
                const { filledBy, fillDate, ...rest } = d;
                initial[Number(itemId)] = rest;
            });
            setItemPurchaseDetails(initial);
        }
    }, [request.purchaseDetails]);

    // ... (Comment state and handlers remain same)
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

    // Print & PDF logic ... (Same)
    const handlePrint = () => {
        window.print();
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
            return true;
        }

        return approvedItems.every(item => {
            const detail = itemPurchaseDetails[item.id];
            if (!detail) return false;
            const hasPrice = Number(detail.purchasePrice) > 0;
            const hasVendor = detail.vendor && detail.vendor.trim().length > 0;
            const hasPO = detail.poNumber && detail.poNumber.trim().length > 0;
            const hasInvoice = detail.invoiceNumber && detail.invoiceNumber.trim().length > 0;
            const hasDate = !!detail.purchaseDate;
            return hasPrice && hasVendor && hasPO && hasInvoice && hasDate;
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
    
    const handlePurchaseDetailChange = useCallback((itemId: number, details: Omit<PurchaseDetails, 'filledBy' | 'fillDate'>) => {
        setItemPurchaseDetails(prev => ({
            ...prev,
            [itemId]: details,
        }));
    }, []);

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
                    <button onClick={handlePrint} className="hidden sm:inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-xl shadow-sm hover:bg-slate-50 transition-all">
                        <PrintIcon className="w-4 h-4"/> Cetak
                    </button>
                    {/* Add download handler when ready, keeping disabled for now based on prop/logic */}
                </div>
            }
            mainColClassName={isActionSidebarExpanded ? 'lg:col-span-8' : 'lg:col-span-11'}
            asideColClassName={isActionSidebarExpanded ? 'lg:col-span-4' : 'lg:col-span-1'}
            aside={
                <RequestStatusSidebar 
                    {...props} 
                    request={request}
                    isExpanded={isActionSidebarExpanded} 
                    onToggleVisibility={() => setIsActionSidebarExpanded(prev => !prev)}
                    onFinalSubmit={handleFinalSubmitForApproval}
                    isPurchaseFormValid={isPurchaseFormValid}
                />
            }
        >
            <div className="space-y-6">
                <div ref={printRef} className="p-8 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-8 relative overflow-hidden">
                    {/* Decorative Top Border */}
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-tm-primary to-tm-accent"></div>
                    
                    <Letterhead />

                    {request.isPrioritizedByCEO && (
                        <div className="p-4 flex items-start gap-3 text-sm bg-purple-50 border border-purple-200 rounded-xl text-purple-800 shadow-sm animate-fade-in-down">
                            <MegaphoneIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold uppercase tracking-wide text-xs mb-1">Perhatian</p>
                                <p>Permintaan ini telah diprioritaskan oleh CEO pada <strong>{new Date(request.ceoDispositionDate!).toLocaleString('id-ID')}</strong>.</p>
                            </div>
                        </div>
                    )}
                    
                    {/* Progress Update Request Block */}
                    {request.progressUpdateRequest && !request.progressUpdateRequest.isAcknowledged && currentUser.role === 'Admin Purchase' && (
                        <div className="p-4 flex items-start gap-4 text-sm bg-blue-50 border border-blue-200 rounded-xl text-blue-800 no-print shadow-sm animate-fade-in-down">
                            <InfoIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold uppercase tracking-wide text-xs mb-1">Permintaan Update Progres</p>
                                <p className="mt-1 mb-3">
                                    <span className="font-semibold">{request.progressUpdateRequest.requestedBy}</span> meminta update progres untuk permintaan ini.
                                </p>
                                <button
                                    onClick={props.onAcknowledgeProgressUpdate}
                                    disabled={props.isLoading}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover transition-all"
                                >
                                    {props.isLoading ? <SpinnerIcon /> : <CheckIcon />}
                                    Tandai Sudah Dilihat
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="text-center pb-4 border-b border-slate-100">
                        <h3 className="text-2xl font-black uppercase text-slate-800 tracking-tight font-sans">Surat Permintaan Barang</h3>
                        <p className="text-sm font-medium text-slate-400 mt-1">Dokumen ID: <span className="font-mono text-slate-600 font-bold">{request.docNumber || request.id}</span></p>
                    </div>
                    
                    {/* META DATA GRID - REFINED */}
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8">
                            <PreviewItem label="No. Request" value={<div className="font-mono font-bold text-slate-700 flex items-center gap-2 text-base"><BsHash className="text-slate-400"/> {request.id}</div>} />
                            <PreviewItem label="No. Dokumen" value={<div className="font-mono text-slate-700 flex items-center gap-2"><BsFileEarmarkText className="text-slate-400"/> {request.docNumber || '-'}</div>} />
                            <PreviewItem label="Tanggal Request" value={<div className="flex items-center gap-2"><BsCalendarEvent className="text-slate-400"/> {new Date(request.requestDate).toLocaleString('id-ID')}</div>} />
                            <PreviewItem label="Pemohon" value={<div className="flex items-center gap-2"><BsPerson className="text-slate-400"/> {request.requester}</div>} />
                            <PreviewItem label="Divisi" value={<div className="flex items-center gap-2"><BsBuilding className="text-slate-400"/> {request.division}</div>} />
                            <PreviewItem label="Tipe Order">
                                <OrderIndicator order={request.order} />
                            </PreviewItem>
                            <PreviewItem label="Status Saat Ini">
                                <RequestStatusIndicator status={request.status} />
                            </PreviewItem>
                            {request.order.type === 'Project Based' && (
                                <PreviewItem label="Nama Proyek" value={<span className="font-bold text-slate-800">{request.order.project}</span>} />
                            )}
                             {request.order.type === 'Urgent' && (
                                <PreviewItem label="Justifikasi Urgent" fullWidth>
                                    <p className="text-sm font-medium text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-100 italic">
                                        "{request.order.justification}"
                                    </p>
                                </PreviewItem>
                            )}
                        </div>
                    </div>
                    
                    <section>
                        <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                             <span className="w-1 h-5 bg-tm-primary rounded-full"></span>
                             Rincian Barang
                        </h4>
                        <div className="overflow-hidden border border-slate-200 rounded-xl shadow-sm">
                             <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-[10px] uppercase font-extrabold text-slate-500 border-b border-slate-200 tracking-wider">
                                    <tr>
                                        <th className="p-4 w-14 text-center">No.</th>
                                        <th className="p-4">Nama Barang</th>
                                        <th className="p-4">Tipe/Brand</th>
                                        <th className="p-4 text-center w-32">Jumlah</th>
                                        <th className="p-4">Keterangan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {request.items.map((item, index) => {
                                        const itemStatus = request.itemStatuses?.[item.id];
                                        const approvedQuantity = itemStatus?.approvedQuantity;
                                        const isAdjusted = typeof approvedQuantity === 'number';
                                        const isPartiallyApproved = isAdjusted && approvedQuantity > 0 && approvedQuantity < item.quantity;
                                        const isRejected = isAdjusted && approvedQuantity === 0;
                                        
                                        let rowClass = 'hover:bg-slate-50/50 transition-colors';
                                        if (isRejected) rowClass += ' bg-red-50/30 text-slate-400';
                                        else if (isPartiallyApproved) rowClass += ' bg-amber-50/30';

                                        let unitOfMeasure = 'unit';
                                        
                                        return (
                                            <tr key={item.id} className={rowClass}>
                                                <td className="p-4 text-center font-normal text-slate-400">
                                                    {index + 1}
                                                </td>
                                                <td className="p-4 font-semibold">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={isRejected ? 'line-through decoration-red-300' : 'text-slate-800 text-base font-normal'}>{item.itemName}</span>
                                                        <div className="flex gap-2">
                                                            {isPartiallyApproved && <span className="px-2 py-0.5 text-[9px] font-bold text-white bg-amber-500 rounded uppercase tracking-wider shadow-sm">Revisi</span>}
                                                            {isRejected && <span className="px-2 py-0.5 text-[9px] font-bold text-white bg-red-500 rounded uppercase tracking-wider shadow-sm">Ditolak</span>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={`p-4 ${isRejected ? 'text-slate-400' : 'text-slate-600 font-normal'}`}>{item.itemTypeBrand}</td>
                                                <td className="p-4 text-center align-top">
                                                    <div className="flex flex-col items-center">
                                                        {isAdjusted ? (
                                                            <>
                                                                <span className="text-xs text-slate-400 line-through decoration-slate-300">{item.quantity}</span>
                                                                <strong className={`text-lg font-bold ${isRejected ? 'text-red-500' : 'text-amber-600'}`}>{approvedQuantity}</strong>
                                                            </>
                                                        ) : (
                                                            <strong className="text-lg font-bold text-slate-800">{item.quantity}</strong>
                                                        )}
                                                        <span className="text-[9px] uppercase font-bold text-slate-400 mt-0.5 tracking-wide">{unitOfMeasure}</span>
                                                    </div>
                                                </td>
                                                <td className={`p-4 text-sm ${isRejected ? 'text-slate-400' : 'text-slate-600'}`}>
                                                    <div className="italic">{item.keterangan || '-'}</div>
                                                    {itemStatus?.reason && (
                                                        <div className="not-italic mt-2 font-semibold text-amber-800 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100 text-xs">
                                                            <span className="font-bold uppercase tracking-wide text-amber-600 mb-1 block">Catatan Admin:</span>
                                                            {itemStatus.reason}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {canViewPrice(currentUser) && (
                                     <tfoot className="bg-slate-50 border-t border-slate-200">
                                        <tr>
                                            <td colSpan={5} className="p-4 text-center font-bold text-slate-800 text-base">
                                                Estimasi Total: <span className="text-xl text-tm-primary ml-2 font-mono">Rp. {calculatedTotalValue.toLocaleString('id-ID')}</span>
                                            </td>
                                        </tr>
                                     </tfoot>
                                )}
                            </table>
                        </div>
                    </section>

                    {request.status === ItemStatus.LOGISTIC_APPROVED && hasPermission(currentUser, 'requests:approve:purchase') && (
                        <section className="p-6 mt-8 border-2 border-dashed border-tm-primary/30 bg-blue-50/30 rounded-2xl no-print">
                            <h4 className="font-bold text-tm-primary border-b border-tm-primary/20 pb-3 mb-4 uppercase text-xs tracking-wider flex items-center gap-2">
                                <PencilIcon className="w-4 h-4"/> Input Detail Pembelian
                            </h4>
                            <div className="space-y-4">
                                {request.items.map(item => {
                                    const approvedQuantity = request.itemStatuses?.[item.id]?.approvedQuantity ?? item.quantity;
                                    const isRejected = approvedQuantity === 0;
                                    // FIX: Pass initialData from state
                                    return (
                                        <ItemPurchaseDetailsForm
                                            key={item.id}
                                            item={item}
                                            approvedQuantity={approvedQuantity}
                                            initialData={itemPurchaseDetails[item.id]}
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
                        <section className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm">
                            <h4 className="font-bold text-emerald-800 uppercase text-xs tracking-wider mb-3 flex items-center gap-2">
                                <CheckIcon className="w-5 h-5"/> Aset Terdaftar
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {assets.filter(a => a.woRoIntNumber === request.id).map(asset => (
                                    <ClickableLink key={asset.id} onClick={() => onShowPreview({ type: 'asset', id: asset.id })} className="bg-white px-3 py-1.5 rounded-lg border border-emerald-200 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors shadow-sm hover:shadow-md">
                                        {asset.id}
                                    </ClickableLink>
                                ))}
                            </div>
                        </section>
                    )}

                     <div>
                        <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span className="w-1 h-5 bg-tm-primary rounded-full"></span> Status Persetujuan
                        </h4>
                        <ApprovalProgress request={request} />
                    </div>
                </div>
                
                {showProcurement && <ProcurementProgressCard request={request} assets={assets} />}

                 <div className="bg-white border border-slate-200 rounded-2xl shadow-sm no-print overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                        <h3 className="text-base font-bold text-slate-800">Aktivitas & Diskusi</h3>
                    </div>
                    
                    <div className="p-6 space-y-6">
                        {/* New Comment Form */}
                        <div className="flex items-start gap-4">
                            <Avatar name={currentUser.name} className="w-10 h-10 flex-shrink-0 text-sm shadow-sm border border-slate-200" />
                            <div className="flex-1">
                                {replyingTo && (
                                    <div className="mb-2 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-between animate-fade-in-down">
                                        <span>Membalas <strong className="text-slate-900">{replyingTo.author}</strong></span>
                                        <button onClick={() => setReplyingTo(null)} className="text-red-500 hover:text-red-700 font-bold ml-2"><CloseIcon className="w-3 h-3"/></button>
                                    </div>
                                )}
                                <div className="relative group">
                                    <textarea
                                        ref={commentInputRef}
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        rows={1}
                                        style={{ overflow: 'hidden' }}
                                        className="block w-full px-4 py-3 pr-12 text-sm text-slate-700 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-tm-primary/20 focus:border-tm-primary resize-none transition-all disabled:bg-slate-100 disabled:text-slate-400 shadow-inner"
                                        placeholder={isCommentDisabled ? "Diskusi ditutup." : "Tulis komentar..."}
                                        disabled={isCommentDisabled}
                                    />
                                    {!isCommentDisabled && (
                                        <button
                                            onClick={handleAddComment}
                                            disabled={!newComment.trim()}
                                            className="absolute bottom-1.5 right-1.5 p-2 text-white bg-tm-primary rounded-full shadow-md hover:bg-tm-primary-hover disabled:bg-slate-300 disabled:shadow-none transition-all transform active:scale-95"
                                        >
                                            <SendIcon className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                                {!isCommentDisabled && (
                                    <p className="mt-2 text-[10px] text-slate-400 hidden sm:block">
                                        Tekan <kbd className="font-sans font-bold text-slate-500">Enter</kbd> untuk kirim, <kbd className="font-sans font-bold text-slate-500">Shift + Enter</kbd> untuk baris baru.
                                    </p>
                                )}
                            </div>
                        </div>
                        
                        {/* Activity List */}
                        <div className="border-t border-slate-100 pt-6">
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
            </div>

            {activityToDelete && (
                <Modal isOpen={!!activityToDelete} onClose={() => setActivityToDelete(null)} title="Hapus Komentar?" size="sm" zIndex="z-[70]"
                    footerContent={<div className="flex gap-2 w-full justify-end"><button onClick={() => setActivityToDelete(null)} className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Batal</button><button onClick={handleDelete} className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg shadow-sm hover:bg-red-700">Ya, Hapus</button></div>}>
                    <p className="text-sm text-slate-600">Anda yakin ingin menghapus komentar ini secara permanen?</p>
                </Modal>
            )}
        </DetailPageLayout>
    );
};

export default NewRequestDetailPage;
