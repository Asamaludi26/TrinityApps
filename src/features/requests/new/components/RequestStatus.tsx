import React, { useMemo } from 'react';
import { ItemStatus, OrderDetails } from '../../../../types';
import { BsClock, BsPatchCheck, BsClipboardCheck, BsCheckCircleFill, BsXCircleFill, BsSlashCircle } from 'react-icons/bs';
import { ShoppingCartIcon } from '../../../../components/icons/ShoppingCartIcon';
import { TruckIcon } from '../../../../components/icons/TruckIcon';
import { ArchiveBoxIcon } from '../../../../components/icons/ArchiveBoxIcon';
import { RegisterIcon } from '../../../../components/icons/RegisterIcon';
import { SpinnerIcon } from '../../../../components/icons/SpinnerIcon';
import { InfoIcon } from '../../../../components/icons/InfoIcon';

export const getStatusClass = (status: ItemStatus) => {
    switch (status) {
        case ItemStatus.PENDING:
            return 'bg-warning-light text-warning-text';
        case ItemStatus.LOGISTIC_APPROVED:
            return 'bg-info-light text-info-text';
        case ItemStatus.AWAITING_CEO_APPROVAL:
            return 'bg-purple-100 text-purple-700';
        case ItemStatus.APPROVED:
            return 'bg-sky-100 text-sky-700';
        case ItemStatus.PURCHASING:
            return 'bg-blue-100 text-blue-700';
        case ItemStatus.IN_DELIVERY:
            return 'bg-purple-100 text-purple-700';
        case ItemStatus.ARRIVED:
            return 'bg-teal-100 text-teal-700';
        case ItemStatus.COMPLETED:
            return 'bg-success-light text-success-text';
        case ItemStatus.REJECTED:
            return 'bg-danger-light text-danger-text';
        case ItemStatus.CANCELLED:
            return 'bg-gray-200 text-gray-700';
        case ItemStatus.AWAITING_HANDOVER:
             return 'bg-emerald-100 text-emerald-700';
        case ItemStatus.IN_PROGRESS:
             return 'bg-gray-200 text-gray-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

export const RequestStatusIndicator: React.FC<{ status: ItemStatus }> = ({ status }) => {
    const statusDetails = useMemo(() => {
        switch (status) {
            case ItemStatus.PENDING:
                return { Icon: BsClock, label: 'Menunggu', className: 'bg-warning-light text-warning-text' };
            case ItemStatus.LOGISTIC_APPROVED:
                return { Icon: BsPatchCheck, label: 'Logistik OK', className: 'bg-info-light text-info-text' };
            case ItemStatus.AWAITING_CEO_APPROVAL:
                return { Icon: BsClock, label: 'Menunggu CEO', className: 'bg-purple-100 text-purple-700' };
            case ItemStatus.APPROVED:
                return { Icon: BsClipboardCheck, label: 'Disetujui', className: 'bg-sky-100 text-sky-700' };
            case ItemStatus.PURCHASING:
                return { Icon: ShoppingCartIcon, label: 'Pengadaan', className: 'bg-blue-100 text-blue-700' };
            case ItemStatus.IN_DELIVERY:
                return { Icon: TruckIcon, label: 'Dikirim', className: 'bg-purple-100 text-purple-700' };
            case ItemStatus.ARRIVED:
                return { Icon: ArchiveBoxIcon, label: 'Telah Tiba', className: 'bg-teal-100 text-teal-700' };
            case ItemStatus.AWAITING_HANDOVER:
                return { Icon: RegisterIcon, label: 'Siap Serah Terima', className: 'bg-emerald-100 text-emerald-700' };
            case ItemStatus.COMPLETED:
                return { Icon: BsCheckCircleFill, label: 'Selesai', className: 'bg-success-light text-success-text' };
            case ItemStatus.REJECTED:
                return { Icon: BsXCircleFill, label: 'Ditolak', className: 'bg-danger-light text-danger-text' };
            case ItemStatus.CANCELLED:
                return { Icon: BsSlashCircle, label: 'Dibatalkan', className: 'bg-gray-200 text-gray-700' };
            case ItemStatus.IN_PROGRESS:
                 return { Icon: SpinnerIcon, label: 'Diproses', className: 'bg-gray-200 text-gray-800' };
            default:
                return { Icon: InfoIcon, label: status, className: 'bg-gray-100 text-gray-800' };
        }
    }, [status]);

    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${statusDetails.className}`}>
            <statusDetails.Icon className={`flex-shrink-0 w-3.5 h-3.5 ${status === ItemStatus.IN_PROGRESS ? 'animate-spin' : ''}`} />
            <span className="leading-none">{statusDetails.label}</span>
        </div>
    );
};

export const OrderIndicator: React.FC<{ order: OrderDetails }> = ({ order }) => {
    const details = useMemo(() => {
        switch (order.type) {
            case 'Urgent':
                return { 
                    label: 'Urgent',
                    className: 'text-danger-text font-bold',
                    dotClass: 'bg-danger',
                    tooltip: `Urgent: ${order.justification || 'Membutuhkan penanganan segera.'}`,
                };
            case 'Project Based':
                return { 
                    label: 'Project Based',
                    className: 'text-info-text font-medium',
                    dotClass: 'bg-info',
                    tooltip: `Project: ${order.project || 'Terkait proyek tertentu.'}`,
                };
            case 'Regular Stock':
            default:
                return { 
                    label: 'Regular Stock',
                    className: 'text-tm-secondary font-medium',
                    dotClass: 'bg-tm-secondary',
                    tooltip: 'Permintaan stok reguler',
                };
        }
    }, [order]);

    return (
        <div title={details.tooltip} className="inline-flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${details.dotClass}`}></span>
            <span className={`text-xs ${details.className}`}>{details.label}</span>
        </div>
    );
};