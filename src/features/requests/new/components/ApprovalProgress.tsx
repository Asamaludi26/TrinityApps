
import React from 'react';
import { Request, ItemStatus } from '../../../../types';
import { ApprovalStamp } from '../../../../components/ui/ApprovalStamp';
import { RejectionStamp } from '../../../../components/ui/RejectionStamp';
import { SignatureStamp } from '../../../../components/ui/SignatureStamp';

export const ApprovalProgress: React.FC<{ request: Request }> = ({ request }) => {
    if (request.status === ItemStatus.REJECTED && request.rejectedBy) {
        return (
            <div className="flex flex-col items-center justify-center py-4 bg-red-50/50 rounded-xl border border-red-100 mt-4">
                <RejectionStamp
                    rejectorName={request.rejectedBy}
                    rejectionDate={request.rejectionDate || new Date().toISOString()}
                    rejectorDivision={request.rejectedByDivision || 'N/A'}
                />
            </div>
        );
    }

    if (request.status === ItemStatus.COMPLETED && request.completedBy) {
        return (
            <div className="flex flex-col items-center justify-center py-4 bg-blue-50/30 rounded-xl border border-blue-100 mt-4">
                <div className="relative flex flex-col items-center justify-center w-36 h-24 p-1 text-blue-600 border-2 border-blue-500 rounded-md transform -rotate-12 bg-blue-50/80 shadow-sm">
                    <p className="text-lg font-black tracking-widest uppercase opacity-80">SELESAI</p>
                    <p className="text-xs font-bold whitespace-nowrap">{request.completedBy}</p>
                    <p className="text-[10px] mt-0.5 font-mono">
                        {request.completionDate ? new Date(request.completionDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                    </p>
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
                            approvalDate={request.logisticApprovalDate || new Date().toISOString()} 
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
                            approvalDate={request.finalApprovalDate || new Date().toISOString()} 
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
