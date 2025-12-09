

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Asset, LoanRequest, AssetCondition, AssetReturn, Division, AssetReturnStatus, LoanRequestStatus, AssetStatus } from '../../../types';
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

// Stores
import { useRequestStore } from '../../../stores/useRequestStore';
import { useAssetStore } from '../../../stores/useAssetStore';
import { useMasterDataStore } from '../../../stores/useMasterDataStore';
import { useNotificationStore } from '../../../stores/useNotificationStore';

interface ReturnAssetFormPageProps {
    currentUser: User;
    onCancel: () => void;
    // Props for initializing state if passed from router
    loanRequest?: LoanRequest; 
    assetToReturn?: Asset;
    returnDocument?: AssetReturn;
    isReadOnly?: boolean;
}

const getReturnStatusClass = (status: AssetReturnStatus) => {
    switch (status) {
        case AssetReturnStatus.PENDING_APPROVAL: return 'bg-warning-light text-warning-text';
        case AssetReturnStatus.APPROVED: return 'bg-success-light text-success-text';
        case AssetReturnStatus.REJECTED: return 'bg-danger-light text-danger-text';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const ReturnAssetFormPage: React.FC<ReturnAssetFormPageProps> = ({ 
    currentUser, 
    onCancel, 
    loanRequest: propLoanRequest, 
    assetToReturn: propAssetToReturn, 
    returnDocument: propReturnDocument,
    isReadOnly = false 
}) => {
    // Store Hooks
    const returns = useRequestStore(state => state.returns);
    const addReturn = useRequestStore(state => state.addReturn);
    const updateReturn = useRequestStore(state => state.updateReturn);
    const updateLoanRequest = useRequestStore(state => state.updateLoanRequest);
    
    const updateAsset = useAssetStore(state => state.updateAsset);
    const users = useMasterDataStore(state => state.users);
    const divisions = useMasterDataStore(state => state.divisions);
    // FIX: 'addNotification' does not exist on the store, it should be 'addToast'.
    const addAppNotification = useNotificationStore(state => state.addToast);

    const [returnDate, setReturnDate] = useState<Date | null>(new Date());
    const [docNumber, setDocNumber] = useState('');
    const [returnedCondition, setReturnedCondition] = useState<AssetCondition>(AssetCondition.USED_OKAY);
    const [notes, setNotes] = useState('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFooterVisible, setIsFooterVisible] = useState(true);
    const footerRef = useRef<HTMLDivElement>(null);
    const formId = "return-asset-form";
    const addNotification = useNotification();
    
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    // Determine Data Source
    const loanRequest = propLoanRequest;
    const assetToReturn = propAssetToReturn;
    const returnDocument = propReturnDocument;

    const adminLogistik = useMemo(() => users.find(u => u.role === 'Admin Logistik'), [users]);
    const ceo = useMemo(() => users.find(u => u.role === 'Super Admin'), [users]);

    const borrower = useMemo(() => {
        if (!loanRequest) return null;
        return users.find(u => u.name === loanRequest.requester);
    }, [users, loanRequest]);

    const borrowerDivision = useMemo(() => {
        if (!borrower || !borrower.divisionId) return 'N/A';
        return divisions.find(d => d.id === borrower.divisionId)?.name || 'N/A';
    }, [divisions, borrower]);
    
    // Construct view data
    const data = isReadOnly && returnDocument ? returnDocument : {
        returnDate: returnDate?.toISOString(),
        loanRequestId: loanRequest?.id,
        loanDocNumber: loanRequest?.id,
        assetId: assetToReturn?.id,
        assetName: assetToReturn?.name,
        returnedBy: currentUser.name,
        receivedBy: adminLogistik?.name,
        acknowledgedBy: ceo?.name,
        returnedCondition: returnedCondition,
        notes: notes,
        docNumber: docNumber,
    };

    const canApprove = isReadOnly && returnDocument && returnDocument.status === AssetReturnStatus.PENDING_APPROVAL && (currentUser.role === 'Admin Logistik' || currentUser.role === 'Super Admin');

    useEffect(() => {
        if (!isReadOnly) {
            const newDocNumber = generateDocumentNumber('RET', returns, returnDate || new Date());
            setDocNumber(newDocNumber);
        }
    }, [returnDate, returns, isReadOnly]);
    
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => setIsFooterVisible(entry.isIntersecting), { threshold: 0.1 });
        const currentRef = footerRef.current;
        if (currentRef) observer.observe(currentRef);
        return () => { if (currentRef) observer.unobserve(currentRef); };
    }, []);

    // Action Handlers
    const handleSave = async () => {
        if (!loanRequest || !assetToReturn) return;
        
        const newReturn: AssetReturn = {
            id: `RET-${Date.now()}`,
            docNumber: docNumber,
            returnDate: returnDate!.toISOString().split('T')[0],
            loanRequestId: loanRequest.id,
            loanDocNumber: loanRequest.id, 
            assetId: assetToReturn.id,
            assetName: assetToReturn.name,
            returnedBy: currentUser.name,
            receivedBy: adminLogistik?.name || 'Admin Logistik',
            acknowledgedBy: ceo?.name || 'Super Admin',
            returnedCondition,
            notes,
            status: AssetReturnStatus.PENDING_APPROVAL
        };

        await addReturn(newReturn);

        await updateAsset(assetToReturn.id, {
            status: AssetStatus.AWAITING_RETURN
        });

        users.filter(u => u.role === 'Admin Logistik').forEach(admin => {
             addAppNotification(`Pengajuan pengembalian aset ${assetToReturn.name} dari ${currentUser.name}`, 'info', { recipientId: admin.id, referenceId: newReturn.id });
        });

        addNotification(`Request pengembalian ${docNumber} telah diajukan.`, 'success');
        onCancel();
    };

    const handleApprove = async () => {
        if (!returnDocument) return;
        setIsSubmitting(true);
        try {
            const today = new Date().toISOString();
            
            // 1. Update Return Document
            await updateReturn(returnDocument.id, {
                status: AssetReturnStatus.APPROVED,
                approvedBy: currentUser.name,
                approvalDate: today
            });

            // 2. Update Asset Status to return it to storage
            await updateAsset(returnDocument.assetId, {
                status: AssetStatus.IN_STORAGE,
                condition: returnDocument.returnedCondition, // Update condition based on return form
                currentUser: null,
                location: 'Gudang Inventori'
            });

            // 3. Update the original Loan Request
            const loanReqToUpdate = useRequestStore.getState().loanRequests.find(lr => lr.id === returnDocument.loanRequestId);
            if (loanReqToUpdate) {
                const currentReturnedIds = loanReqToUpdate.returnedAssetIds || [];
                const newReturnedIds = [...new Set([...currentReturnedIds, returnDocument.assetId])];

                // Check if all assets for this loan have been returned
                const allAssignedIds = Object.values(loanReqToUpdate.assignedAssetIds || {}).flat();
                const isFullyReturned = allAssignedIds.every(id => newReturnedIds.includes(id));

                await updateLoanRequest(loanReqToUpdate.id, {
                    returnedAssetIds: newReturnedIds,
                    status: isFullyReturned ? LoanRequestStatus.RETURNED : loanReqToUpdate.status, // Keep status if not fully returned
                    actualReturnDate: isFullyReturned ? today : loanReqToUpdate.actualReturnDate,
                });
            }
             
             addNotification('Pengembalian disetujui. Aset telah dikembalikan ke stok.', 'success');
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

            // Revert asset status back to IN_USE because the return was rejected
            await updateAsset(returnDocument.assetId, {
                status: AssetStatus.IN_USE 
            });
            
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
        if (!loanRequest || !assetToReturn) {
            addNotification('Aksi tidak valid atau data tidak lengkap.', 'error');
            return;
        }

        setIsSubmitting(true);
        setTimeout(() => {
            handleSave();
            setIsSubmitting(false);
        }, 1000);
    };

    if (!data) {
        return (
            <div className="p-8 text-center text-gray-600">
                <h2 className="text-xl font-bold">Data Tidak Ditemukan</h2>
                <p>Data pengembalian atau aset tidak dapat dimuat. Silakan kembali.</p>
                <button onClick={onCancel} className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-tm-primary rounded-lg">Kembali</button>
            </div>
        );
    }
    
    const ActionButtons: React.FC<{ formId: string }> = ({ formId }) => {
        if (isReadOnly) {
            return <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Kembali</button>;
        }
        return (
            <>
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
                <button type="submit" form={formId} disabled={isSubmitting} className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover disabled:bg-tm-primary/70">
                    {isSubmitting && <SpinnerIcon className="w-4 h-4 mr-2" />}
                    Konfirmasi Pengembalian
                </button>
            </>
        );
    };

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="p-4 sm:p-6 bg-white border border-gray-200/80 rounded-xl shadow-md pb-24">
                <form id={formId} onSubmit={handleSubmit} className="space-y-6">
                    <Letterhead />
                    <div className="text-center">
                        <h3 className="text-xl font-bold uppercase text-tm-dark">Berita Acara Pengembalian Aset</h3>
                    </div>

                    <h4 className="font-semibold text-gray-800 border-b pb-1 mb-4">Dokumen</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                        <div>
                            <span className="font-semibold text-gray-500">No. Dokumen Peminjaman</span>
                            <p className="font-mono text-gray-800">{data.loanDocNumber}</p>
                        </div>
                        <div>
                            <span className="font-semibold text-gray-500">No. Dokumen Pengembalian</span>
                            <p className="font-mono text-gray-800">{data.docNumber}</p>
                        </div>
                        <div>
                            <span className="font-semibold text-gray-500">Nama Peminjam:</span>
                            <p className="font-medium text-gray-800">{loanRequest?.requester || data.returnedBy || '-'}</p>
                        </div>
                        <div>
                            <span className="font-semibold text-gray-500">Divisi:</span>
                            <p className="font-medium text-gray-800">{borrowerDivision}</p>
                        </div>
                        <div><span className="font-semibold text-gray-500">Tanggal Pengembalian:</span><p className="font-medium text-gray-800">{new Date(data.returnDate!).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p></div>
                    </div>

                    <fieldset disabled={isReadOnly}>
                        <section className="mt-6 pt-6 border-t pb-1 mb-4">
                             <h4 className="font-semibold text-gray-800 border-b pb-1 mb-4">Aset Dikembalikan</h4>
                            <div className="overflow-x-auto border rounded-lg">
                                <table className="min-w-full text-left text-sm">
                                            <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                                                <tr>
                                                    <th className="p-3">Nama Aset</th>
                                                    <th className="p-3">ID Aset</th>
                                                    <th className="p-3">Serial Number</th>
                                                    <th className="p-3">Kondisi Pengembalian</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-b">
                                                    <td className="p-3 font-semibold text-gray-800">{data.assetName}</td>
                                                    <td className="p-3 font-mono text-gray-600">{data.assetId}</td>
                                                    <td className="p-3 font-mono text-gray-600 break-words">{assetToReturn?.serialNumber || '-'}</td>
                                                    <td className="p-3 font-semibold text-gray-800">
                                                        {isReadOnly ? data.returnedCondition : (
                                                            <CustomSelect 
                                                                options={Object.values(AssetCondition).map(c => ({value: c, label: c}))} 
                                                                value={returnedCondition} 
                                                                onChange={(v) => setReturnedCondition(v as AssetCondition)} 
                                                            />
                                                        )}
                                                    </td>
                                                </tr>
                                            </tbody>
                                </table>
                            </div>
                        </section>

                        <div>
                            <label htmlFor="returnNotes" className="block text-sm font-medium text-gray-700">Catatan Tambahan</label>
                            <textarea id="returnNotes" value={notes || data.notes || ''} onChange={e => setNotes(e.target.value)} rows={3} className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-lg shadow-sm sm:text-sm disabled:bg-gray-100/50 disabled:text-gray-500" placeholder="Catatan mengenai kondisi aset atau proses pengembalian..."></textarea>
                        </div>
                    </fieldset>

                    {isReadOnly && returnDocument && (
                        <section>
                            <h4 className="font-semibold text-gray-800 border-b pb-1 mb-4">Status Pengembalian</h4>
                            <span className={`px-2.5 py-1 text-sm font-semibold rounded-full ${getReturnStatusClass(returnDocument.status)}`}>
                                {returnDocument.status}
                            </span>
                            {returnDocument.rejectionReason && (
                                <p className="mt-2 text-sm text-red-700 italic">Alasan: "{returnDocument.rejectionReason}"</p>
                            )}
                        </section>
                    )}

                    {canApprove && (
                        <div className="p-4 bg-blue-50 border-t border-b border-blue-200 space-y-3 no-print">
                            <h4 className="font-semibold text-blue-800">Aksi Admin Logistik</h4>
                            <div className="flex gap-4">
                                <button type="button" onClick={handleApprove} disabled={isSubmitting} className="flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-success rounded-lg shadow-sm hover:bg-green-700">Setujui</button>
                                <button type="button" onClick={() => setIsRejectModalOpen(true)} disabled={isSubmitting} className="flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-danger rounded-lg shadow-sm hover:bg-red-700">Tolak</button>
                            </div>
                        </div>
                    )}

                    <div className="pt-8 mt-6 border-t border-gray-200">
                        <div className="grid grid-cols-1 text-sm text-center gap-y-8 md:grid-cols-3 md:gap-x-8">
                            <div>
                                <p className="font-semibold text-gray-700">Yang Mengembalikan,</p>
                                <div className="flex items-center justify-center mt-2 h-28">
                                    <SignatureStamp signerName={data.returnedBy!} signatureDate={data.returnDate!} />
                                </div>
                                <p className="pt-1 mt-2 border-t border-gray-400">({data.returnedBy})</p>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-700">Yang Menerima (Logistik),</p>
                                <div className="flex items-center justify-center mt-2 h-28">
                                    {returnDocument?.status === AssetReturnStatus.APPROVED && returnDocument.approvedBy && (
                                        <ApprovalStamp approverName={returnDocument.approvedBy} approvalDate={returnDocument.approvalDate!} />
                                    )}
                                    {returnDocument?.status === AssetReturnStatus.REJECTED && returnDocument.rejectedBy && (
                                        <RejectionStamp rejectorName={returnDocument.rejectedBy} rejectionDate={returnDocument.rejectionDate!} />
                                    )}
                                    {(!returnDocument || returnDocument.status === AssetReturnStatus.PENDING_APPROVAL) && (
                                        <div className="flex flex-col items-center justify-center w-36 h-24 p-1 text-gray-400 border-2 border-dashed border-gray-300 rounded-md bg-gray-50/50">
                                            <span className="text-sm italic">Menunggu Persetujuan</span>
                                        </div>
                                    )}
                                </div>
                                <p className="pt-1 mt-2 border-t border-gray-400">({ 
                                    (returnDocument?.status === AssetReturnStatus.APPROVED && returnDocument.approvedBy) || 
                                    (returnDocument?.status === AssetReturnStatus.REJECTED && returnDocument.rejectedBy) || 
                                    '.........................'
                                })</p>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-700">Mengetahui,</p>
                                <div className="flex items-center justify-center mt-2 h-28">
                                    <SignatureStamp signerName={data.acknowledgedBy || 'Super Admin'} signatureDate={data.returnDate!} />
                                </div>
                                <p className="pt-1 mt-2 border-t border-gray-400">({data.acknowledgedBy || '.........................'})</p>
                            </div>
                        </div>
                    </div>

                     <div ref={footerRef} className="flex justify-end pt-4 mt-4 border-t border-gray-200">
                        <ActionButtons formId={formId} />
                    </div>
                </form>
                 <FloatingActionBar isVisible={!isFooterVisible}>
                    <ActionButtons formId={formId} />
                </FloatingActionBar>
            </div>
            
            <Modal isOpen={isRejectModalOpen} onClose={() => setIsRejectModalOpen(false)} title="Tolak Pengembalian Aset">
                <div className="space-y-4">
                    <p>Harap berikan alasan penolakan.</p>
                    <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={3} className="w-full text-sm border-gray-300 rounded-md focus:ring-tm-accent focus:border-tm-accent " placeholder="Contoh: Kondisi aset tidak sesuai, bagian tidak lengkap..."></textarea>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={() => setIsRejectModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
                    <button onClick={handleReject} disabled={!rejectionReason.trim()} className="px-4 py-2 text-sm font-medium text-white bg-danger rounded-lg shadow-sm hover:bg-red-700 disabled:bg-red-300">Kirim Penolakan</button>
                </div>
            </Modal>
        </div>
    );
};

export default ReturnAssetFormPage;
