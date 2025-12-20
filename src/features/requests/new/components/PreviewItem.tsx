
import React from 'react';

interface PreviewItemProps {
    label: string;
    value?: React.ReactNode;
    children?: React.ReactNode;
    fullWidth?: boolean;
}

export const PreviewItem: React.FC<PreviewItemProps> = ({ label, value, children, fullWidth = false }) => (
    <div className={`flex flex-col ${fullWidth ? 'sm:col-span-full' : ''}`}>
        <dt className="text-[10px] font-bold text-slate-800 uppercase tracking-widest mb-1.5">{label}</dt>
        <dd className="text-sm font-normal text-slate-600 break-words leading-relaxed">{value || children || '-'}</dd>
    </div>
);
