import React from 'react';

interface ApprovalStampProps {
    approverName: string;
    approvalDate: string;
    approverDivision?: string;
}

export const ApprovalStamp: React.FC<ApprovalStampProps> = ({ approverName, approvalDate, approverDivision }) => {
    return (
        <div className="relative flex flex-col items-center justify-center w-36 h-24 p-1 text-green-600 border-2 border-green-500 rounded-md transform -rotate-12 bg-green-50 bg-opacity-50">
            <p className="text-lg font-black tracking-wider uppercase opacity-80">APPROVED</p>
            <p className="text-xs font-semibold whitespace-nowrap">{approverName}</p>
            {approverDivision && <p className="text-[10px] italic text-green-700">{approverDivision}</p>}
            <p className="text-[10px] mt-0.5">{new Date(approvalDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
        </div>
    );
};
