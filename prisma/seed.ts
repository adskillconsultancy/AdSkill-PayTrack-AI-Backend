import bcryptjs from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Granular canonical permissions
export const CANONICAL_PERMISSIONS = [
  // User Management
  { name: 'user:read', module: 'USER', description: 'View user profiles and list' },
  { name: 'user:create', module: 'USER', description: 'Create internal employee or client accounts' },
  { name: 'user:update', module: 'USER', description: 'Update user profiles and details' },
  { name: 'user:delete', module: 'USER', description: 'Soft delete or suspend users' },
  { name: 'user:manage-role', module: 'USER', description: 'Promote or assign user roles' },

  // Service Catalog
  { name: 'service:read', module: 'SERVICE', description: 'View services and base fees' },
  { name: 'service:manage', module: 'SERVICE', description: 'Create and edit service catalog offerings' },

  // Payment Plans
  { name: 'plan:read', module: 'PLAN', description: 'View client payment plans and installment milestones' },
  { name: 'plan:create', module: 'PLAN', description: 'Create contracted payment plans' },
  { name: 'plan:update', module: 'PLAN', description: 'Amend payment plans and milestones' },
  { name: 'plan:delete', module: 'PLAN', description: 'Cancel or soft delete payment plans' },

  // Payments & Transactions
  { name: 'payment:read', module: 'PAYMENT', description: 'View transaction records and payment proofs' },
  { name: 'payment:record', module: 'PAYMENT', description: 'Record manual offline payments (Cash, Zelle, Wire)' },
  { name: 'payment:verify', module: 'PAYMENT', description: 'Verify and approve pending offline payments' },
  { name: 'payment:refund', module: 'PAYMENT', description: 'Approve and issue transaction refunds' },
  { name: 'payment:pay', module: 'PAYMENT', description: 'Execute online payments via Stripe checkout' },

  // Invoices & Receipts
  { name: 'invoice:read', module: 'INVOICE', description: 'View and download invoices' },
  { name: 'invoice:generate', module: 'INVOICE', description: 'Generate sequential branded PDF invoices' },
  { name: 'receipt:read', module: 'RECEIPT', description: 'View and download payment receipts' },
  { name: 'receipt:generate', module: 'RECEIPT', description: 'Generate official sequential PDF receipts' },

  // Reports & Financial Intelligence
  { name: 'report:view', module: 'REPORT', description: 'View management dashboard financial metrics' },
  { name: 'report:export', module: 'REPORT', description: 'Export financial reports to CSV, Excel, or PDF' },

  // Case Notes & Collaboration
  { name: 'note:read', module: 'NOTE', description: 'View client-visible notes' },
  { name: 'note:create', module: 'NOTE', description: 'Create client or internal notes' },
  { name: 'note:read-internal', module: 'NOTE', description: 'View confidential internal staff notes' },
];

// Role to Permission Mappings
export const ROLE_PERMISSION_MAPPING: Record<string, string[]> = {
  SUPER_ADMIN: CANONICAL_PERMISSIONS.map((p) => p.name), // Super Admin receives all permissions
  MANAGER: [
    'user:read',
    'user:create',
    'user:update',
    'service:read',
    'plan:read',
    'plan:create',
    'plan:update',
    'payment:read',
    'payment:record',
    'payment:verify',
    'invoice:read',
    'invoice:generate',
    'receipt:read',
    'receipt:generate',
    'report:view',
    'report:export',
    'note:read',
    'note:create',
    'note:read-internal',
  ],
  CONSULTANT: [
    'user:read',
    'service:read',
    'plan:read',
    'payment:read',
    'invoice:read',
    'receipt:read',
    'note:read',
    'note:create',
    'note:read-internal',
  ],
  CLIENT: [
    'user:read',
    'plan:read',
    'payment:read',
    'payment:pay',
    'invoice:read',
    'receipt:read',
    'note:read',
  ],
};

async function main() {
  console.log('🌱 Starting PBAC Database Seeding...');

  // 1. Seed All Canonical Permissions
  console.log('--- 1. Seeding Permissions ---');
  const permissionMap = new Map<string, string>(); // name -> id

  for (const perm of CANONICAL_PERMISSIONS) {
    const upsertedPerm = await prisma.permission.upsert({
      where: { name: perm.name },
      update: {
        module: perm.module,
        description: perm.description,
        isDeleted: false,
      },
      create: {
        name: perm.name,
        module: perm.module,
        description: perm.description,
      },
    });
    permissionMap.set(upsertedPerm.name, upsertedPerm.id);
  }
  console.log(`✅ Seeded ${permissionMap.size} permissions.`);

  // 2. Seed All Roles
  console.log('--- 2. Seeding Roles ---');
  const roleMap = new Map<string, string>(); // name -> id
  const roles = Object.keys(ROLE_PERMISSION_MAPPING);

  for (const roleName of roles) {
    const upsertedRole = await prisma.userRole.upsert({
      where: { name: roleName },
      update: { isDeleted: false },
      create: { name: roleName },
    });
    roleMap.set(upsertedRole.name, upsertedRole.id);
    console.log(`✅ Role seeded: ${upsertedRole.name} (${upsertedRole.id})`);
  }

  // 3. Map Permissions to Roles (Reconcile strictly to specification)
  console.log('--- 3. Mapping Permissions to Roles ---');
  for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSION_MAPPING)) {
    const roleId = roleMap.get(roleName);
    if (!roleId) continue;

    const validPermissionIds = permissionNames
      .map((name) => permissionMap.get(name))
      .filter(Boolean) as string[];

    // Remove any permissions no longer assigned to this role per spec
    await prisma.rolePermission.deleteMany({
      where: {
        roleId,
        permissionId: { notIn: validPermissionIds },
      },
    });

    for (const permName of permissionNames) {
      const permissionId = permissionMap.get(permName);
      if (!permissionId) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId,
          },
        },
        update: { isDeleted: false },
        create: {
          roleId,
          permissionId,
        },
      });
    }
    console.log(`✅ Mapped ${permissionNames.length} permissions to role: ${roleName}`);
  }

  // 4. Seed Canonical Demo Users for all 4 PBAC Roles
  console.log('--- 4. Seeding Demo Users ---');
  const defaultPassword = await bcryptjs.hash('Password123!', 12);

  const demoUsers = [
    {
      name: 'AdSkill Super Administrator',
      preferredName: 'Super Admin',
      email: 'admin@adskillconsultancy.com',
      password: defaultPassword,
      roleName: 'SUPER_ADMIN',
      status: 'ACTIVE' as const,
      country: 'United States',
    },
    {
      name: 'Sarah Jenkins',
      preferredName: 'Sarah',
      email: 'manager@adskillconsultancy.com',
      password: defaultPassword,
      roleName: 'MANAGER',
      status: 'ACTIVE' as const,
      phone: '+1 (555) 345-6789',
      country: 'United States',
    },
    {
      name: 'David Chen',
      preferredName: 'David',
      email: 'consultant@adskillconsultancy.com',
      password: defaultPassword,
      roleName: 'CONSULTANT',
      status: 'ACTIVE' as const,
      phone: '+1 (555) 456-7890',
      country: 'United States',
    },
    {
      clientId: 'ASK-2026-1001',
      name: 'Mohammad Rahim',
      preferredName: 'Rahim',
      email: 'client@example.com',
      password: defaultPassword,
      roleName: 'CLIENT',
      status: 'ACTIVE' as const,
      phone: '+1 (555) 234-5678',
      whatsapp: '+1 (555) 234-5678',
      country: 'United States',
    },
  ];

  for (const user of demoUsers) {
    const roleId = roleMap.get(user.roleName);
    if (!roleId) continue;

    const { roleName, ...userData } = user;

    const upsertedUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        ...userData,
        roleId,
        isDeleted: false,
      },
      create: {
        ...userData,
        roleId,
        isDeleted: false,
      },
    });
    console.log(`✅ Demo User seeded: ${upsertedUser.name} (${user.roleName}) -> ${upsertedUser.email}`);
  }

  // 5. Seed Default Service Catalog Offerings (Section 5)
  console.log('--- 5. Seeding Service Catalog Offerings ---');
  const superAdminUser = await prisma.user.findUnique({
    where: { email: 'admin@adskillconsultancy.com' },
  });

  if (superAdminUser) {
    const defaultServices = [
      {
        name: 'EB-2 NIW - National Interest Waiver',
        code: 'EB2-NIW',
        category: 'IMMIGRATION' as const,
        description: 'Self-petitioned employment-based green card category for individuals with advanced degrees or exceptional ability whose work holds substantial merit and national importance.',
        baseFee: 5000.00,
        estimatedGovFee: 1015.00,
        estimatedAttorneyFee: 1500.00,
        estimatedThirdPartyFee: 500.00,
        defaultDeposit: 1500.00,
        defaultInstallments: 4,
        estimatedDuration: '6-9 months',
        createdById: superAdminUser.id,
      },
      {
        name: 'EB-1A - Extraordinary Ability',
        code: 'EB1-A',
        category: 'IMMIGRATION' as const,
        description: 'First-preference employment immigration for individuals who possess extraordinary ability in sciences, arts, education, business, or athletics.',
        baseFee: 6500.00,
        estimatedGovFee: 1015.00,
        estimatedAttorneyFee: 2000.00,
        estimatedThirdPartyFee: 600.00,
        defaultDeposit: 2000.00,
        defaultInstallments: 4,
        estimatedDuration: '6-12 months',
        createdById: superAdminUser.id,
      },
      {
        name: 'EB-3 - Skilled Workers & Professionals',
        code: 'EB3-SKILLED',
        category: 'IMMIGRATION' as const,
        description: 'Employment-based third preference petition for skilled workers, professionals, and other workers.',
        baseFee: 4500.00,
        estimatedGovFee: 1015.00,
        estimatedAttorneyFee: 1500.00,
        estimatedThirdPartyFee: 400.00,
        defaultDeposit: 1500.00,
        defaultInstallments: 3,
        estimatedDuration: '12-18 months',
        createdById: superAdminUser.id,
      },
      {
        name: 'E-2 - Treaty Investor Visa',
        code: 'E2-INVESTOR',
        category: 'IMMIGRATION' as const,
        description: 'Nonimmigrant classification for nationals of countries with which the United States maintains a treaty of commerce and navigation.',
        baseFee: 6000.00,
        estimatedGovFee: 315.00,
        estimatedAttorneyFee: 2000.00,
        estimatedThirdPartyFee: 1200.00,
        defaultDeposit: 2000.00,
        defaultInstallments: 4,
        estimatedDuration: '3-6 months',
        createdById: superAdminUser.id,
      },
      {
        name: 'L-1 - Intracompany Transferee',
        code: 'L1-TRANSFER',
        category: 'IMMIGRATION' as const,
        description: 'Nonimmigrant visa facilitating the temporary transfer of foreign employees in managerial/executive capacity or specialized knowledge.',
        baseFee: 5500.00,
        estimatedGovFee: 1385.00,
        estimatedAttorneyFee: 1800.00,
        estimatedThirdPartyFee: 800.00,
        defaultDeposit: 1800.00,
        defaultInstallments: 3,
        estimatedDuration: '3-6 months',
        createdById: superAdminUser.id,
      },
      {
        name: 'Family Immigration Support',
        code: 'FAM-IMM',
        category: 'IMMIGRATION' as const,
        description: 'Assistance for petitioning immediate relatives, spouse green cards, and family-based immigrant visas.',
        baseFee: 3000.00,
        estimatedGovFee: 675.00,
        estimatedAttorneyFee: 1000.00,
        estimatedThirdPartyFee: 200.00,
        defaultDeposit: 1000.00,
        defaultInstallments: 3,
        estimatedDuration: '6-12 months',
        createdById: superAdminUser.id,
      },
      {
        name: 'Visa Application Assistance',
        code: 'VISA-ASSIST',
        category: 'IMMIGRATION' as const,
        description: 'Comprehensive DS-160 preparation, consular appointment scheduling, and interview strategy briefing.',
        baseFee: 1500.00,
        estimatedGovFee: 185.00,
        estimatedAttorneyFee: 0.00,
        estimatedThirdPartyFee: 0.00,
        defaultDeposit: 750.00,
        defaultInstallments: 2,
        estimatedDuration: '2-4 weeks',
        createdById: superAdminUser.id,
      },
      {
        name: 'Business Formation & Corporate Filing',
        code: 'BUS-CORP',
        category: 'BUSINESS' as const,
        description: 'U.S. state business registration (LLC/C-Corp), EIN acquisition, operating agreement drafting, and corporate compliance.',
        baseFee: 2000.00,
        estimatedGovFee: 300.00,
        estimatedAttorneyFee: 500.00,
        estimatedThirdPartyFee: 200.00,
        defaultDeposit: 1000.00,
        defaultInstallments: 2,
        estimatedDuration: '2-4 weeks',
        createdById: superAdminUser.id,
      },
      {
        name: 'Initial Strategy Consultation',
        code: 'CONSULT-STRAT',
        category: 'CONSULTATION' as const,
        description: 'In-depth 60-minute case evaluation, profile assessment, and strategic roadmap recommendation.',
        baseFee: 350.00,
        estimatedGovFee: 0.00,
        estimatedAttorneyFee: 0.00,
        estimatedThirdPartyFee: 0.00,
        defaultDeposit: 350.00,
        defaultInstallments: 1,
        estimatedDuration: '1-3 days',
        createdById: superAdminUser.id,
      },
      {
        name: 'DMV / PSB Services',
        code: 'DMV-PSB',
        category: 'DMV_PSB' as const,
        description: 'Assistance with driver license applications, state ID processing, and public safety bureau regulatory documentation.',
        baseFee: 800.00,
        estimatedGovFee: 100.00,
        estimatedAttorneyFee: 0.00,
        estimatedThirdPartyFee: 50.00,
        defaultDeposit: 400.00,
        defaultInstallments: 2,
        estimatedDuration: '1-3 weeks',
        createdById: superAdminUser.id,
      },
      {
        name: 'Custom Consulting Package',
        code: 'CUSTOM-PKG',
        category: 'CUSTOM' as const,
        description: 'Tailored consulting advisory for bespoke multi-jurisdictional client engagements.',
        baseFee: 4000.00,
        estimatedGovFee: 0.00,
        estimatedAttorneyFee: 0.00,
        estimatedThirdPartyFee: 0.00,
        defaultDeposit: 1500.00,
        defaultInstallments: 3,
        estimatedDuration: 'Custom',
        createdById: superAdminUser.id,
      },
    ];

    for (const service of defaultServices) {
      await prisma.service.upsert({
        where: { code: service.code },
        update: {
          ...service,
          isDeleted: false,
        },
        create: {
          ...service,
          isDeleted: false,
        },
      });
      console.log(`✅ Service catalog seeded: ${service.name} (${service.code})`);
    }
  }

  console.log('🎉 PBAC Database Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
