
import React from 'react';

interface SummaryCardProps {
    title: string;
    value: string | number;
    icon: React.FC<{ className?: string }>;
    onClick?: () => void;
    isActive?: boolean;
    tooltipText?: string;
    color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'gray' | 'indigo' | 'teal';
    className?: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ 
    title, 
    value, 
    icon: Icon, 
    onClick, 
    isActive = false, 
    tooltipText, 
    color = 'blue',
    className = ''
}) => {
    const colorStyles = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', activeRing: 'ring-blue-200' },
        green: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', activeRing: 'ring-emerald-200' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', activeRing: 'ring-amber-200' },
        red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', activeRing: 'ring-red-200' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', activeRing: 'ring-purple-200' },
        gray: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', activeRing: 'ring-gray-200' },
        indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', activeRing: 'ring-indigo-200' },
        teal: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', activeRing: 'ring-teal-200' },
    };

    const style = colorStyles[color] || colorStyles.blue;

    return (
        <div 
            onClick={onClick} 
            className={`p-5 bg-white border rounded-xl shadow-sm transition-all duration-300
                ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-1' : ''}
                ${isActive ? `border-tm-primary ring-2 ${style.activeRing}` : 'border-gray-200/80'}
                ${className}
            `}
            title={tooltipText}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-bold tracking-wider text-gray-500 uppercase">{title}</h3>
                    <p className="mt-2 text-2xl font-bold text-tm-dark truncate">
                        {value}
                    </p>
                </div>
                <div className={`flex items-center justify-center flex-shrink-0 w-12 h-12 rounded-xl ${style.bg} ${style.text}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </div>
    );
};
