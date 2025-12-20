
import React from 'react';
import { Request, PurchaseDetails, User } from '../../../../types';
import { ShoppingCartIcon } from '../../../../components/icons/ShoppingCartIcon';
import { hasPermission } from '../../../../utils/permissions';

const canViewPrice = (user: User) => hasPermission(user, 'requests:approve:purchase');

export const PurchaseDetailsView: React.FC<{ request: Request, details: Record<number, PurchaseDetails>, currentUser: User }> = ({ request, details, currentUser }) => (
    <section>
        <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
            <ShoppingCartIcon className="w-5 h-5 text-tm-primary" />
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Detail Realisasi Pembelian</h4>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
            <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    <tr>
                        <th className="p-3">Nama Barang</th>
                        {canViewPrice(currentUser) && <th className="p-3 text-right">Harga Satuan</th>}
                        <th className="p-3">Vendor</th>
                        <th className="p-3">Tgl Beli</th>
                        <th className="p-3">Akhir Garansi</th>
                        <th className="p-3">Dokumen</th>
                        <th className="p-3">Diisi Oleh</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {request.items.map(item => {
                        const isRejected = request.itemStatuses?.[item.id]?.approvedQuantity === 0;
                        const itemDetails = details[item.id];

                        if (isRejected) {
                            return (
                                <tr key={item.id} className="bg-red-50/30 text-slate-400">
                                    <td className="p-3 font-semibold">
                                        <div className="flex items-center gap-2">
                                            <span className="line-through decoration-red-400">{item.itemName}</span>
                                            <span className="px-1.5 py-0.5 text-[9px] font-bold text-white bg-red-500 rounded uppercase">Ditolak</span>
                                        </div>
                                    </td>
                                    <td colSpan={6} className="p-3 text-xs italic">
                                        {request.itemStatuses?.[item.id]?.reason || 'Item ditolak saat proses review.'}
                                    </td>
                                </tr>
                            );
                        }
                        
                        if (itemDetails) {
                             return (
                                <tr key={item.id} className="bg-white hover:bg-slate-50/50 transition-colors">
                                    <td className="p-3 font-bold text-slate-800">{item.itemName || 'N/A'}</td>
                                    {canViewPrice(currentUser) && (
                                        <td className="p-3 text-right font-mono font-normal text-slate-700">Rp {(itemDetails.purchasePrice as unknown as number).toLocaleString('id-ID')}</td>
                                    )}
                                    <td className="p-3 text-slate-600 font-normal">{itemDetails.vendor}</td>
                                    <td className="p-3 text-slate-600 whitespace-nowrap">{new Date(itemDetails.purchaseDate).toLocaleDateString('id-ID')}</td>
                                    <td className="p-3 text-slate-600 whitespace-nowrap">{itemDetails.warrantyEndDate ? new Date(itemDetails.warrantyEndDate).toLocaleDateString('id-ID') : '-'}</td>
                                    <td className="p-3 text-slate-600 text-xs">
                                        <div className="font-mono font-normal bg-slate-100 px-1.5 py-0.5 rounded w-fit mb-1 border border-slate-200 text-slate-700">{itemDetails.poNumber}</div>
                                        <div className="text-slate-400 font-mono">{itemDetails.invoiceNumber}</div>
                                    </td>
                                    <td className="p-3 text-slate-600 text-xs">
                                        <div className="font-normal text-slate-700">{itemDetails.filledBy}</div>
                                        <div className="text-slate-400">{new Date(itemDetails.fillDate).toLocaleDateString('id-ID')}</div>
                                    </td>
                                </tr>
                            );
                        }

                        return null;
                    })}
                </tbody>
            </table>
        </div>
    </section>
);
