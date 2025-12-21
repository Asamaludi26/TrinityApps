
import React, { useState, useEffect } from 'react';
import { PurchaseDetails, RequestItem } from '../../../../types';
import { ChevronDownIcon } from '../../../../components/icons/ChevronDownIcon';
import DatePicker from '../../../../components/ui/DatePicker';

interface ItemPurchaseDetailsFormProps {
    item: RequestItem;
    approvedQuantity: number;
    onChange: (details: Omit<PurchaseDetails, 'filledBy' | 'fillDate'>) => void;
    isDisabled?: boolean;
    initialData?: Omit<PurchaseDetails, 'filledBy' | 'fillDate'>;
}

export const ItemPurchaseDetailsForm: React.FC<ItemPurchaseDetailsFormProps> = ({ item, approvedQuantity, onChange, isDisabled = false, initialData }) => {
    // FIX: State initialization is now also handled via useEffect to sync with props
    const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
    const [vendor, setVendor] = useState('');
    const [poNumber, setPoNumber] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [purchaseDate, setPurchaseDate] = useState<Date | null>(new Date());
    const [warrantyEndDate, setWarrantyEndDate] = useState<Date | null>(null);
    const [warrantyPeriod, setWarrantyPeriod] = useState<number | ''>('');
    
    // Sync state with initialData when it changes
    useEffect(() => {
        if (initialData) {
            setPurchasePrice(initialData.purchasePrice ?? '');
            setVendor(initialData.vendor ?? '');
            setPoNumber(initialData.poNumber ?? '');
            setInvoiceNumber(initialData.invoiceNumber ?? '');
            setPurchaseDate(initialData.purchaseDate ? new Date(initialData.purchaseDate) : new Date());
            setWarrantyEndDate(initialData.warrantyEndDate ? new Date(initialData.warrantyEndDate) : null);
            
            // Recalculate warranty period if needed
            if (initialData.purchaseDate && initialData.warrantyEndDate) {
                const start = new Date(initialData.purchaseDate);
                const end = new Date(initialData.warrantyEndDate);
                if (end > start) {
                    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
                    setWarrantyPeriod(months);
                }
            }
        }
    }, [initialData]);
    
    const [isExpanded, setIsExpanded] = useState(!isDisabled);

    // Helper to send data to parent immediately
    const triggerChange = (overrides: Partial<Omit<PurchaseDetails, 'filledBy' | 'fillDate'>>) => {
        const currentData = {
            purchasePrice: Number(purchasePrice),
            vendor,
            poNumber,
            invoiceNumber,
            purchaseDate: purchaseDate ? purchaseDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            warrantyEndDate: warrantyEndDate ? warrantyEndDate.toISOString().split('T')[0] : null,
        };
        onChange({ ...currentData, ...overrides });
    };

    // Handlers
    const handlePriceChange = (val: string) => {
        const numericValue = val.replace(/\D/g, '');
        const num = numericValue === '' ? '' : Number(numericValue);
        setPurchasePrice(num);
        triggerChange({ purchasePrice: Number(num) });
    };

    const handleVendorChange = (val: string) => {
        setVendor(val);
        triggerChange({ vendor: val });
    };

    const handlePoChange = (val: string) => {
        setPoNumber(val);
        triggerChange({ poNumber: val });
    };

    const handleInvoiceChange = (val: string) => {
        setInvoiceNumber(val);
        triggerChange({ invoiceNumber: val });
    };

    const handlePurchaseDateChange = (date: Date | null) => {
        setPurchaseDate(date);
        let newWarrantyEnd = warrantyEndDate;
        if (date && warrantyPeriod && warrantyPeriod > 0) {
            const d = new Date(date);
            d.setMonth(d.getMonth() + Number(warrantyPeriod));
            setWarrantyEndDate(d);
            newWarrantyEnd = d;
        }
        triggerChange({ 
            purchaseDate: date ? date.toISOString().split('T')[0] : '',
            warrantyEndDate: newWarrantyEnd ? newWarrantyEnd.toISOString().split('T')[0] : null
        });
    };

    const handleWarrantyPeriodChange = (val: string) => {
        const period = val === '' ? '' : parseInt(val, 10);
        setWarrantyPeriod(period);
        let newWarrantyEnd = null;
        if (purchaseDate && period && period > 0) {
            const d = new Date(purchaseDate);
            d.setMonth(d.getMonth() + Number(period));
            setWarrantyEndDate(d);
            newWarrantyEnd = d;
        } else {
            setWarrantyEndDate(null); 
        }
        triggerChange({ warrantyEndDate: newWarrantyEnd ? newWarrantyEnd.toISOString().split('T')[0] : null });
    };

    const handleWarrantyEndDateChange = (date: Date | null) => {
        setWarrantyEndDate(date);
        if (purchaseDate && date && date > purchaseDate) {
            const pDate = new Date(purchaseDate);
            let months = (date.getFullYear() - pDate.getFullYear()) * 12 + (Number(date.getMonth()) - Number(pDate.getMonth()));
            if (date.getDate() < pDate.getDate()) months--;
            setWarrantyPeriod(months <= 0 ? '' : months);
        } else {
            setWarrantyPeriod('');
        }
        triggerChange({ warrantyEndDate: date ? date.toISOString().split('T')[0] : null });
    };

    return (
        <div className={`border border-slate-200 rounded-lg shadow-sm transition-all duration-300 ${isDisabled ? 'bg-slate-50 opacity-60' : 'bg-white hover:border-tm-primary/50'}`}>
            <button
                type="button"
                onClick={() => !isDisabled && setIsExpanded(p => !p)}
                disabled={isDisabled}
                className={`flex items-center justify-between w-full p-4 font-semibold text-left text-slate-700 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${isExpanded && !isDisabled ? 'bg-slate-50/70 border-b border-slate-100' : ''}`}
            >
                <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-lg text-sm font-bold shadow-sm ${isDisabled ? 'bg-slate-200 text-slate-500' : 'bg-tm-primary text-white'}`}>
                        {approvedQuantity}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                             <span className={`text-sm font-bold ${isDisabled ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                {item.itemName} 
                            </span>
                            {isDisabled && <span className="px-2 py-0.5 text-[10px] font-bold uppercase text-white bg-red-500 rounded-full tracking-wider">Ditolak</span>}
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5 bg-slate-100 px-2 py-0.5 rounded w-fit">{item.itemTypeBrand}</p>
                    </div>
                </div>
                {!isDisabled && <ChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />}
            </button>
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded && !isDisabled ? 'max-h-[1000px]' : 'max-h-0'}`}>
                <fieldset disabled={isDisabled}>
                    <div className="p-5 space-y-5 text-sm">
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Harga Beli Total (Rp) <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                        <span className="text-slate-500 font-normal text-xs">Rp</span>
                                    </div>
                                    <input type="text" value={purchasePrice === '' ? '' : purchasePrice.toLocaleString('id-ID')} onChange={e => handlePriceChange(e.target.value)} required className="block w-full py-2.5 pl-10 pr-3 text-slate-900 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-tm-primary/20 focus:border-tm-primary transition-all font-normal" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Vendor <span className="text-red-500">*</span></label>
                                <input type="text" value={vendor} onChange={e => handleVendorChange(e.target.value)} required className="block w-full px-3 py-2.5 text-slate-900 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-tm-primary/20 focus:border-tm-primary transition-all font-normal" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">No. Purchase Order <span className="text-red-500">*</span></label>
                                <input type="text" value={poNumber} onChange={e => handlePoChange(e.target.value)} required className="block w-full px-3 py-2.5 text-slate-900 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-tm-primary/20 focus:border-tm-primary transition-all font-normal" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">No. Faktur <span className="text-red-500">*</span></label>
                                <input type="text" value={invoiceNumber} onChange={e => handleInvoiceChange(e.target.value)} required className="block w-full px-3 py-2.5 text-slate-900 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-tm-primary/20 focus:border-tm-primary transition-all font-normal" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
                             <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Tanggal Beli <span className="text-red-500">*</span></label>
                                <DatePicker id={`pd-${item.id}`} selectedDate={purchaseDate} onDateChange={handlePurchaseDateChange} disableFutureDates />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Masa Garansi (bulan)</label>
                                <input type="number" value={warrantyPeriod} onChange={e => handleWarrantyPeriodChange(e.target.value)} min="0" className="block w-full px-3 py-2 text-slate-900 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-tm-primary/20 focus:border-tm-primary transition-all font-normal" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Akhir Garansi</label>
                                <DatePicker id={`we-${item.id}`} selectedDate={warrantyEndDate} onDateChange={handleWarrantyEndDateChange} />
                            </div>
                        </div>
                    </div>
                </fieldset>
            </div>
        </div>
    );
};
