import React from 'react';
import { TrinitiLogoIcon } from '../icons/TrinitiLogoIcon';
import { SpinnerIcon } from '../icons/SpinnerIcon';

interface FullPageLoaderProps {
    message?: string;
}

export const FullPageLoader: React.FC<FullPageLoaderProps> = ({ message = "Memuat Data..." }) => {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm transition-opacity duration-300">
            <div className="relative flex flex-col items-center">
                {/* Logo with pulse effect */}
                <div className="relative mb-6">
                    <div className="absolute inset-0 rounded-full bg-tm-primary/20 animate-ping"></div>
                    <div className="relative bg-white p-4 rounded-full shadow-lg border border-gray-100">
                        <TrinitiLogoIcon className="w-16 h-16 text-tm-primary" />
                    </div>
                </div>
                
                {/* Text and Spinner */}
                <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-3">
                        <SpinnerIcon className="w-6 h-6 text-tm-primary animate-spin" />
                        <span className="text-lg font-bold tracking-tight text-tm-dark">
                            Triniti<span className="font-light opacity-80">Asset</span>
                        </span>
                    </div>
                    <p className="text-sm font-medium text-gray-500 animate-pulse">
                        {message}
                    </p>
                </div>
            </div>
            
            {/* Minimalist Progress Bar at top */}
            <div className="fixed top-0 left-0 right-0 h-1 bg-gray-100 overflow-hidden">
                <div className="h-full bg-tm-primary animate-[loading-bar_2s_infinite_linear]"></div>
            </div>

            <style>{`
                @keyframes loading-bar {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
};