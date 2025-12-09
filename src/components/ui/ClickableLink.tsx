import React from 'react';

interface ClickableLinkProps {
    children: React.ReactNode;
    onClick?: () => void;
    title?: string;
    className?: string;
}

export const ClickableLink: React.FC<ClickableLinkProps> = ({ children, onClick, title, className }) => (
    <span 
        onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick();
        }} 
        title={title} 
        className={`font-medium hover:underline cursor-pointer transition-colors duration-150 align-middle ${className || ''}`}
    >
        {children}
    </span>
);