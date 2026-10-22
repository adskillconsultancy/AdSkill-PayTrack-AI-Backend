import {
  PrismaClient,
  LeadStatus,
  LeadActivityType,
  CallOutcome,
  ServiceCategory,
  TransactionType,
  OfficeExpenseCategory,
  SupportPriority,
  SupportStatus,
  SupportTargetType,
  SupportCategory,
} from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting Staff Performance & Operational Data Seed...");

  const now = new Date();
  const passwordHash = await bcryptjs.hash("Password123!", 10);

  // 1. Ensure Roles exist
  const superAdminRole = await prisma.userRole.upsert({
    where: { name: "SUPER_ADMIN" },
    update: {},
    create: { name: "SUPER_ADMIN" },
  });

  const managerRole = await prisma.userRole.upsert({
    where: { name: "MANAGER" },
    update: {},
    create: { name: "MANAGER" },
  });

  const consultantRole = await prisma.userRole.upsert({
    where: { name: "CONSULTANT" },
    update: {},
    create: { name: "CONSULTANT" },
  });

  const clientRole = await prisma.userRole.upsert({
    where: { name: "CLIENT" },
    update: {},
    create: { name: "CLIENT" },
  });

  // 2. Seed 4 Staff Members
  const sarah = await prisma.user.upsert({
    where: { email: "sarah.jenkins@adskillconsultancy.com" },
    update: { status: "ACTIVE", isDeleted: false },
    create: {
      name: "Sarah Jenkins",
      preferredName: "Sarah",
      email: "sarah.jenkins@adskillconsultancy.com",
      password: passwordHash,
      roleId: managerRole.id,
      phone: "+1 (555) 345-6789",
      country: "United States",
      status: "ACTIVE",
    },
  });

  const david = await prisma.user.upsert({
    where: { email: "david.chen@adskillconsultancy.com" },
    update: { status: "ACTIVE", isDeleted: false },
    create: {
      name: "David Chen",
      preferredName: "David",
      email: "david.chen@adskillconsultancy.com",
      password: passwordHash,
      roleId: consultantRole.id,
      phone: "+1 (555) 456-7890",
      country: "United States",
      status: "ACTIVE",
    },
  });

  const alex = await prisma.user.upsert({
    where: { email: "alex.ray@adskillconsultancy.com" },
    update: { status: "ACTIVE", isDeleted: false },
    create: {
      name: "Alex Ray",
      preferredName: "Alex",
      email: "alex.ray@adskillconsultancy.com",
      password: passwordHash,
      roleId: consultantRole.id,
      phone: "+1 (555) 567-8901",
      country: "United States",
      status: "ACTIVE",
    },
  });

  const lisa = await prisma.user.upsert({
    where: { email: "lisa.wong@adskillconsultancy.com" },
    update: { status: "ACTIVE", isDeleted: false },
    create: {
      name: "Lisa Wong",
      preferredName: "Lisa",
      email: "lisa.wong@adskillconsultancy.com",
      password: passwordHash,
      roleId: consultantRole.id,
      phone: "+1 (555) 678-9012",
      country: "United States",
      status: "ACTIVE",
    },
  });

  console.log("✅ Staff members seeded / verified:");
  console.log(`   - ${sarah.name} (${sarah.email})`);
  console.log(`   - ${david.name} (${david.email})`);
  console.log(`   - ${alex.name} (${alex.email})`);
  console.log(`   - ${lisa.name} (${lisa.email})`);

  // 3. Ensure Demo Clients exist
  let client1 = await prisma.user.findFirst({
    where: { role: { name: "CLIENT" }, isDeleted: false },
  });
  if (!client1) {
    client1 = await prisma.user.create({
      data: {
        clientId: `ASK-2026-${Date.now().toString().slice(-4)}`,
        name: "Mohammad Rahim",
        email: `rahim.${Date.now()}@example.com`,
        password: passwordHash,
        roleId: clientRole.id,
        phone: "+1 (555) 111-2222",
        country: "United States",
        status: "ACTIVE",
      },
    });
  }

  let client2 = await prisma.user.findFirst({
    where: {
      role: { name: "CLIENT" },
      isDeleted: false,
      id: { not: client1.id },
    },
  });
  if (!client2) {
    client2 = await prisma.user.create({
      data: {
        clientId: `ASK-2026-${(Date.now() + 1).toString().slice(-4)}`,
        name: "Sophia Miller",
        email: `sophia.${Date.now()}@example.com`,
        password: passwordHash,
        roleId: clientRole.id,
        phone: "+1 (555) 222-3333",
        country: "United States",
        status: "ACTIVE",
      },
    });
  }

  let client3 = await prisma.user.findFirst({
    where: {
      role: { name: "CLIENT" },
      isDeleted: false,
      id: { notIn: [client1.id, client2.id] },
    },
  });
  if (!client3) {
    client3 = await prisma.user.create({
      data: {
        clientId: `ASK-2026-${(Date.now() + 2).toString().slice(-4)}`,
        name: "Elena Rostova",
        email: `elena.${Date.now()}@example.com`,
        password: passwordHash,
        roleId: clientRole.id,
        phone: "+1 (555) 333-4444",
        country: "United States",
        status: "ACTIVE",
      },
    });
  }

  // 4. Ensure a Service exists
  let service = await prisma.service.findFirst({ where: { isDeleted: false } });
  if (!service) {
    service = await prisma.service.create({
      data: {
        code: "EB2-NIW",
        name: "EB-2 National Interest Waiver",
        category: ServiceCategory.IMMIGRATION,
        baseFee: 6500.0,
        currency: "USD",
        isActive: true,
        createdById: sarah.id,
      },
    });
  }

  // 5. Ensure Client Cases exist
  const case1 = await prisma.clientCase.upsert({
    where: { caseCode: "CASE-2026-001" },
    update: { assignedConsultantId: sarah.id },
    create: {
      caseCode: "CASE-2026-001",
      userId: client1.id,
      serviceId: service.id,
      serviceCodeSnapshot: service.code,
      serviceNameSnapshot: service.name,
      serviceCategorySnapshot: service.category,
      assignedConsultantId: sarah.id,
      agreementDate: now,
    },
  });

  const case2 = await prisma.clientCase.upsert({
    where: { caseCode: "CASE-2026-002" },
    update: { assignedConsultantId: david.id },
    create: {
      caseCode: "CASE-2026-002",
      userId: client2.id,
      serviceId: service.id,
      serviceCodeSnapshot: service.code,
      serviceNameSnapshot: service.name,
      serviceCategorySnapshot: service.category,
      assignedConsultantId: david.id,
      agreementDate: now,
    },
  });

  const case3 = await prisma.clientCase.upsert({
    where: { caseCode: "CASE-2026-003" },
    update: { assignedConsultantId: alex.id },
    create: {
      caseCode: "CASE-2026-003",
      userId: client3.id,
      serviceId: service.id,
      serviceCodeSnapshot: service.code,
      serviceNameSnapshot: service.name,
      serviceCategorySnapshot: service.category,
      assignedConsultantId: alex.id,
      agreementDate: now,
    },
  });

  // 6. Seed Leads for Today (attributed to staff)
  const leadsData = [
    {
      fullName: "Marcus Aurelius",
      phone: "+1 (555) 888-0001",
      email: "marcus.a@example.com",
      status: LeadStatus.IN_PROGRESS,
      createdById: sarah.id,
      createdByName: sarah.name,
      assignedToId: sarah.id,
      serviceId: service.id,
      createdAt: now,
    },
    {
      fullName: "Julian Alvarez",
      phone: "+1 (555) 888-0002",
      email: "julian.alvarez@example.com",
      status: LeadStatus.QUALIFIED,
      createdById: sarah.id,
      createdByName: sarah.name,
      assignedToId: sarah.id,
      serviceId: service.id,
      createdAt: now,
    },
    {
      fullName: "Priya Sharma",
      phone: "+1 (555) 888-0003",
      email: "priya.sharma@example.com",
      status: LeadStatus.CONTACTED,
      createdById: david.id,
      createdByName: david.name,
      assignedToId: david.id,
      serviceId: service.id,
      createdAt: now,
    },
    {
      fullName: "Tariq Mansoor",
      phone: "+1 (555) 888-0004",
      email: "tariq.m@example.com",
      status: LeadStatus.NEW,
      createdById: david.id,
      createdByName: david.name,
      assignedToId: david.id,
      serviceId: service.id,
      createdAt: now,
    },
    {
      fullName: "Chloe Dubois",
      phone: "+1 (555) 888-0005",
      email: "chloe.dubois@example.com",
      status: LeadStatus.FOLLOW_UP,
      createdById: alex.id,
      createdByName: alex.name,
      assignedToId: alex.id,
      serviceId: service.id,
      createdAt: now,
    },
    {
      fullName: "Liam O'Connor",
      phone: "+1 (555) 888-0006",
      email: "liam.oc@example.com",
      status: LeadStatus.QUALIFIED,
      createdById: alex.id,
      createdByName: alex.name,
      assignedToId: alex.id,
      serviceId: service.id,
      createdAt: now,
    },
    {
      fullName: "Fatima Al-Sayed",
      phone: "+1 (555) 888-0007",
      email: "fatima.as@example.com",
      status: LeadStatus.NEW,
      createdById: lisa.id,
      createdByName: lisa.name,
      assignedToId: lisa.id,
      serviceId: service.id,
      createdAt: now,
    },
  ];

  for (const ld of leadsData) {
    const existing = await prisma.lead.findFirst({
      where: { email: ld.email, isDeleted: false },
    });
    const lead =
      existing ||
      (await prisma.lead.create({
        data: ld,
      }));

    // Add Lead Activities for today
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        activityType: LeadActivityType.CALL,
        callOutcome: CallOutcome.ANSWERED,
        notes: "Discussed case background and qualification criteria. Client requested agreement draft.",
        performedById: ld.createdById,
        performedByName: ld.createdByName,
        createdAt: now,
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        activityType: LeadActivityType.NOTE,
        notes: "Intake notes logged into system with passport scan verification.",
        performedById: ld.createdById,
        performedByName: ld.createdByName,
        createdAt: now,
      },
    });
  }

  console.log("✅ Seeded leads and lead activities for today.");

  // 7. Seed Case Notes for Today
  await prisma.caseNote.create({
    data: {
      caseId: case1.id,
      authorId: sarah.id,
      content: "<p>Completed initial petition draft review with legal team. Ready for filing.</p>",
      createdAt: now,
    },
  });

  await prisma.caseNote.create({
    data: {
      caseId: case2.id,
      authorId: david.id,
      content: "<p>Client submitted additional supporting letters of recommendation.</p>",
      createdAt: now,
    },
  });

  await prisma.caseNote.create({
    data: {
      caseId: case3.id,
      authorId: alex.id,
      content: "<p>Scheduled follow-up intake consultation for document notarization.</p>",
      createdAt: now,
    },
  });

  console.log("✅ Seeded case notes for today.");

  // 8. Seed Verified Payments for Today (Sarah: Stripe + Direct, David: Stripe, Alex: Stripe, Lisa: Direct)
  const paymentsData = [
    {
      caseId: case1.id,
      amount: 4500.0,
      currency: "USD",
      paymentDate: now,
      paymentMethod: "STRIPE",
      stripePaymentIntentId: `pi_test_${Date.now()}_1`,
      status: "VERIFIED",
      verifiedById: sarah.id,
      operationalNotes: "Stripe Online payment verified automatically by manager.",
    },
    {
      caseId: case1.id,
      amount: 1200.0,
      currency: "USD",
      paymentDate: now,
      paymentMethod: "BANK_TRANSFER",
      externalReference: "WIRE-REF-90812",
      status: "VERIFIED",
      verifiedById: sarah.id,
      operationalNotes: "Bank transfer wire confirmation verified against bank statement.",
    },
    {
      caseId: case2.id,
      amount: 3250.0,
      currency: "USD",
      paymentDate: now,
      paymentMethod: "STRIPE",
      stripePaymentIntentId: `pi_test_${Date.now()}_2`,
      status: "VERIFIED",
      verifiedById: david.id,
      operationalNotes: "Client installment paid via Stripe online invoice link.",
    },
    {
      caseId: case2.id,
      amount: 750.0,
      currency: "USD",
      paymentDate: now,
      paymentMethod: "CASH",
      status: "VERIFIED",
      verifiedById: david.id,
      operationalNotes: "Cash payment received in office and verified with official receipt.",
    },
    {
      caseId: case3.id,
      amount: 2800.0,
      currency: "USD",
      paymentDate: now,
      paymentMethod: "STRIPE",
      stripePaymentIntentId: `pi_test_${Date.now()}_3`,
      status: "VERIFIED",
      verifiedById: alex.id,
      operationalNotes: "Online credit card payment processed successfully.",
    },
    {
      caseId: case3.id,
      amount: 1500.0,
      currency: "USD",
      paymentDate: now,
      paymentMethod: "ZELLE",
      externalReference: "ZELLE-CONF-8821",
      status: "VERIFIED",
      verifiedById: lisa.id,
      operationalNotes: "Zelle direct transfer verified by billing desk.",
    },
  ];

  for (const p of paymentsData) {
    await prisma.payment.create({
      data: p,
    });
  }

  console.log("✅ Seeded 6 verified payments for today (Online Stripe & Direct Collections).");

  // 9. Seed Office Expenses for Today (Attributed to Staff who logged them)
  const expensesData = [
    {
      type: TransactionType.EXPENSE,
      category: OfficeExpenseCategory.MEALS_ENTERTAINMENT,
      amount: 145.5,
      currency: "USD",
      description: "Client Intake Advisory Lunch with corporate sponsorship leads",
      transactionDate: now,
      createdById: sarah.id,
    },
    {
      type: TransactionType.EXPENSE,
      category: OfficeExpenseCategory.TRAVEL,
      amount: 68.0,
      currency: "USD",
      description: "Uber travel to USCIS regional service center for expedited filing",
      transactionDate: now,
      createdById: david.id,
    },
    {
      type: TransactionType.EXPENSE,
      category: OfficeExpenseCategory.OFFICE_SUPPLIES,
      amount: 220.0,
      currency: "USD",
      description: "High-yield document scanner maintenance & filing folders",
      transactionDate: now,
      createdById: lisa.id,
    },
    {
      type: TransactionType.EXPENSE,
      category: OfficeExpenseCategory.SOFTWARE_SUBSCRIPTIONS,
      amount: 95.0,
      currency: "USD",
      description: "Document translation portal monthly seat license",
      transactionDate: now,
      createdById: alex.id,
    },
  ];

  for (const exp of expensesData) {
    await prisma.officeExpense.create({
      data: exp,
    });
  }

  console.log("✅ Seeded 4 office expenses for today attributed to staff members.");

  // 10. Seed Support Tickets & Messages for Today
  const ticket1 = await prisma.supportTicket.create({
    data: {
      ticketCode: `TKT-${Date.now().toString().slice(-4)}`,
      clientId: client1.id,
      caseId: case1.id,
      category: SupportCategory.BILLING_PAYMENT,
      priority: SupportPriority.NORMAL,
      status: SupportStatus.RESOLVED,
      subject: "Receipt confirmation for wire payment",
      assignedStaffId: sarah.id,
      createdAt: now,
    },
  });

  await prisma.supportMessage.create({
    data: {
      ticketId: ticket1.id,
      senderId: sarah.id,
      isStaffReply: true,
      message: "Hello Mohammad, your wire transfer has been confirmed and verified. Official receipt #REC-2026-0042 is attached.",
      createdAt: now,
    },
  });

  const ticket2 = await prisma.supportTicket.create({
    data: {
      ticketCode: `TKT-${(Date.now() + 1).toString().slice(-4)}`,
      clientId: client2.id,
      caseId: case2.id,
      category: SupportCategory.CASE_STATUS,
      priority: SupportPriority.URGENT,
      status: SupportStatus.OPEN,
      subject: "Status of recommendation letter translations",
      assignedStaffId: lisa.id,
      createdAt: now,
    },
  });

  await prisma.supportMessage.create({
    data: {
      ticketId: ticket2.id,
      senderId: lisa.id,
      isStaffReply: true,
      message: "Hi Sophia, the certified translation team has completed 3 out of 4 letters. We will upload the final drafts by 5 PM.",
      createdAt: now,
    },
  });

  console.log("✅ Seeded support tickets & messages for today.");
  console.log("🎉 Seeding completed successfully! All staff performance reports now have live data.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
