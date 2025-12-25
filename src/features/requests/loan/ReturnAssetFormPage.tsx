
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
import { Checkbox } from '../../../components/ui/Checkbox';

// Stores
import { useRequestStore } from '../../../stores/useRequestStore';
import { useAssetStore } from '../../../stores/useAssetStore';
import { useMasterDataStore } from '../../../stores/useMasterDataStore';
import { useUIStore } from '../../../stores/useUIStore';

// Imported Components
import { ReturnStatusSidebar } from './components/ReturnStatusSidebar';
import { getStatusClass } from '../../assetRegistration/RegistrationPage';

interface ReturnAssetFormPageProps {
    currentUser: User;
    onCancel: () => void;
    loanRequest?: LoanRequest; 
    assetsToReturn?: Asset[]; 
    returnDocument?: AssetReturn;
    isReadOnly?: boolean;
    onShowPreview: (data: PreviewData) => void;
}

const ReturnAssetFormPage: React.FC<ReturnAssetFormPageProps> = ({ 
    currentUser, 
    onCancel, 
    loanRequest: propLoanRequest, 
    assetsToReturn: propAssetsToReturn = [], 
    returnDocument: propReturnDocument,
    isReadOnly = false,
    onShowPreview
}) => {
    // Store Hooks
    const returns = useRequestStore(state => state.returns);
    const submitReturnRequest = useRequestStore(state => state.submitReturnRequest);
    const processReturnBatch = useRequestStore(state => state.processReturnBatch);
    const setActivePage = useUIStore(state => state.setActivePage);
    const allAssets = useAssetStore(state => state.assets);
    
    const users = useMasterDataStore(state => state.users);
    const divisions = useMasterDataStore(state => state.divisions);

    const [returnDate, setReturnDate] = useState<Date | null>(new Date());
    const [docNumber, setDocNumber] = useState('');
    
    const [returnDetails, setReturnDetails] = useState<Record<string, { condition: AssetCondition; notes: string }>>({});
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFooterVisible, setIsFooterVisible] = useState(true);
    const footerRef = useRef<HTMLDivElement>(null);
    const printRef = useRef<HTMLDivElement>(null);
    const formId = "return-asset-form";
    const addNotification = useNotification();
    
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isActionSidebarExpanded, setIsActionSidebarExpanded] = useState(true);

    const loanRequest = propLoanRequest;
    const returnDocument = propReturnDocument;
    const targetAssets = propAssetsToReturn;
    
    // Approval Mode State
    const isApprovalMode = isReadOnly && returnDocument?.status === AssetReturnStatus.PENDING_APPROVAL && ['Admin Logistik', 'Super Admin'].includes(currentUser.role);
    const [verifiedAssetIds, setVerifiedAssetIds] = useState<string[]>([]);

    useEffect(() => {
        if (isApprovalMode) {
            setVerifiedAssetIds(targetAssets.map(a => a.id));
        }
    }, [isApprovalMode, targetAssets]);

    const handleToggleAssetVerification = (assetId: string) => {
        setVerifiedAssetIds(prev => 
            prev.includes(assetId) ? prev.filter(id => id !== assetId) : [...prev, assetId]
        );
    };

    const handleToggleAllVerification = () => {
        if (verifiedAssetIds.length === targetAssets.length) {
            setVerifiedAssetIds([]);
        } else {
            setVerifiedAssetIds(targetAssets.map(a => a.id));
        }
    };

    const handleVerification = async () => {
        if (!loanRequest || !isApprovalMode) return;
        setIsSubmitting(true);
        try {
            await processReturnBatch(loanRequest.id, verifiedAssetIds, currentUser.name);
            if (verifiedAssetIds.length > 0) {
                addNotification(`${verifiedAssetIds.length} aset berhasil diterima dan dikembalikan ke stok.`, 'success');
            }
            const rejectedCount = targetAssets.length - verifiedAssetIds.length;
            if (rejectedCount > 0) {
                addNotification(`${rejectedCount} aset ditolak dan statusnya dikembalikan ke peminjam.`, 'warning');
            }
            onCancel(); // Go back to list page
        } catch (e: any) {
            addNotification(e.message || 'Gagal memproses pengembalian.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getDivisionForUser = (userName: string): string => {
        const user = users.find(u => u.name === userName);
        if (!user || !user.divisionId) return '';
        const division = divisions.find(d => d.id === user.divisionId);
        return division ? `Divisi ${division.name}` : '';
    };

    useEffect(() => {
        if (!isReadOnly && propAssetsToReturn.length > 0) {
            const initialDetails: Record<string, { condition: AssetCondition; notes: string }> = {};
            propAssetsToReturn.forEach(asset => {
                initialDetails[asset.id] = {
                    condition: AssetCondition.USED_OKAY,
                    notes: '',
                };
            });
            setReturnDetails(initialDetails);
        }
    }, [propAssetsToReturn, isReadOnly]);


    useEffect(() => {
        if (!isReadOnly) {
            const newDocNumber = generateDocumentNumber('RET', returns, returnDate || new Date());
            setDocNumber(newDocNumber);
        } else if (returnDocument) {
             setDocNumber(returnDocument.docNumber);
             setReturnDate(new Date(returnDocument.returnDate));
        }
    }, [returnDate, returns, isReadOnly, returnDocument]);
    
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => setIsFooterVisible(entry.isIntersecting), { threshold: 0.1 });
        const currentRef = footerRef.current;
        if (currentRef) observer.observe(currentRef);
        return () => { if (currentRef) observer.unobserve(currentRef); };
    }, []);

    const handleDetailChange = (assetId: string, field: 'condition' | 'notes', value: string) => {
        setReturnDetails(prev => {
            const currentItemDetails = prev[assetId] || { condition: AssetCondition.USED_OKAY, notes: '' };
            const updatedItemDetails = { ...currentItemDetails, [field]: value };
            return {
                ...prev,
                [assetId]: updatedItemDetails,
            };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isReadOnly || !loanRequest || targetAssets.length === 0) return;

        setIsSubmitting(true);
        try {
            const returnItemsPayload = Object.entries(returnDetails).map(([assetId, details]) => {
                // FIX: Explicitly cast 'details' as its type is inferred as 'unknown' from Object.entries.
                const typedDetails = details as { condition: AssetCondition; notes: string };
                return {
                    assetId,
                    condition: typedDetails.condition,
                    notes: typedDetails.notes,
                };
            });

            await submitReturnRequest(loanRequest.id, returnItemsPayload);
            addNotification(`Request pengembalian ${docNumber} berhasil diajukan.`, 'success');
        } catch (error) {
            addNotification('Gagal mengajukan pengembalian.', 'error');
        } finally {
            setIsSubmitting(false);
        }
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

    const ActionButtons: React.FC = () => (
        <>
            <button type="button" onClick={onCancel} className="px-5 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
            <button type="submit" form={formId} disabled={isSubmitting} className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover disabled:bg-tm-primary/70">
                {isSubmitting ? <SpinnerIcon className="w-4 h-4 mr-2" /> : null}
                Ajukan Pengembalian
            </button>
        </>
    );

    if (!isReadOnly) {
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
                                <label className="block text-gray-500 font-medium">Referensi Pinjaman</label>
                                <input className="w-full mt-1 p-2 bg-gray-100 border rounded text-gray-700" value={loanRequest?.id || '-'} readOnly />
                            </div>
                             <div>
                                <label className="block text-gray-500 font-medium">Dikembalikan Oleh</label>
                                <input className="w-full mt-1 p-2 bg-gray-100 border rounded text-gray-700" value={currentUser.name} readOnly />
                            </div>
                        </div>

                        {loanRequest?.assignedAssetIds && (
                             <section className="mt-6 pt-4 border-t">
                                <h4 className="font-semibold text-gray-800 mb-3">Aset yang Dipinjam</h4>
                                <div className="overflow-x-auto border rounded-lg">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                                            <tr>
                                                <th className="p-2">Nama Aset</th>
                                                <th className="p-2">ID Aset</th>
                                                <th className="p-2">SN</th>
                                                <th className="p-2">MAC</th>
                                                <th className="p-2">Kondisi</th>
                                                <th className="p-2">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.values(loanRequest.assignedAssetIds).flat().map((assetId: string) => {
                                                const asset = allAssets.find(a => a.id === assetId);
                                                if (!asset) return null;
                                                const isReturned = loanRequest.returnedAssetIds?.includes(assetId);
                                                return (
                                                    <tr key={assetId} className={`border-b ${isReturned ? 'bg-green-50/60 text-gray-500' : ''}`}>
                                                        <td className="p-2 font-semibold text-gray-800">
                                                             <ClickableLink onClick={() => onShowPreview({ type: 'asset', id: assetId })}>{asset.name}</ClickableLink>
                                                        </td>
                                                        <td className="p-2 font-mono text-gray-600">{assetId}</td>
                                                        <td className="p-2 font-mono text-gray-600">{asset.serialNumber || '-'}</td>
                                                        <td className="p-2 font-mono text-gray-600">{asset.macAddress || '-'}</td>
                                                        <td className="p-2 text-gray-600">{asset.condition}</td>
                                                        <td className="p-2">
                                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusClass(asset.status)}`}>
                                                                {asset.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        <section className="mt-6 pt-4 border-t">
                             <h4 className="font-semibold text-gray-800 mb-3">Detail pengembalian</h4>
                            <div className="overflow-x-auto border rounded-lg">
                                <table className="min-w-full text-left text-sm">
                                    <thead className="bg-gray-100 text-xs uppercase text-gray-700 sticky top-0">
                                        <tr>
                                            <th className="p-3">Nama Aset</th>
                                            <th className="p-3">ID & SN</th>
                                            <th className="p-3 w-48">Kondisi Saat Kembali</th>
                                            <th className="p-3 w-64">Catatan</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {targetAssets.map((asset) => (
                                            <tr key={asset.id} className="border-b last:border-b-0 bg-white">
                                                <td className="p-3 font-semibold text-gray-800">{asset.name}</td>
                                                <td className="p-3 font-mono text-gray-600">
                                                    <div>{asset.id}</div>
                                                    <div className="text-xs text-gray-400">SN: {asset.serialNumber || '-'}</div>
                                                </td>
                                                <td className="p-3">
                                                    <CustomSelect 
                                                        options={Object.values(AssetCondition).map(c => ({value: c, label: c}))} 
                                                        value={returnDetails[asset.id]?.condition || AssetCondition.USED_OKAY} 
                                                        onChange={(v) => handleDetailChange(asset.id, 'condition', v as AssetCondition)} 
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <input 
                                                        type="text"
                                                        value={returnDetails[asset.id]?.notes || ''}
                                                        onChange={(e) => handleDetailChange(asset.id, 'notes', e.target.value)}
                                                        className="block w-full px-3 py-2 text-gray-900 placeholder:text-gray-400 bg-white border border-gray-300 rounded-lg shadow-sm sm:text-sm"
                                                        placeholder="Opsional..."
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                        
                        <section className="pt-8 mt-6 border-t border-gray-200">
                             <div className="grid grid-cols-1 text-sm text-center gap-y-8 md:grid-cols-2 md:gap-x-8">
                                <div>
                                    <p className="font-semibold text-gray-700">Yang Mengembalikan,</p>
                                    <div className="flex items-center justify-center mt-2 h-28"><SignatureStamp signerName={currentUser.name} signatureDate={new Date().toISOString()} signerDivision={getDivisionForUser(currentUser.name)} /></div>
                                    <p className="pt-1 mt-2 border-t border-gray-400 text-gray-600">{currentUser.name}</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-700">Diterima (Admin Logistik),</p>
                                    <div className="flex items-center justify-center mt-2 h-28"><span className="text-sm italic text-gray-400">Menunggu Verifikasi</span></div>
                                    <p className="pt-1 mt-2 border-t border-gray-400 text-gray-600">.........................................</p>
                                </div>
                            </div>
                        </section>

                         <div ref={footerRef} className="flex justify-end pt-6 mt-6 border-t border-gray-200">
                            <ActionButtons />
                        </div>
                    </form>
                     <FloatingActionBar isVisible={!isFooterVisible}>
                        <div className="flex gap-2">
                           <ActionButtons />
                        </div>
                    </FloatingActionBar>
                </div>
            </div>
        );
    }
    
    // --- RENDER DETAIL VIEW ---
    if (!returnDocument || !loanRequest) return <div>Dokumen tidak ditemukan.</div>;
    
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
                    onApprove={handleVerification}
                    isApprovalMode={isApprovalMode}
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
                    <dl className="grid grid-cols-1 gap-4 sm:gap-x-8 sm:gap-y-4 md:grid-cols-2 text-sm">
                        <div>
                            <label className="block font-medium text-gray-500">No. Dokumen Pengembalian</label>
                            <p className="font-semibold text-gray-800 font-mono">{returnDocument.docNumber}</p>
                        </div>
                        <div>
                            <label className="block font-medium text-gray-500">No. Dokumen Peminjaman</label>
                            <p className="font-semibold text-gray-800">
                                <ClickableLink onClick={() => setActivePage('request-pinjam', { openDetailForId: returnDocument.loanRequestId })}>
                                    {returnDocument.loanRequestId}
                                </ClickableLink>
                            </p>
                        </div>
                        <div>
                            <label className="block font-medium text-gray-500">Tanggal Peminjaman</label>
                            <p className="font-semibold text-gray-800">{loanRequest.approvalDate ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(loanRequest.approvalDate)) : '-'}</p>
                        </div>
                        <div>
                            <label className="block font-medium text-gray-500">Tanggal Pengembalian</label>
                            <p className="font-semibold text-gray-800">{new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(returnDocument.returnDate))}</p>
                        </div>
                        <div>
                            <label className="block font-medium text-gray-500">Peminjam</label>
                            <p className="font-semibold text-gray-800">{loanRequest.requester}</p>
                        </div>
                        <div>
                            <label className="block font-medium text-gray-500">Divisi</label>
                            <p className="font-semibold text-gray-800">{loanRequest.division}</p>
                        </div>
                    </dl>
                </section>
                
                <section className="pt-4 border-t">
                    <h4 className="font-semibold text-gray-800 border-b pb-1 mb-2">Detail pengembalian</h4>
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-left text-sm">
                           <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                                <tr>
                                    {isApprovalMode && (
                                        <th className="p-3 w-12 text-center">
                                            <Checkbox
                                                id="verify-all-assets"
                                                checked={verifiedAssetIds.length > 0 && verifiedAssetIds.length === targetAssets.length}
                                                indeterminate={verifiedAssetIds.length > 0 && verifiedAssetIds.length < targetAssets.length}
                                                onChange={handleToggleAllVerification}
                                            />
                                        </th>
                                    )}
                                    <th className="p-3">Nama Aset</th>
                                    <th className="p-3">ID & SN</th>
                                    <th className="p-3">Kondisi Kembali</th>
                                    <th className="p-3">Catatan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {targetAssets.map((asset) => {
                                    const specificReturnDoc = returns.find(r => r.docNumber === returnDocument.docNumber && r.assetId === asset.id);
                                    return (
                                        <tr key={asset.id} className={`border-b last:border-b-0 transition-colors ${isApprovalMode && !verifiedAssetIds.includes(asset.id) ? 'bg-red-50/50' : 'bg-white'}`}>
                                             {isApprovalMode && (
                                                <td className="p-3 text-center">
                                                    <Checkbox
                                                        id={`verify-${asset.id}`}
                                                        checked={verifiedAssetIds.includes(asset.id)}
                                                        onChange={() => handleToggleAssetVerification(asset.id)}
                                                    />
                                                </td>
                                            )}
                                            <td className="p-3 font-semibold text-gray-800">{asset.name}</td>
                                            <td className="p-3 font-mono text-gray-600">
                                                <div>{asset.id}</div>
                                                <div className="text-xs text-gray-400">SN: {asset.serialNumber || '-'}</div>
                                            </td>
                                            <td className="p-3 font-medium text-gray-800">{specificReturnDoc?.returnedCondition || '-'}</td>
                                            <td className="p-3 text-xs italic text-gray-500">"{specificReturnDoc?.notes || '-'}"</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
                
                <section className="pt-8">
                    <h4 className="font-semibold text-gray-800 border-b pb-1 mb-6">Persetujuan</h4>
                    <div className="grid grid-cols-1 text-sm text-center gap-y-6 sm:grid-cols-2">
                        <div>
                            <p className="font-semibold text-gray-600">Yang Mengembalikan,</p>
                            <div className="flex items-center justify-center mt-2 h-28">
                                <SignatureStamp signerName={returnDocument.returnedBy} signatureDate={returnDocument.returnDate} signerDivision={getDivisionForUser(returnDocument.returnedBy)} />
                            </div>
                            <p className="pt-1 mt-2 border-t border-gray-400">({returnDocument.returnedBy})</p>
                        </div>
                        <div>
                            <p className="font-semibold text-gray-600">Diterima (Admin Logistik),</p>
                            <div className="flex items-center justify-center mt-2 h-28">
                                {returnDocument.status === AssetReturnStatus.REJECTED && returnDocument.rejectedBy && <RejectionStamp rejectorName={returnDocument.rejectedBy} rejectionDate={returnDocument.rejectionDate!} />}
                                {returnDocument.status === AssetReturnStatus.APPROVED && returnDocument.approvedBy && <ApprovalStamp approverName={returnDocument.approvedBy} approvalDate={returnDocument.approvalDate!} />}
                                {returnDocument.status === AssetReturnStatus.PENDING_APPROVAL && <span className="italic text-gray-400">Menunggu Verifikasi</span>}
                            </div>
                            <p className="pt-1 mt-2 border-t border-gray-400">({returnDocument.approvedBy || returnDocument.rejectedBy || '.........................'})</p>
                        </div>
                    </div>
                </section>
            </div>
        </DetailPageLayout>
    );
};

export default ReturnAssetFormPage;
