import React from 'react';

interface RejectionStampProps {
    rejectorName: string;
    rejectionDate: string;
    rejectorDivision?: string;
}

export const RejectionStamp: React.FC<RejectionStampProps> = ({ rejectorName, rejectionDate, rejectorDivision }) => {
    return (
        <div className="relative flex flex-col items-center justify-center w-36 h-24 p-1 text-red-600 border-2 border-red-500 rounded-md transform -rotate-12 bg-red-50 bg-opacity-50">
            <p className="text-lg font-black tracking-wider uppercase opacity-80">REJECTED</p>
            <p className="text-xs font-semibold whitespace-nowrap">{rejectorName}</p>
            {rejectorDivision && <p className="text-[10px] italic text-red-700">{rejectorDivision}</p>}
            <p className="text-[10px] mt-0.5">{new Date(rejectionDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
        </div>
    );
};
