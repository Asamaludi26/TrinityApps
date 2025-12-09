import React from 'react';
import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { CustomSelect } from './CustomSelect';

interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (newPage: number) => void;
    onItemsPerPageChange: (newSize: number) => void;
    startIndex: number;
    endIndex: number;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange,
    startIndex,
    endIndex
}) => {
    // Correctly calculate the start and end item numbers for display.
    const startItem = totalItems > 0 ? startIndex + 1 : 0;
    const endItem = Math.min(endIndex, totalItems);

    const itemsPerPageOptions = [
        { value: '10', label: '10' },
        { value: '50', label: '50' },
        { value: '100', label: '100' },
    ];
    
    return (
        <div className="flex flex-col items-center justify-between gap-4 p-4 border-t border-gray-200 sm:flex-row">
            <div className="flex items-center space-x-2 text-sm text-gray-700">
                <span>Tampilkan</span>
                <div className="w-20">
                    <CustomSelect
                        options={itemsPerPageOptions}
                        value={itemsPerPage.toString()}
                        onChange={(value) => onItemsPerPageChange(Number(value))}
                        direction="up"
                    />
                </div>
                 <span>per halaman</span>
            </div>

            <span className="text-sm text-gray-700">
                Menampilkan <span className="font-semibold text-gray-900">{startItem}</span>-<span className="font-semibold text-gray-900">{endItem}</span> dari <span className="font-semibold text-gray-900">{totalItems}</span> hasil
            </span>

            <div className="flex items-center space-x-2">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="inline-flex items-center justify-center w-8 h-8 text-gray-600 transition-colors bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Halaman sebelumnya"
                >
                    <ChevronLeftIcon className="w-5 h-5"/>
                </button>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="inline-flex items-center justify-center w-8 h-8 text-gray-600 transition-colors bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Halaman selanjutnya"
                >
                    <ChevronRightIcon className="w-5 h-5"/>
                </button>
            </div>
        </div>
    );
};
