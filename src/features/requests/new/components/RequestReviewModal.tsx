
import React, { useState, useEffect, useMemo } from 'react';
import { Request, ItemStatus } from '../../../../types';
import Modal from '../../../../components/ui/Modal';
import { SpinnerIcon } from '../../../../components/icons/SpinnerIcon';
import { InfoIcon } from '../../../../components/icons/InfoIcon';
import { CheckIcon } from '../../../../components/icons/CheckIcon';
import { CloseIcon } from '../../../../components/icons/CloseIcon';
import { PencilIcon } from '../../../../components/icons/PencilIcon';

export interface AdjustmentData {
  approvedQuantity: number;
  reason: string;
}

interface RequestReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: Request;
  onConfirm: (adjustments: Record<number, AdjustmentData>) => void;
  isLoading: boolean;
}

type ItemAction = "approve" | "partial" | "reject";

export const RequestReviewModal: React.FC<RequestReviewModalProps> = ({ isOpen, onClose, request, onConfirm, isLoading }) => {
  const [itemActions, setItemActions] = useState<Record<number, ItemAction>>({});
  const [adjustments, setAdjustments] = useState<Record<number, { approvedQuantity: string; reason: string }>>({});

  useEffect(() => {
    if (isOpen) {
      const initialActions: Record<number, ItemAction> = {};
      const initialAdjustments: Record<number, { approvedQuantity: string; reason: string }> = {};

      request.items.forEach((item) => {
        const existingStatus = request.itemStatuses?.[item.id];
        const approvedQty = existingStatus?.approvedQuantity;
        
        if (typeof approvedQty === "number") {
          initialActions[item.id] = approvedQty === 0 ? "reject" : approvedQty < item.quantity ? "partial" : "approve";
          initialAdjustments[item.id] = { approvedQuantity: approvedQty.toString(), reason: existingStatus?.reason || "" };
        } else {
          initialActions[item.id] = "approve";
          initialAdjustments[item.id] = { approvedQuantity: item.quantity.toString(), reason: "" };
        }
      });
      setItemActions(initialActions);
      setAdjustments(initialAdjustments);
    }
  }, [isOpen, request]);

  const handleAdjustmentChange = (itemId: number, field: "approvedQuantity" | "reason", value: string) => {
    const item = request.items.find(i => i.id === itemId);
    if (!item) return;
    const maxQty = item.quantity;

    if (field === "approvedQuantity") {
      const numValue = value === "" ? NaN : parseInt(value, 10);
      if (!isNaN(numValue) && (numValue < 0 || numValue > maxQty)) return;
    }

    setAdjustments(prev => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
  };

  const handleActionChange = (itemId: number, action: ItemAction) => {
    setItemActions(prev => ({ ...prev, [itemId]: action }));
    const originalQty = request.items.find(i => i.id === itemId)?.quantity || 0;

    let newQty = originalQty;
    if (action === "reject") newQty = 0;
    else if (action === "partial") newQty = Math.max(1, originalQty - 1);

    setAdjustments(prev => ({ ...prev, [itemId]: { ...prev[itemId], approvedQuantity: String(newQty) } }));
  };

  const isSubmissionValid = useMemo(() => {
    return request.items.every(item => {
      const adj = adjustments[item.id];
      if (!adj || adj.approvedQuantity === "") return false;
      const action = itemActions[item.id];
      if (action !== 'approve' && adj.reason.trim().length < 3) return false;
      return true;
    });
  }, [adjustments, itemActions, request.items]);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Review Permintaan Pengadaan`} 
      size="2xl" 
      hideDefaultCloseButton 
      footerContent={
        <div className="flex items-center justify-between w-full">
          <p className="text-xs text-slate-600 font-bold hidden sm:block">
            <span className="text-red-600">*</span> Perubahan wajib menyertakan alasan jelas.
          </p>
          <div className="flex gap-3 w-full sm:w-auto">
            <button 
              onClick={onClose} 
              className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all"
            >
              Batal
            </button>
            <button 
              onClick={() => {
                const final: Record<number, AdjustmentData> = {};
                Object.keys(adjustments).forEach(id => {
                    const numId = parseInt(id, 10);
                    final[numId] = { approvedQuantity: Number(adjustments[numId].approvedQuantity), reason: adjustments[numId].reason };
                });
                onConfirm(final);
              }} 
              disabled={isLoading || !isSubmissionValid} 
              className="flex-1 sm:flex-none inline-flex items-center justify-center px-8 py-2.5 text-sm font-bold text-white bg-tm-primary rounded-xl shadow-lg shadow-tm-primary/20 hover:bg-tm-primary-hover disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none transition-all"
            >
              {isLoading && <SpinnerIcon className="w-4 h-4 mr-2" />} Simpan Review
            </button>
          </div>
        </div>
    }>
      <div className="space-y-6">
        {/* Header Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-100 rounded-2xl border border-slate-200">
           <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">ID Dokumen</p>
              <h3 className="text-lg font-black text-slate-900">#{request.id}</h3>
           </div>
           <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-200">
              <InfoIcon className="w-5 h-5 text-tm-primary" />
              <p className="text-xs font-bold text-slate-700 leading-tight">
                Review kuantitas item untuk menyesuaikan <br/> dengan stok atau kebijakan anggaran.
              </p>
           </div>
        </div>

        {/* Items List */}
        <div className="space-y-5 max-h-[55vh] overflow-y-auto custom-scrollbar px-1 py-1">
          {request.items.map(item => {
            const action = itemActions[item.id];
            const adj = adjustments[item.id];
            const isModified = action !== 'approve';

            return (
              <div 
                key={item.id} 
                className={`group p-6 border-2 rounded-2xl transition-all duration-300 shadow-sm
                  ${action === 'reject' ? 'bg-red-50 border-red-200' : 
                    action === 'partial' ? 'bg-amber-50 border-amber-200' : 
                    'bg-white border-slate-100 hover:border-slate-300'}`}
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  {/* Left: Item Identity */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-black text-slate-900 text-base leading-tight truncate">{item.itemName}</h4>
                      <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-slate-200 text-slate-700 rounded border border-slate-300">{item.itemTypeBrand}</span>
                    </div>
                    <p className="text-sm text-slate-600 font-bold">
                      Permintaan: <span className="text-slate-900 font-black">{item.quantity} Unit</span>
                    </p>
                  </div>

                  {/* Right: Modern Segmented Action Control */}
                  <div className="flex bg-slate-200/50 p-1.5 rounded-xl w-full md:w-auto relative border border-slate-200">
                    <button 
                      onClick={() => handleActionChange(item.id, 'approve')} 
                      className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2 text-[11px] font-black rounded-lg transition-all
                        ${action === 'approve' ? 'bg-white text-emerald-700 shadow-md ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {action === 'approve' && <CheckIcon className="w-3.5 h-3.5" />}
                      PENUH
                    </button>
                    <button 
                      onClick={() => handleActionChange(item.id, 'partial')} 
                      className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2 text-[11px] font-black rounded-lg transition-all
                        ${action === 'partial' ? 'bg-white text-amber-700 shadow-md ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {action === 'partial' && <PencilIcon className="w-3.5 h-3.5" />}
                      REVISI
                    </button>
                    <button 
                      onClick={() => handleActionChange(item.id, 'reject')} 
                      className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2 text-[11px] font-black rounded-lg transition-all
                        ${action === 'reject' ? 'bg-white text-red-700 shadow-md ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {action === 'reject' && <CloseIcon className="w-3.5 h-3.5" />}
                      TOLAK
                    </button>
                  </div>
                </div>

                {/* Conditional Input Areas with Sharp Typography */}
                {action === 'partial' && (
                  <div className="mt-6 pt-6 border-t border-slate-300 animate-fade-in-down">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Kuantitas Disetujui</label>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-tm-primary">{adj?.approvedQuantity || 0}</span>
                        <span className="text-[10px] font-black text-slate-500">UNIT</span>
                      </div>
                    </div>
                    <div className="relative flex items-center gap-4 px-1">
                      <span className="text-[10px] font-black text-slate-500">1</span>
                      <input 
                        type="range" min="1" max={item.quantity} value={adj?.approvedQuantity || 1} 
                        onChange={e => handleAdjustmentChange(item.id, 'approvedQuantity', e.target.value)}
                        className="flex-1 h-2.5 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-tm-primary transition-all hover:bg-slate-400"
                      />
                      <span className="text-[10px] font-black text-slate-500">{item.quantity}</span>
                    </div>
                  </div>
                )}

                {isModified && (
                  <div className="mt-6 animate-fade-in-down">
                    <div className="flex items-center gap-2 mb-2">
                      <label className={`text-[10px] font-black uppercase tracking-widest ${action === 'reject' ? 'text-red-700' : 'text-amber-800'}`}>
                        Alasan {action === 'reject' ? 'Penolakan' : 'Revisi'}
                      </label>
                      <span className="text-[9px] font-black text-red-600 uppercase leading-none">(WAJIB DIISI)</span>
                    </div>
                    <div className="relative group">
                       <textarea 
                        value={adj?.reason || ''} 
                        onChange={e => handleAdjustmentChange(item.id, 'reason', e.target.value)} 
                        placeholder={action === 'reject' ? "Jelaskan alasan penolakan..." : "Berikan alasan perubahan kuantitas..."} 
                        className={`w-full p-4 text-sm font-bold bg-white border-2 rounded-2xl outline-none transition-all placeholder:text-slate-400 placeholder:font-medium resize-none
                          ${action === 'reject' ? 'border-red-200 focus:border-red-500 text-red-900' : 'border-amber-200 focus:border-amber-500 text-amber-900'}`} 
                        rows={2} 
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
