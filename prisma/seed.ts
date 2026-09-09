import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Canonical system roles based on project specifications
export const INITIAL_ROLES = [
  { name: 'SUPER_ADMIN' },
  { name: 'MANAGER' },
  { name: 'CONSULTANT' },
  { name: 'CLIENT' },
];

async function main() {
  console.log('🌱 Starting database seeding...');

  // Seed default roles
  for (const role of INITIAL_ROLES) {
    const upsertedRole = await prisma.userRole.upsert({
      where: { name: role.name },
      update: { isDeleted: false },
      create: {
        name: role.name,
      },
    });
    console.log(`✅ Role seeded: ${upsertedRole.name} (${upsertedRole.id})`);
  }

  console.log('🎉 Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
