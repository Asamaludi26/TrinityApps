
# Panduan Pengembangan Backend (NestJS & PostgreSQL)

Dokumen ini adalah panduan teknis lengkap untuk membangun, mengembangkan, dan memelihara backend Aplikasi Inventori Aset. Backend ini dibangun menggunakan **NestJS**, **Prisma ORM**, dan database **PostgreSQL**.

## 1. Prasyarat Lingkungan

Sebelum memulai, pastikan lingkungan pengembangan server memiliki:
-   **Node.js**: Versi 18.x atau lebih baru (LTS direkomendasikan).
-   **pnpm**: Package manager yang digunakan (`npm install -g pnpm`).
-   **PostgreSQL**: Versi 14.x atau lebih baru.
-   **NestJS CLI**: Instal secara global dengan `npm install -g @nestjs/cli`.

---

## 2. Arsitektur Aplikasi (Modular Monolith)

Kami menggunakan pendekatan **Modular** di NestJS. Setiap fitur bisnis (Aset, User, Request) dikapsulasi dalam modulnya sendiri yang berisi Controller, Service, dan DTO.

### 2.1. Struktur Folder
```
src/
├── app.module.ts        # Root Module yang menggabungkan semua modul
├── main.ts              # Entry point aplikasi (Config, CORS, Global Pipes)
├── prisma/              # Konfigurasi Database
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── common/              # Logic yang digunakan bersama
│   ├── decorators/      # Custom Decorators (@CurrentUser)
│   ├── guards/          # Auth Guards (JwtAuthGuard, RolesGuard)
│   └── filters/         # Global Exception Filters
├── auth/                # Modul Autentikasi (JWT Strategy)
├── assets/              # Modul Manajemen Aset
│   ├── dto/             # Data Transfer Objects (Validasi Input)
│   │   ├── create-asset.dto.ts
│   │   └── update-asset.dto.ts
│   ├── assets.controller.ts  # HTTP Endpoints
│   ├── assets.service.ts     # Business Logic
│   └── assets.module.ts      # Dependency Injection Container
└── users/               # Modul Manajemen Pengguna
```

---

## 3. Manajemen Database (Prisma ORM)

Pengelolaan skema database dilakukan sepenuhnya melalui file `prisma/schema.prisma`.

### 3.1. Definisi Skema (`schema.prisma`)
Skema ini adalah *Single Source of Truth* untuk struktur data.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id         Int       @id @default(autoincrement())
  name       String
  email      String    @unique
  password   String
  role       String    // Enum: 'Super Admin', 'Admin Logistik', dll
  divisionId Int?
  division   Division? @relation(fields: [divisionId], references: [id])
  requests   Request[]
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
}

model Asset {
  id               String    @id // Format: AST-001
  name             String
  serialNumber     String?   @unique
  status           String    // Enum: IN_STORAGE, IN_USE
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
}

// ... model lainnya (Request, Handover, dll)
```

### 3.2. Strategi Migrasi (PENTING)

**Di Lingkungan Development:**
Gunakan perintah ini setiap kali Anda mengubah `schema.prisma`. Ini akan membuat file migrasi SQL baru.
```bash
npx prisma migrate dev --name nama_perubahan_anda
# Contoh: npx prisma migrate dev --name add_user_role
```

**Di Lingkungan Produksi:**
JANGAN gunakan `migrate dev` di produksi. Gunakan perintah berikut untuk menerapkan migrasi yang sudah ada tanpa mereset data:
```bash
npx prisma migrate deploy
```

---

## 4. Pola Pengembangan Fitur (Best Practices)

### 4.1. Data Transfer Objects (DTO)
Semua input dari client **wajib** divalidasi menggunakan DTO. Jangan pernah menggunakan `any` di controller.

**File**: `src/assets/dto/create-asset.dto.ts`
```typescript
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum } from 'class-validator';

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsOptional()
  serialNumber?: string;
  
  @IsNumber()
  @IsOptional()
  purchasePrice?: number;
}
```

### 4.2. Controller (Handling Request)
Controller hanya bertugas menerima request, memanggil service, dan mengembalikan response. Hindari logika bisnis yang kompleks di sini.

**File**: `src/assets/assets.controller.ts`
```typescript
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('assets')
@UseGuards(JwtAuthGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @Roles('Admin Logistik', 'Super Admin') // RBAC Protection
  create(@Body() createAssetDto: CreateAssetDto) {
    return this.assetsService.create(createAssetDto);
  }

  @Get()
  findAll() {
    return this.assetsService.findAll();
  }
}
```

### 4.3. Service (Business Logic)
Service berisi logika bisnis utama dan interaksi langsung dengan Prisma.

**File**: `src/assets/assets.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateAssetDto) {
    // Logika bisnis tambahan (misal: generate custom ID)
    return this.prisma.asset.create({ data });
  }

  async findAll() {
    return this.prisma.asset.findMany();
  }
}
```

---

## 5. Konfigurasi `main.ts` untuk Produksi

Pastikan `main.ts` dikonfigurasi untuk keamanan dan validasi global.

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as compression from 'compression';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security Headers
  app.use(helmet());
  
  // Gzip Compression
  app.use(compression());

  // CORS (Cross-Origin Resource Sharing)
  // Ubah origin sesuai domain frontend di produksi
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Global Validation
  // whitelist: true akan membuang properti yang tidak ada di DTO (mencegah injeksi data sampah)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // Global Prefix
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT || 3001);
}
bootstrap();
```
