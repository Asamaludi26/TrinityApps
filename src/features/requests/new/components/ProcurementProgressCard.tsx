
import React from 'react';
import { Request, Asset, ItemStatus, PurchaseDetails } from '../../../../types';
import { ShoppingCartIcon } from '../../../../components/icons/ShoppingCartIcon';
import { TruckIcon } from '../../../../components/icons/TruckIcon';
import { ArchiveBoxIcon } from '../../../../components/icons/ArchiveBoxIcon';
import { RegisterIcon } from '../../../../components/icons/RegisterIcon';
import { HandoverIcon } from '../../../../components/icons/HandoverIcon';
import { CheckIcon } from '../../../../components/icons/CheckIcon';

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

export const ProcurementProgressCard: React.FC<{ request: Request, assets: Asset[] }> = ({ request, assets }) => {
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
