import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { InboxIcon } from '../icons/InboxIcon';
import { PlusIcon } from '../icons/PlusIcon';

interface CreatableSelectProps {
    options: string[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export const CreatableSelect: React.FC<CreatableSelectProps> = ({ 
    options, 
    value, 
    onChange, 
    placeholder = 'Pilih atau buat baru...', 
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value);
    const [isDirty, setIsDirty] = useState(false); // Tracks if user has typed since open
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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
            setIsDirty(false); // Reset dirty state every time dropdown opens
        } else {
            setInputValue(value); // On close, reset input text to the actual selected value
        }
    }, [isOpen, value]);

    // This effect ensures that if the parent component's value changes externally,
    // the input text reflects that change.
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    const filteredOptions = useMemo(() => {
        // If the dropdown is not open, no need to compute options.
        if (!isOpen) return [];
        // When first opened (`isDirty` is false), show all options.
        if (!isDirty) return options;
        // Once the user types (`isDirty` is true), filter the options.
        return options.filter(opt => opt.toLowerCase().includes(inputValue.toLowerCase()));
    }, [options, inputValue, isOpen, isDirty]);

    const showCreateOption = isDirty && inputValue && !options.some(opt => opt.toLowerCase() === inputValue.toLowerCase());

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (showCreateOption) {
                handleSelect(inputValue);
            } else if (filteredOptions.length > 0) {
                // Select the first visible option on Enter
                handleSelect(filteredOptions[0]);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        if (!isDirty) setIsDirty(true);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onClick={() => setIsOpen(!isOpen)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`w-full px-3 py-2 text-left bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-tm-accent sm:text-sm ${disabled ? 'bg-gray-200/60 text-gray-500 cursor-not-allowed' : 'text-gray-900'}`}
                    autoComplete="off"
                />
                 <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                     <ChevronDownIcon className={`w-5 h-5 text-gray-400 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
                </div>
            </div>

            <div
                className={`absolute z-20 w-full mt-1 overflow-auto bg-white border border-gray-200 rounded-md shadow-lg max-h-60 custom-scrollbar transition-all duration-150 ease-in-out origin-top
                    ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`
                }
                role="listbox"
            >
                <ul>
                    {showCreateOption && (
                         <li
                            onClick={() => handleSelect(inputValue)}
                            className="flex items-center gap-2 px-3 py-2.5 text-sm cursor-pointer transition-colors duration-150 text-tm-primary bg-blue-50 hover:bg-blue-100"
                        >
                            <PlusIcon className="w-4 h-4" />
                            Buat "<strong className="truncate">{inputValue}</strong>"
                        </li>
                    )}
                    {filteredOptions.map((option) => (
                        <li
                            key={option}
                            onClick={() => handleSelect(option)}
                            className={`flex items-center justify-between px-3 py-2.5 text-sm cursor-pointer transition-colors duration-150
                                ${value === option 
                                    ? 'bg-tm-primary/10 text-tm-primary font-semibold' 
                                    : 'text-gray-900 hover:bg-tm-light'}`
                            }
                            role="option"
                            aria-selected={value === option}
                        >
                            <span className="truncate">{option}</span>
                            {value === option && <CheckIcon className="w-4 h-4" />}
                        </li>
                    ))}
                    {!showCreateOption && filteredOptions.length === 0 && (
                        <div className="p-4 text-center text-sm text-gray-500">
                            <InboxIcon className="w-8 h-8 mx-auto text-gray-400" />
                            <p className="mt-2">Tidak ada pilihan yang cocok.</p>
                        </div>
                    )}
                </ul>
            </div>
        </div>
    );
};
