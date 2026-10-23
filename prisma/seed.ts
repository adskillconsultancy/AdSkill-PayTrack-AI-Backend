import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

export const CANONICAL_PERMISSIONS = [
  // User Management
  { name: "user:read", module: "USER", description: "View user profiles and list" },
  { name: "user:create", module: "USER", description: "Create internal employee or client accounts" },
  { name: "user:update", module: "USER", description: "Update user profiles and details" },
  { name: "user:delete", module: "USER", description: "Soft delete or suspend users" },
  { name: "user:manage-role", module: "USER", description: "Promote or assign user roles" },

  // Service Catalog
  { name: "service:read", module: "SERVICE", description: "View services and base fees" },
  { name: "service:manage", module: "SERVICE", description: "Create and edit service catalog offerings" },

  // Client Cases
  { name: "case:create", module: "CASE", description: "Create client service cases" },
  { name: "case:read", module: "CASE", description: "View client service cases" },
  { name: "case:update", module: "CASE", description: "Update client service cases" },
  { name: "case:manage", module: "CASE", description: "Manage assigned client service cases" },

  // Payment Plans
  { name: "plan:read", module: "PLAN", description: "View client payment plans and installment milestones" },
  { name: "plan:create", module: "PLAN", description: "Create contracted payment plans" },
  { name: "plan:update", module: "PLAN", description: "Amend payment plans and milestones" },
  { name: "plan:delete", module: "PLAN", description: "Cancel or soft delete payment plans" },

  // Payments & Transactions
  { name: "payment:read", module: "PAYMENT", description: "View transaction records and payment proofs" },
  { name: "payment:record", module: "PAYMENT", description: "Record manual offline payments (Cash, Zelle, Wire)" },
  { name: "payment:verify", module: "PAYMENT", description: "Verify and approve pending offline payments" },
  { name: "payment:refund", module: "PAYMENT", description: "Approve and issue transaction refunds" },
  { name: "payment:pay", module: "PAYMENT", description: "Execute online payments via Stripe checkout" },

  // Invoices & Receipts
  { name: "invoice:read", module: "INVOICE", description: "View and download invoices" },
  { name: "invoice:generate", module: "INVOICE", description: "Generate sequential branded PDF invoices" },
  { name: "receipt:read", module: "RECEIPT", description: "View and download payment receipts" },
  { name: "receipt:generate", module: "RECEIPT", description: "Generate official sequential PDF receipts" },

  // Documents
  { name: "document:read", module: "DOCUMENT", description: "View private case documents" },
  { name: "document:upload", module: "DOCUMENT", description: "Upload private case documents" },
  { name: "document:delete", module: "DOCUMENT", description: "Remove private case documents" },

  // Reports & Financial Intelligence
  { name: "report:view", module: "REPORT", description: "View management dashboard financial metrics" },
  { name: "report:export", module: "REPORT", description: "Export financial reports to CSV, Excel, or PDF" },

  // Dashboard & Executive Intelligence
  { name: "dashboard:view", module: "DASHBOARD", description: "View management executive dashboard and KPIs" },

  // Case Notes & Collaboration
  { name: "note:read", module: "NOTE", description: "View client-visible notes" },
  { name: "note:create", module: "NOTE", description: "Create client or internal notes" },
  { name: "note:read-internal", module: "NOTE", description: "View confidential internal staff notes" },

  // Support & Client Communication Desk
  { name: "support:read", module: "SUPPORT", description: "View support tickets and messaging threads" },
  { name: "support:create", module: "SUPPORT", description: "Create support tickets and inquiries" },
  { name: "support:reply", module: "SUPPORT", description: "Send messages and replies in support tickets" },
  { name: "support:manage", module: "SUPPORT", description: "Update ticket status, assign staff handler, and close tickets" },

  // Audit Log — Super Admin Only
  { name: "audit:read", module: "AUDIT", description: "View immutable system audit log (Super Admin only)" },

  // Attendance Tracker (Universal PBAC)
  { name: "attendance:track", module: "ATTENDANCE", description: "Clock in and clock out of work shifts" },
  { name: "attendance:read-self", module: "ATTENDANCE", description: "View personal attendance history and status" },
  { name: "attendance:read-all", module: "ATTENDANCE", description: "View team attendance history and real-time active status" },

  // Expense Tracker
  { name: "expense:read", module: "EXPENSE", description: "View office expenses and income records" },
  { name: "expense:create", module: "EXPENSE", description: "Record office expenses and overhead payments" },
  { name: "expense:update", module: "EXPENSE", description: "Update recorded office expenses" },
  { name: "expense:delete", module: "EXPENSE", description: "Delete recorded office expenses" },
  { name: "expense:manage", module: "EXPENSE", description: "Manage expense categories and approvals" },

  // CRM Leads
  { name: "lead:read", module: "LEAD", description: "View CRM prospective leads" },
  { name: "lead:create", module: "LEAD", description: "Create and ingest prospective sales leads" },
  { name: "lead:update", module: "LEAD", description: "Update lead status and communications" },
  { name: "lead:delete", module: "LEAD", description: "Archive or delete leads" },
  { name: "lead:manage", module: "LEAD", description: "Assign leads and manage pipeline" },
];

async function main() {
  console.log("🌱 Starting Pure Super Admin Setup...");

  // 1. Seed Permissions in batch
  console.log("--- 1. Seeding Canonical Permissions ---");
  await prisma.permission.createMany({
    data: CANONICAL_PERMISSIONS,
    skipDuplicates: true,
  });
  const allPermissions = await prisma.permission.findMany({
    where: { isDeleted: false },
    select: { id: true, name: true },
  });
  console.log(`✅ Seeded ${allPermissions.length} canonical permissions.`);

  // 2. Seed ONLY the SUPER_ADMIN Role
  console.log("--- 2. Seeding SUPER_ADMIN Role ---");
  const superAdminRole = await prisma.userRole.upsert({
    where: { name: "SUPER_ADMIN" },
    update: { isDeleted: false },
    create: { name: "SUPER_ADMIN" },
  });
  console.log(`✅ Seeded Role: ${superAdminRole.name} (${superAdminRole.id})`);

  // 3. Map ALL Permissions to SUPER_ADMIN Role
  console.log("--- 3. Mapping Permissions to SUPER_ADMIN ---");
  await prisma.rolePermission.createMany({
    data: allPermissions.map((perm) => ({
      roleId: superAdminRole.id,
      permissionId: perm.id,
    })),
    skipDuplicates: true,
  });
  console.log(`✅ Mapped ${allPermissions.length} permissions to SUPER_ADMIN.`);

  // 4. Seed ONLY the Super Admin User
  console.log("--- 4. Seeding Super Admin User ---");
  const hashedPassword = await bcryptjs.hash("Password123!", 10);
  const superAdminUser = await prisma.user.upsert({
    where: { email: "superadmin@adskill.com" },
    update: {
      name: "Super Administrator",
      preferredName: "Admin",
      password: hashedPassword,
      roleId: superAdminRole.id,
      status: "ACTIVE",
      isDeleted: false,
    },
    create: {
      email: "superadmin@adskill.com",
      name: "Super Administrator",
      preferredName: "Admin",
      password: hashedPassword,
      roleId: superAdminRole.id,
      status: "ACTIVE",
    },
  });
  console.log(`✅ Seeded Super Admin User: ${superAdminUser.email} (Password: Password123!)`);

  console.log("🎉 Clean Super Admin setup completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
