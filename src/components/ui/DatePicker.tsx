import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { CalendarIcon } from '../icons/CalendarIcon';
import { ChevronsRightIcon } from '../../components/icons/ChevronsRightIcon';
import { ChevronsLeftIcon } from '../../components/icons/ChevronsLeftIcon';

type CalendarView = 'days' | 'months' | 'years';

interface DatePickerProps {
    id: string;
    selectedDate: Date | null;
    onDateChange: (date: Date | null) => void;
    disablePastDates?: boolean;
    disableFutureDates?: boolean;
    disabled?: boolean;
}

const DatePicker: React.FC<DatePickerProps> = ({ 
    id, 
    selectedDate, 
    onDateChange, 
    disablePastDates = false, 
    disableFutureDates = false, 
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonthDate, setCurrentMonthDate] = useState(selectedDate || new Date());
    const [view, setView] = useState<CalendarView>('days');
    const [yearRange, setYearRange] = useState([0, 0]);
    
    const calendarRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

    const calculatePosition = useCallback(() => {
        if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
                width: rect.width,
            });
        }
    }, []);

    const toggleCalendar = () => {
        if (disabled) return;
        if (!isOpen) {
            calculatePosition();
            setCurrentMonthDate(selectedDate || new Date());
            setView('days');
        }
        setIsOpen(prev => !prev);
    };
    
    const closeCalendar = useCallback(() => {
        setIsOpen(false);
    }, []);

    useEffect(() => {
        if (isOpen) {
            const handleScrollAndResize = () => calculatePosition();
            const handleClickOutside = (event: MouseEvent) => {
                if (calendarRef.current && !calendarRef.current.contains(event.target as Node) && inputRef.current && !inputRef.current.contains(event.target as Node)) {
                    closeCalendar();
                }
            };

            document.addEventListener("mousedown", handleClickOutside);
            window.addEventListener('scroll', handleScrollAndResize, true);
            window.addEventListener('resize', handleScrollAndResize);
            
            return () => {
                document.removeEventListener("mousedown", handleClickOutside);
                window.removeEventListener('scroll', handleScrollAndResize, true);
                window.removeEventListener('resize', handleScrollAndResize);
            };
        }
    }, [isOpen, closeCalendar, calculatePosition]);

    const handleDayClick = (day: number) => {
        onDateChange(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), day));
        closeCalendar();
    };

    const handleMonthClick = (monthIndex: number) => {
        setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), monthIndex, 1));
        setView('days');
    };

    const handleYearClick = (year: number) => {
        setCurrentMonthDate(new Date(year, currentMonthDate.getMonth(), 1));
        setView('months');
    };

    const handleHeaderClick = () => {
        if (view === 'days') setView('months');
        if (view === 'months') {
            const year = currentMonthDate.getFullYear();
            setYearRange([year - 5, year + 6]);
            setView('years');
        }
    };

    const changeMonth = (offset: number) => setCurrentMonthDate(p => new Date(p.getFullYear(), p.getMonth() + offset, 1));
    const changeYearRange = (offset: number) => setYearRange(p => [p[0] + offset, p[1] + offset]);

    const renderDaysView = () => {
        const year = currentMonthDate.getFullYear();
        const month = currentMonthDate.getMonth();
        const numDays = new Date(year, month + 1, 0).getDate();
        const startDay = new Date(year, month, 1).getDay();
        const blanks = Array(startDay).fill(null);
        const days = Array.from({ length: numDays }, (_, i) => i + 1);
        const dayHeaders = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
        const today = new Date(); today.setHours(0, 0, 0, 0);

        return (
            <>
                <div className="grid grid-cols-7 text-xs font-medium text-center text-gray-500 mb-2">
                    {dayHeaders.map(day => <div key={day} className="py-1">{day}</div>)}
                </div>
                <div className="grid grid-cols-7 text-sm text-center">
                    {blanks.map((_, i) => <div key={`blank-${i}`}></div>)}
                    {days.map(day => {
                        const currentDate = new Date(year, month, day); currentDate.setHours(0,0,0,0);
                        const isSelected = selectedDate?.toDateString() === currentDate.toDateString();
                        const isToday = today.toDateString() === currentDate.toDateString();
                        let isDisabled = false;
                        if (disablePastDates && currentDate < today) isDisabled = true;
                        if (disableFutureDates && currentDate > today) isDisabled = true;
                        
                        const baseClasses = "w-9 h-9 rounded-full transition-colors duration-150 flex items-center justify-center font-medium";
                        let specificClasses = isSelected ? "bg-tm-primary text-white hover:bg-tm-primary-hover"
                            : isToday ? "bg-gray-100 text-tm-primary hover:bg-gray-200"
                            : isDisabled ? "text-gray-300 cursor-not-allowed"
                            : "text-gray-700 hover:bg-gray-100";
                        
                        return (
                            <div key={day} className="py-1 flex justify-center">
                                <button type="button" onClick={() => !isDisabled && handleDayClick(day)} disabled={isDisabled} className={`${baseClasses} ${specificClasses}`}>
                                    {day}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </>
        );
    };

    const renderMonthsView = () => {
        const months = Array.from({ length: 12 }, (_, i) => new Date(0, i).toLocaleString('id-ID', { month: 'short' }));
        return (
            <div className="grid grid-cols-3 gap-2 p-2">
                {months.map((month, i) => (
                    <button key={month} onClick={() => handleMonthClick(i)} className="p-3 text-center rounded-lg hover:bg-gray-100 font-semibold text-gray-700">
                        {month}
                    </button>
                ))}
            </div>
        );
    };

    const renderYearsView = () => {
        const years = Array.from({ length: 12 }, (_, i) => yearRange[0] + i);
        return (
            <div className="grid grid-cols-3 gap-2 p-2">
                {years.map(year => (
                    <button key={year} onClick={() => handleYearClick(year)} className="p-3 text-center rounded-lg hover:bg-gray-100 font-semibold text-gray-700">
                        {year}
                    </button>
                ))}
            </div>
        );
    };

    const formattedDate = selectedDate ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(selectedDate) : '';

    let headerText = '';
    if (view === 'days') headerText = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(currentMonthDate);
    if (view === 'months') headerText = currentMonthDate.getFullYear().toString();
    if (view === 'years') headerText = `${yearRange[0]} - ${yearRange[1] -1}`;

    const CalendarDropdown = (
        <div 
            ref={calendarRef} 
            style={{ top: `${position.top}px`, left: `${position.left}px`, minWidth: `${position.width}px` }} 
            className={`absolute z-[100] transition-opacity duration-200 ease-in-out`}
        >
             <div className="mt-1 p-4 bg-white border border-gray-200 rounded-xl shadow-lg animate-zoom-in">
                <div className="flex items-center justify-between mb-4">
                    <button type="button" onClick={() => view === 'days' ? changeMonth(-1) : changeYearRange(-12)} className="p-2 text-gray-500 rounded-full hover:bg-gray-100 transition-colors">
                        <ChevronsLeftIcon />
                    </button>
                    <button type="button" onClick={handleHeaderClick} className="font-semibold text-base text-gray-800 hover:text-tm-primary transition-colors px-2 py-1 rounded-md">
                        {headerText}
                    </button>
                    <button type="button" onClick={() => view === 'days' ? changeMonth(1) : changeYearRange(12)} className="p-2 text-gray-500 rounded-full hover:bg-gray-100 transition-colors">
                        <ChevronsRightIcon />
                    </button>
                </div>
                
                {view === 'days' && renderDaysView()}
                {view === 'months' && renderMonthsView()}
                {view === 'years' && renderYearsView()}

                <div className="pt-2 mt-2 border-t border-gray-200 flex justify-between">
                    <button onClick={() => { onDateChange(new Date()); closeCalendar(); }} className="px-3 py-1.5 text-sm font-semibold text-tm-primary rounded-md hover:bg-blue-50">
                        Hari Ini
                    </button>
                    <button onClick={() => { onDateChange(null); closeCalendar(); }} className="px-3 py-1.5 text-sm font-semibold text-gray-600 rounded-md hover:bg-gray-100">
                        Hapus
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="relative">
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    id={id}
                    readOnly
                    value={formattedDate}
                    onClick={toggleCalendar}
                    placeholder="Pilih tanggal"
                    disabled={disabled}
                    className="block w-full pl-3 pr-10 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-tm-accent focus:border-tm-accent sm:text-sm disabled:bg-gray-200/60 disabled:text-gray-500 disabled:cursor-not-allowed"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <CalendarIcon className="w-5 h-5 text-gray-400" />
                </div>
            </div>

            {isOpen && ReactDOM.createPortal(CalendarDropdown, document.body)}
        </div>
    );
};

export default DatePicker;