
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { LoanRequest, AssetReturn, User, LoanRequestStatus, Page } from '../../../../types';
import { useSortableData } from '../../../../hooks/useSortableData';
import { SearchIcon } from '../../../../components/icons/SearchIcon';
import { FilterIcon } from '../../../../components/icons/FilterIcon';
import { CloseIcon } from '../../../../components/icons/CloseIcon';
import { ExportIcon } from '../../../../components/icons/ExportIcon';
import { CustomSelect } from '../../../../components/ui/CustomSelect';
import { PaginationControls } from '../../../../components/ui/PaginationControls';
import DatePicker from '../../../../components/ui/DatePicker';
import { LoanRequestTable } from './LoanRequestTable';
import { ReturnRequestTable } from './ReturnRequestTable';
import { ExportLoanRequestModal } from './ExportLoanRequestModal';
import { ExportReturnRequestModal } from './ExportReturnRequestModal'; // IMPORTED NEW MODAL
import { exportToCSV } from '../../../../utils/csvExporter';

interface LoanRequestListViewProps {
    currentUser: User;
    loanRequests: LoanRequest[];
    returns: AssetReturn[];
    divisions: any[];
    setActivePage: (page: Page, filters?: any) => void;
    onCreateClick: () => void;
    onDetailClick: (req: LoanRequest) => void;
    onReturnDetailClick: (ret: AssetReturn) => void;
    highlightedId: string | null;
}

export const LoanRequestListView: React.FC<LoanRequestListViewProps> = ({
    currentUser,
    loanRequests,
    returns,
    divisions,
    setActivePage,
    onCreateClick,
    onDetailClick,
    onReturnDetailClick,
    highlightedId
}) => {
    // UI State
    const [activeTab, setActiveTab] = useState<'loans' | 'returns'>('loans');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    // Filter State
    const initialFilterState = { status: '', division: '', startDate: null as Date | null, endDate: null as Date | null };
    const [filters, setFilters] = useState(initialFilterState);
    const [tempFilters, setTempFilters] = useState(filters);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const filterPanelRef = useRef<HTMLDivElement>(null);

    // Filter Panel Click Outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
                setIsFilterPanelOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => { document.removeEventListener("mousedown", handleClickOutside); };
    }, [filterPanelRef]);

    // Reset pagination when filters change
    useEffect(() => { setCurrentPage(1); }, [searchQuery, filters, itemsPerPage, activeTab]);

    const activeFilterCount = Object.values(filters).filter(Boolean).length;

    const handleApplyFilters = () => {
        setFilters(tempFilters);
        setIsFilterPanelOpen(false);
    };

    const handleRemoveFilter = (key: keyof typeof filters) => {
        setFilters((prev) => ({ ...prev, [key]: (key as string).includes('Date') ? null : "" }));
        setTempFilters((prev) => ({ ...prev, [key]: (key as string).includes('Date') ? null : "" }));
    };

    // Filter Logic for Loans
    const filteredRequests = useMemo(() => {
        let tempRequests = [...loanRequests];
        if (!['Admin Logistik', 'Super Admin'].includes(currentUser.role)) {
            tempRequests = tempRequests.filter(req => req.requester === currentUser.name);
        }
        return tempRequests
            .filter(req => {
                const searchLower = searchQuery.toLowerCase();
                return req.id.toLowerCase().includes(searchLower) ||
                       req.requester.toLowerCase().includes(searchLower) ||
                       req.items.some(i => i.itemName.toLowerCase().includes(searchLower));
            })
            .filter(req => {
                if (filters.status && req.status !== filters.status) return false;
                if (filters.division && req.division !== filters.division) return false;
                if (filters.startDate) {
                    const start = new Date(filters.startDate); start.setHours(0,0,0,0);
                    const reqDate = new Date(req.requestDate); reqDate.setHours(0,0,0,0);
                    if (reqDate < start) return false;
                }
                if (filters.endDate) {
                    const end = new Date(filters.endDate); end.setHours(23,59,59,999);
                    const reqDate = new Date(req.requestDate);
                    if (reqDate > end) return false;
                }
                return true;
            });
    }, [loanRequests, currentUser, searchQuery, filters]);

    // Filter Logic for Returns
    const filteredReturns = useMemo(() => {
        let tempReturns = [...returns];
        // Note: Returns don't strictly have a 'requester' field on the top level object for simple filtering 
        // without joining to LoanRequest, but we can filter by 'returnedBy'.
        if (!['Admin Logistik', 'Super Admin'].includes(currentUser.role)) {
            tempReturns = tempReturns.filter(ret => ret.returnedBy === currentUser.name);
        }
        
        return tempReturns.filter(ret => {
             const searchLower = searchQuery.toLowerCase();
             return ret.docNumber.toLowerCase().includes(searchLower) || 
                    ret.assetName.toLowerCase().includes(searchLower) ||
                    ret.returnedBy.toLowerCase().includes(searchLower) ||
                    ret.loanDocNumber.toLowerCase().includes(searchLower);
        });
        // Note: Advanced filters for returns (Date, Status) aren't implemented in the UI panel yet for Returns specifically,
        // so we only apply search query here for now to keep it consistent with the UI.
    }, [returns, currentUser, searchQuery]);

    // Sorting & Pagination
    const { items: sortedRequests, requestSort, sortConfig } = useSortableData(filteredRequests, { key: 'requestDate', direction: 'descending' });
    
    // Pagination Slicing
    const totalItems = activeTab === 'loans' ? sortedRequests.length : filteredReturns.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedRequests = sortedRequests.slice(startIndex, startIndex + itemsPerPage);
    
    // Returns Pagination
    const paginatedReturns = filteredReturns.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                <h1 className="text-3xl font-bold text-tm-dark">Request Peminjaman</h1>
                <div className="flex gap-2">
                    <button onClick={() => setIsExportModalOpen(true)} className="inline-flex items-center justify-center gap-2 px-4 py-2 border rounded-xl bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 shadow-sm transition-all">
                        <ExportIcon className="w-4 h-4"/> Ekspor
                    </button>
                    <button onClick={onCreateClick} className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover">
                        Buat Request Pinjam
                    </button>
                </div>
            </div>
            
            <div className="mb-6 border-b border-gray-200">
                <nav className="flex -mb-px space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('loans')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'loans' ? 'border-tm-primary text-tm-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Request Peminjaman</button>
                    <button onClick={() => setActiveTab('returns')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'returns' ? 'border-tm-primary text-tm-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Request Pengembalian</button>
                </nav>
            </div>
            
            <div className="p-4 mb-4 bg-white border border-gray-200/80 rounded-xl shadow-md space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-grow">
                        <SearchIcon className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 top-1/2 left-3" />
                        <input type="text" placeholder="Cari ID, pemohon, aset..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-10 py-2 pl-10 pr-4 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-tm-accent focus:border-tm-accent" />
                    </div>
                    {activeTab === 'loans' && (
                        <div className="relative" ref={filterPanelRef}>
                            <button
                                onClick={() => { setTempFilters(filters); setIsFilterPanelOpen(p => !p); }}
                                className="inline-flex items-center justify-center gap-2 w-full h-10 px-4 text-sm font-semibold text-gray-700 transition-all duration-200 bg-white border border-gray-300 rounded-lg shadow-sm sm:w-auto hover:bg-gray-50"
                            >
                                <FilterIcon className="w-4 h-4" /> <span>Filter</span> {activeFilterCount > 0 && <span className="px-2 py-0.5 text-xs font-bold text-white rounded-full bg-tm-primary">{activeFilterCount}</span>}
                            </button>
                            {isFilterPanelOpen && (
                                <>
                                    <div onClick={() => setIsFilterPanelOpen(false)} className="fixed inset-0 z-20 bg-black/25 sm:hidden" />
                                    <div className="fixed top-32 inset-x-4 z-30 origin-top rounded-xl border border-gray-200 bg-white shadow-lg sm:absolute sm:top-full sm:inset-x-auto sm:right-0 sm:mt-2 sm:w-72">
                                        <div className="flex items-center justify-between p-4 border-b">
                                            <h3 className="text-lg font-semibold text-gray-800">Filter</h3>
                                            <button onClick={() => setIsFilterPanelOpen(false)} className="p-1 text-gray-400 rounded-full hover:bg-gray-100"><CloseIcon className="w-5 h-5"/></button>
                                        </div>
                                        <div className="p-4 space-y-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                                                <CustomSelect 
                                                    options={[{ value: '', label: 'Semua Status' }, ...Object.values(LoanRequestStatus).map(s => ({ value: s, label: s }))]} 
                                                    value={tempFilters.status} 
                                                    onChange={v => setTempFilters(f => ({ ...f, status: v }))} 
                                                    isSearchable={false}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Divisi</label>
                                                <CustomSelect 
                                                    options={[{ value: '', label: 'Semua Divisi' }, ...divisions.map(d => ({ value: d.name, label: d.name }))]} 
                                                    value={tempFilters.division} 
                                                    onChange={v => setTempFilters(f => ({ ...f, division: v }))}
                                                    isSearchable={false} 
                                                />
                                            </div>
                                             <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Periode Pengajuan</label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div><DatePicker id="filter-start-date" selectedDate={tempFilters.startDate} onDateChange={(date) => setTempFilters(f => ({ ...f, startDate: date }))} /></div>
                                                    <div><DatePicker id="filter-end-date" selectedDate={tempFilters.endDate} onDateChange={(date) => setTempFilters(f => ({ ...f, endDate: date }))} /></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-gray-50 border-t">
                                            <button onClick={() => { setFilters(initialFilterState); setTempFilters(initialFilterState); setIsFilterPanelOpen(false); }} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Reset</button>
                                            <button onClick={handleApplyFilters} className="px-4 py-2 text-sm font-semibold text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover">Terapkan</button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
                {activeTab === 'loans' && activeFilterCount > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 animate-fade-in-up">
                        {filters.status && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-full">
                                Status: <span className="font-bold">{filters.status}</span>
                                <button onClick={() => handleRemoveFilter('status')} className="p-0.5 ml-1 rounded-full hover:bg-blue-200 text-blue-500"><CloseIcon className="w-3 h-3" /></button>
                            </span>
                        )}
                        {filters.division && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-100 rounded-full">
                                Divisi: <span className="font-bold">{filters.division}</span>
                                <button onClick={() => handleRemoveFilter('division')} className="p-0.5 ml-1 rounded-full hover:bg-orange-200 text-orange-500"><CloseIcon className="w-3 h-3" /></button>
                            </span>
                        )}
                        {(filters.startDate || filters.endDate) && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-100 rounded-full">
                                Tanggal: <span className="font-bold">{filters.startDate ? new Date(filters.startDate).toLocaleDateString('id-ID') : '...'} - {filters.endDate ? new Date(filters.endDate).toLocaleDateString('id-ID') : '...'}</span>
                                <button onClick={() => { handleRemoveFilter('startDate'); handleRemoveFilter('endDate'); }} className="p-0.5 ml-1 rounded-full hover:bg-purple-200 text-purple-500"><CloseIcon className="w-3 h-3" /></button>
                            </span>
                        )}
                        <button onClick={() => { setFilters(initialFilterState); setTempFilters(initialFilterState); }} className="text-xs text-gray-500 hover:text-red-600 hover:underline px-2 py-1">Hapus Semua</button>
                    </div>
                )}
            </div>

            <div className="overflow-hidden bg-white border border-gray-200/80 rounded-xl shadow-md">
                <div className="overflow-x-auto custom-scrollbar">
                    {activeTab === 'loans' ? (
                        <LoanRequestTable requests={paginatedRequests} onDetailClick={onDetailClick} sortConfig={sortConfig} requestSort={requestSort} highlightedId={highlightedId} />
                    ) : (
                        <ReturnRequestTable returns={paginatedReturns} onDetailClick={onReturnDetailClick} />
                    )}
                </div>
                <PaginationControls currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} startIndex={startIndex} endIndex={startIndex + (activeTab === 'loans' ? paginatedRequests.length : paginatedReturns.length)} />
            </div>

            {isExportModalOpen && activeTab === 'loans' && (
                <ExportLoanRequestModal 
                    isOpen={true} 
                    onClose={() => setIsExportModalOpen(false)} 
                    currentUser={currentUser} 
                    data={sortedRequests} 
                    onConfirmExport={(data, filename, header) => exportToCSV(data, filename, header)} 
                />
            )}
            
            {isExportModalOpen && activeTab === 'returns' && (
                <ExportReturnRequestModal 
                    isOpen={true} 
                    onClose={() => setIsExportModalOpen(false)} 
                    currentUser={currentUser} 
                    data={filteredReturns} 
                    onConfirmExport={(data, filename, header) => exportToCSV(data, filename, header)} 
                />
            )}
        </div>
    );
}
