
import React, { useState, useMemo } from "react";
import { AssetReturn, User } from "../../../../types";
import Modal from "../../../../components/ui/Modal";
import { Avatar } from "../../../../components/ui/Avatar";
import DatePicker from "../../../../components/ui/DatePicker";
import { CustomSelect } from "../../../../components/ui/CustomSelect";
import { 
  BsTable, 
  BsCalendarRange, 
  BsPersonBadge, 
  BsInfoCircleFill, 
  BsLayoutTextWindowReverse 
} from "react-icons/bs";

interface ExportReturnRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  data: AssetReturn[];
  onConfirmExport: (mappedData: any[], filename: string, extraHeader: any) => void;
}

export const ExportReturnRequestModal: React.FC<ExportReturnRequestModalProps> = ({ 
  isOpen, 
  onClose, 
  currentUser, 
  data, 
  onConfirmExport 
}) => {
  const [rangeType, setRangeType] = useState('all');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const rangeOptions = [
    { value: 'all', label: 'Seluruh Database' },
    { value: 'today', label: 'Hari Ini' },
    { value: 'week', label: '7 Hari Terakhir' },
    { value: 'month', label: 'Bulan Berjalan' },
    { value: 'year', label: 'Tahun Berjalan' },
    { value: 'custom', label: 'Rentang Tanggal Kustom' },
  ];

  const filteredData = useMemo(() => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    
    return data.filter(item => {
      const itemDate = new Date(item.returnDate);
      
      switch (rangeType) {
        case 'today':
          return itemDate.toDateString() === now.toDateString();
        case 'week': {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          return itemDate >= weekAgo && itemDate <= now;
        }
        case 'month':
          return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
        case 'year':
          return itemDate.getFullYear() === now.getFullYear();
        case 'custom':
          if (!startDate || !endDate) return true;
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          return itemDate >= start && itemDate <= end;
        default:
          return true;
      }
    });
  }, [data, rangeType, startDate, endDate]);

  const prepareMappedData = (returns: AssetReturn[]) => {
    return returns.map((ret, index) => {
      const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('id-ID', { 
        day: '2-digit', month: '2-digit', year: 'numeric' 
      }) : '-';

      return {
        'NO': index + 1,
        'ID PENGEMBALIAN': ret.docNumber,
        'TANGGAL KEMBALI': fmtDate(ret.returnDate),
        'ID PINJAMAN (REF)': ret.loanDocNumber,
        'NAMA ASET': ret.assetName,
        'ID ASET': ret.assetId,
        'DIKEMBALIKAN OLEH': ret.returnedBy,
        'DITERIMA OLEH': ret.receivedBy,
        'KONDISI': ret.returnedCondition,
        'STATUS': ret.status,
        'CATATAN': ret.notes || '-'
      };
    });
  };

  const handleExport = () => {
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0].replace(/-/g, '');
    const filename = `LAPORAN_PENGEMBALIAN_${rangeType.toUpperCase()}_${timestamp}`;
    const mappedData = prepareMappedData(filteredData);
    
    const extraHeader = {
        title: "LAPORAN PENGEMBALIAN ASET (RETURN)",
        metadata: {
            "Akun": currentUser.name,
            "Range Waktu": rangeType === 'custom' ? `${startDate?.toLocaleDateString('id-ID')} - ${endDate?.toLocaleDateString('id-ID')}` : rangeOptions.find(o => o.value === rangeType)?.label || rangeType,
            "Tanggal Cetak": now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
        }
    };

    onConfirmExport(mappedData, filename, extraHeader);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ekspor Laporan Pengembalian" size="lg">
      <div className="space-y-5">
        <div className="flex items-center gap-4 p-4 bg-slate-900 text-white rounded-xl border-b-2 border-tm-accent relative overflow-hidden shadow-sm">
          <div className="flex-shrink-0 p-2 bg-white/5 rounded-lg border border-white/10">
            <BsLayoutTextWindowReverse className="w-6 h-6 text-tm-accent" />
          </div>
          <div className="relative z-10">
            <h4 className="font-bold text-base tracking-tight">Konfigurasi Ekspor CSV</h4>
            <p className="text-[11px] text-slate-400 font-medium opacity-90">Dokumen akan diunduh dalam format tabel standar Excel.</p>
          </div>
        </div>

        <div className="space-y-4">
            <div className="p-4 bg-white border border-gray-200 rounded-xl">
                <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                    <BsCalendarRange className="w-3.5 h-3.5 text-tm-primary"/>
                    Rentang Waktu Laporan
                </label>
                <div className="space-y-3">
                    <CustomSelect 
                        options={rangeOptions} 
                        value={rangeType} 
                        onChange={setRangeType} 
                    />
                    
                    {rangeType === 'custom' && (
                        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg animate-fade-in-up">
                            <div>
                                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Dari</label>
                                <DatePicker id="export-start" selectedDate={startDate} onDateChange={setStartDate} />
                            </div>
                            <div>
                                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Sampai</label>
                                <DatePicker id="export-end" selectedDate={endDate} onDateChange={setEndDate} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 bg-white border border-gray-200 rounded-xl">
                <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                    <BsPersonBadge className="w-3.5 h-3.5 text-tm-primary"/>
                    Data Operator
                </label>
                <div className="flex items-center gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                    <Avatar name={currentUser.name} className="w-9 h-9 shadow-sm" />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-tm-dark truncate">{currentUser.name}</p>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mt-0.5">
                            {currentUser.role} &bull; TRINITI MEDIA
                        </p>
                    </div>
                    <div className="px-2 py-0.5 bg-white border border-blue-200 rounded text-[9px] font-bold text-tm-primary tracking-tighter shadow-sm">
                        AUTH OK
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-md">
                <div className="px-5 py-2.5 bg-white/5 border-b border-white/5 flex justify-between items-center">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Summary Output</p>
                    <span className="flex items-center gap-1 text-[9px] font-bold text-tm-accent uppercase">
                        <BsInfoCircleFill className="w-2.5 h-2.5" /> Live Validation
                    </span>
                </div>
                <div className="p-5 flex items-center justify-between">
                    <div className="space-y-1">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Total Data</span>
                        <p className="text-xl font-bold text-white leading-none">
                            {filteredData.length} 
                            <span className="text-[10px] font-medium text-slate-500 ml-1.5">baris</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex gap-3 pt-5 border-t border-gray-100">
          <button 
            onClick={onClose} 
            className="flex-1 px-4 py-2 text-[12px] font-bold text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all uppercase tracking-wider"
          >
            Batal
          </button>
          <button 
            onClick={handleExport} 
            disabled={filteredData.length === 0}
            className="flex-[1.5] inline-flex items-center justify-center gap-2 px-4 py-2 text-[12px] font-bold text-white bg-tm-primary rounded-lg shadow-lg shadow-tm-primary/20 hover:bg-tm-primary-hover hover:-translate-y-0.5 active:translate-y-0 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed transition-all uppercase tracking-wider"
          >
            <BsTable className="w-4 h-4" />
            Download CSV
          </button>
        </div>
      </div>
    </Modal>
  );
};
