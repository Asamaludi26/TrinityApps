
import React from 'react';
import { Request, User, ItemStatus } from '../../../../types';
import { hasPermission } from '../../../../utils/permissions';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { InfoIcon } from '../../../../components/icons/InfoIcon';
import { ChevronsLeftIcon } from '../../../../components/icons/ChevronsLeftIcon';
import { ChevronsRightIcon } from '../../../../components/icons/ChevronsRightIcon';
import { CheckIcon } from '../../../../components/icons/CheckIcon';
import { PencilIcon } from '../../../../components/icons/PencilIcon';
import { BellIcon } from '../../../../components/icons/BellIcon';
import { CloseIcon } from '../../../../components/icons/CloseIcon';
import { MegaphoneIcon } from '../../../../components/icons/MegaphoneIcon';
import { ShoppingCartIcon } from '../../../../components/icons/ShoppingCartIcon';
import { TruckIcon } from '../../../../components/icons/TruckIcon';
import { ArchiveBoxIcon } from '../../../../components/icons/ArchiveBoxIcon';
import { RegisterIcon } from '../../../../components/icons/RegisterIcon';
import { HandoverIcon } from '../../../../components/icons/HandoverIcon';
import { BsHourglassSplit } from 'react-icons/bs';
import { RequestStatusIndicator } from './RequestStatus';

interface RequestStatusSidebarProps {
    request: Request;
    currentUser: User;
    isLoading: boolean;
    isExpanded: boolean;
    onToggleVisibility: () => void;
    
    // Action Handlers
    onLogisticApproval: (id: string) => void;
    onOpenReviewModal: () => void;
    onOpenFollowUpModal: (req: Request) => void;
    onOpenCancellationModal: () => void;
    onFinalSubmit: () => void;
    isPurchaseFormValid: boolean;
    onFollowUpToCeo: (req: Request) => void;
    onCeoDisposition: (id: string) => void;
    onFinalCeoApproval: (id: string) => void;
    onStartProcurement: () => void;
    onUpdateRequestStatus: (status: ItemStatus) => void;
    onRequestProgressUpdate: (id: string) => void;
    onOpenStaging: (req: Request) => void;
    onInitiateHandoverFromRequest: (req: Request) => void;
}

// Local Helper Component
const WaitingStateCard: React.FC<{ title: string; message: string; icon?: React.FC<{className?:string}> }> = ({ title, message, icon: Icon = BsHourglassSplit }) => (
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

export const RequestStatusSidebar: React.FC<RequestStatusSidebarProps> = (props) => {
    const {
        request, currentUser, isLoading, onToggleVisibility, isExpanded,
        onLogisticApproval, onOpenCancellationModal, onOpenFollowUpModal, onOpenReviewModal,
        onFinalSubmit, isPurchaseFormValid, onFinalCeoApproval, onStartProcurement,
        onUpdateRequestStatus, onOpenStaging, onCeoDisposition,
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

    const renderContent = () => {
        // --- 1. PENDING (Tahap Awal) ---
        if (request.status === ItemStatus.PENDING) {
            if (canApproveLogistic || canApproveFinal) {
                // Actor: Admin Logistik / Super Admin
                return (
                    <div className="space-y-3">
                        <ActionButton onClick={() => onLogisticApproval(request.id)} disabled={isLoading} text="Setujui (Logistik)" color="success" icon={CheckIcon} />
                        <ActionButton onClick={onOpenReviewModal} disabled={isLoading} text="Revisi / Tolak" color="secondary" icon={PencilIcon} />
                    </div>
                );
            } else if (isRequester) {
                // Actor: Requester
                return (
                    <div className="space-y-3">
                         <ActionButton onClick={() => onOpenFollowUpModal(request)} text="Follow Up ke Admin" color="info" icon={BellIcon} />
                         <ActionButton onClick={onOpenCancellationModal} text="Batalkan Permintaan" color="danger" icon={CloseIcon} />
                    </div>
                );
            } else {
                 return <WaitingStateCard title="Menunggu Persetujuan Logistik" message="Permintaan sedang ditinjau oleh Admin Logistik." />;
            }
        }
        
        // --- 2. LOGISTIC APPROVED (Tahap Purchase) ---
        if (request.status === ItemStatus.LOGISTIC_APPROVED) {
            if (canApprovePurchase) {
                // Actor: Admin Purchase
                return (
                    <div className="space-y-3">
                        <ActionButton 
                            onClick={onFinalSubmit} 
                            disabled={isLoading || !isPurchaseFormValid} 
                            text="Submit ke CEO" 
                            color="primary" 
                            icon={CheckIcon} 
                            title={!isPurchaseFormValid ? "Formulir Detail Pembelian belum lengkap. Mohon isi Harga, Vendor, No PO, dan No Faktur untuk semua item." : "Kirim untuk persetujuan final"}
                        />
                        <ActionButton onClick={onOpenReviewModal} disabled={isLoading} text="Revisi / Tolak" color="secondary" icon={PencilIcon} />
                        {!request.ceoFollowUpSent && (
                            <ActionButton onClick={() => onFollowUpToCeo(request)} disabled={isLoading} text="Follow Up ke CEO" color="secondary" icon={BellIcon} />
                        )}
                    </div>
                );
            } else if (canApproveFinal && !request.isPrioritizedByCEO) {
                 // Actor: Super Admin (Can prioritize)
                 return (
                    <div className="space-y-3">
                        <ActionButton onClick={() => onCeoDisposition(request.id)} disabled={isLoading} text="Prioritaskan (Disposisi)" color="special" icon={MegaphoneIcon} />
                        <div className="pt-2 border-t border-gray-100">
                             <WaitingStateCard title="Menunggu Detail Pembelian" message="Admin Purchase sedang melengkapi detail estimasi harga." />
                        </div>
                    </div>
                 );
            } else {
                return <WaitingStateCard title="Dalam Proses Purchase" message="Admin Purchase sedang melakukan estimasi dan persiapan data untuk persetujuan final." />;
            }
        }

        // --- 3. AWAITING CEO APPROVAL (Tahap Final) ---
        if (request.status === ItemStatus.AWAITING_CEO_APPROVAL) {
            if (canApproveFinal) {
                // Actor: Super Admin / CEO
                 return (
                    <div className="space-y-3">
                        <ActionButton 
                            onClick={() => onFinalCeoApproval(request.id)} 
                            disabled={isLoading || !isPurchaseFormValid} 
                            text="Berikan Persetujuan Final" 
                            color="success" 
                            icon={CheckIcon}
                            title={!isPurchaseFormValid ? "Detail pembelian belum lengkap. Mohon hubungi tim Purchase." : "Persetujuan akhir"}
                        />
                        <ActionButton onClick={onOpenReviewModal} disabled={isLoading} text="Tolak / Revisi" color="danger" icon={CloseIcon} />
                    </div>
                );
            } else {
                // Actor: Admin Purchase / Requester / Others
                return <WaitingStateCard title="Menunggu Persetujuan CEO" message="Permintaan telah diajukan dan sedang menunggu keputusan final dari Pimpinan." />;
            }
        }

        // --- 4. APPROVED (Siap Pengadaan) ---
        if (request.status === ItemStatus.APPROVED) {
            if (canApprovePurchase) {
                 // Actor: Admin Purchase
                 return <ActionButton onClick={onStartProcurement} disabled={isLoading} text="Mulai Proses Pengadaan" color="primary" icon={ShoppingCartIcon} />;
            } else {
                 return <WaitingStateCard title="Siap Pengadaan" message="Permintaan disetujui. Tim Purchase akan segera memulai proses pembelian." />;
            }
        }

        // --- 5. PURCHASING / IN DELIVERY / IN_PROGRESS ---
        if (request.status === ItemStatus.PURCHASING || request.status === ItemStatus.IN_PROGRESS) {
            if (canApprovePurchase) {
                 return <ActionButton onClick={() => onUpdateRequestStatus(ItemStatus.IN_DELIVERY)} disabled={isLoading} text="Tandai Sedang Dikirim" color="primary" icon={TruckIcon} />;
            } else if (canApproveFinal && !request.progressUpdateRequest?.isAcknowledged) {
                 return <ActionButton onClick={() => onRequestProgressUpdate(request.id)} disabled={isLoading} text="Minta Update Progres" color="info" icon={InfoIcon} />;
            } else {
                 return <WaitingStateCard title="Sedang Dipesan" message="Barang sedang dalam proses pembelian oleh tim Purchase." icon={ShoppingCartIcon} />;
            }
        }
        
        if (request.status === ItemStatus.IN_DELIVERY) {
             if (canApprovePurchase || canApproveLogistic) {
                  return <ActionButton onClick={() => onUpdateRequestStatus(ItemStatus.ARRIVED)} disabled={isLoading} text="Tandai Barang Tiba" color="primary" icon={ArchiveBoxIcon} />;
             } else {
                  return <WaitingStateCard title="Dalam Pengiriman" message="Barang sedang dalam perjalanan menuju kantor." icon={TruckIcon} />;
             }
        }

        // --- 6. ARRIVED (Siap Registrasi) ---
        if (request.status === ItemStatus.ARRIVED) {
            if (canManageAssets || canApproveFinal) {
                // Actor: Admin Logistik
                return <ActionButton onClick={() => onOpenStaging(request)} disabled={isLoading} text="Catat Sebagai Aset" color="primary" icon={RegisterIcon} />;
            } else {
                 return <WaitingStateCard title="Barang Tiba" message="Admin Logistik sedang memproses pencatatan aset ke dalam sistem." icon={ArchiveBoxIcon} />;
            }
        }

        // --- 7. AWAITING HANDOVER ---
        if (request.status === ItemStatus.AWAITING_HANDOVER) {
             if (canManageHandover || canApproveFinal) {
                 return <ActionButton onClick={() => onInitiateHandoverFromRequest(request)} disabled={isLoading} text="Buat Berita Acara Handover" color="primary" icon={HandoverIcon} />;
             } else {
                 return <WaitingStateCard title="Siap Serah Terima" message="Aset sudah teregistrasi dan siap diserahterimakan oleh Logistik." icon={CheckIcon} />;
             }
        }

        // --- 8. TERMINAL STATES ---
        if ([ItemStatus.COMPLETED, ItemStatus.REJECTED, ItemStatus.CANCELLED].includes(request.status)) {
            return (
                <div className="text-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    {request.status === ItemStatus.REJECTED ? (
                        <CloseIcon className="w-10 h-10 mx-auto mb-2 text-red-500" />
                    ) : request.status === ItemStatus.CANCELLED ? (
                        <CloseIcon className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                    ) : (
                        <CheckIcon className="w-10 h-10 mx-auto mb-2 text-green-500" />
                    )}
                    <p className="text-sm font-semibold text-gray-800">
                        {request.status === ItemStatus.COMPLETED ? 'Permintaan Selesai' : 
                         request.status === ItemStatus.REJECTED ? 'Permintaan Ditolak' : 'Permintaan Dibatalkan'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Tidak ada aksi lebih lanjut untuk permintaan ini.</p>
                </div>
            );
        }

        return null;
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
