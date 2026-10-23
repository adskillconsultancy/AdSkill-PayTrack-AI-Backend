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

  // Client Cases
  { name: 'case:create', module: 'CASE', description: 'Create client service cases' },
  { name: 'case:read', module: 'CASE', description: 'View client service cases' },
  { name: 'case:manage', module: 'CASE', description: 'Manage assigned client service cases' },

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

  // Documents
  { name: 'document:read', module: 'DOCUMENT', description: 'View private case documents' },
  { name: 'document:upload', module: 'DOCUMENT', description: 'Upload private case documents' },
  { name: 'document:delete', module: 'DOCUMENT', description: 'Remove private case documents' },

  // Reports & Financial Intelligence
  { name: 'report:view', module: 'REPORT', description: 'View management dashboard financial metrics' },
  { name: 'report:export', module: 'REPORT', description: 'Export financial reports to CSV, Excel, or PDF' },

  // Dashboard & Executive Intelligence
  { name: 'dashboard:view', module: 'DASHBOARD', description: 'View management executive dashboard and KPIs' },

  // Case Notes & Collaboration
  { name: 'note:read', module: 'NOTE', description: 'View client-visible notes' },
  { name: 'note:create', module: 'NOTE', description: 'Create client or internal notes' },
  { name: 'note:read-internal', module: 'NOTE', description: 'View confidential internal staff notes' },

  // Support & Client Communication Desk
  { name: 'support:read', module: 'SUPPORT', description: 'View support tickets and messaging threads' },
  { name: 'support:create', module: 'SUPPORT', description: 'Create support tickets and inquiries' },
  { name: 'support:reply', module: 'SUPPORT', description: 'Send messages and replies in support tickets' },
  { name: 'support:manage', module: 'SUPPORT', description: 'Update ticket status, assign staff handler, and close tickets' },

  // Audit Log — Super Admin Only
  { name: 'audit:read', module: 'AUDIT', description: 'View immutable system audit log (Super Admin only)' },

  // Attendance Tracker (Universal PBAC)
  { name: 'attendance:track', module: 'ATTENDANCE', description: 'Clock in and clock out of work shifts' },
  { name: 'attendance:read-self', module: 'ATTENDANCE', description: 'View personal attendance history and status' },
  { name: 'attendance:read-all', module: 'ATTENDANCE', description: 'View team attendance history and real-time active status' },
];

// Role to Permission Mappings
export const ROLE_PERMISSION_MAPPING: Record<string, string[]> = {
  SUPER_ADMIN: CANONICAL_PERMISSIONS.map((p) => p.name), // Super Admin receives all permissions
  MANAGER: [
    'user:read',
    'user:create',
    'user:update',
    'service:read',
    'case:read',
    'case:create',
    'case:manage',
    'document:read',
    'document:upload',
    'document:delete',
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
    'dashboard:view',
    'note:read',
    'note:create',
    'note:read-internal',
    'support:read',
    'support:create',
    'support:reply',
    'support:manage',
    'attendance:track',
    'attendance:read-self',
    'attendance:read-all',
  ],
  CONSULTANT: [
    'user:read',
    'service:read',
    'case:read',
    'case:manage',
    'document:read',
    'document:upload',
    'plan:read',
    'payment:read',
    'payment:record',
    'invoice:read',
    'receipt:read',
    'note:read',
    'note:create',
    'note:read-internal',
    'support:read',
    'support:reply',
    'attendance:track',
    'attendance:read-self',
  ],
  CLIENT: [
    'user:read',
    'service:read',
    'case:create',
    'case:read',
    'document:read',
    'document:upload',
    'plan:read',
    'payment:read',
    'payment:pay',
    'invoice:read',
    'receipt:read',
    'note:read',
    'note:create',
    'support:read',
    'support:create',
    'support:reply',
  ],
  USER: [
    'user:read',
    'service:read',
    'support:read',
    'support:create',
    'support:reply',
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

  console.log('🎉 Foundational Roles & Permissions setup completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
