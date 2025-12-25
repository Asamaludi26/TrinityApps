
import React, { useState, useRef, useMemo } from 'react';
import { LoanRequest, User, Asset, Division, PreviewData, LoanRequestStatus, AssetCategory, ParsedScanResult, Page, AssetStatus, AssetCondition, AssetReturnStatus } from '../../../types';
import { DetailPageLayout } from '../../../components/layout/DetailPageLayout';
import { Letterhead } from '../../../components/ui/Letterhead';
import { SignatureStamp } from '../../../components/ui/SignatureStamp';
import { ApprovalStamp } from '../../../components/ui/ApprovalStamp';
import { RejectionStamp } from '../../../components/ui/RejectionStamp';
import { ClickableLink } from '../../../components/ui/ClickableLink';
import { SpinnerIcon } from '../../../components/icons/SpinnerIcon';
import { PrintIcon } from '../../../components/icons/PrintIcon';
import { DownloadIcon } from '../../../components/icons/DownloadIcon';
import { useNotification } from '../../../providers/NotificationProvider';

// Imported Components
import { AssignmentPanel } from './components/AssignmentPanel';
import { LoanActionSidebar } from './components/LoanActionSidebar';
import { ReturnSelectionModal } from './components/ReturnSelectionModal';

// Store Import (Required for re-fetching data)
import { useAssetStore } from '../../../stores/useAssetStore';
import { useRequestStore } from '../../../stores/useRequestStore';

interface LoanRequestDetailPageProps {
    loanRequest: LoanRequest;
    currentUser: User;
    assets: Asset[];
    users: User[];
    divisions: Division[];
    assetCategories: AssetCategory[];
    onBackToList: () => void;
    onShowPreview: (data: PreviewData) => void;
    onAssignAndApprove: (request: LoanRequest, result: { itemStatuses: any, assignedAssetIds: any }) => void;
    onReject: (request: LoanRequest) => void;
    onInitiateHandoverFromLoan: (request: LoanRequest) => void;
    isLoading: boolean;
    setIsGlobalScannerOpen: (isOpen: boolean) => void;
    setScanContext: (context: 'global' | 'form') => void;
    setFormScanCallback: (callback: ((data: ParsedScanResult) => void) | null) => void;
    setActivePage: (page: Page, filters?: any) => void;
}

const LoanRequestDetailPage: React.FC<LoanRequestDetailPageProps> = (props) => {
    const { loanRequest, currentUser, assets, users, divisions, assetCategories, onAssignAndApprove, setIsGlobalScannerOpen, setScanContext, setFormScanCallback, setActivePage, onShowPreview } = props;
    const [isActionSidebarExpanded, setIsActionSidebarExpanded] = useState(true);
    
    // Modal Control State
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    
    // NEW STATE for Inline Panel Visibility
    const [isAssignmentPanelOpen, setIsAssignmentPanelOpen] = useState(false);
    const [isFetchingAssets, setIsFetchingAssets] = useState(false);

    const printRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const addNotification = useNotification();
    
    // Store Actions
    const fetchAssets = useAssetStore(state => state.fetchAssets);
    const returns = useRequestStore(state => state.returns);
    
    // Only fetch necessary data for the panel
    const availableAssetsForLoan = useMemo(() => assets.filter(a => a.status === 'Di Gudang'), [assets]);
    const panelRef = useRef<HTMLDivElement>(null);

    const getDivisionForUser = (userName: string): string => {
        const user = users.find(u => u.name === userName);
        if (!user || !user.divisionId) return '';
        const division = divisions.find(d => d.id === user.divisionId);
        return division ? `Divisi ${division.name}` : '';
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
                const canvasWidth = canvas.width;
                const canvasHeight = canvas.height;
                const canvasRatio = canvasWidth / canvasHeight;
                const imgHeight = pdfWidth / canvasRatio;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
                pdf.save(`LoanRequest-${loanRequest.id}.pdf`);
                setIsDownloading(false);
                addNotification('PDF berhasil diunduh.', 'success');
            }).catch(() => {
                addNotification('Gagal membuat PDF.', 'error');
                setIsDownloading(false);
            });
    };
    
    const handleOpenAssignment = async () => {
        setIsFetchingAssets(true);
        try {
            await fetchAssets();
            setIsAssignmentPanelOpen(true);
            setTimeout(() => {
                panelRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (error) {
            addNotification("Gagal menyinkronkan data aset terbaru.", "error");
        } finally {
            setIsFetchingAssets(false);
        }
    };

    const handleAssignmentConfirm = (result: { itemStatuses: any, assignedAssetIds: any }) => {
        onAssignAndApprove(loanRequest, result);
        setIsAssignmentPanelOpen(false);
    };
    
    const handleOpenReturnRequest = () => {
        setIsReturnModalOpen(true);
    };

    const handleOpenReturnApproval = () => {
        const pendingReturn = returns.find(r => r.loanRequestId === loanRequest.id && r.status === AssetReturnStatus.PENDING_APPROVAL);
        if (pendingReturn) {
            setActivePage('return-detail', { returnId: pendingReturn.id });
        } else {
            addNotification('Tidak ada pengajuan pengembalian yang menunggu verifikasi untuk pinjaman ini.', 'info');
        }
    };

    return (
        <DetailPageLayout
            title={`Detail Pinjam: ${loanRequest.id}`}
            onBack={props.onBackToList}
            headerActions={
                 <div className="flex items-center gap-2">
                    <button onClick={handlePrint} className="hidden sm:inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border rounded-lg shadow-sm hover:bg-gray-50"><PrintIcon className="w-4 h-4"/> Cetak</button>
                    <button onClick={handleDownloadPdf} disabled={isDownloading} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover disabled:bg-tm-primary/70">{isDownloading ? <SpinnerIcon className="w-4 h-4"/> : <DownloadIcon className="w-4 h-4" />}{isDownloading ? 'Mengunduh...' : 'Unduh PDF'}</button>
                </div>
            }
            mainColClassName={isActionSidebarExpanded ? 'lg:col-span-8' : 'lg:col-span-11'}
            asideColClassName={isActionSidebarExpanded ? 'lg:col-span-4' : 'lg:col-span-1'}
            aside={
                <LoanActionSidebar 
                    {...props} 
                    isLoading={props.isLoading || isFetchingAssets}
                    isExpanded={isActionSidebarExpanded} 
                    onToggleVisibility={() => setIsActionSidebarExpanded(p => !p)} 
                    onOpenAssignment={handleOpenAssignment}
                    onOpenReturnConfirmation={handleOpenReturnApproval} // Admin
                    onInitiateReturn={handleOpenReturnRequest} // Staff
                />
            }
        >
            <div className="space-y-8">
                <div ref={printRef} className="p-4 sm:p-8 bg-white border border-gray-200/80 rounded-xl shadow-sm space-y-6 sm:space-y-8">
                    <Letterhead />
                    <div className="text-center">
                        <h3 className="text-lg sm:text-xl font-bold uppercase text-tm-dark">Surat Permintaan Peminjaman Aset</h3>
                        <p className="text-sm text-tm-secondary">Nomor: {loanRequest.id}</p>
                    </div>

                    <section><dl className="grid grid-cols-1 gap-4 sm:gap-x-8 sm:gap-y-4 md:grid-cols-2 text-sm">
                        <div><label className="block font-medium text-gray-500">Tanggal</label><p className="font-semibold text-gray-800">{new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(loanRequest.requestDate))}</p></div>
                        <div><label className="block font-medium text-gray-500">Nama Pemohon</label><p className="font-semibold text-gray-800">{loanRequest.requester}</p></div>
                        <div><label className="block font-medium text-gray-500">Divisi</label><p className="font-semibold text-gray-800">{loanRequest.division}</p></div>
                        <div><label className="block font-medium text-gray-500">No Dokumen</label><p className="font-semibold text-gray-800">{loanRequest.id}</p></div>
                    </dl></section>
                    
                    <section>
                        <h4 className="font-semibold text-gray-800 border-b pb-1 mb-2">Detail Aset yang Diminta</h4>
                        <div className="overflow-x-auto border rounded-lg sm:border-none sm:rounded-none">
                            <table className="w-full text-left text-sm min-w-[600px] sm:min-w-0">
                                <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                                    <tr>
                                        <th className="p-2 w-10">No.</th>
                                        <th className="p-2">Nama Barang</th>
                                        <th className="p-2 text-center">Jumlah</th>
                                        <th className="p-2">Tgl Kembali</th>
                                        <th className="p-2">Catatan / Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loanRequest.items.map((item, index) => {
                                        const category = assetCategories.find(c => c.types.some(t => t.standardItems?.some(si => si.name === item.itemName && si.brand === item.brand)));
                                        const type = category?.types.find(t => t.standardItems?.some(si => si.name === item.itemName && si.brand === item.brand));
                                        const unitOfMeasure = type?.unitOfMeasure || 'unit';
                                        
                                        const itemStatus = loanRequest.itemStatuses?.[item.id];
                                        const isRejected = itemStatus?.status === 'rejected';
                                        const isPartial = itemStatus?.status === 'partial';
                                        const approvedQty = itemStatus ? itemStatus.approvedQuantity : item.quantity;

                                        return (
                                            <tr key={item.id} className={`border-b ${isRejected ? 'bg-red-50 text-gray-400' : ''}`}>
                                                <td className="p-2 text-center">{index + 1}.</td>
                                                <td className="p-2 font-semibold">
                                                    <span className={isRejected ? 'line-through' : 'text-gray-800'}>{item.itemName} - {item.brand}</span>
                                                    {isRejected && <span className="ml-2 text-xs text-white bg-red-500 px-1.5 rounded">DITOLAK</span>}
                                                    {isPartial && <span className="ml-2 text-xs text-white bg-amber-500 px-1.5 rounded">DIREVISI</span>}
                                                </td>
                                                <td className="p-2 text-center font-medium">
                                                    {isPartial || isRejected ? (
                                                        <span><s className="text-xs text-gray-400">{item.quantity}</s> <strong>{approvedQty}</strong></span>
                                                    ) : (
                                                        <span>{item.quantity}</span>
                                                    )} {unitOfMeasure}
                                                </td>
                                                <td className="p-2 text-gray-600">
                                                    {item.returnDate 
                                                        ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(item.returnDate)) 
                                                        : <span className="italic text-gray-500">Belum ditentukan</span>}
                                                </td>
                                                <td className="p-2 text-xs italic">
                                                    "{item.keterangan || '-'}"
                                                    {itemStatus?.reason && <div className="mt-1 font-bold not-italic text-amber-700">Admin: {itemStatus.reason}</div>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                    
                    {loanRequest.assignedAssetIds && Object.keys(loanRequest.assignedAssetIds).length > 0 && (
                        <section>
                            <h4 className="font-semibold text-gray-800 border-b pb-1 mb-2">Aset yang Dipinjamkan</h4>
                            <div className="overflow-x-auto custom-scrollbar border rounded-lg sm:border-none sm:rounded-none">
                                <table className="w-full text-left text-sm min-w-[600px] sm:min-w-0">
                                    <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                                        <tr>
                                            <th className="p-2 w-10">No.</th>
                                            <th className="p-2">Nama Aset</th>
                                            <th className="p-2">ID Aset</th>
                                            <th className="p-2">Serial Number</th>
                                            <th className="p-2">MAC Address</th>
                                            <th className="p-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.values(loanRequest.assignedAssetIds).flat().map((assetId: string, index) => {
                                            const asset = assets.find(a => a.id === assetId);
                                            if (!asset) return null;
                                            const isReturned = loanRequest.returnedAssetIds?.includes(assetId);
                                            
                                            // Handle status visual override based on real status
                                            let statusBadge;
                                            if (asset.status === AssetStatus.AWAITING_RETURN) {
                                                 statusBadge = <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-semibold border border-orange-200">Menunggu Verifikasi</span>;
                                            } else if (isReturned || asset.status === AssetStatus.IN_STORAGE) {
                                                 statusBadge = <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded font-semibold">Dikembalikan</span>;
                                            } else {
                                                 statusBadge = <span className="text-xs bg-blue-50 text-blue-800 px-2 py-0.5 rounded">Dipinjam</span>;
                                            }

                                            return (
                                                <tr key={assetId} className="border-b">
                                                    <td className="p-2 text-center text-gray-800">{index + 1}.</td>
                                                    <td className="p-2 font-semibold text-gray-800">
                                                        <ClickableLink onClick={() => onShowPreview({ type: 'asset', id: assetId })}>
                                                            {asset.name}
                                                        </ClickableLink>
                                                    </td>
                                                    <td className="p-2 font-mono text-gray-600">{assetId}</td>
                                                    <td className="p-2 font-mono text-gray-600">{asset.serialNumber || '-'}</td>
                                                    <td className="p-2 font-mono text-gray-600">{asset.macAddress || 'N/A'}</td>
                                                    <td className="p-2 text-center">
                                                        {statusBadge}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {loanRequest.notes && (<section><h4 className="font-semibold text-gray-800 border-b pb-1 mb-2">Alasan Peminjaman</h4><p className="text-sm text-gray-700 italic p-3 bg-gray-50 border rounded-md">"{loanRequest.notes}"</p></section>)}
                    
                    <section className="pt-8"><h4 className="font-semibold text-gray-800 border-b pb-1 mb-6">Persetujuan</h4><div className="grid grid-cols-1 text-sm text-center gap-y-6 sm:grid-cols-2">
                        <div><p className="font-semibold text-gray-600">Pemohon,</p><div className="flex items-center justify-center mt-2 h-28"><SignatureStamp signerName={loanRequest.requester} signatureDate={loanRequest.requestDate} signerDivision={getDivisionForUser(loanRequest.requester)} /></div><p className="pt-1 mt-2 border-t border-gray-400">({loanRequest.requester})</p></div>
                        <div><p className="font-semibold text-gray-600">Mengetahui (Admin Logistik),</p><div className="flex items-center justify-center mt-2 h-28">
                            {loanRequest.status === LoanRequestStatus.REJECTED && loanRequest.approver && <RejectionStamp rejectorName={loanRequest.approver} rejectionDate={loanRequest.approvalDate!} />}
                            {/* FIX: Corrected typo from 'LoanRequestS' to 'LoanRequestStatus' */}
                            {loanRequest.status !== LoanRequestStatus.PENDING && loanRequest.status !== LoanRequestStatus.REJECTED && loanRequest.approver && <ApprovalStamp approverName={loanRequest.approver} approvalDate={loanRequest.approvalDate!} />}
                            {loanRequest.status === LoanRequestStatus.PENDING && <span className="italic text-gray-400">Menunggu Persetujuan</span>}
                        </div><p className="pt-1 mt-2 border-t border-gray-400">({loanRequest.approver || '.........................'})</p></div>
                    </div></section>
                </div>

                {isAssignmentPanelOpen && (
                    <div ref={panelRef}>
                        <AssignmentPanel
                            request={loanRequest}
                            availableAssets={availableAssetsForLoan}
                            assetCategories={assetCategories}
                            onConfirm={handleAssignmentConfirm}
                            onCancel={() => setIsAssignmentPanelOpen(false)}
                            setIsGlobalScannerOpen={setIsGlobalScannerOpen}
                            setScanContext={setScanContext}
                            setFormScanCallback={setFormScanCallback}
                        />
                    </div>
                )}
            </div>

            {isReturnModalOpen && (
                <ReturnSelectionModal
                    isOpen={isReturnModalOpen}
                    onClose={() => setIsReturnModalOpen(false)}
                    request={loanRequest}
                    assets={assets}
                    targetStatus={AssetStatus.IN_USE}
                    title="Ajukan Pengembalian Aset"
                    onConfirm={(assetIds) => {
                        setIsReturnModalOpen(false);
                        setActivePage('return-form', { loanId: loanRequest.id, assetIds: assetIds });
                    }}
                />
            )}
        </DetailPageLayout>
    );
};

export default LoanRequestDetailPage;
