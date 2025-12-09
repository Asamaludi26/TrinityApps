import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { InboxIcon } from '../icons/InboxIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { SearchIcon } from '../icons/SearchIcon';

interface Option {
    value: string;
    label: string;
    indicator?: React.ReactNode;
}

interface CustomSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    emptyStateMessage?: string;
    emptyStateButtonLabel?: string;
    onEmptyStateClick?: () => void;
    direction?: 'up' | 'down';
    isSearchable?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ 
    options, 
    value, 
    onChange, 
    placeholder = 'Pilih...', 
    disabled = false,
    emptyStateMessage = 'Tidak ada pilihan tersedia.',
    emptyStateButtonLabel,
    onEmptyStateClick,
    direction = 'down',
    isSearchable = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) {
            // Reset search query when dropdown opens
            setSearchQuery('');
            if (isSearchable && searchInputRef.current) {
                // Focus the search input shortly after opening
                setTimeout(() => searchInputRef.current?.focus(), 100);
            }
        }
    }, [isOpen, isSearchable]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };
    
    const directionClasses = direction === 'down' 
        ? 'mt-1 origin-top' 
        : 'mb-1 bottom-full origin-bottom';
    
    const filteredOptions = useMemo(() => {
        if (!isSearchable || !searchQuery) {
            return options;
        }
        return options.filter(option => 
            option.label.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [options, isSearchable, searchQuery]);

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`flex items-center justify-between w-full px-3 py-2 text-left bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-tm-accent sm:text-sm ${disabled ? 'bg-gray-200/60 text-gray-500 cursor-not-allowed' : 'text-gray-900 cursor-pointer'}`}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-2 truncate">
                    {selectedOption?.indicator}
                    <span 
                        className={`truncate ${selectedOption ? 'font-medium text-gray-900' : 'text-gray-500'}`}
                        title={selectedOption ? selectedOption.label : placeholder}
                    >
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>
                <ChevronDownIcon className={`w-5 h-5 text-gray-400 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
            </button>

            <div
                className={`absolute z-20 w-full overflow-hidden bg-white border border-gray-200 rounded-md shadow-lg flex flex-col
                    ${directionClasses}
                    ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`
                }
                style={{ transition: 'opacity 150ms ease-in-out, transform 150ms ease-in-out' }}
                role="listbox"
            >
                {isSearchable && (
                    <div className="p-2 border-b border-gray-200">
                        <div className="relative">
                            <SearchIcon className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 top-1/2 left-3" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Cari..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onClick={e => e.stopPropagation()}
                                className="w-full h-9 py-2 pl-9 pr-4 text-sm bg-gray-100 text-gray-600 border border-gray-300 rounded-md focus:ring-tm-accent focus:border-tm-accent"
                            />
                        </div>
                    </div>
                )}
                <div className="overflow-y-auto max-h-56 custom-scrollbar">
                    {filteredOptions.length > 0 ? (
                        <ul>
                            {filteredOptions.map((option) => (
                                <li
                                    key={option.value}
                                    onClick={() => handleSelect(option.value)}
                                    className={`flex items-center justify-between px-3 py-2.5 text-sm cursor-pointer transition-colors duration-150
                                        ${value === option.value 
                                            ? 'bg-tm-primary/10 text-tm-primary font-semibold' 
                                            : 'text-gray-900 hover:bg-tm-light'}`
                                    }
                                    role="option"
                                    aria-selected={value === option.value}
                                    title={option.label}
                                >
                                    <div className="flex items-center gap-2">
                                        {option.indicator}
                                        <span className="truncate">{option.label}</span>
                                    </div>
                                    {value === option.value && <CheckIcon className="w-4 h-4" />}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="p-4 text-center text-sm text-gray-500">
                            <InboxIcon className="w-8 h-8 mx-auto text-gray-400" />
                            <p className="mt-2">{searchQuery ? `Tidak ada hasil untuk "${searchQuery}".` : emptyStateMessage}</p>
                            {onEmptyStateClick && emptyStateButtonLabel && !searchQuery && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsOpen(false);
                                        onEmptyStateClick();
                                    }}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 mt-3 text-xs font-semibold text-white transition-colors rounded-md shadow-sm bg-tm-accent hover:bg-tm-primary"
                                >
                                    <PlusIcon className="w-3.5 h-3.5" />
                                    {emptyStateButtonLabel}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};