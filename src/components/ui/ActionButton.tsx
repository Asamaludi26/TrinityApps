
import React from 'react';
import { SpinnerIcon } from '../icons/SpinnerIcon';

interface ActionButtonProps {
    onClick?: () => void;
    text: string;
    icon?: React.FC<{ className?: string }>;
    color: 'primary' | 'success' | 'danger' | 'info' | 'secondary' | 'special';
    disabled?: boolean;
    title?: string;
    className?: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({ onClick, text, icon: Icon, color, disabled, title, className = '' }) => {
    const colors = {
        primary: "bg-tm-primary hover:bg-tm-primary-hover text-white",
        success: "bg-success hover:bg-green-700 text-white",
        danger: "bg-danger hover:bg-red-700 text-white",
        info: "bg-info hover:bg-blue-700 text-white",
        secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800", // Adjusted for better visibility
        special: "bg-purple-600 hover:bg-purple-700 text-white",
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed ${colors[color]} ${className}`}
        >
            {disabled && <SpinnerIcon className="w-4 h-4" />}
            {Icon && <Icon className="w-4 h-4" />}
            {text}
        </button>
    );
};
