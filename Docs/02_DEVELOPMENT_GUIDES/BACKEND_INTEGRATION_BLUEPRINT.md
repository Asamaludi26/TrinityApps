
# Blueprint Integrasi WhatsApp Gateway (Backend V2 - Production Ready)

Dokumen ini menjelaskan arsitektur teknis untuk implementasi notifikasi WhatsApp pada Backend NestJS. Desain ini menggunakan **Queue System** untuk performa dan **Adapter Pattern** untuk fleksibilitas provider.

## 1. Arsitektur Sistem (Asynchronous Queue)

Pengiriman pesan WA adalah proses "side-effect" yang berat (IO-bound). Jangan lakukan di main thread request.

```mermaid
graph LR
    User[User Action] --> API[NestJS API]
    API --> DB[(Database)]
    API -- "Add Job" --> Queue[Redis Queue (BullMQ)]
    
    subgraph "Worker Service"
        Worker[Notification Worker] -- "Process Job" --> Queue
        Worker -- "Use Adapter" --> Adapter[WA Provider Adapter]
    end
    
    Adapter --> WAGateway[External WA API]
    WAGateway --> WAGroup[WhatsApp Group]
```

## 2. Konfigurasi (Environment Variables)

ID Group dan API Key **TIDAK BOLEH** di-hardcode. Wajib menggunakan `.env`.

```env
# Provider Config
WA_PROVIDER=watzap # atau 'meta', 'twilio'
WA_API_KEY=xyz...
WA_API_URL=https://api.watzap.id/v1

# Group IDs (Target)
WA_GROUP_LOGISTIC_ID=1203630239482@g.us
WA_GROUP_PURCHASE_ID=1203630291823@g.us
WA_GROUP_MANAGEMENT_ID=1203630239123@g.us
```

## 3. Implementasi Kode (NestJS)

### A. Interface Adapter (Fleksibilitas Provider)
Memungkinkan kita mengganti vendor WA tanpa mengubah logika bisnis utama.

```typescript
// src/notifications/interfaces/whatsapp-provider.interface.ts
export interface IWhatsAppProvider {
  sendMessage(to: string, message: string): Promise<boolean>;
}
```

### B. Service Logika (Business Logic)
Service ini menentukan *siapa* menerima pesan dan *apa* isinya.

```typescript
@Injectable()
export class WhatsappService {
  constructor(
    @Inject('WA_PROVIDER') private readonly provider: IWhatsAppProvider,
    private readonly config: ConfigService
  ) {}

  async notifyNewRequest(request: RequestEntity) {
    const message = this.formatNewRequestMessage(request);
    const targetGroup = this.config.get('WA_GROUP_LOGISTIC_ID');
    
    // Kirim ke Queue (disarankan) atau langsung (jika MVP)
    await this.provider.sendMessage(targetGroup, message);
  }

  private formatNewRequestMessage(req: RequestEntity): string {
    return `🆕 *REQUEST BARU*\nID: ${req.id}\nOleh: ${req.requester}`;
  }
}
```

## 4. Strategi Error Handling

1.  **Retry Mechanism**: Jika API WA down, Worker harus mencoba ulang (Exponential Backoff) minimal 3 kali.
2.  **Dead Letter Queue**: Jika gagal total setelah retry, simpan log error ke database/Sentry agar Admin sadar notifikasi gagal.
3.  **Circuit Breaker**: Jika provider error terus-menerus, hentikan pengiriman sementara untuk mencegah overload.

## 5. Simulasi Frontend (Current Implementation)

Di frontend saat ini (`src/services/whatsappIntegration.ts`), kita mensimulasikan struktur ini dengan:
1.  `WhatsAppConfig`: Simulasi `.env`.
2.  `WhatsAppService`: Simulasi Backend Service.
3.  `sendWhatsAppSimulation`: Simulasi Provider Adapter.
