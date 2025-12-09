
import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    height?: string | number;
    width?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
    className = "", 
    variant = "text", 
    height, 
    width 
}) => {
    const baseClasses = "animate-pulse bg-gray-200/80";
    
    const variantClasses = {
        text: "rounded",
        circular: "rounded-full",
        rectangular: "rounded-md",
    };

    const style: React.CSSProperties = {};
    if (width) style.width = width;
    if (height) style.height = height;

    return (
        <div 
            className={`${baseClasses} ${variantClasses[variant]} ${className}`} 
            style={style}
        />
    );
};
