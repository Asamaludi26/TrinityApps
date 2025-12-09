import React from 'react';

interface SignatureStampProps {
    signerName: string;
    signatureDate: string;
    signerDivision?: string;
}

export const SignatureStamp: React.FC<SignatureStampProps> = ({ signerName, signatureDate, signerDivision }) => {
    return (
        <div className="relative flex flex-col items-center justify-center w-40 h-24 p-2 space-y-1 text-center border border-blue-400 rounded-md bg-blue-50 bg-opacity-50">
            <p className="font-sans font-bold text-base text-tm-dark tracking-wide leading-tight">{signerName}</p>
            {signerDivision && <p className="text-xs font-medium text-tm-secondary leading-tight">{signerDivision}</p>}
            <p className="pt-1 text-xs text-gray-500">{new Date(signatureDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
        </div>
    );
};
