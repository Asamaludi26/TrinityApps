
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seeding...');

  // 1. Seed Divisions
  const divisions = [
    { id: 1, name: 'Network Engineering' },
    { id: 2, name: 'NOC (Network Operation Center)' },
    { id: 3, name: 'Technical Support' },
    { id: 4, name: 'Logistik & Gudang' },
    { id: 5, name: 'Management' },
    { id: 6, name: 'Purchase' },
    { id: 7, name: 'HR & GA' },
  ];

  for (const div of divisions) {
    await prisma.division.upsert({
      where: { id: div.id },
      update: {},
      create: div,
    });
  }
  console.log('✅ Divisions seeded');

  // 2. Seed Users
  const passwordHash = await bcrypt.hash('password123', 10); // Default password
  const users = [
    { email: 'super.admin@triniti.com', name: 'Super Admin', role: 'Super Admin', divisionId: 5 },
    { email: 'logistik.admin@triniti.com', name: 'Admin Logistik', role: 'Admin Logistik', divisionId: 4 },
    { email: 'purchase.admin@triniti.com', name: 'Admin Purchase', role: 'Admin Purchase', divisionId: 6 },
    { email: 'staff.teknisi@triniti.com', name: 'Teknisi Lapangan', role: 'Staff', divisionId: 3 },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        ...user,
        password: passwordHash,
      },
    });
  }
  console.log('✅ Users seeded');

  // 3. Seed Asset Categories (Basic)
  const categories = [
    { name: 'Perangkat Jaringan (Core)', isCustomerInstallable: false, associatedDivisions: [1, 2] },
    { name: 'Perangkat Pelanggan (CPE)', isCustomerInstallable: true, associatedDivisions: [1, 3] },
    { name: 'Infrastruktur Fiber Optik', isCustomerInstallable: true, associatedDivisions: [3] },
    { name: 'Alat Kerja Lapangan', isCustomerInstallable: false, associatedDivisions: [3] },
    { name: 'Aset Kantor', isCustomerInstallable: false, associatedDivisions: [] },
  ];

  for (const cat of categories) {
    // Note: In real logic, handle associatedDivisions properly based on your schema relation
    await prisma.assetCategory.create({
      data: {
        name: cat.name,
        isCustomerInstallable: cat.isCustomerInstallable,
      }
    });
  }
  console.log('✅ Categories seeded');

  console.log('🚀 Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    (process as any).exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
