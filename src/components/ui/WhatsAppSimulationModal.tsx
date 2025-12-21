
import React from 'react';
import Modal from './Modal';
import { useUIStore } from '../../stores/useUIStore';
import { BsWhatsapp, BsSend } from 'react-icons/bs';

export const WhatsAppSimulationModal: React.FC = () => {
    const { waModalOpen, waModalData, closeWAModal } = useUIStore();

    if (!waModalData) return null;

    // Helper untuk merender newline sebagai <br/>
    const renderMessage = (text: string) => {
        return text.split('\n').map((str, index) => (
            <React.Fragment key={index}>
                {str}
                <br />
            </React.Fragment>
        ));
    };

    return (
        <Modal
            isOpen={waModalOpen}
            onClose={closeWAModal}
            title="Simulasi Notifikasi WhatsApp"
            size="md"
            hideDefaultCloseButton
        >
            <div className="flex flex-col space-y-4">
                {/* Header Info */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                    <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center text-white flex-shrink-0">
                        <BsWhatsapp className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Target Group</p>
                        <p className="font-semibold text-gray-800">{waModalData.groupName}</p>
                        <p className="text-[10px] font-mono text-gray-400">{waModalData.targetGroup}</p>
                    </div>
                </div>

                {/* Chat Bubble Simulation */}
                <div className="bg-[#E5DDD5] p-4 rounded-xl border border-gray-300 shadow-inner min-h-[150px] flex flex-col">
                    <div className="self-start bg-white p-3 rounded-lg rounded-tl-none shadow-sm max-w-[90%] text-sm text-gray-800 relative">
                        {/* Triangle */}
                        <div className="absolute top-0 -left-2 w-0 h-0 border-t-[10px] border-t-white border-l-[10px] border-l-transparent"></div>
                        
                        <div className="whitespace-pre-wrap font-sans leading-relaxed">
                            {renderMessage(waModalData.message)}
                        </div>
                        
                        <div className="text-[10px] text-gray-400 text-right mt-1 flex justify-end items-center gap-1">
                            {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            {/* Double Check Icon mimicking WA read receipt */}
                            <span className="text-blue-400 font-bold">✓✓</span>
                        </div>
                    </div>
                </div>
                
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg border border-blue-100">
                    <strong>Mode Debug:</strong> Pesan di atas adalah format teks yang akan dikirimkan oleh Bot ke Grup WhatsApp saat backend diimplementasikan.
                </div>

                {/* Footer Action */}
                <div className="flex justify-end pt-2">
                    <button 
                        onClick={closeWAModal}
                        className="flex items-center gap-2 px-6 py-2 bg-[#128C7E] text-white font-bold rounded-full hover:bg-[#075E54] transition-all shadow-md active:scale-95"
                    >
                        <BsSend className="w-4 h-4" />
                        Tutup Simulasi
                    </button>
                </div>
            </div>
        </Modal>
    );
};
