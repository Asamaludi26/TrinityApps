# Panduan Rinci Implementasi Backend (Step-by-Step)

Dokumen ini memberikan panduan teknis mendalam untuk membangun backend Aplikasi Inventori Aset menggunakan NestJS, Prisma, dan PostgreSQL.

## 1. Prasyarat
-   Node.js (v18+) & pnpm
-   PostgreSQL server berjalan (lokal atau via Docker)
-   NestJS CLI: `pnpm add -g @nestjs/cli`

## 2. Langkah 1: Setup Proyek & Database
1.  **Buat Proyek NestJS Baru**:
    ```bash
    nest new backend
    cd backend
    ```

2.  **Instal Dependensi Prisma**:
    ```bash
    pnpm add prisma @prisma/client
    ```

3.  **Inisialisasi Prisma**:
    ```bash
    pnpm prisma init --datasource-provider postgresql
    ```
    Ini akan membuat folder `prisma` dengan file `schema.prisma` dan file `.env` untuk `DATABASE_URL`.

4.  **Konfigurasi Koneksi Database**:
    Buka file `.env` dan atur `DATABASE_URL` sesuai dengan konfigurasi PostgreSQL Anda.
    ```env
    DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
    ```

5.  **Isi Skema Database**:
    Salin seluruh skema dari [Dokumen Skema Database](../01_CONCEPT_AND_ARCHITECTURE/DATABASE_SCHEMA.md) ke dalam file `prisma/schema.prisma`.

6.  **Jalankan Migrasi Pertama**:
    Perintah ini akan membuat database (jika belum ada), menerapkan skema, dan men-generate Prisma Client.
    ```bash
    pnpm prisma migrate dev --name init
    ```
    Setiap kali Anda mengubah `schema.prisma`, jalankan kembali perintah ini dengan nama migrasi yang baru.

## 3. Langkah 2: Membangun Modul Inti (`PrismaService`, `Auth`)

### 3.1. Membuat PrismaService
Service ini akan menyediakan instance Prisma Client yang dapat di-inject ke service lain.
1.  Buat modul & service:
    ```bash
    nest g module shared/prisma
    nest g service shared/prisma
    ```
2.  Implementasikan `PrismaService`:
    **File**: `src/shared/prisma/prisma.service.ts`
    ```typescript
    import { Injectable, OnModuleInit } from '@nestjs/common';
    import { PrismaClient } from '@prisma/client';

    @Injectable()
    export class PrismaService extends PrismaClient implements OnModuleInit {
      async onModuleInit() {
        await this.$connect();
      }
    }
    ```

### 3.2. Membangun Modul Autentikasi (`Auth`)
1.  Instal dependensi JWT & Passport:
    ```bash
    pnpm add @nestjs/passport passport passport-jwt @nestjs/jwt bcrypt
    pnpm add -D @types/passport-jwt @types/bcrypt
    ```
2.  Generate modul `auth`:
    ```bash
    nest g resource auth --no-spec
    ```
3.  Implementasikan Logika:
    **File**: `src/auth/auth.service.ts`
    ```typescript
    import { Injectable, UnauthorizedException } from '@nestjs/common';
    import { PrismaService } from '../shared/prisma/prisma.service';
    import { JwtService } from '@nestjs/jwt';
    import * as bcrypt from 'bcrypt';

    @Injectable()
    export class AuthService {
      constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
      ) {}

      async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (user && await bcrypt.compare(pass, user.password)) {
          const { password, ...result } = user;
          return result;
        }
        return null;
      }

      async login(user: any) {
        const payload = { email: user.email, sub: user.id, role: user.role };
        return {
          access_token: this.jwtService.sign(payload),
        };
      }
    }
    ```
    **File**: `src/auth/jwt.strategy.ts` (di dalam `src/auth/strategies`)
    ```typescript
    import { Injectable } from '@nestjs/common';
    import { PassportStrategy } from '@nestjs/passport';
    import { ExtractJwt, Strategy } from 'passport-jwt';

    @Injectable()
    export class JwtStrategy extends PassportStrategy(Strategy) {
      constructor() {
        super({
          jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
          ignoreExpiration: false,
          secretOrKey: process.env.JWT_SECRET, // Pastikan ini ada di .env
        });
      }

      async validate(payload: any) {
        // payload adalah hasil dekode dari JWT
        return { id: payload.sub, email: payload.email, role: payload.role };
      }
    }
    ```

## 4. Langkah 3: Membangun Modul Fitur (Contoh: `Assets`)
1.  Generate modul `assets`:
    ```bash
    nest g resource assets --no-spec
    ```
2.  **Buat DTO (Data Transfer Object)**:
    File: `src/assets/dto/create-asset.dto.ts`
    ```typescript
    import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber } from 'class-validator';
    import { AssetStatus, AssetCondition } from '@prisma/client';

    export class CreateAssetDto {
      @IsString() @IsNotEmpty() id: string;
      @IsString() @IsNotEmpty() name: string;
      // ... tambahkan properti lain dengan decorator validasi
      @IsEnum(AssetStatus) @IsOptional() status?: AssetStatus;
      @IsEnum(AssetCondition) @IsNotEmpty() condition: AssetCondition;
    }
    ```
3.  **Implementasikan Service**:
    File: `src/assets/assets.service.ts`
    ```typescript
    import { Injectable } from '@nestjs/common';
    import { PrismaService } from '../shared/prisma/prisma.service';
    import { CreateAssetDto } from './dto/create-asset.dto';

    @Injectable()
    export class AssetsService {
      constructor(private prisma: PrismaService) {}

      create(createAssetDto: CreateAssetDto) {
        return this.prisma.asset.create({ data: createAssetDto });
      }

      findAll() {
        return this.prisma.asset.findMany();
      }
    }
    ```
4.  **Implementasikan Controller**:
    File: `src/assets/assets.controller.ts`
    ```typescript
    import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
    import { AssetsService } from './assets.service';
    import { CreateAssetDto } from './dto/create-asset.dto';
    import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Import Guard
    import { Roles } from '../auth/decorators/roles.decorator'; // Import Decorator
    import { RolesGuard } from '../auth/guards/roles.guard'; // Import Guard
    import { UserRole } from '@prisma/client';

    @Controller('assets')
    @UseGuards(JwtAuthGuard, RolesGuard) // Lindungi semua endpoint di controller ini
    export class AssetsController {
      constructor(private readonly assetsService: AssetsService) {}

      @Post()
      @Roles(UserRole.AdminLogistik, UserRole.SuperAdmin) // Hanya Admin & Super Admin
      create(@Body() createAssetDto: CreateAssetDto) {
        return this.assetsService.create(createAssetDto);
      }

      @Get()
      // Tidak ada @Roles, berarti semua user yang terautentikasi bisa akses
      findAll() {
        return this.assetsService.findAll();
      }
    }
    ```

## 5. Langkah 4: Konfigurasi Global
Pastikan aplikasi Anda memiliki konfigurasi global untuk validasi, keamanan, dan lainnya.
**File**: `src/main.ts`
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Aktifkan CORS
  app.enableCors({
    origin: 'http://localhost:5173', // Ganti dengan URL frontend produksi
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  // Gunakan Helmet untuk header keamanan
  app.use(helmet());

  // Atur prefix global untuk semua API
  app.setGlobalPrefix('api');

  // Aktifkan validasi global menggunakan DTO
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Hapus properti yang tidak ada di DTO
    transform: true, // Transformasi payload ke instance DTO
  }));

  await app.listen(3001);
}
bootstrap();
```