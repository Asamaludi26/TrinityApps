import React from 'react';
import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';

interface DetailPageLayoutProps {
    title: React.ReactNode;
    onBack: () => void;
    children: React.ReactNode;
    aside?: React.ReactNode;
    headerActions?: React.ReactNode;
    mainColClassName?: string;
    asideColClassName?: string;
}

export const DetailPageLayout: React.FC<DetailPageLayoutProps> = ({
    title,
    onBack,
    children,
    aside,
    headerActions,
    mainColClassName = 'lg:col-span-8',
    asideColClassName = 'lg:col-span-4',
}) => {
    return (
        <div className="flex flex-col h-full min-h-[calc(100vh-4rem)] bg-gray-50/50">
            {/* Header */}
            <header className="sticky top-16 z-10 flex items-center justify-between gap-4 px-4 py-3 bg-white border-b border-gray-200 sm:px-6 md:px-8 no-print">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={onBack}
                        className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-gray-500 rounded-full hover:bg-gray-100 hover:text-gray-800"
                        aria-label="Kembali"
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold text-gray-800 truncate">{title}</h1>
                    </div>
                </div>
                {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
            </header>

            {/* Main Content */}
            <div className="flex-1 w-full max-w-screen-xl px-4 py-6 mx-auto sm:px-6 md:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-8">
                    {/* Main column */}
                    <div className={`${aside ? mainColClassName : 'lg:col-span-12'} transition-all duration-300 ease-in-out`}>
                        {children}
                    </div>

                    {/* Aside/Sidebar column */}
                    {aside && (
                        <aside className={`${asideColClassName} transition-all duration-300 ease-in-out no-print`}>
                            <div className="sticky top-28">
                               {aside}
                            </div>
                        </aside>
                    )}
                </div>
            </div>
        </div>
    );
};