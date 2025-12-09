import React from 'react';
import { Tooltip } from '../../../components/ui/Tooltip';

interface DashboardCardProps {
    title: string;
    value: string | number;
    secondaryMetric: string;
    icon: React.FC<{ className?: string }>;
    color: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'indigo' | 'teal' | 'rose';
    onClick: () => void;
    tooltipText?: string;
    className?: string;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, secondaryMetric, icon: Icon, color, onClick, tooltipText, className = '' }) => {
    const colorStyles = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', ring: 'group-hover:ring-blue-100' },
        green: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', ring: 'group-hover:ring-emerald-100' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', ring: 'group-hover:ring-amber-100' },
        red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', ring: 'group-hover:ring-red-100' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', ring: 'group-hover:ring-purple-100' },
        indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', ring: 'group-hover:ring-indigo-100' },
        teal: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', ring: 'group-hover:ring-teal-100' },
        rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', ring: 'group-hover:ring-rose-100' },
    };

    const style = colorStyles[color] || colorStyles.blue;

    const cardContent = (
        <div 
            onClick={onClick}
            className={`group relative flex flex-col justify-between h-full p-5 bg-white border border-gray-200 rounded-xl shadow-sm transition-all duration-300 cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-transparent ring-0 hover:ring-2 ${style.ring} ${className}`}
        >
            <div className="flex justify-between items-start mb-4 gap-4">
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-500 tracking-wide uppercase truncate">{title}</h3>
                    <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900 truncate block" title={typeof value === 'string' ? value : undefined}>
                            {value}
                        </span>
                    </div>
                </div>
                <div className={`flex items-center justify-center w-12 h-12 rounded-xl flex-shrink-0 ${style.bg} ${style.text} transition-transform group-hover:scale-110`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
            
            <div className="mt-auto pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5 truncate">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.bg.replace('bg-', 'bg-').replace('50', '500')}`}></span>
                    <span className="truncate">{secondaryMetric}</span>
                </p>
            </div>
        </div>
    );

    if (tooltipText) {
        return <Tooltip text={tooltipText}>{cardContent}</Tooltip>;
    }

    return cardContent;
};