
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { SearchIcon } from '../../../../components/icons/SearchIcon';
import { FilterIcon } from '../../../../components/icons/FilterIcon';
import { CloseIcon } from '../../../../components/icons/CloseIcon';
import { CustomSelect } from '../../../../components/ui/CustomSelect';
import { ItemStatus, Division } from '../../../../types';
import DatePicker from '../../../../components/ui/DatePicker'; // Import DatePicker
import { CalendarIcon } from '../../../../components/icons/CalendarIcon';

interface FilterState {
    status: string;
    orderType: string;
    division: string;
    startDate: Date | null;
    endDate: Date | null;
}

interface RequestFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: FilterState;
  onFiltersApply: (filters: FilterState) => void;
  onFiltersReset: () => void;
  divisions: Division[];
  isAdmin: boolean;
}

export const RequestFilterBar: React.FC<RequestFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersApply,
  onFiltersReset,
  divisions,
  isAdmin
}) => {
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState<FilterState>(filters);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  // Sync tempFilters when panel opens or filters change externally
  useEffect(() => {
    if (isFilterPanelOpen) {
        setTempFilters(filters);
    }
  }, [isFilterPanelOpen, filters]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
        setIsFilterPanelOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status) count++;
    if (filters.orderType) count++;
    if (filters.division) count++;
    if (filters.startDate || filters.endDate) count++; // Date range counts as 1 filter group
    return count;
  }, [filters]);

  const handleApply = () => {
    onFiltersApply(tempFilters);
    setIsFilterPanelOpen(false);
  };

  const handleReset = () => {
    const reset: FilterState = { status: '', orderType: '', division: '', startDate: null, endDate: null };
    setTempFilters(reset);
    onFiltersReset();
    setIsFilterPanelOpen(false);
  };

  const handleRemoveOne = (key: keyof FilterState) => {
    const updated = { ...filters, [key]: key === 'startDate' || key === 'endDate' ? null : '' };
    // If removing one date, logic might need adjustment, but here we just update state
    onFiltersApply(updated);
  };

  const removeDateRange = () => {
      onFiltersApply({ ...filters, startDate: null, endDate: null });
  }

  return (
    <div className="p-4 mb-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Search Input */}
        <div className="relative flex-grow">
          <SearchIcon className="absolute w-5 h-5 text-slate-400 transform -translate-y-1/2 top-1/2 left-3" />
          <input 
            type="text" 
            placeholder="Cari ID Request, Nama Pemohon, atau Item..." 
            value={searchQuery} 
            onChange={e => onSearchChange(e.target.value)} 
            className="w-full h-10 py-2 pl-10 pr-4 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-tm-primary/20 focus:border-tm-primary transition-all outline-none placeholder:text-slate-400" 
          />
        </div>
        
        {/* Filter Button & Panel */}
        <div className="relative" ref={filterPanelRef}>
          <button
            onClick={() => setIsFilterPanelOpen(p => !p)}
            className={`inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-bold transition-all duration-200 border rounded-lg shadow-sm sm:w-auto 
              ${activeFilterCount > 0 
                  ? 'bg-slate-800 border-slate-800 text-white hover:bg-slate-900' 
                  : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-800'}
            `}
          >
            <FilterIcon className="w-4 h-4" /> 
            <span>Filter</span> 
            {activeFilterCount > 0 && (
              <span className="flex items-center justify-center w-5 h-5 text-[10px] bg-white text-slate-900 rounded-full ml-1">
                {activeFilterCount}
              </span>
            )}
          </button>

          {isFilterPanelOpen && (
            <>
              <div onClick={() => setIsFilterPanelOpen(false)} className="fixed inset-0 z-20 bg-slate-900/20 backdrop-blur-sm sm:hidden" />
              <div className="fixed top-20 left-4 right-4 z-30 flex flex-col bg-white border border-slate-200 rounded-xl shadow-2xl sm:absolute sm:top-full sm:left-auto sm:right-0 sm:mt-2 sm:w-80 animate-zoom-in">
                
                {/* Panel Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Filter Data</h3>
                  <button onClick={() => setIsFilterPanelOpen(false)} className="p-1 text-slate-400 rounded-full hover:bg-slate-100 hover:text-slate-600 transition-colors"><CloseIcon className="w-5 h-5"/></button>
                </div>

                {/* Panel Content */}
                <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  {/* Status Filter */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Status Dokumen</label>
                    <CustomSelect 
                      options={[{ value: '', label: 'Semua Status' }, ...Object.values(ItemStatus).map(s => ({ value: s, label: s }))]} 
                      value={tempFilters.status} 
                      onChange={v => setTempFilters(f => ({ ...f, status: v }))} 
                    />
                  </div>

                  {/* Order Type Filter */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tipe Order</label>
                    <CustomSelect 
                      options={[{ value: '', label: 'Semua Tipe' }, { value: 'Regular Stock', label: 'Regular Stock' }, { value: 'Urgent', label: 'Urgent' }, { value: 'Project Based', label: 'Project Based' }]} 
                      value={tempFilters.orderType} 
                      onChange={v => setTempFilters(f => ({ ...f, orderType: v }))} 
                    />
                  </div>

                  {/* Division Filter (Admin Only) */}
                  {isAdmin && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Divisi Pemohon</label>
                      <CustomSelect 
                        options={[{ value: '', label: 'Semua Divisi' }, ...divisions.map(d => ({ value: d.name, label: d.name }))]} 
                        value={tempFilters.division} 
                        onChange={v => setTempFilters(f => ({ ...f, division: v }))} 
                      />
                    </div>
                  )}

                  {/* Date Range Filter */}
                  <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Periode Pengajuan</label>
                      <div className="grid grid-cols-2 gap-3">
                          <div>
                              <DatePicker 
                                  id="filter-start-date" 
                                  selectedDate={tempFilters.startDate} 
                                  onDateChange={(date) => setTempFilters(f => ({ ...f, startDate: date }))} 
                              />
                          </div>
                          <div>
                              <DatePicker 
                                  id="filter-end-date" 
                                  selectedDate={tempFilters.endDate} 
                                  onDateChange={(date) => setTempFilters(f => ({ ...f, endDate: date }))} 
                              />
                          </div>
                      </div>
                  </div>
                </div>

                {/* Panel Footer */}
                <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-t border-slate-100 rounded-b-xl">
                  <button onClick={handleReset} className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors">Reset Filter</button>
                  <button onClick={handleApply} className="px-6 py-2 text-xs font-bold text-white bg-tm-primary rounded-lg shadow-md hover:bg-tm-primary-hover transition-all transform active:scale-95">Terapkan</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 animate-fade-in-down">
          {filters.status && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-full shadow-sm">
              Status: <span className="font-extrabold">{filters.status}</span>
              <button onClick={() => handleRemoveOne('status')} className="p-0.5 ml-1 rounded-full hover:bg-blue-200 text-blue-500 transition-colors"><CloseIcon className="w-3 h-3" /></button>
            </span>
          )}
          {filters.orderType && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-100 rounded-full shadow-sm">
              Tipe: <span className="font-extrabold">{filters.orderType}</span>
              <button onClick={() => handleRemoveOne('orderType')} className="p-0.5 ml-1 rounded-full hover:bg-purple-200 text-purple-500 transition-colors"><CloseIcon className="w-3 h-3" /></button>
            </span>
          )}
          {filters.division && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-orange-700 bg-orange-50 border border-orange-100 rounded-full shadow-sm">
              Divisi: <span className="font-extrabold">{filters.division}</span>
              <button onClick={() => handleRemoveOne('division')} className="p-0.5 ml-1 rounded-full hover:bg-orange-200 text-orange-500 transition-colors"><CloseIcon className="w-3 h-3" /></button>
            </span>
          )}
          {(filters.startDate || filters.endDate) && (
             <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full shadow-sm">
              <CalendarIcon className="w-3 h-3" />
              <span>
                  {filters.startDate ? new Date(filters.startDate).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'}) : 'Awal'} 
                  {' - '} 
                  {filters.endDate ? new Date(filters.endDate).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'}) : 'Sekarang'}
              </span>
              <button onClick={removeDateRange} className="p-0.5 ml-1 rounded-full hover:bg-emerald-200 text-emerald-500 transition-colors"><CloseIcon className="w-3 h-3" /></button>
            </span>
          )}
          <button onClick={handleReset} className="px-3 py-1 text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">Hapus Semua</button>
        </div>
      )}
    </div>
  );
};
