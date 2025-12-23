
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Asset, LoanRequest, AssetCondition, AssetReturn, Division, AssetReturnStatus, LoanRequestStatus, AssetStatus, Handover, ItemStatus, PreviewData, Page, ParsedScanResult } from '../../../types';
import { useNotification } from '../../../providers/NotificationProvider';
import { generateDocumentNumber } from '../../../utils/documentNumberGenerator';
import { Letterhead } from '../../../components/ui/Letterhead';
import { SignatureStamp } from '../../../components/ui/SignatureStamp';
import DatePicker from '../../../components/ui/DatePicker';
import FloatingActionBar from '../../../components/ui/FloatingActionBar';
import { SpinnerIcon } from '../../../components/icons/SpinnerIcon';
import { ApprovalStamp } from '../../../components/ui/ApprovalStamp';
import { RejectionStamp } from '../../../components/ui/RejectionStamp';
import Modal from '../../../components/ui/Modal';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import { PrintIcon } from '../../../components/icons/PrintIcon';
import { DownloadIcon } from '../../../components/icons/DownloadIcon';
import { DetailPageLayout } from '../../../components/layout/DetailPageLayout';
import { ClickableLink } from '../../../components/ui/ClickableLink';

// Stores
import { useRequestStore } from '../../../stores/useRequestStore';
import { useAssetStore } from '../../../stores/useAssetStore';
import { useMasterDataStore } from '../../../stores/useMasterDataStore';
import { useNotificationStore } from '../../../stores/useNotificationStore';
import { useTransactionStore } from '../../../stores/useTransactionStore';

// Imported Components
import { ReturnStatusSidebar } from './components/ReturnStatusSidebar';

interface ReturnAssetFormPageProps {
    currentUser: User;
    onCancel: () => void;
    // Props for initializing state if passed from router
    loanRequest?: LoanRequest; 
    assetsToReturn?: Asset[]; 
    returnDocument?: AssetReturn;
    isReadOnly?: boolean;
}

const ReturnAssetFormPage: React.FC<ReturnAssetFormPageProps> = ({ 
    currentUser, 
    onCancel, 
    loanRequest: propLoanRequest, 
    assetsToReturn: propAssetsToReturn = [], 
    returnDocument: propReturnDocument,
    isReadOnly = false 
}) => {
    // Store Hooks
    const returns = useRequestStore(state => state.returns);
    const addReturn = useRequestStore(state => state.addReturn);
    const updateReturn = useRequestStore(state => state.updateReturn);
    const updateLoanRequest = useRequestStore(state => state.updateLoanRequest);
    const fetchRequests = useRequestStore(state => state.fetchRequests);
    
    const updateAsset = useAssetStore(state => state.updateAsset);
    const fetchAssets = useAssetStore(state => state.fetchAssets);
    
    const addHandover = useTransactionStore(state => state.addHandover);
    const handovers = useTransactionStore(state => state.handovers);

    const users = useMasterDataStore(state => state.users);
    const divisions = useMasterDataStore(state => state.divisions);
    const addAppNotification = useNotificationStore(state => state.addSystemNotification);

    const [returnDate, setReturnDate] = useState<Date | null>(new Date());
    const [docNumber, setDocNumber] = useState('');
    
    // Bulk Logic State
    const [returnedCondition, setReturnedCondition] = useState<AssetCondition>(AssetCondition.USED_OKAY);
    const [notes, setNotes] = useState('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFooterVisible, setIsFooterVisible] = useState(true);
    const [isActionSidebarExpanded, setIsActionSidebarExpanded] = useState(true);
    
    const footerRef = useRef<HTMLDivElement>(null);
    const printRef = useRef<HTMLDivElement>(null);
    const formId = "return-asset-form";
    const addNotification = useNotification();
    
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);

    // Determine Data Source
    const loanRequest = propLoanRequest;
    const returnDocument = propReturnDocument;

    // Use assetsToReturn prop, fallback to single asset from returnDocument if readonly
    const targetAssets = useMemo(() => {
        if (propAssetsToReturn.length > 0) return propAssetsToReturn;
        // In read-only mode, if we view a single return doc, we might need to fetch the asset
        if (isReadOnly && returnDocument) {
             const found = useAssetStore.getState().assets.find(a => a.id === returnDocument.assetId);
             return found ? [found] : [];
        }
        return [];
    }, [propAssetsToReturn, isReadOnly, returnDocument]);

    const adminLogistik = useMemo(() => users.find(u => u.role === 'Admin Logistik'), [users]);
    const ceo = useMemo(() => users.find(u => u.role === 'Super Admin'), [users]);

    const borrower = useMemo(() => {
        // If loan request is available
        if (loanRequest) return users.find(u => u.name === loanRequest.requester);
        // If only return document is available
        if (returnDocument) return users.find(u => u.name === returnDocument.returnedBy);
        return null;
    }, [users, loanRequest, returnDocument]);

    const borrowerDivision = useMemo(() => {
        if (!borrower || !borrower.divisionId) return 'N/A';
        return divisions.find(d => d.id === borrower.divisionId)?.name || 'N/A';
    }, [divisions, borrower]);
    
    useEffect(() => {
        if (!isReadOnly) {
            const newDocNumber = generateDocumentNumber('RET', returns, returnDate || new Date());
            setDocNumber(newDocNumber);
        } else if (returnDocument) {
             setDocNumber(returnDocument.docNumber);
             setReturnDate(new Date(returnDocument.returnDate));
             setReturnedCondition(returnDocument.returnedCondition);
             setNotes(returnDocument.notes || '');
        }
    }, [returnDate, returns, isReadOnly, returnDocument]);
    
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => setIsFooterVisible(entry.isIntersecting), { threshold: 0.1 });
        const currentRef = footerRef.current;
        if (currentRef) observer.observe(currentRef);
        return () => { if (currentRef) observer.unobserve(currentRef); };
    }, []);

    // Action Handlers
    const handleSave = async () => {
        if (!loanRequest || targetAssets.length === 0) return;
        
        // --- OPTIMIZATION: BATCH PROCESSING ---
        const returnPromises = targetAssets.map((asset, index) => {
             const newReturn: AssetReturn = {
                id: `RET-${Date.now()}-${index}`, 
                docNumber: docNumber, 
                returnDate: returnDate!.toISOString().split('T')[0],
                loanRequestId: loanRequest.id,
                loanDocNumber: loanRequest.id, 
                assetId: asset.id,
                assetName: asset.name,
                returnedBy: currentUser.name,
                receivedBy: adminLogistik?.name || 'Admin Logistik',
                acknowledgedBy: ceo?.name || 'Super Admin',
                returnedCondition,
                notes,
                status: AssetReturnStatus.PENDING_APPROVAL
            };
            return addReturn(newReturn);
        });
        
        const assetUpdatePromises = targetAssets.map(asset => {
             return updateAsset(asset.id, {
                status: AssetStatus.AWAITING_RETURN,
            });
        });

        const loanUpdatePromise = updateLoanRequest(loanRequest.id, {
            status: LoanRequestStatus.AWAITING_RETURN
        });

        await Promise.all([...returnPromises, ...assetUpdatePromises, loanUpdatePromise]);

        await fetchAssets();
        await fetchRequests();

        // Notification
        const assetNames = targetAssets.map(a => a.name).join(', ');
        const logisticAdmins = users.filter(u => u.role === 'Admin Logistik');
        
        logisticAdmins.forEach(admin => {
             addAppNotification({
                 recipientId: admin.id, 
                 actorName: currentUser.name,
                 type: 'info', 
                 referenceId: docNumber,
                 message: `mengajukan pengembalian untuk ${targetAssets.length} aset (${assetNames}).`
             });
        });

        addNotification(`Request pengembalian ${docNumber} untuk ${targetAssets.length} aset telah diajukan.`, 'success');
        onCancel();
    };

    const handleApprove = async () => {
        if (!returnDocument) return;
        setIsSubmitting(true);
        try {
            const today = new Date().toISOString();
            
            await updateReturn(returnDocument.id, {
                status: AssetReturnStatus.APPROVED,
                approvedBy: currentUser.name,
                approvalDate: today
            });

            await updateAsset(returnDocument.assetId, {
                status: AssetStatus.IN_STORAGE,
                condition: returnDocument.returnedCondition, 
                currentUser: null,
                location: 'Gudang Inventori'
            });

            const loanReqToUpdate = useRequestStore.getState().loanRequests.find(lr => lr.id === returnDocument.loanRequestId);
            if (loanReqToUpdate) {
                const currentReturnedIds = loanReqToUpdate.returnedAssetIds || [];
                const newReturnedIds = [...new Set([...currentReturnedIds, returnDocument.assetId])];
                const allAssignedIds = Object.values(loanReqToUpdate.assignedAssetIds || {}).flat();
                const isFullyReturned = allAssignedIds.every(id => newReturnedIds.includes(id));

                await updateLoanRequest(loanReqToUpdate.id, {
                    returnedAssetIds: newReturnedIds,
                    status: isFullyReturned ? LoanRequestStatus.RETURNED : LoanRequestStatus.ON_LOAN,
                    actualReturnDate: isFullyReturned ? today : loanReqToUpdate.actualReturnDate,
                });
            }
            
            const handoverDocNumber = generateDocumentNumber('HO-RET', handovers, new Date());
            const newHandover: Handover = {
                id: `HO-RET-${Date.now()}`,
                docNumber: handoverDocNumber,
                handoverDate: today.split('T')[0],
                menyerahkan: returnDocument.returnedBy,
                penerima: currentUser.name, 
                mengetahui: returnDocument.acknowledgedBy || 'Super Admin',
                woRoIntNumber: returnDocument.docNumber, 
                status: ItemStatus.COMPLETED,
                items: [{
                    id: Date.now(),
                    assetId: returnDocument.assetId,
                    itemName: returnDocument.assetName,
                    itemTypeBrand: 'Generic', 
                    conditionNotes: returnDocument.returnedCondition,
                    quantity: 1,
                    checked: true
                }]
            };
            await addHandover(newHandover);
             
             await fetchAssets();
             await fetchRequests();

             addNotification(`Pengembalian disetujui. Handover #${handoverDocNumber} dibuat.`, 'success');
             onCancel();
        } catch (e) {
            addNotification('Gagal menyetujui pengembalian.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!returnDocument) return;
        setIsSubmitting(true);
        try {
            await updateReturn(returnDocument.id, {
                status: AssetReturnStatus.REJECTED,
                rejectedBy: currentUser.name,
                rejectionDate: new Date().toISOString(),
                rejectionReason
            });

            await updateAsset(returnDocument.assetId, {
                status: AssetStatus.IN_USE 
            });
            
            await fetchAssets();

            addNotification('Pengembalian ditolak.', 'warning');
            setIsRejectModalOpen(false);
            onCancel();
        } catch (e) {
             addNotification('Gagal menolak.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isReadOnly) return;
        if (!loanRequest || targetAssets.length === 0) {
            addNotification('Aksi tidak valid atau data tidak lengkap.', 'error');
            return;
        }

        setIsSubmitting(true);
        setTimeout(() => {
            handleSave();
            setIsSubmitting(false);
        }, 1000);
    };

    const handlePrint = () => { window.print(); };

    const handleDownloadPdf = () => {
        if (!printRef.current) return;
        setIsDownloading(true);
        const { jsPDF } = (window as any).jspdf;
        const html2canvas = (window as any).html2canvas;

        html2canvas(printRef.current, { scale: 2, useCORS: true, logging: false, })
            .then((canvas: HTMLCanvasElement) => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const imgHeight = (canvas.height * pdfWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
                pdf.save(`Return-${docNumber}.pdf`);
                setIsDownloading(false);
                addNotification('PDF berhasil diunduh.', 'success');
            }).catch(() => {
                addNotification('Gagal membuat PDF.', 'error');
                setIsDownloading(false);
            });
    };

    // --- RENDER FOR FORM (CREATION) ---
    if (!isReadOnly) {
        if (targetAssets.length === 0 && !returnDocument) {
             return (
                <div className="p-8 text-center text-gray-600 bg-white rounded-lg shadow-sm">
                    <h2 className="text-xl font-bold">Data Tidak Ditemukan</h2>
                    <p>Tidak ada aset yang dipilih untuk dikembalikan. Silakan kembali.</p>
                    <button onClick={onCancel} className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-tm-primary rounded-lg">Kembali</button>
                </div>
            );
        }
        
        // Use simpler layout for FORM creation (similar to LoanRequestForm)
        return (
             <div className="p-4 sm:p-6 md:p-8">
                <div className="p-6 bg-white border border-gray-200/80 rounded-xl shadow-md pb-24 max-w-4xl mx-auto">
                    <form id={formId} onSubmit={handleSubmit} className="space-y-6">
                        <Letterhead />
                        <div className="text-center">
                            <h3 className="text-xl font-bold uppercase text-tm-dark">Formulir Pengembalian Aset</h3>
                        </div>

                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-500 font-medium">Tanggal Pengembalian</label>
                                <div className="mt-1"><DatePicker id="returnDate" selectedDate={returnDate} onDateChange={setReturnDate} /></div>
                            </div>
                            <div>
                                <label className="block text-gray-500 font-medium">No. Dokumen</label>
                                <input className="w-full mt-1 p-2 bg-gray-100 border rounded text-gray-700 font-mono" value={docNumber} readOnly />
                            </div>
                            <div>
                                <label className="block text-gray-500 font-medium">Referensi Peminjaman</label>
                                <input className="w-full mt-1 p-2 bg-gray-100 border rounded text-gray-700" value={loanRequest?.id || '-'} readOnly />
                            </div>
                             <div>
                                <label className="block text-gray-500 font-medium">Pemohon</label>
                                <input className="w-full mt-1 p-2 bg-gray-100 border rounded text-gray-700" value={loanRequest?.requester || currentUser.name} readOnly />
                            </div>
                        </div>

                        <section className="mt-6 pt-4 border-t">
                             <h4 className="font-semibold text-gray-800 mb-3">
                                {targetAssets.length > 1 ? `Aset yang Dikembalikan (${targetAssets.length})` : "Aset Dikembalikan"}
                             </h4>
                            <div className="overflow-x-auto border rounded-lg max-h-64 custom-scrollbar">
                                <table className="min-w-full text-left text-sm">
                                    <thead className="bg-gray-100 text-xs uppercase text-gray-700 sticky top-0">
                                        <tr>
                                            <th className="p-3">Nama Aset</th>
                                            <th className="p-3">ID Aset</th>
                                            <th className="p-3">Serial Number</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {targetAssets.map((asset) => (
                                            <tr key={asset.id} className="border-b last:border-b-0 hover:bg-gray-50">
                                                <td className="p-3 font-semibold text-gray-800">{asset.name}</td>
                                                <td className="p-3 font-mono text-gray-600">{asset.id}</td>
                                                <td className="p-3 font-mono text-gray-600 break-words">{asset.serialNumber || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kondisi Pengembalian</label>
                                <CustomSelect 
                                    options={Object.values(AssetCondition).map(c => ({value: c, label: c}))} 
                                    value={returnedCondition} 
                                    onChange={(v) => setReturnedCondition(v as AssetCondition)} 
                                />
                                {targetAssets.length > 1 && <p className="text-xs text-gray-500 mt-1">*Kondisi ini akan diterapkan untuk semua aset yang dipilih.</p>}
                            </div>
                            <div>
                                <label htmlFor="returnNotes" className="block text-sm font-medium text-gray-700 mb-1">Catatan Tambahan</label>
                                <textarea id="returnNotes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="block w-full px-3 py-2 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-lg shadow-sm sm:text-sm" placeholder="Catatan mengenai kondisi aset..."></textarea>
                            </div>
                        </div>

                         <div ref={footerRef} className="flex justify-end pt-6 mt-6 border-t border-gray-200">
                            <button type="button" onClick={onCancel} className="px-4 py-2 mr-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
                            <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover disabled:bg-tm-primary/70">
                                {isSubmitting && <SpinnerIcon className="w-4 h-4 mr-2" />}
                                Konfirmasi Pengembalian
                            </button>
                        </div>
                    </form>
                     <FloatingActionBar isVisible={!isFooterVisible}>
                        <div className="flex gap-2">
                            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
                            <button type="submit" form={formId} disabled={isSubmitting} className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover">
                                Konfirmasi Pengembalian
                            </button>
                        </div>
                    </FloatingActionBar>
                </div>
            </div>
        );
    }

    // --- RENDER FOR DETAIL (READ ONLY) ---
    // This uses the DetailPageLayout to match LoanRequestDetailPage
    
    if (!returnDocument) return <div>Dokumen tidak ditemukan.</div>;

    return (
        <DetailPageLayout
            title={`Detail Pengembalian: ${returnDocument.docNumber}`}
            onBack={onCancel}
            headerActions={
                <div className="flex items-center gap-2">
                   <button onClick={handlePrint} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border rounded-lg shadow-sm hover:bg-gray-50"><PrintIcon className="w-4 h-4"/> Cetak</button>
                   <button onClick={handleDownloadPdf} disabled={isDownloading} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover disabled:bg-tm-primary/70">{isDownloading ? <SpinnerIcon className="w-4 h-4"/> : <DownloadIcon className="w-4 h-4" />}{isDownloading ? 'Mengunduh...' : 'Unduh PDF'}</button>
               </div>
            }
            mainColClassName={isActionSidebarExpanded ? 'lg:col-span-8' : 'lg:col-span-11'}
            asideColClassName={isActionSidebarExpanded ? 'lg:col-span-4' : 'lg:col-span-1'}
            aside={
                <ReturnStatusSidebar 
                    returnDocument={returnDocument}
                    currentUser={currentUser}
                    isLoading={isSubmitting}
                    isExpanded={isActionSidebarExpanded}
                    onToggleVisibility={() => setIsActionSidebarExpanded(p => !p)}
                    onApprove={handleApprove}
                    onReject={() => setIsRejectModalOpen(true)}
                />
            }
        >
            <div ref={printRef} className="p-8 bg-white border border-gray-200/80 rounded-xl shadow-sm space-y-8">
                <Letterhead />
                <div className="text-center">
                    <h3 className="text-xl font-bold uppercase text-tm-dark">Berita Acara Pengembalian Aset</h3>
                    <p className="text-sm text-tm-secondary">Nomor: {returnDocument.docNumber}</p>
                </div>

                <section>
                     <dl className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2 text-sm">
                        <div><label className="block font-medium text-gray-500">Tanggal Pengembalian</label><p className="font-semibold text-gray-800">{new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(returnDocument.returnDate))}</p></div>
                        <div><label className="block font-medium text-gray-500">Referensi Peminjaman</label><p className="font-semibold text-gray-800">{returnDocument.loanDocNumber}</p></div>
                        <div><label className="block font-medium text-gray-500">Dikembalikan Oleh</label><p className="font-semibold text-gray-800">{returnDocument.returnedBy}</p></div>
                        <div><label className="block font-medium text-gray-500">Divisi</label><p className="font-semibold text-gray-800">{borrowerDivision}</p></div>
                    </dl>
                </section>

                <section>
                    <h4 className="font-semibold text-gray-800 border-b pb-1 mb-2">Detail Aset</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                                <tr>
                                    <th className="p-2 w-10">No.</th>
                                    <th className="p-2">Nama Barang</th>
                                    <th className="p-2">ID Aset</th>
                                    <th className="p-2">Kondisi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {targetAssets.map((asset, index) => (
                                    <tr key={asset.id} className="border-b">
                                        <td className="p-2 text-center">{index + 1}.</td>
                                        <td className="p-2 font-semibold text-gray-800">{asset.name}</td>
                                        <td className="p-2 font-mono text-gray-600">{asset.id}</td>
                                        <td className="p-2">
                                            <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs font-semibold border">{returnDocument.returnedCondition}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
                
                {returnDocument.notes && (
                    <section>
                         <h4 className="font-semibold text-gray-800 border-b pb-1 mb-2">Catatan</h4>
                         <p className="text-sm text-gray-600 italic p-3 bg-gray-50 border rounded-md">"{returnDocument.notes}"</p>
                    </section>
                )}

                {returnDocument.status === AssetReturnStatus.REJECTED && returnDocument.rejectionReason && (
                    <section className="bg-red-50 p-4 border border-red-200 rounded-lg">
                         <h4 className="font-bold text-red-800 text-sm mb-1">Alasan Penolakan:</h4>
                         <p className="text-sm text-red-700 italic">"{returnDocument.rejectionReason}"</p>
                    </section>
                )}

                <section className="pt-8">
                    <h4 className="font-semibold text-gray-800 border-b pb-1 mb-6">Persetujuan</h4>
                    <div className="grid grid-cols-1 text-sm text-center gap-y-6 sm:grid-cols-3">
                        <div>
                            <p className="font-semibold text-gray-600">Yang Mengembalikan,</p>
                            <div className="flex items-center justify-center mt-2 h-28">
                                <SignatureStamp signerName={returnDocument.returnedBy} signatureDate={returnDocument.returnDate} signerDivision={borrowerDivision} />
                            </div>
                            <p className="pt-1 mt-2 border-t border-gray-400">({returnDocument.returnedBy})</p>
                        </div>
                        <div>
                            <p className="font-semibold text-gray-600">Diterima (Logistik),</p>
                            <div className="flex items-center justify-center mt-2 h-28">
                                {returnDocument.status === AssetReturnStatus.APPROVED && returnDocument.approvedBy && <ApprovalStamp approverName={returnDocument.approvedBy} approvalDate={returnDocument.approvalDate!} />}
                                {returnDocument.status === AssetReturnStatus.REJECTED && returnDocument.rejectedBy && <RejectionStamp rejectorName={returnDocument.rejectedBy} rejectionDate={returnDocument.rejectionDate!} />}
                                {returnDocument.status === AssetReturnStatus.PENDING_APPROVAL && <span className="italic text-gray-400">Menunggu Verifikasi</span>}
                            </div>
                            <p className="pt-1 mt-2 border-t border-gray-400">({returnDocument.status === AssetReturnStatus.APPROVED ? returnDocument.approvedBy : '.........................'})</p>
                        </div>
                        <div>
                            <p className="font-semibold text-gray-600">Mengetahui,</p>
                             <div className="flex items-center justify-center mt-2 h-28">
                                <SignatureStamp signerName={returnDocument.acknowledgedBy || 'Super Admin'} signatureDate={returnDocument.returnDate} />
                            </div>
                            <p className="pt-1 mt-2 border-t border-gray-400">({returnDocument.acknowledgedBy || 'Super Admin'})</p>
                        </div>
                    </div>
                </section>
            </div>

            <Modal isOpen={isRejectModalOpen} onClose={() => setIsRejectModalOpen(false)} title="Tolak Pengembalian Aset">
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">Harap berikan alasan penolakan. Status aset akan dikembalikan menjadi 'Digunakan'.</p>
                    <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={3} className="w-full text-sm border-gray-300 rounded-md focus:ring-tm-accent focus:border-tm-accent " placeholder="Contoh: Kondisi aset tidak sesuai laporan, aksesoris kurang..."></textarea>
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                    <button onClick={() => setIsRejectModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
                    <button onClick={handleReject} disabled={!rejectionReason.trim()} className="px-4 py-2 text-sm font-medium text-white bg-danger rounded-lg shadow-sm hover:bg-red-700 disabled:bg-red-300">Kirim Penolakan</button>
                </div>
            </Modal>
        </DetailPageLayout>
    );
};

export default ReturnAssetFormPage;
