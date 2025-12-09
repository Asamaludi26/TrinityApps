# Panduan Pengujian (Testing)

Pengujian adalah bagian krusial dari siklus pengembangan untuk memastikan kualitas, keandalan, dan stabilitas aplikasi. Dokumen ini mendefinisikan strategi dan panduan untuk menulis tes di proyek ini.

## 1. Filosofi Pengujian

Kami mengadopsi pendekatan **Piramida Pengujian**, dengan fokus pada:
-   **Unit Tests (Dasar Piramida)**: Porsi terbesar dari tes. Menguji unit-unit kecil (fungsi, komponen UI) secara terisolasi. Cepat dijalankan dan memberikan umpan balik instan.
-   **Integration Tests (Tengah Piramida)**: Menguji interaksi antara beberapa unit. Contoh: komponen yang mengambil data dari sebuah hook, atau endpoint controller yang berinteraksi dengan service.
-   **End-to-End (E2E) Tests (Puncak Piramida)**: Porsi terkecil. Mensimulasikan alur kerja pengguna secara lengkap dari antarmuka hingga ke database. Lambat dijalankan tetapi memberikan kepercayaan tertinggi.

## 2. Tools yang Digunakan

-   **Test Runner & Framework**: **Jest**
-   **Frontend Testing**: **React Testing Library (RTL)** untuk merender komponen dan mensimulasikan interaksi pengguna.
-   **Backend Testing**: Modul `@nestjs/testing` untuk membuat lingkungan pengujian yang terisolasi.
-   **E2E Testing**: **Cypress** untuk mensimulasikan interaksi pengguna nyata di browser.

## 3. Cara Menjalankan Tes

Jalankan perintah berikut dari folder masing-masing (`frontend/` atau `backend/`):

```bash
# Menjalankan semua tes sekali jalan
pnpm run test

# Menjalankan tes dalam mode watch (interaktif, otomatis berjalan saat ada perubahan)
pnpm run test:watch
```

---

## 4. Contoh Penulisan Tes (Skrip Teruji)

### Contoh 1: Unit Test Komponen React (Frontend)

Menggunakan React Testing Library untuk menguji komponen `Checkbox`. Tes ini fokus pada perilaku komponen secara terisolasi.

**File**: `src/components/ui/Checkbox.test.tsx`
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Checkbox } from './Checkbox';

describe('Checkbox Component', () => {
  test('harus render dalam keadaan tidak tercentang secara default', () => {
    render(<Checkbox data-testid="my-checkbox" />);
    const checkbox = screen.getByTestId('my-checkbox');
    expect(checkbox).not.toBeChecked();
  });

  test('harus render dalam keadaan tercentang jika prop `checked` adalah true', () => {
    render(<Checkbox checked data-testid="my-checkbox" />);
    const checkbox = screen.getByTestId('my-checkbox');
    expect(checkbox).toBeChecked();
  });

  test('harus memanggil fungsi `onChange` ketika diklik', () => {
    // jest.fn() adalah fungsi mock untuk melacak panggilan
    const handleChange = jest.fn();
    render(<Checkbox onChange={handleChange} data-testid="my-checkbox" />);
    
    const checkbox = screen.getByTestId('my-checkbox');
    fireEvent.click(checkbox);
    
    // Verifikasi bahwa fungsi mock dipanggil tepat 1 kali
    expect(handleChange).toHaveBeenCalledTimes(1);
  });
  
  test('tidak boleh memanggil `onChange` jika dalam keadaan disabled', () => {
    const handleChange = jest.fn();
    render(<Checkbox onChange={handleChange} disabled data-testid="my-checkbox" />);
    
    const checkbox = screen.getByTestId('my-checkbox');
    expect(checkbox).toBeDisabled();
    
    // fireEvent.click tidak akan berpengaruh pada elemen yang disabled
    fireEvent.click(checkbox);
    
    expect(handleChange).not.toHaveBeenCalled();
  });
});
```

### Contoh 2: Unit Test Service NestJS (Backend)

Menggunakan `@nestjs/testing` untuk menguji `AssetsService` secara terisolasi dengan me-mock `PrismaService`. Ini memastikan logika bisnis diuji tanpa bergantung pada database sungguhan.

**File**: `src/assets/assets.service.spec.ts`
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AssetsService } from './assets.service';
import { PrismaService } from '../shared/prisma/prisma.service';
import { AssetCondition } from '@prisma/client';

// Buat mock untuk PrismaService. Ini meniru objek PrismaClient.
const dbMock = {
  asset: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
  },
};

describe('AssetsService', () => {
  let service: AssetsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        {
          provide: PrismaService,
          useValue: dbMock, // Gunakan mock, bukan PrismaService asli
        },
      ],
    }).compile();

    service = module.get<AssetsService>(AssetsService);
    prisma = module.get<PrismaService>(PrismaService);
    
    // Reset semua mock sebelum setiap tes
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('harus mengembalikan array berisi aset', async () => {
      const mockAssets = [{ id: 'AST-001', name: 'Test Asset' }];
      dbMock.asset.findMany.mockResolvedValue(mockAssets);

      const assets = await service.findAll();
      
      expect(assets).toEqual(mockAssets);
      expect(prisma.asset.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('create', () => {
    it('harus membuat dan mengembalikan sebuah aset', async () => {
      const dto = { 
        id: 'AST-002', 
        name: 'New Asset', 
        condition: AssetCondition.BRAND_NEW,
        // ...properti lain
      };
      const mockCreatedAsset = { ...dto, createdAt: new Date(), updatedAt: new Date() };
      
      dbMock.asset.create.mockResolvedValue(mockCreatedAsset);

      const newAsset = await service.create(dto);
      
      expect(newAsset).toEqual(mockCreatedAsset);
      expect(prisma.asset.create).toHaveBeenCalledWith({ data: dto });
    });
  });
});
```

### Contoh 3: Tes Integrasi Endpoint NestJS (Backend)

Menggunakan `@nestjs/testing` dan `supertest` untuk menguji endpoint `GET /api/assets` secara menyeluruh, dari HTTP request hingga (mock) database.

**File**: `src/assets/assets.controller.integration.spec.ts`
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';

// Mock database untuk tes integrasi
const dbMock = {
  asset: {
    findMany: jest.fn().mockResolvedValue([{ id: 'AST-INT-001', name: 'Integration Asset' }]),
  },
};

describe('AssetsController (Integration)', () => {
  let app: INestApplication;
  let jwtToken: string; // Token dummy untuk tes

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider(PrismaService) // Ganti PrismaService asli dengan mock
    .useValue(dbMock)
    .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    
    // Dapatkan token dummy. Di dunia nyata, ini akan memanggil auth service.
    // Di sini kita asumsikan auth service bekerja.
    // Ini adalah contoh token JWT yang sudah di-decode, untuk simplicity.
    const { JwtService } = await import('@nestjs/jwt');
    const jwtService = app.get<JwtService>(JwtService);
    jwtToken = jwtService.sign({ sub: 1, email: 'test@admin.com', role: 'SuperAdmin' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/assets - harus mengembalikan array aset jika token valid', () => {
    return request(app.getHttpServer())
      .get('/api/assets')
      .set('Authorization', `Bearer ${jwtToken}`) 
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(1);
        expect(res.body[0].id).toBe('AST-INT-001');
      });
  });

  it('GET /api/assets - harus gagal dengan status 401 jika tidak ada token', () => {
    return request(app.getHttpServer())
      .get('/api/assets')
      .expect(401);
  });
});
```

### Contoh 4: End-to-End Test dengan Cypress (Frontend)

Tes ini mensimulasikan pengguna nyata yang mencoba login ke aplikasi. Ini adalah level pengujian tertinggi.

**Prasyarat**: Cypress harus diinstal di `frontend/`: `pnpm add -D cypress` dan `npx cypress open`.

**File**: `frontend/cypress/e2e/login.cy.ts`
```typescript
describe('Alur Login Pengguna', () => {
  it('harus berhasil login dengan kredensial yang valid dan diarahkan ke dashboard', () => {
    // 1. Kunjungi halaman utama aplikasi
    cy.visit('http://localhost:5173');

    // 2. Cari elemen input email dan ketikkan email yang valid
    // cy.get() mencari elemen berdasarkan selector CSS.
    cy.get('input[name="email"]')
      .should('be.visible')
      .type('super.admin@triniti.com');

    // 3. Cari elemen input password dan ketikkan password yang valid
    cy.get('input[name="password"]')
      .should('be.visible')
      .type('password123');

    // 4. Klik tombol "Masuk"
    // cy.contains() mencari elemen berdasarkan teksnya.
    cy.contains('button', 'Masuk').click();
    
    // 5. Verifikasi bahwa URL telah berubah ke halaman dashboard
    // URL mungkin tidak berubah di SPA, jadi kita cek elemen di dashboard.
    cy.url().should('include', '/'); // Asumsi path root setelah login

    // 6. Verifikasi bahwa elemen dari halaman dashboard muncul
    // Ini adalah bukti paling kuat bahwa login berhasil.
    cy.contains('h1', 'Dashboard').should('be.visible');
    
    // 7. Verifikasi bahwa nama pengguna yang login ditampilkan
    cy.contains('span', 'John Doe').should('be.visible');
  });

  it('harus menampilkan pesan error dengan kredensial yang tidak valid', () => {
    cy.visit('http://localhost:5173');

    cy.get('input[name="email"]').type('email.salah@triniti.com');
    cy.get('input[name="password"]').type('password.salah');
    cy.contains('button', 'Masuk').click();

    // Verifikasi bahwa pesan error muncul
    cy.contains('Email atau kata sandi yang Anda masukkan salah').should('be.visible');

    // Verifikasi bahwa kita masih berada di halaman login
    cy.contains('h2', 'Selamat Datang').should('be.visible');
  });
});
```