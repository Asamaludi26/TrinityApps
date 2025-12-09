import React, { useState } from 'react';
import { Handover, User, Division, ItemStatus, PreviewData } from '../../types';
import { DetailPageLayout } from '../../components/layout/DetailPageLayout';
import { Letterhead } from '../../components/ui/Letterhead';
import { SignatureStamp } from '../../components/ui/SignatureStamp';
import { ClickableLink } from '../../components/ui/ClickableLink';
import { InfoIcon } from '../../components/icons/InfoIcon';
import { SpinnerIcon } from '../../components/icons/SpinnerIcon';
import { CheckIcon } from '../../components/icons/CheckIcon';
import { ChevronsLeftIcon } from '../../components/icons/ChevronsLeftIcon';
import { ChevronsRightIcon } from '../../components/icons/ChevronsRightIcon';

interface HandoverDetailPageProps {
    handover: Handover;
    currentUser: User;
    users: User[];
    divisions: Division[];
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


const HandoverStatusIndicator: React.FC<{ status: ItemStatus }> = ({ status }) => {
    const statusDetails: Record<string, { label: string, className: string }> = {
        [ItemStatus.COMPLETED]: { label: 'Selesai', className: 'bg-success-light text-success-text' },
        [ItemStatus.IN_PROGRESS]: { label: 'Dalam Proses', className: 'bg-info-light text-info-text' },
        [ItemStatus.PENDING]: { label: 'Menunggu', className: 'bg-warning-light text-warning-text' }
    };

    const details = statusDetails[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${details.className}`}>
            {details.label}
        </span>
    );
};

const StatusAndActionSidebar: React.FC<HandoverDetailPageProps & { isExpanded: boolean; onToggleVisibility: () => void; }> = ({ handover, currentUser, isLoading, onComplete, isExpanded, onToggleVisibility }) => {
    
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

    const canComplete = handover.status === ItemStatus.IN_PROGRESS && (currentUser.role === 'Admin Logistik' || currentUser.role === 'Super Admin');

    return (
        <div className="p-5 bg-white border border-gray-200/80 rounded-xl shadow-sm">
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <InfoIcon className="w-5 h-5 text-gray-400" />
                        <h3 className="text-base font-semibold text-gray-800">Status & Aksi</h3>
                    </div>
                     <div className="mt-2">
                        <HandoverStatusIndicator status={handover.status} />
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
                     <ActionButton onClick={onComplete} disabled={isLoading} text="Selesaikan Handover" icon={CheckIcon} color="success" />
                ) : (
                    <div className="text-center p-4 bg-gray-50/70 border border-gray-200/60 rounded-lg">
                        <CheckIcon className="w-10 h-10 mx-auto mb-3 text-success" />
                        <p className="text-sm font-semibold text-gray-800">Proses Selesai</p>
                        <p className="text-xs text-gray-500 mt-1">Handover ini telah selesai diproses.</p>
                    </div>
                )}
            </div>
        </div>
    );
};


const HandoverDetailPage: React.FC<HandoverDetailPageProps> = (props) => {
    const { handover, users, divisions, onShowPreview } = props;
    const [isActionSidebarExpanded, setIsActionSidebarExpanded] = useState(true);

    const getDivisionForUser = (userName: string): string => {
        if (!userName) return '';
        const user = users.find(u => u.name === userName);
        if (!user || !user.divisionId) return '';
        const division = divisions.find(d => d.id === user.divisionId);
        return division ? `Divisi ${division.name}` : '';
    };

    return (
        <DetailPageLayout
            title={`Detail Handover: ${handover.docNumber}`}
            onBack={props.onBackToList}
            mainColClassName={isActionSidebarExpanded ? 'lg:col-span-8' : 'lg:col-span-11'}
            asideColClassName={isActionSidebarExpanded ? 'lg:col-span-4' : 'lg:col-span-1'}
            aside={
                <StatusAndActionSidebar
                    {...props}
                    isExpanded={isActionSidebarExpanded}
                    onToggleVisibility={() => setIsActionSidebarExpanded(p => !p)}
                />
            }
        >
            <div className="p-6 bg-white border border-gray-200/80 rounded-xl shadow-sm space-y-8">
                <Letterhead />
                <div className="text-center">
                    <h3 className="text-xl font-bold uppercase text-tm-dark">Berita Acara Serah Terima Barang</h3>
                    <p className="text-sm text-tm-secondary">Nomor: {handover.docNumber}</p>
                </div>
                
                <section>
                    <p className="mb-2 text-gray-800 text-sm">Pada hari ini, tanggal {new Date(handover.handoverDate).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}, telah dilaksanakan serah terima barang internal dengan rincian sebagai berikut:</p>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 p-3 bg-gray-50 border rounded-md text-sm">
                        <div><dt className="text-gray-500">Pihak Pertama (Yang Menyerahkan)</dt><dd className="font-medium text-gray-900">{handover.menyerahkan}</dd></div>
                        <div><dt className="text-gray-500">Pihak Kedua (Yang Menerima)</dt><dd className="font-medium text-gray-900">{handover.penerima}</dd></div>
                    </dl>
                </section>
                
                <section>
                    <h4 className="font-semibold text-gray-800 border-b pb-1 mb-2">Rincian Barang</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                                <tr>
                                    <th className="p-2 w-10">No.</th>
                                    <th className="p-2">Nama Barang</th>
                                    <th className="p-2">ID Aset</th>
                                    <th className="p-2">Kondisi</th>
                                    <th className="p-2 text-center">Jumlah</th>
                                </tr>
                            </thead>
                            <tbody>
                                {handover.items.map((item, index) => (
                                    <tr key={item.id} className="border-b">
                                        <td className="p-2 text-center text-gray-800">{index + 1}.</td>
                                        <td className="p-2 font-semibold text-gray-800">{item.itemName}</td>
                                        <td className="p-2 text-gray-600 font-mono">
                                            {item.assetId ? (
                                                <ClickableLink onClick={() => onShowPreview({type: 'asset', id: item.assetId!})}>
                                                    {item.assetId}
                                                </ClickableLink>
                                            ) : '-'}
                                        </td>
                                        <td className="p-2 text-gray-600">{item.conditionNotes}</td>
                                        <td className="p-2 text-center font-medium text-gray-800">{item.quantity} unit</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="pt-6">
                    <h4 className="font-semibold text-gray-800 border-b pb-1 mb-6">Persetujuan</h4>
                    <p className="text-xs text-center text-gray-500 mb-6">Demikian Berita Acara ini dibuat untuk dipergunakan sebagaimana mestinya.</p>
                    <div className="grid grid-cols-1 text-sm text-center gap-y-6 sm:grid-cols-3">
                        <div><p className="font-semibold text-gray-600">Yang Menyerahkan,</p><div className="flex items-center justify-center mt-2 h-28"><SignatureStamp signerName={handover.menyerahkan} signatureDate={handover.handoverDate} signerDivision={getDivisionForUser(handover.menyerahkan)} /></div><div className="pt-1 mt-2"><p>({handover.menyerahkan})</p></div></div>
                        <div><p className="font-semibold text-gray-600">Penerima,</p><div className="flex items-center justify-center mt-2 h-28"><SignatureStamp signerName={handover.penerima} signatureDate={handover.handoverDate} signerDivision={getDivisionForUser(handover.penerima)} /></div><div className="pt-1 mt-2"><p>({handover.penerima})</p></div></div>
                        <div><p className="font-semibold text-gray-600">Mengetahui,</p><div className="flex items-center justify-center mt-2 h-28"><SignatureStamp signerName={handover.mengetahui} signatureDate={handover.handoverDate} signerDivision={getDivisionForUser(handover.mengetahui)} /></div><div className="pt-1 mt-2"><p>({handover.mengetahui})</p></div></div>
                    </div>
                </section>
            </div>
        </DetailPageLayout>
    );
};

export default HandoverDetailPage;