
import { Request, RequestItem, ItemStatus } from '../types';

/**
 * PRODUCTION-READY BLUEPRINT (FRONTEND SIMULATION)
 * ------------------------------------------------
 * File ini sekarang distrukturisasi menyerupai 'Service' di Backend.
 * Memisahkan Konfigurasi, Formatting, dan Pengiriman.
 */

// 1. SIMULASI ENVIRONMENT VARIABLES (Config)
const WA_CONFIG = {
    groups: {
        LOGISTIC: '1203630239482@g.us',
        PURCHASE: '1203630291823@g.us',
        MANAGEMENT: '1203630239123@g.us'
    },
    // Mapping ID ke Nama yang mudah dibaca user (Hanya untuk UI Simulation)
    groupNames: {
        '1203630239482@g.us': 'Grup Logistik & Gudang',
        '1203630291823@g.us': 'Grup Purchasing',
        '1203630239123@g.us': 'Grup Management (CEO)'
    }
};

export interface WAMessagePayload {
    targetGroup: string;
    message: string;
    groupName: string; 
}

// SECURITY: Sanitizer untuk mencegah Message Spoofing / Injection
// Menghapus karakter formatting WA (*, _, ~) dan membatasi newline agar user tidak bisa memalsukan status
const sanitize = (text: string | undefined | null): string => {
    if (!text) return '-';
    return text
        .toString()
        .replace(/[*_~`]/g, '') // Hapus karakter formatting WA
        .replace(/(\r\n|\n|\r){2,}/g, '\n') // Batasi max 1 baris baru berturut-turut
        .trim();
};

// 2. HELPER FORMATTING (Private Methods di Backend Service)
const formatters = {
    // Format: (no). (nama barang) (tipe/brand) (jumlah) (keterangan)
    itemsList: (items: RequestItem[]): string => {
        return items.map((item, idx) => 
            `${idx + 1}. ${sanitize(item.itemName)} (${sanitize(item.itemTypeBrand)}) ${item.quantity} Unit`
        ).join('\n');
    },
    
    // Format khusus untuk item yang direvisi/ditolak
    revisionsList: (req: Request): string => {
        const revisedItems = req.items.filter(item => {
            const status = req.itemStatuses?.[item.id];
            return status?.status === 'partial' || status?.status === 'rejected';
        });

        if (revisedItems.length === 0) return '';

        const list = revisedItems.map(item => {
            const status = req.itemStatuses?.[item.id];
            const approvedQty = status?.approvedQuantity || 0;
            const reason = sanitize(status?.reason);
            const itemName = sanitize(item.itemName);
            
            if (status?.status === 'rejected') {
                return `❌ ${itemName}: DITOLAK (Alasan: ${reason})`;
            } else {
                return `⚠️ ${itemName}: ${item.quantity} ➝ ${approvedQty} Unit (Alasan: ${reason})`;
            }
        }).join('\n');

        return `\n📝 *CATATAN REVISI / PENYESUAIAN:*\n${list}`;
    },

    currency: (value: number | undefined | null) => {
        if (value === undefined || value === null) return 'Rp 0';
        return `Rp ${value.toLocaleString('id-ID')}`;
    },
    
    date: (date: string | undefined | null) => {
        if (!date) return '-';
        try {
            return new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
        } catch (e) { return '-'; }
    },
    
    dateTime: (date: string | undefined | null) => {
        if (!date) return '-';
        try {
            return new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch (e) { return '-'; }
    }
};

// Helper untuk menyusun body pesan standar
const buildMessageBody = (req: Request, title: string, approvalStatus: string, additionalInfo: string = '') => {
    return `*${title}*
---------------------------
No Request      : *${sanitize(req.id)}*
No Dokumen      : ${sanitize(req.docNumber) || '-'}
Tanggal Request : ${formatters.date(req.requestDate)}
Pemohon         : ${sanitize(req.requester)}
Divisi          : ${sanitize(req.division)}
Status          : ${req.status}

📦 *Rincian Barang:*
${formatters.itemsList(req.items)}

*Status Persetujuan:*
${approvalStatus}
${additionalInfo ? `\n${additionalInfo}` : ''}
🔗 _Link: https://aset.trinitimedia.com/request/${req.id}_`;
};

// 3. SERVICE UTAMA (Business Logic)
export const WhatsAppService = {
    
    generateNewRequestPayload: (request: Request): WAMessagePayload => {
        const justification = request.order.justification ? `📝 *Alasan Urgent:* ${sanitize(request.order.justification)}` : '';
        const message = buildMessageBody(
            request, 
            "🆕 REQUEST ASET BARU", 
            "Menunggu Review Logistik",
            justification
        );

        return { 
            targetGroup: WA_CONFIG.groups.LOGISTIC, 
            message, 
            groupName: WA_CONFIG.groupNames[WA_CONFIG.groups.LOGISTIC as keyof typeof WA_CONFIG.groupNames]
        };
    },

    generateLogisticApprovalPayload: (request: Request, approverName: string): WAMessagePayload => {
        const needsPurchase = request.items.some(i => request.itemStatuses?.[i.id]?.status === 'procurement_needed');
        const targetId = needsPurchase ? WA_CONFIG.groups.PURCHASE : WA_CONFIG.groups.LOGISTIC;
        
        // Cek revisi
        const revisionNote = formatters.revisionsList(request);
        const hasRevisions = revisionNote.length > 0;
        
        const actionNote = needsPurchase 
            ? "⚠️ Butuh Pengadaan (Purchase)" 
            : "✅ Stok Tersedia (Siap Handover)";
        
        // FIX: Judul dinamis agar tidak membingungkan saat ada penolakan item
        const title = hasRevisions ? "✅ LOGISTIC APPROVED (DENGAN REVISI)" : "✅ LOGISTIC APPROVED";
        const statusText = hasRevisions
            ? `Disetujui dengan Revisi oleh Logistik (${sanitize(approverName)})`
            : `Disetujui oleh Logistik (${sanitize(approverName)})`;

        const message = buildMessageBody(
            request,
            title,
            statusText,
            `Catatan: ${actionNote}${revisionNote}`
        );

        return { 
            targetGroup: targetId, 
            message,
            groupName: WA_CONFIG.groupNames[targetId as keyof typeof WA_CONFIG.groupNames]
        };
    },

    generateSubmitToCeoPayload: (request: Request, approverName: string): WAMessagePayload => {
        const totalValue = formatters.currency(request.totalValue);
        const message = buildMessageBody(
            request,
            "💼 BUTUH PERSETUJUAN CEO",
            "Menunggu Persetujuan CEO",
            `💰 *Total Estimasi:* ${totalValue}\n👤 *Diajukan oleh:* ${sanitize(approverName)}`
        );

        return { 
            targetGroup: WA_CONFIG.groups.MANAGEMENT, 
            message, 
            groupName: WA_CONFIG.groupNames[WA_CONFIG.groups.MANAGEMENT as keyof typeof WA_CONFIG.groupNames]
        };
    },

    generateFinalApprovalPayload: (request: Request, approverName: string): WAMessagePayload => {
        // Cek apakah ada revisi dari CEO (item yang di-approve sebagian atau ditolak sebagian)
        const revisionNote = formatters.revisionsList(request);
        const hasRevisions = revisionNote.length > 0;
        
        const title = hasRevisions ? "🎉 CEO APPROVED (DENGAN REVISI)" : "🎉 CEO APPROVED (FINAL)";
        const statusText = hasRevisions 
            ? `Disetujui dengan Revisi oleh ${sanitize(approverName)}` 
            : `Disetujui Penuh oleh ${sanitize(approverName)}`;

        const message = buildMessageBody(
            request,
            title,
            statusText,
            `Instruksi: Tim Purchase silakan proses PO sesuai persetujuan final.${revisionNote}`
        );

        return { 
            targetGroup: WA_CONFIG.groups.PURCHASE, 
            message, 
            groupName: WA_CONFIG.groupNames[WA_CONFIG.groups.PURCHASE as keyof typeof WA_CONFIG.groupNames]
        };
    },
    
    // --- PROCUREMENT PROGRESS UPDATES ---

    generateProcurementUpdatePayload: (request: Request, status: ItemStatus): WAMessagePayload => {
        let title = "";
        let info = "";
        let date = "";

        if (status === ItemStatus.PURCHASING) {
            title = "🛒 PROSES PENGADAAN DIMULAI";
            info = "Tim Purchase sedang memproses pembelian/PO ke vendor.";
            date = formatters.date(new Date().toISOString());
        } else if (status === ItemStatus.IN_DELIVERY) {
            title = "🚚 BARANG DALAM PENGIRIMAN";
            info = "Barang sudah dikirim oleh vendor dan sedang dalam perjalanan.";
            date = request.actualShipmentDate ? formatters.date(request.actualShipmentDate) : formatters.date(new Date().toISOString());
        }

        const message = buildMessageBody(
            request,
            title,
            "Sedang Diproses",
            `📅 Tanggal Update: ${date}\nℹ️ Info: ${info}`
        );

        return {
            targetGroup: WA_CONFIG.groups.LOGISTIC, // Info ke logistik agar bersiap
            message,
            groupName: WA_CONFIG.groupNames[WA_CONFIG.groups.LOGISTIC as keyof typeof WA_CONFIG.groupNames]
        };
    },

    generateItemsArrivedPayload: (request: Request): WAMessagePayload => {
        const arrivalDate = request.arrivalDate ? formatters.dateTime(request.arrivalDate) : formatters.dateTime(new Date().toISOString());
        const message = buildMessageBody(
            request,
            "🏁 BARANG TIBA / SIAP",
            "Selesai (Barang Tiba)",
            `📅 Waktu Tiba: ${arrivalDate}\n\nBarang telah tersedia di gudang. Admin Logistik silakan lakukan Pencatatan Aset (Register) & Handover.`
        );

        return { 
            targetGroup: WA_CONFIG.groups.LOGISTIC, 
            message, 
            groupName: WA_CONFIG.groupNames[WA_CONFIG.groups.LOGISTIC as keyof typeof WA_CONFIG.groupNames]
        };
    },

    generateRejectionPayload: (request: Request, rejectorName: string, reason: string): WAMessagePayload => {
        // Force update status visual pada pesan menjadi 'Ditolak'
        const rejectedRequest = { ...request, status: ItemStatus.REJECTED };
        
        // Custom title jika CEO yang menolak
        const isCeoRejection = rejectorName.includes('Super Admin') || rejectorName.includes('CEO');
        const title = isCeoRejection ? "❌ DITOLAK CEO / MANAGEMENT" : "❌ REQUEST DITOLAK";

        const message = buildMessageBody(
            rejectedRequest,
            title,
            `Ditolak oleh ${sanitize(rejectorName)}`,
            `📝 *Alasan Penolakan/Revisi:*\n"${sanitize(reason)}"\n\nSilakan ajukan ulang jika diperlukan.`
        );

        return { 
            targetGroup: WA_CONFIG.groups.LOGISTIC, 
            message, 
            groupName: WA_CONFIG.groupNames[WA_CONFIG.groups.LOGISTIC as keyof typeof WA_CONFIG.groupNames]
        };
    }
};

// 4. PROVIDER ADAPTER SIMULATION
export const sendWhatsAppSimulation = async (payload: WAMessagePayload): Promise<void> => {
    // Di Backend: await axios.post(process.env.WA_URL, { phone: payload.targetGroup, message: payload.message });
    console.log(`[WA-ADAPTER] Sending payload to ${payload.targetGroup} (${payload.groupName})`);
    
    // Simulate Network Delay
    await new Promise(resolve => setTimeout(resolve, 500));
};

// Legacy export
export const WhatsAppMessageGenerator = {
    newRequest: WhatsAppService.generateNewRequestPayload,
    logisticApproved: WhatsAppService.generateLogisticApprovalPayload,
    submittedToCEO: WhatsAppService.generateSubmitToCeoPayload,
    finalApproved: WhatsAppService.generateFinalApprovalPayload,
    itemsArrived: WhatsAppService.generateItemsArrivedPayload,
    rejected: WhatsAppService.generateRejectionPayload
};
