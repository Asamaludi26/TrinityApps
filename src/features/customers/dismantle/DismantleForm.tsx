import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Asset, Customer, User, AssetCondition, Attachment, Page, AssetStatus, Dismantle } from '../../../types';
import DatePicker from '../../../components/ui/DatePicker';
import { useNotification } from '../../../providers/NotificationProvider';
import FloatingActionBar from '../../../components/ui/FloatingActionBar';
import { Letterhead } from '../../../components/ui/Letterhead';
import { SignatureStamp } from '../../../components/ui/SignatureStamp';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import { PaperclipIcon } from '../../../components/icons/PaperclipIcon';
import { TrashIcon } from '../../../components/icons/TrashIcon';
import { SpinnerIcon } from '../../../components/icons/SpinnerIcon';
import { generateDocumentNumber } from '../../../utils/documentNumberGenerator';

interface DismantleFormProps {
    currentUser: User;
    dismantles: Dismantle[];
    onSave: (data: Omit<Dismantle, 'id' | 'status'>) => void;
    onCancel: () => void;
    customers: Customer[];
    users: User[];
    assets: Asset[];
    prefillAsset?: Asset | null;
    prefillCustomerId?: string;
    setActivePage: (page: Page, initialState?: any) => void;
}

const DismantleForm: React.FC<DismantleFormProps> = ({ currentUser, dismantles, onSave, onCancel, customers, users, assets, prefillAsset, prefillCustomerId }) => {
    // --- STATE MANAGEMENT ---
    const [dismantleDate, setDismantleDate] = useState<Date | null>(new Date());
    const [docNumber, setDocNumber] = useState('');
    const [requestNumber, setRequestNumber] = useState('');
    const [technician, setTechnician] = useState('');
    const [retrievedCondition, setRetrievedCondition] = useState<AssetCondition>(AssetCondition.USED_OKAY);
    const [notes, setNotes] = useState<string>('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [selectedAssetId, setSelectedAssetId] = useState<string>('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFooterVisible, setIsFooterVisible] = useState(true);
    const footerRef = useRef<HTMLDivElement>(null);
    const formId = "dismantle-form";
    const addNotification = useNotification();

    // --- DERIVED STATE & OPTIONS ---
    const selectedAsset = useMemo(() => assets.find(a => a.id === selectedAssetId) || null, [assets, selectedAssetId]);
    const selectedCustomer = useMemo(() => customers.find(c => c.id === selectedCustomerId) || null, [customers, selectedCustomerId]);
    
    const assetsForCustomer = useMemo(() => 
        selectedCustomerId ? assets.filter(a => a.currentUser === selectedCustomerId && a.status === AssetStatus.IN_USE) : [],
    [assets, selectedCustomerId]);

    const customerOptions = useMemo(() => {
        const customerIdsWithAssets = new Set(assets.filter(a => a.currentUser?.startsWith('TMI-')).map(a => a.currentUser));
        return customers
            .filter(c => customerIdsWithAssets.has(c.id))
            .map(c => ({ value: c.id, label: `${c.name} (${c.id})` }));
    }, [customers, assets]);

    const assetOptions = useMemo(() => assetsForCustomer.map(asset => ({
        value: asset.id,
        label: `${asset.name} (${asset.id}) - SN: ${asset.serialNumber || 'N/A'}`
    })), [assetsForCustomer]);

    const technicianOptions = useMemo(() => 
        users.filter(u => u.divisionId === 3).map(u => ({ value: u.name, label: u.name })), 
    [users]);
    
    // --- EFFECTS ---
     useEffect(() => {
        setTechnician(currentUser.name);
    }, [currentUser]);

    useEffect(() => {
        if (prefillAsset) {
            setSelectedCustomerId(prefillAsset.currentUser || '');
            setSelectedAssetId(prefillAsset.id);
        } else if (prefillCustomerId) {
            setSelectedCustomerId(prefillCustomerId);
            const customerAssets = assets.filter(a => a.currentUser === prefillCustomerId && a.status === AssetStatus.IN_USE);
            if (customerAssets.length === 1) {
                setSelectedAssetId(customerAssets[0].id);
            }
        }
    }, [prefillAsset, prefillCustomerId, assets]);

    useEffect(() => {
        if (!dismantleDate) {
            setDocNumber('[Otomatis]');
            return;
        }
        const newDocNumber = generateDocumentNumber('DSM', dismantles, dismantleDate);
        setDocNumber(newDocNumber);
    }, [dismantleDate, dismantles]);

    useEffect(() => {
        setRequestNumber(selectedAsset?.poNumber || '');
    }, [selectedAsset]);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => setIsFooterVisible(entry.isIntersecting), { threshold: 0.1 });
        const currentRef = footerRef.current;
        if (currentRef) observer.observe(currentRef);
        return () => { if (currentRef) observer.unobserve(currentRef); };
    }, []);
    
    // --- EVENT HANDLERS ---
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setAttachments(prev => [...prev, ...Array.from(event.target.files!)]);
        }
    };

    const removeAttachment = (fileName: string) => {
        setAttachments(prev => prev.filter(file => file.name !== fileName));
    };
    
    const handleDragEvents = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setIsDragging(true);
        else if (e.type === 'dragleave') setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files?.length > 0) {
            setAttachments(prev => [...prev, ...Array.from(e.dataTransfer.files!)]);
            e.dataTransfer.clearData();
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAsset || !selectedCustomer) {
            addNotification('Aset atau pelanggan tidak valid. Harap pilih aset yang akan ditarik.', 'error');
            return;
        }
        setIsSubmitting(true);
        setTimeout(() => {
            const processedAttachments: Attachment[] = attachments.map((file, index) => ({
                id: Date.now() + index,
                name: file.name,
                url: URL.createObjectURL(file), 
                type: file.type.startsWith('image/') ? 'image' : (file.type === 'application/pdf' ? 'pdf' : 'other'),
            }));

            onSave({
                docNumber,
                requestNumber: requestNumber || undefined,
                assetId: selectedAsset.id,
                assetName: selectedAsset.name,
                dismantleDate: dismantleDate!.toISOString().split('T')[0],
                technician,
                customerName: selectedCustomer.name,
                customerId: selectedCustomer.id,
                customerAddress: selectedCustomer.address,
                retrievedCondition,
                notes: notes.trim() || null,
                acknowledger: null, // Admin gudang yang akan mengisi ini
                attachments: processedAttachments,
            });
            setIsSubmitting(false);
        }, 1000);
    };

    // --- SUB-COMPONENTS ---
     const ActionButtons: React.FC<{ formId?: string }> = ({ formId }) => (
        <>
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">
                Batal
            </button>
            <button 
                type="submit" 
                form={formId}
                disabled={isSubmitting || !selectedAsset}
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover disabled:bg-tm-primary/70 disabled:cursor-not-allowed">
                {isSubmitting ? <SpinnerIcon className="w-5 h-5 mr-2" /> : null}
                {isSubmitting ? 'Memproses...' : 'Buat Berita Acara'}
            </button>
        </>
    );

    return (
        <>
            <form id={formId} onSubmit={handleSubmit} className="space-y-6">
                <Letterhead />
                <div className="text-center">
                    <h3 className="text-xl font-bold uppercase text-tm-dark">Berita Acara Penarikan Aset</h3>
                </div>

                <div className="p-4 border-t border-b border-gray-200">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tanggal Penarikan</label>
                            <DatePicker id="dismantleDate" selectedDate={dismantleDate} onDateChange={setDismantleDate} />
                        </div>
                        <div>
                            <label htmlFor="docNumber" className="block text-sm font-medium text-gray-700">No. Dokumen</label>
                            <input type="text" id="docNumber" readOnly value={docNumber} className="block w-full px-3 py-2 mt-1 text-gray-700 bg-gray-100 border border-gray-200 rounded-lg shadow-sm sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="requestNumber" className="block text-sm font-medium text-gray-700">No. Request Terkait</label>
                            <input type="text" id="requestNumber" readOnly value={requestNumber || 'N/A'} className="block w-full px-3 py-2 mt-1 text-gray-700 bg-gray-100 border border-gray-200 rounded-lg shadow-sm sm:text-sm" />
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border rounded-lg">
                    <h3 className="text-base font-semibold text-gray-800 mb-4">Detail Aset & Pelanggan</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Pelanggan</label>
                            <CustomSelect
                                options={customerOptions}
                                value={selectedCustomerId}
                                onChange={(val) => { setSelectedCustomerId(val); setSelectedAssetId(''); }}
                                placeholder="-- Pilih Pelanggan --"
                                isSearchable
                                disabled={!!prefillCustomerId || !!prefillAsset}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Aset yang Ditarik</label>
                            <CustomSelect
                                options={assetOptions}
                                value={selectedAssetId}
                                onChange={setSelectedAssetId}
                                placeholder={selectedCustomerId ? "-- Pilih Aset --" : "Pilih pelanggan dahulu"}
                                disabled={!selectedCustomerId || !!prefillAsset || (!!prefillCustomerId && assetsForCustomer.length === 1)}
                            />
                        </div>
                    </div>

                    {selectedAsset && selectedCustomer ? (
                        <div className="grid grid-cols-1 gap-x-4 gap-y-2 mt-4 pt-4 border-t text-sm">
                            <div><span className="font-semibold text-gray-500">Alamat:</span><span className="pl-2 text-gray-900">{selectedCustomer.address}</span></div>
                        </div>
                    ) : null}
                </div>

                <div className="p-4 border-t border-b border-gray-200">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Teknisi</label>
                            <CustomSelect options={technicianOptions} value={technician} onChange={setTechnician} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Kondisi Aset Saat Ditarik</label>
                            <CustomSelect options={Object.values(AssetCondition).map(c => ({ value: c, label: c }))} value={retrievedCondition} onChange={v => setRetrievedCondition(v as AssetCondition)} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Catatan Penarikan</label>
                            <textarea id="dismantleNotes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-lg shadow-sm sm:text-sm" placeholder="Contoh: Unit ditarik karena pelanggan upgrade, kondisi fisik baik..."></textarea>
                        </div>
                         <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Lampiran (Foto Kondisi, dll)</label>
                            <div 
                                onDragEnter={handleDragEvents} 
                                onDragOver={handleDragEvents} 
                                onDragLeave={handleDragEvents} 
                                onDrop={handleDrop}
                                className={`flex items-center justify-center w-full px-6 pt-5 pb-6 mt-1 border-2 border-dashed rounded-md transition-colors
                                    ${isDragging ? 'border-tm-primary bg-blue-50' : 'border-gray-300'}`
                                }
                            >
                                <div className="space-y-1 text-center">
                                <PaperclipIcon className="w-10 h-10 mx-auto text-gray-400" />
                                    <div className="flex text-sm text-gray-600">
                                        <label htmlFor="file-upload" className="relative font-medium bg-transparent rounded-md cursor-pointer text-tm-primary hover:text-tm-accent focus-within:outline-none">
                                            <span>Pilih file</span>
                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} />
                                        </label>
                                        <p className="pl-1">atau tarik dan lepas</p>
                                    </div>
                                    <p className="text-xs text-gray-500">PNG, JPG, PDF hingga 10MB</p>
                                </div>
                            </div>
                            {attachments.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    {attachments.map(file => (
                                        <div key={file.name} className="flex items-center justify-between p-2 text-sm text-gray-700 bg-gray-100 border border-gray-200 rounded-md">
                                            <span className="truncate">{file.name}</span>
                                            <button type="button" onClick={() => removeAttachment(file.name)} className="text-red-500 hover:text-red-700">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="pt-8 mt-6 border-t border-gray-200">
                    <div className="flex justify-center">
                        <div>
                            <p className="font-medium text-center text-gray-700">Teknisi</p>
                            <div className="flex items-center justify-center mt-2 h-28">
                                {technician && <SignatureStamp signerName={technician} signatureDate={dismantleDate?.toISOString() || ''} />}
                            </div>
                            <p className="pt-1 mt-2 text-sm text-center text-gray-600">( {technician || 'Nama Jelas'} )</p>
                        </div>
                    </div>
                </div>

                <div ref={footerRef} className="flex justify-end pt-4 mt-4 border-t border-gray-200">
                    <ActionButtons />
                </div>
            </form>
            <FloatingActionBar isVisible={!isFooterVisible}>
                <ActionButtons formId={formId} />
            </FloatingActionBar>
        </>
    );
};

export default DismantleForm;