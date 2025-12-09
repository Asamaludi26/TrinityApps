import React, { useState } from 'react';
import { Asset, AssetCondition, Attachment } from '../../../types';
import Modal from '../../../components/ui/Modal';
import { useNotification } from '../../../providers/NotificationProvider';
import { SpinnerIcon } from '../../../components/icons/SpinnerIcon';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import { PaperclipIcon } from '../../../components/icons/PaperclipIcon';
import { TrashIcon } from '../../../components/icons/TrashIcon';

interface ReportDamageModalProps {
    isOpen: boolean;
    onClose: () => void;
    asset: Asset | null;
    onSubmit: (asset: Asset, condition: AssetCondition, description: string, attachments: Attachment[]) => void;
}

const ReportDamageModal: React.FC<ReportDamageModalProps> = ({ isOpen, onClose, asset, onSubmit }) => {
    const [condition, setCondition] = useState<AssetCondition>(AssetCondition.MINOR_DAMAGE);
    const [description, setDescription] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const addNotification = useNotification();

    const conditionOptions = [
        { value: AssetCondition.MINOR_DAMAGE, label: 'Rusak Ringan (Perlu Perbaikan)' },
        { value: AssetCondition.MAJOR_DAMAGE, label: 'Rusak Berat' },
        { value: AssetCondition.FOR_PARTS, label: 'Untuk Kanibalisasi' },
    ];

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setAttachments(prev => [...prev, ...Array.from(event.target.files!)]);
        }
    };

    const removeAttachment = (fileName: string) => {
        setAttachments(prev => prev.filter(file => file.name !== fileName));
    };

    const handleSubmit = () => {
        if (!asset) return;
        if (!description.trim()) {
            addNotification('Deskripsi kerusakan harus diisi.', 'error');
            return;
        }
        setIsLoading(true);

        // This is a simplified attachment handling for the demo.
        // In a real app, you would upload files to a server and get back URLs.
        const processedAttachments: Attachment[] = attachments.map((file, index) => ({
            id: Date.now() + index,
            name: file.name,
            url: URL.createObjectURL(file), 
            type: file.type.startsWith('image/') ? 'image' : (file.type === 'application/pdf' ? 'pdf' : 'other'),
        }));
        
        setTimeout(() => { // Simulate API call
            onSubmit(asset, condition, description, processedAttachments);
            setIsLoading(false);
            onClose();
            // Reset state for next time
            setDescription('');
            setCondition(AssetCondition.MINOR_DAMAGE);
            setAttachments([]);
        }, 1000);
    };

    if (!asset) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Laporkan Kerusakan Aset`}
            size="lg"
            hideDefaultCloseButton
            footerContent={
                <>
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
                    <button onClick={handleSubmit} disabled={isLoading} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-danger rounded-lg shadow-sm hover:bg-red-700 disabled:bg-red-300">
                        {isLoading && <SpinnerIcon className="w-4 h-4 mr-2" />}
                        Kirim Laporan
                    </button>
                </>
            }
        >
            <div className="space-y-6">
                <div className="p-4 bg-gray-50/70 border border-gray-200 rounded-lg">
                    <p className="text-sm font-medium text-gray-600">Aset yang Dilaporkan:</p>
                    <p className="text-lg font-bold text-tm-dark">{asset.name}</p>
                    <p className="text-xs font-mono text-gray-500">{asset.id}</p>
                </div>
                <div>
                    <label htmlFor="damage-condition" className="block text-sm font-medium text-gray-700">Tingkat Kerusakan</label>
                    <div className="mt-1">
                        <CustomSelect options={conditionOptions} value={condition} onChange={(v) => setCondition(v as AssetCondition)} />
                    </div>
                </div>
                <div>
                    <label htmlFor="damage-description" className="block text-sm font-medium text-gray-700">Deskripsi Kerusakan</label>
                    <textarea
                        id="damage-description"
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-lg shadow-sm sm:text-sm focus:ring-tm-accent focus:border-tm-accent"
                        placeholder="Jelaskan detail kerusakan, apa yang terjadi, dan bagian mana yang bermasalah..."
                    ></textarea>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Lampiran (Foto/Video)</label>
                    <div className="flex items-center justify-center w-full px-6 pt-5 pb-6 mt-1 border-2 border-gray-300 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                            <PaperclipIcon className="w-10 h-10 mx-auto text-gray-400" />
                            <div className="flex text-sm text-gray-600">
                                <label htmlFor="file-upload-damage" className="relative font-medium bg-white rounded-md cursor-pointer text-tm-primary hover:text-tm-accent focus-within:outline-none">
                                    <span>Pilih file</span>
                                    <input id="file-upload-damage" name="file-upload-damage" type="file" className="sr-only" multiple onChange={handleFileChange} />
                                </label>
                                <p className="pl-1">atau tarik dan lepas</p>
                            </div>
                            <p className="text-xs text-gray-500">PNG, JPG, MP4 hingga 10MB</p>
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
        </Modal>
    );
};

export default ReportDamageModal;