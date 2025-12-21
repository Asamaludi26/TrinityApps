
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Request, ItemStatus, User, Asset, AssetCategory, PurchaseDetails, Activity, Division } from '../../../types';
import { DetailPageLayout } from '../../../components/layout/DetailPageLayout';
import { Letterhead } from '../../../components/ui/Letterhead';
import { MegaphoneIcon } from '../../../components/icons/MegaphoneIcon';
import { InfoIcon } from '../../../components/icons/InfoIcon';
import { SpinnerIcon } from '../../../components/icons/SpinnerIcon';
import { CheckIcon } from '../../../components/icons/CheckIcon';
import { RequestStatusIndicator, OrderIndicator } from './components/RequestStatus';
import { PrintIcon } from '../../../components/icons/PrintIcon';
import { Avatar } from '../../../components/ui/Avatar';
import Modal from '../../../components/ui/Modal';
import { SendIcon } from '../../../components/icons/SendIcon';
import { CloseIcon } from '../../../components/icons/CloseIcon';
import { ExclamationTriangleIcon } from '../../../components/icons/ExclamationTriangleIcon';
import { hasPermission } from '../../../utils/permissions';
import { useRequestStore } from '../../../stores/useRequestStore';
import { useNotification } from '../../../providers/NotificationProvider';
import { RequestStatusSidebar } from './components/RequestStatusSidebar';
import { BsPerson, BsBuilding, BsCalendarEvent, BsHash, BsFileEarmarkText } from 'react-icons/bs';
import { ClickableLink } from '../../../components/ui/ClickableLink';
import { PencilIcon } from '../../../components/icons/PencilIcon';
import { ArchiveBoxIcon } from '../../../components/icons/ArchiveBoxIcon';

// Extracted Components
import { PreviewItem } from './components/PreviewItem';
import { ProcurementProgressCard } from './components/ProcurementProgressCard';
import { ApprovalProgress } from './components/ApprovalProgress';
import { ItemPurchaseDetailsForm } from './components/ItemPurchaseDetailsForm';
import { PurchaseDetailsView } from './components/PurchaseDetailsView';
import { CommentThread } from './components/CommentThread';

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
    // REMOVED: onLogisticApproval - Moved to Sidebar internal logic
    onSubmitForCeoApproval: (id: string, data: Record<number, Omit<PurchaseDetails, 'filledBy' | 'fillDate'>>) => void;
    // REMOVED: onFinalCeoApproval - Moved to Sidebar internal logic
    onStartProcurement: () => void;
    // REMOVED: onUpdateRequestStatus - Moved to Sidebar internal logic
    onOpenStaging: (req: Request) => void;
    // REMOVED: onCeoDisposition - Moved to Sidebar internal logic
    onAcknowledgeProgressUpdate: () => void;
    onRequestProgressUpdate: (id: string) => void;
    onFollowUpToCeo: (req: Request) => void;
    onInitiateHandoverFromRequest: (req: Request) => void;
    isLoading: boolean;
    assetCategories: AssetCategory[];
}

const NewRequestDetailPage: React.FC<RequestDetailPageProps> = (props) => {
    const { request: initialRequest, currentUser, assets, onBackToList, onShowPreview, users, onSubmitForCeoApproval, assetCategories, onOpenReviewModal, isLoading, onOpenStaging } = props;
    const [isActionSidebarExpanded, setIsActionSidebarExpanded] = useState(true);
    const [itemPurchaseDetails, setItemPurchaseDetails] = useState<Record<number, Omit<PurchaseDetails, 'filledBy' | 'fillDate'>>>({});
    const initializedRef = useRef(false);
    
    // Local state for cancellation
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

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
        if (request.purchaseDetails && !initializedRef.current) {
             const initial: Record<number, Omit<PurchaseDetails, 'filledBy' | 'fillDate'>> = {};
             let hasData = false;
             Object.entries(request.purchaseDetails).forEach(([itemId, details]) => {
                const d = details as PurchaseDetails;
                const { filledBy, fillDate, ...rest } = d;
                initial[Number(itemId)] = rest;
                hasData = true;
             });
             
             if (hasData) {
                 setItemPurchaseDetails(initial);
                 initializedRef.current = true;
             }
        }
    }, [request.purchaseDetails]);

    // --- Comment Logic ---
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
        window.print();
    };

    // --- Cancellation Logic ---
    const handleCancelRequest = async () => {
        setIsCancelling(true);
        try {
            const cancellationActivity: Activity = {
                id: Date.now(),
                author: currentUser.name,
                timestamp: new Date().toISOString(),
                type: 'status_change',
                payload: { text: 'Membatalkan permintaan.' }
            };

            await updateRequest(request.id, { 
                status: ItemStatus.CANCELLED,
                activityLog: [cancellationActivity, ...(request.activityLog || [])]
            });
            
            addNotification(`Permintaan #${request.id} berhasil dibatalkan.`, 'success');
            setIsCancelModalOpen(false);
            onBackToList(); // Return to list after cancelling
        } catch (error) {
            addNotification('Gagal membatalkan permintaan.', 'error');
        } finally {
            setIsCancelling(false);
        }
    };

    const isPurchaseFormValid = useMemo(() => {
        if (request.status === ItemStatus.LOGISTIC_APPROVED) {
             if (currentUser.role !== 'Admin Purchase' && currentUser.role !== 'Super Admin') return true;

             const itemsRequiringPurchase = request.items.filter(item => {
                const itemStatus = request.itemStatuses?.[item.id];
                // Exclude Rejected AND Stock Allocated items from purchase form validation
                if (itemStatus?.status === 'rejected' || itemStatus?.status === 'stock_allocated') return false;
                
                return itemStatus === undefined || itemStatus.approvedQuantity > 0;
            });

            if (itemsRequiringPurchase.length === 0) return true;

            return itemsRequiringPurchase.every(item => {
                const detail = itemPurchaseDetails[item.id];
                if (!detail) return false;
                const hasPrice = Number(detail.purchasePrice) > 0;
                const hasVendor = detail.vendor && detail.vendor.trim().length > 0;
                const hasPO = detail.poNumber && detail.poNumber.trim().length > 0;
                const hasInvoice = detail.invoiceNumber && detail.invoiceNumber.trim().length > 0;
                const hasDate = !!detail.purchaseDate;
                return hasPrice && hasVendor && hasPO && hasInvoice && hasDate;
            });
        }

        if (request.status === ItemStatus.AWAITING_CEO_APPROVAL) {
             if (!request.purchaseDetails) return false;
             
             const itemsRequiringPurchase = request.items.filter(item => {
                const itemStatus = request.itemStatuses?.[item.id];
                if (itemStatus?.status === 'rejected' || itemStatus?.status === 'stock_allocated') return false;
                return itemStatus === undefined || itemStatus.approvedQuantity > 0;
            });

             return itemsRequiringPurchase.every(item => {
                 const detail = request.purchaseDetails?.[item.id];
                 return !!detail;
             });
        }

        return true;
    }, [itemPurchaseDetails, request, currentUser.role]);

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
    
    // Wrapped in useCallback to prevent infinite loops in child components
    const handlePurchaseDetailChange = useCallback((itemId: number, details: Omit<PurchaseDetails, 'filledBy' | 'fillDate'>) => {
        setItemPurchaseDetails(prev => ({
            ...prev,
            [itemId]: details,
        }));
    }, []);

    const handleFinalSubmitForApproval = () => {
        if (!isPurchaseFormValid) {
            addNotification('Harap isi semua detail pembelian yang wajib diisi untuk item yang disetujui (selain stok).', 'error');
            return;
        }
        onSubmitForCeoApproval(request.id, itemPurchaseDetails);
    };

    const showProcurement = request && [ItemStatus.APPROVED, ItemStatus.PURCHASING, ItemStatus.IN_DELIVERY, ItemStatus.ARRIVED, ItemStatus.AWAITING_HANDOVER, ItemStatus.COMPLETED].includes(request.status);
    const isCommentDisabled = [ItemStatus.COMPLETED, ItemStatus.REJECTED, ItemStatus.CANCELLED].includes(request.status);
    const canViewPrice = hasPermission(currentUser, 'requests:approve:purchase');
    
    // Helper to check if any item needs purchase details form
    const hasItemsToProcess = useMemo(() => {
        return request.items.some(item => {
             const status = request.itemStatuses?.[item.id];
             return status?.status !== 'rejected';
        });
    }, [request]);

    return (
        <DetailPageLayout
            title={`Detail Request: ${request.id}`}
            onBack={onBackToList}
            headerActions={
                 <div className="flex items-center gap-2 no-print">
                    <button onClick={handlePrint} className="hidden sm:inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-xl shadow-sm hover:bg-slate-50 transition-all">
                        <PrintIcon className="w-4 h-4"/> Cetak
                    </button>
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
                    onOpenCancellationModal={() => setIsCancelModalOpen(true)}
                    onOpenStaging={() => onOpenStaging(request)} 
                />
            }
        >
            <div className="space-y-6">
                <div ref={printRef} className="p-8 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-8 relative overflow-hidden">
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
                    
                    {request.progressUpdateRequest && !request.progressUpdateRequest.isAcknowledged && currentUser.role === 'Admin Purchase' && (
                        <div className="p-4 flex items-start gap-4 text-sm bg-blue-50 border border-blue-200 rounded-xl text-blue-800 no-print shadow-sm animate-fade-in-down">
                            <InfoIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold uppercase tracking-wide text-xs mb-1">Permintaan Update Progres</p>
                                <p className="mt-1 mb-3">
                                    <span className="font-semibold">{request.progressUpdateRequest.requestedBy}</span> meminta update progres untuk permintaan ini.
                                </p>
                                <button onClick={props.onAcknowledgeProgressUpdate} disabled={props.isLoading} className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover transition-all">
                                    {props.isLoading ? <SpinnerIcon /> : <CheckIcon />} Tandai Sudah Dilihat
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="text-center pb-4 border-b border-slate-100">
                        <h3 className="text-2xl font-black uppercase text-slate-800 tracking-tight font-sans">Surat Permintaan Barang</h3>
                        <p className="text-sm font-medium text-slate-400 mt-1">Dokumen ID: <span className="font-mono text-slate-600 font-bold">{request.docNumber || request.id}</span></p>
                    </div>
                    
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8">
                            <PreviewItem label="No. Request" value={<div className="font-mono font-bold text-slate-700 flex items-center gap-2 text-base"><BsHash className="text-slate-400"/> {request.id}</div>} />
                            <PreviewItem label="No. Dokumen" value={<div className="font-mono text-slate-700 flex items-center gap-2"><BsFileEarmarkText className="text-slate-400"/> {request.docNumber || '-'}</div>} />
                            <PreviewItem label="Tanggal Request" value={<div className="flex items-center gap-2"><BsCalendarEvent className="text-slate-400"/> {new Date(request.requestDate).toLocaleString('id-ID')}</div>} />
                            <PreviewItem label="Pemohon" value={<div className="flex items-center gap-2"><BsPerson className="text-slate-400"/> {request.requester}</div>} />
                            <PreviewItem label="Divisi" value={<div className="flex items-center gap-2"><BsBuilding className="text-slate-400"/> {request.division}</div>} />
                            <PreviewItem label="Tipe Order"><OrderIndicator order={request.order} /></PreviewItem>
                            <PreviewItem label="Status Saat Ini"><RequestStatusIndicator status={request.status} /></PreviewItem>
                            {request.order.type === 'Project Based' && <PreviewItem label="Nama Proyek" value={<span className="font-bold text-slate-800">{request.order.project}</span>} />}
                             {request.order.type === 'Urgent' && <PreviewItem label="Justifikasi Urgent" fullWidth><p className="text-sm font-medium text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-100 italic">"{request.order.justification}"</p></PreviewItem>}
                        </div>
                    </div>
                    
                    <section>
                        <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                             <span className="w-1 h-5 bg-tm-primary rounded-full"></span> Rincian Barang
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
                                        const isStockAllocated = itemStatus?.status === 'stock_allocated';
                                        
                                        let rowClass = 'hover:bg-slate-50/50 transition-colors';
                                        if (isRejected) rowClass += ' bg-red-50/30 text-slate-400';
                                        else if (isPartiallyApproved) rowClass += ' bg-amber-50/30';
                                        else if (isStockAllocated) rowClass += ' bg-green-50/30';
                                        
                                        return (
                                            <tr key={item.id} className={rowClass}>
                                                <td className="p-4 text-center font-normal text-slate-400">{index + 1}</td>
                                                <td className="p-4 font-semibold">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={isRejected ? 'line-through decoration-red-300' : 'text-slate-800 text-base font-normal'}>{item.itemName}</span>
                                                        <div className="flex gap-2">
                                                            {isPartiallyApproved && <span className="px-2 py-0.5 text-[9px] font-bold text-white bg-amber-500 rounded uppercase tracking-wider shadow-sm">Revisi</span>}
                                                            {isRejected && <span className="px-2 py-0.5 text-[9px] font-bold text-white bg-red-500 rounded uppercase tracking-wider shadow-sm">Ditolak</span>}
                                                            {isStockAllocated && <span className="px-2 py-0.5 text-[9px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 rounded uppercase tracking-wider shadow-sm">Stok</span>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={`p-4 ${isRejected ? 'text-slate-400' : 'text-slate-600 font-normal'}`}>{item.itemTypeBrand}</td>
                                                <td className="p-4 text-center align-top">
                                                    <div className="flex flex-col items-center">
                                                        {isAdjusted ? (
                                                            <><span className="text-xs text-slate-400 line-through decoration-slate-300">{item.quantity}</span><strong className={`text-lg font-bold ${isRejected ? 'text-red-500' : 'text-amber-600'}`}>{approvedQuantity}</strong></>
                                                        ) : (
                                                            <strong className="text-lg font-bold text-slate-800">{item.quantity}</strong>
                                                        )}
                                                        <span className="text-[9px] uppercase font-bold text-slate-400 mt-0.5 tracking-wide">Unit</span>
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
                                {canViewPrice && (
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

                    {request.status === ItemStatus.LOGISTIC_APPROVED && canViewPrice && hasItemsToProcess && (
                        <section className="p-6 mt-8 border-2 border-dashed border-tm-primary/30 bg-blue-50/30 rounded-2xl no-print">
                            <h4 className="font-bold text-tm-primary border-b border-tm-primary/20 pb-3 mb-4 uppercase text-xs tracking-wider flex items-center gap-2">
                                <PencilIcon className="w-4 h-4"/> Input Detail Pembelian
                            </h4>
                            <div className="space-y-4">
                                {request.items.map(item => {
                                    const itemStatus = request.itemStatuses?.[item.id];
                                    const approvedQuantity = itemStatus?.approvedQuantity ?? item.quantity;
                                    const isRejected = approvedQuantity === 0;
                                    const isStockAllocated = itemStatus?.status === 'stock_allocated';

                                    if (isRejected) return null; // Don't show anything for fully rejected items in purchase section

                                    if (isStockAllocated) {
                                        return (
                                            <div key={item.id} className="p-4 bg-white border border-emerald-200 rounded-lg shadow-sm flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                                                        <ArchiveBoxIcon className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h5 className="font-bold text-gray-800">{item.itemName}</h5>
                                                        <p className="text-xs text-gray-500">{item.itemTypeBrand}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                     <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                                                        <CheckIcon className="w-3.5 h-3.5" />
                                                        Stok Tersedia ({approvedQuantity} Unit)
                                                     </span>
                                                     <p className="text-[10px] text-gray-400 mt-1 mr-2">Tidak perlu pembelian</p>
                                                </div>
                                            </div>
                                        );
                                    }

                                    // Normal Rendering for Purchase
                                    return (
                                        <ItemPurchaseDetailsForm 
                                            key={item.id} 
                                            item={item} 
                                            approvedQuantity={approvedQuantity} 
                                            initialData={itemPurchaseDetails[item.id]} 
                                            onChange={(details) => handlePurchaseDetailChange(item.id, details)} 
                                            isDisabled={false} 
                                        />
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {request.purchaseDetails && canViewPrice && (
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

                     <div><h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider mb-4 flex items-center gap-2"><span className="w-1 h-5 bg-tm-primary rounded-full"></span> Status Persetujuan</h4><ApprovalProgress request={request} /></div>
                </div>
                
                {showProcurement && <ProcurementProgressCard request={request} assets={assets} />}

                 <div className="bg-white border border-slate-200 rounded-2xl shadow-sm no-print overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                        <h3 className="text-base font-bold text-slate-800">Aktivitas & Diskusi</h3>
                    </div>
                    <div className="p-6 space-y-6">
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
                                    <textarea ref={commentInputRef} value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={handleKeyDown} rows={1} style={{ overflow: 'hidden' }} className="block w-full px-4 py-3 pr-12 text-sm text-slate-700 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-tm-primary/20 focus:border-tm-primary resize-none transition-all disabled:bg-slate-100 disabled:text-slate-400 shadow-inner" placeholder={isCommentDisabled ? "Diskusi ditutup." : "Tulis komentar..."} disabled={isCommentDisabled} />
                                    {!isCommentDisabled && (<button onClick={handleAddComment} disabled={!newComment.trim()} className="absolute bottom-1.5 right-1.5 p-2 text-white bg-tm-primary rounded-full shadow-md hover:bg-tm-primary-hover disabled:bg-slate-300 disabled:shadow-none transition-all transform active:scale-95"><SendIcon className="w-3.5 h-3.5" /></button>)}
                                </div>
                                {!isCommentDisabled && (<p className="mt-2 text-[10px] text-slate-400 hidden sm:block">Tekan <kbd className="font-sans font-bold text-slate-500">Enter</kbd> untuk kirim, <kbd className="font-sans font-bold text-slate-500">Shift + Enter</kbd> untuk baris baru.</p>)}
                            </div>
                        </div>
                        <div className="border-t border-slate-100 pt-6">
                            <CommentThread activities={(request.activityLog || []).filter(a => !a.parentId).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())} allActivities={request.activityLog || []} level={0} onStartReply={handleStartReply} onStartEdit={handleStartEdit} onDelete={setActivityToDelete} currentUser={currentUser} editingActivityId={editingActivityId} editText={editText} onSaveEdit={handleSaveEdit} onCancelEdit={handleCancelEdit} onSetEditText={setEditText} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Cancel Modal */}
            <Modal isOpen={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)} title="Batalkan Permintaan" size="sm" hideDefaultCloseButton>
                <div className="text-center">
                     <div className="flex items-center justify-center w-12 h-12 mx-auto text-red-600 bg-red-100 rounded-full"><ExclamationTriangleIcon className="w-8 h-8" /></div>
                    <h3 className="mt-4 text-lg font-semibold text-gray-800">Anda Yakin?</h3>
                    <p className="mt-2 text-sm text-gray-600">Permintaan yang dibatalkan tidak dapat diproses lebih lanjut. Tindakan ini tidak dapat diurungkan.</p>
                </div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                    <button onClick={() => setIsCancelModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Kembali</button>
                    <button onClick={handleCancelRequest} disabled={isCancelling} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-danger rounded-lg shadow-sm hover:bg-red-700">{isCancelling ? <SpinnerIcon className="w-4 h-4 mr-2 animate-spin"/> : null} Ya, Batalkan</button>
                </div>
            </Modal>
            
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
