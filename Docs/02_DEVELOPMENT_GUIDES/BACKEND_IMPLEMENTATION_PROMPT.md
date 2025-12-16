
# Backend Implementation Prompt (For AI Agents)

**Context:**
We are migrating a "Trinity Asset Management" application from a Frontend-only prototype (React/Vite with Mock API) to a full-stack NestJS + PostgreSQL application.

**Your Goal:**
Generate the NestJS Service and Controller code for the modules listed below, based strictly on the Prisma Schema provided.

**Tech Stack:**
- Framework: NestJS (v10+)
- ORM: Prisma
- Language: TypeScript
- Auth: Passport-JWT

**Prisma Schema (Reference):**
(Paste content of backend/prisma/schema.prisma here)

**Task:**
Generate the `src/[module]/[module].service.ts` and `src/[module]/[module].controller.ts` for the following module: **[INSERT MODULE NAME HERE]** (e.g., Assets, Requests).

**Requirements:**
1.  **DTOs:** Create DTO classes (`create-[name].dto.ts`, `update-[name].dto.ts`) using `class-validator` based on the Prisma model fields.
    *   *Crucial:* For JSON fields (like `items`, `attachments`), use proper validation or `IsOptional` with `IsJSON` or `IsArray`.
2.  **CRUD:** Implement standard CRUD operations (Create, FindAll with pagination/search, FindOne, Update, Remove).
3.  **Error Handling:** Use `NotFoundException` and `BadRequestException` where appropriate.
4.  **Auth:** Apply `@UseGuards(JwtAuthGuard)` to the controller. Use `@Roles(...)` decorator for restricted actions (e.g., Create/Delete is Admin only).
5.  **Transactions:** For complex operations (like `Installation` which updates `Customer` and `Asset` status simultaneously), use `prisma.$transaction`.

**Modules Checklist (Ensure you generate all):**
1.  **AuthModule** (Login, Register, JWT Strategy)
2.  **UsersModule** (User & Division management)
3.  **AssetsModule** (Asset CRUD, filtering, history)
4.  **RequestsModule** (Procurement flow, approvals)
5.  **LoansModule** (LoanRequest & AssetReturn logic)
6.  **TransactionsModule** (Handles `Handover`, `Installation`, `Dismantle`, `Maintenance`)
7.  **StockModule** (StockMovement ledger logic)
8.  **CustomersModule** (Customer CRM)

Please generate the code for **[INSERT MODULE NAME HERE]**.
