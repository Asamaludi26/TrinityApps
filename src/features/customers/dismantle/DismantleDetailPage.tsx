import React, { useState, useRef, useMemo } from 'react';
import { Dismantle, User, ItemStatus, PreviewData, Asset, Customer } from '../../../types';
import { DetailPageLayout } from '../../../components/layout/DetailPageLayout';
import { Letterhead } from '../../../components/ui/Letterhead';
import { SignatureStamp } from '../../../components/ui/SignatureStamp';
import { ApprovalStamp } from '../../../components/ui/ApprovalStamp';
import { ClickableLink } from '../../../components/ui/ClickableLink';
import { InfoIcon } from '../../../components/icons/InfoIcon';
import { SpinnerIcon } from '../../../components/icons/SpinnerIcon';
import { CheckIcon } from '../../../components/icons/CheckIcon';
import { ChevronsLeftIcon } from '../../../components/icons/ChevronsLeftIcon';
import { ChevronsRightIcon } from '../../../components/icons/ChevronsRightIcon';
import { PrintIcon } from '../../../components/icons/PrintIcon';
import { DownloadIcon } from '../../../components/icons/DownloadIcon';
import { useNotification } from '../../../providers/NotificationProvider';

interface DismantleDetailPageProps {
    dismantle: Dismantle;
    currentUser: User;
    assets: Asset[];
    customers: Customer[];
    onBackToList: () => void;
    onShowPreview: (data: PreviewData) => void;
    onComplete: () => void;
    isLoading: boolean;
}

const ActionButton: React.FC<{ onClick?: () => void, text: string, icon?: React.FC<{className?:string}>, color: 'primary'|'success'|'danger'|'info'|'secondary', disabled?: boolean }> = ({ onClick, text, icon: Icon, color, disabled }) => {
    const colors = {
        primary: "bg-tm-primary hover:bg-tm-primary-hover text-white",
        success: "bg-success hover:bg-green-700 text-white",
        danger: "bg-danger hover:bg-red-700 text-white",
        info: "bg-info hover:bg-blue-700 text-white",
        secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800",
    };
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed ${colors[color]}`}
        >
            {disabled && <SpinnerIcon className="w-4 h-4" />}
            {Icon && <Icon className="w-4 h-4" />}
            {text}
        </button>
    );
};

const DismantleStatusIndicator: React.FC<{ status: ItemStatus }> = ({ status }) => {
    const statusDetails: Record<string, { label: string, className: string }> = {
        [ItemStatus.COMPLETED]: { label: 'Selesai', className: 'bg-success-light text-success-text' },
        [ItemStatus.IN_PROGRESS]: { label: 'Menunggu Penerimaan Gudang', className: 'bg-warning-light text-warning-text' },
    };

    const details = statusDetails[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${details.className}`}>
            {details.label}
        </span>
    );
};

const ActionSidebar: React.FC<DismantleDetailPageProps & { isExpanded: boolean; onToggleVisibility: () => void; }> = ({ dismantle, currentUser, isLoading, onComplete, isExpanded, onToggleVisibility }) => {
    
    if (!isExpanded) {
        return (
            <div className="flex flex-col items-center pt-4 space-y-4">
                <button
                    onClick={onToggleVisibility}
                    className="flex items-center justify-center w-10 h-10 bg-white border border-gray-300 rounded-full shadow-md text-gray-500 hover:bg-gray-100 hover:text-tm-primary transition-all">
                    <ChevronsRightIcon className="w-5 h-5" />
                </button>
            </div>
        );
    }

    const canComplete = dismantle.status === ItemStatus.IN_PROGRESS && (currentUser.role === 'Admin Logistik' || currentUser.role === 'Super Admin');

    return (
        <div className="p-5 bg-white border border-gray-200/80 rounded-xl shadow-sm">
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <InfoIcon className="w-5 h-5 text-gray-400" />
                        <h3 className="text-base font-semibold text-gray-800">Status & Aksi</h3>
                    </div>
                     <div className="mt-2">
                        <DismantleStatusIndicator status={dismantle.status} />
                    </div>
                </div>
                <button
                    onClick={onToggleVisibility}
                    className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-gray-400 rounded-full hover:bg-gray-100 hover:text-gray-800">
                    <ChevronsLeftIcon className="w-5 h-5" />
                </button>
            </div>
            
            <div className="mt-4 pt-4 border-t">
                {canComplete ? (
                     <ActionButton onClick={onComplete} disabled={isLoading} text="Acknowledge & Complete" icon={CheckIcon} color="success" />
                ) : (
                    <div className="text-center p-4 bg-gray-50/70 border border-gray-200/60 rounded-lg">
                        <CheckIcon className="w-10 h-10 mx-auto mb-3 text-success" />
                        <p className="text-sm font-semibold text-gray-800">Proses Selesai</p>
                        <p className="text-xs text-gray-500 mt-1">Dismantle ini telah selesai diproses.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const DismantleDetailPage: React.FC<DismantleDetailPageProps> = (props) => {
    const { dismantle, onShowPreview, assets, customers } = props;
    const [isActionSidebarExpanded, setIsActionSidebarExpanded] = useState(true);
    const printRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const addNotification = useNotification();

    const asset = useMemo(() => assets.find(a => a.id === dismantle.assetId), [assets, dismantle.assetId]);
    const customer = useMemo(() => customers.find(c => c.id === dismantle.customerId), [customers, dismantle.customerId]);
    
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
                pdf.save(`Dismantle-${dismantle.docNumber}.pdf`);
                setIsDownloading(false);
                addNotification('PDF berhasil diunduh.', 'success');
            }).catch((err: any) => {
                addNotification('Gagal membuat PDF.', 'error');
                setIsDownloading(false);
            });
    };

    return (
        <DetailPageLayout
            title={`Detail Dismantle: ${dismantle.docNumber}`}
            onBack={props.onBackToList}
            headerActions={
                 <div className="flex items-center gap-2">
                    <button onClick={handlePrint} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border rounded-lg shadow-sm hover:bg-gray-50"><PrintIcon className="w-4 h-4"/> Cetak</button>
                    <button onClick={handleDownloadPdf} disabled={isDownloading} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover disabled:bg-tm-primary/70">{isDownloading ? <SpinnerIcon className="w-4 h-4"/> : <DownloadIcon className="w-4 h-4" />}{isDownloading ? 'Mengunduh...' : 'Unduh PDF'}</button>
                </div>
            }
            mainColClassName={isActionSidebarExpanded ? 'lg:col-span-8' : 'lg:col-span-11'}
            asideColClassName={isActionSidebarExpanded ? 'lg:col-span-4' : 'lg:col-span-1'}
            aside={<ActionSidebar {...props} isExpanded={isActionSidebarExpanded} onToggleVisibility={() => setIsActionSidebarExpanded(p => !p)} />}
        >
            <div ref={printRef} className="p-8 bg-white border border-gray-200/80 rounded-xl shadow-sm space-y-8">
                <Letterhead />
                <div className="text-center">
                    <h3 className="text-xl font-bold uppercase text-tm-dark">Berita Acara Penarikan Aset</h3>
                    <p className="text-sm text-tm-secondary">Nomor: {dismantle.docNumber}</p>
                </div>
                
                <section>
                    <h4 className="font-semibold text-gray-800 border-b pb-1 mb-4">Informasi Dokumen</h4>
                    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 text-sm">
                        <div><dt className="font-medium text-gray-500">No. Dokumen</dt><dd className="font-semibold text-gray-900">{dismantle.docNumber}</dd></div>
                        <div><dt className="font-medium text-gray-500">Tanggal Penarikan</dt><dd className="font-semibold text-gray-900">{new Date(dismantle.dismantleDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</dd></div>
                        <div><dt className="font-medium text-gray-500">No. Request Terkait</dt><dd className="font-semibold text-gray-900">{dismantle.requestNumber || '-'}</dd></div>
                        <div><dt className="font-medium text-gray-500">Teknisi</dt><dd className="font-semibold text-gray-900">{dismantle.technician}</dd></div>
                    </dl>
                </section>

                <section>
                    <h4 className="font-semibold text-gray-800 border-b pb-1 mb-2">Detail Aset & Pelanggan</h4>
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-left text-sm">
                            <tbody>
                                {/* Asset Details */}
                                <tr className="border-b"><td className="p-3 font-bold bg-gray-50 text-gray-600" colSpan={2}>Aset yang Ditarik</td></tr>
                                <tr className="border-b">
                                    <td className="p-3 font-medium text-gray-500 w-1/3">Nama Aset</td>
                                    <td className="p-3 font-semibold text-gray-800">
                                        {asset ? <ClickableLink onClick={() => onShowPreview({ type: 'asset', id: asset.id })}>{asset.name}</ClickableLink> : '-'}
                                    </td>
                                </tr>
                                <tr className="border-b">
                                    <td className="p-3 font-medium text-gray-500">ID Aset</td>
                                    <td className="p-3 font-mono text-gray-600">{asset?.id || '-'}</td>
                                </tr>
                                <tr className="border-b">
                                    <td className="p-3 font-medium text-gray-500">Serial Number</td>
                                    <td className="p-3 font-mono text-gray-600">{asset?.serialNumber || '-'}</td>
                                </tr>
                                <tr className="border-b">
                                    <td className="p-3 font-medium text-gray-500">MAC Address</td>
                                    <td className="p-3 font-mono text-gray-600">{asset?.macAddress || '-'}</td>
                                </tr>
                                <tr className="border-b">
                                    <td className="p-3 font-medium text-gray-500">Kondisi Saat Ditarik</td>
                                    <td className="p-3 font-semibold text-gray-800">{dismantle.retrievedCondition}</td>
                                </tr>
                                <tr className="border-b">
                                    <td className="p-3 font-medium text-gray-500">Catatan Teknisi</td>
                                    <td className="p-3 text-gray-600 italic">"{dismantle.notes || '-'}"</td>
                                </tr>
                                
                                {/* Customer Details */}
                                <tr className="border-b"><td className="p-3 font-bold bg-gray-50 text-gray-600" colSpan={2}>Informasi Pelanggan</td></tr>
                                <tr className="border-b">
                                    <td className="p-3 font-medium text-gray-500">Nama Pelanggan</td>
                                    <td className="p-3 font-semibold text-gray-800">
                                        {customer ? <ClickableLink onClick={() => onShowPreview({ type: 'customer', id: customer.id })}>{customer.name}</ClickableLink> : '-'}
                                    </td>
                                </tr>
                                <tr className="border-b">
                                    <td className="p-3 font-medium text-gray-500">ID Pelanggan</td>
                                    <td className="p-3 font-mono text-gray-600">{customer?.id || '-'}</td>
                                </tr>
                                <tr className="border-b">
                                    <td className="p-3 font-medium text-gray-500">Alamat</td>
                                    <td className="p-3 text-gray-600">{customer?.address || '-'}</td>
                                </tr>
                                <tr className="border-b">
                                    <td className="p-3 font-medium text-gray-500">Kontak</td>
                                    <td className="p-3 text-gray-600">{customer?.phone || '-'}</td>
                                </tr>
                                <tr className="border-b">
                                    <td className="p-3 font-medium text-gray-500">Layanan</td>
                                    <td className="p-3 text-gray-600">{customer?.servicePackage || '-'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>
                
                <section className="pt-8">
                    <p className="text-xs text-center text-gray-500 mb-6">Demikian Berita Acara ini dibuat dengan sebenar-benarnya untuk dipergunakan sebagaimana mestinya.</p>
                    <div className="grid grid-cols-1 text-sm text-center gap-y-6 sm:grid-cols-2">
                         <div>
                            <p className="font-semibold text-gray-600">Teknisi,</p>
                            <div className="flex items-center justify-center mt-2 h-28">
                                <SignatureStamp signerName={dismantle.technician} signatureDate={dismantle.dismantleDate} />
                            </div>
                            <p className="pt-1 mt-2 border-t border-gray-400">({dismantle.technician})</p>
                        </div>
                         <div>
                            <p className="font-semibold text-gray-600">Diterima Gudang Oleh,</p>
                            <div className="flex items-center justify-center mt-2 h-28">
                                {dismantle.status === ItemStatus.COMPLETED && dismantle.acknowledger ? (
                                    <ApprovalStamp approverName={dismantle.acknowledger} approvalDate={new Date().toISOString()} />
                                ) : (
                                    <span className="italic text-gray-400">Menunggu Penerimaan</span>
                                )}
                            </div>
                            <p className="pt-1 mt-2 border-t border-gray-400">({dismantle.acknowledger || '.........................'})</p>
                        </div>
                    </div>
                </section>
            </div>
        </DetailPageLayout>
    );
};

export default DismantleDetailPage;