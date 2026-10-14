import { PrismaClient, LeadStatus, LeadActivityType, CallOutcome } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding 10 demo follow-up leads...");

  // 1. Find users to assign leads to
  const users = await prisma.user.findMany({
    where: { isDeleted: false, status: "ACTIVE" },
    select: { id: true, name: true, email: true, role: { select: { name: true } } },
    take: 5,
  });

  if (users.length === 0) {
    console.error("❌ No users found in database to assign leads.");
    return;
  }

  // Find a consultant and an admin/super admin
  const consultantUser =
    users.find((u) => u.role?.name === "CONSULTANT" || u.role?.name === "STAFF") ||
    users[0];
  const adminUser =
    users.find((u) => u.role?.name === "SUPER_ADMIN" || u.role?.name === "ADMIN") ||
    users[0];

  console.log(`👤 Assigning demo leads to: ${consultantUser.name} (${consultantUser.email}) and ${adminUser.name} (${adminUser.email})`);

  // 2. Fetch available services
  const services = await prisma.service.findMany({
    where: { isDeleted: false },
    select: { id: true, name: true },
    take: 6,
  });

  const getServiceId = (idx: number) => {
    return services.length > 0 ? services[idx % services.length].id : null;
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Helper date generators
  const daysAgo = (days: number, hour = 10, minute = 30) => {
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  const todayAt = (hour = 11, minute = 0) => {
    const d = new Date(today);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  const daysAhead = (days: number, hour = 14, minute = 0) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  // 10 realistic leads
  const demoLeads = [
    // --- 4 OVERDUE LEADS ---
    {
      fullName: "Mohammad Rahim",
      phone: "+15551234567",
      email: "rahim.mohammad@gmail.com",
      country: "Canada",
      status: LeadStatus.CONTACTED,
      nextFollowUpDate: daysAgo(2, 10, 0),
      assignedToId: consultantUser.id,
      serviceId: getServiceId(0),
      notes: "Interested in Canada Express Entry. Currently tied up with office deadlines. Asked to follow up in 2 days urgently.",
      activityType: LeadActivityType.CALL,
      callOutcome: CallOutcome.ANSWERED,
    },
    {
      fullName: "Fatima Al-Mansoor",
      phone: "+15552345678",
      email: "fatima.mansoor@outlook.com",
      country: "United Arab Emirates",
      status: LeadStatus.FOLLOW_UP,
      nextFollowUpDate: daysAgo(3, 14, 30),
      assignedToId: consultantUser.id,
      serviceId: getServiceId(1),
      notes: "Requested quotation breakdown for UK Skilled Worker visa sponsorship. Client waiting for contract draft.",
      activityType: LeadActivityType.WHATSAPP,
      callOutcome: null,
    },
    {
      fullName: "Shahidul Alam",
      phone: "+15553456789",
      email: "shahidul.alam@yahoo.com",
      country: "United States",
      status: LeadStatus.IN_PROGRESS,
      nextFollowUpDate: daysAgo(1, 16, 0),
      assignedToId: adminUser.id,
      serviceId: getServiceId(2),
      notes: "EB-2 NIW evaluation pending attorney assessment. Client submitted CV and requested fee proposal.",
      activityType: LeadActivityType.NOTE,
      callOutcome: null,
    },
    {
      fullName: "Tanzina Akter",
      phone: "+15554567890",
      email: "tanzina.akter@gmail.com",
      country: "United Kingdom",
      status: LeadStatus.CONTACTED,
      nextFollowUpDate: daysAgo(4, 11, 15),
      assignedToId: consultantUser.id,
      serviceId: getServiceId(3),
      notes: "Called on Friday; lead was driving. Said 'Call me back first thing Monday morning'. Needs urgent follow-up call.",
      activityType: LeadActivityType.CALL,
      callOutcome: CallOutcome.BUSY,
    },

    // --- 4 DUE TODAY LEADS ---
    {
      fullName: "Kamal Hossain",
      phone: "+15555678901",
      email: "kamal.hossain@fintech.io",
      country: "Australia",
      status: LeadStatus.FOLLOW_UP,
      nextFollowUpDate: todayAt(10, 30),
      assignedToId: consultantUser.id,
      serviceId: getServiceId(0),
      notes: "Scheduled follow-up call today at 10:30 AM to discuss spouse visa application and proof of funds.",
      activityType: LeadActivityType.CALL,
      callOutcome: CallOutcome.ANSWERED,
    },
    {
      fullName: "Nasrin Sultana",
      phone: "+15556789012",
      email: "nasrin.sultana@hotmail.com",
      country: "Canada",
      status: LeadStatus.NEW,
      nextFollowUpDate: todayAt(12, 0),
      assignedToId: consultantUser.id,
      serviceId: getServiceId(1),
      notes: "Initial website inquiry. Requested phone consultation regarding student visa transition to permanent residency.",
      activityType: LeadActivityType.WHATSAPP,
      callOutcome: null,
    },
    {
      fullName: "Dr. Ariful Islam",
      phone: "+15557890123",
      email: "ariful.islam@medicalcenter.org",
      country: "United States",
      status: LeadStatus.QUALIFIED,
      nextFollowUpDate: todayAt(15, 0),
      assignedToId: adminUser.id,
      serviceId: getServiceId(2),
      notes: "Medical professional interested in US O-1 / EB-1A extraordinary ability visa. Scheduled 3:00 PM video briefing.",
      activityType: LeadActivityType.MEETING,
      callOutcome: null,
    },
    {
      fullName: "Farhana Chowdhury",
      phone: "+15558901234",
      email: "farhana.chowdhury@gmail.com",
      country: "United Kingdom",
      status: LeadStatus.CONTACTED,
      nextFollowUpDate: todayAt(17, 30),
      assignedToId: consultantUser.id,
      serviceId: getServiceId(3),
      notes: "Requested WhatsApp message review of IELTS academic test score report and university conditional offers.",
      activityType: LeadActivityType.CALL,
      callOutcome: CallOutcome.ANSWERED,
    },

    // --- 2 UPCOMING LEADS ---
    {
      fullName: "Zubair Ahmed",
      phone: "+15559012345",
      email: "zubair.ahmed@techcorp.com",
      country: "Canada",
      status: LeadStatus.IN_PROGRESS,
      nextFollowUpDate: daysAhead(2, 11, 0),
      assignedToId: consultantUser.id,
      serviceId: getServiceId(0),
      notes: "Client requested callback on Friday after completing his bank certificate collection.",
      activityType: LeadActivityType.NOTE,
      callOutcome: null,
    },
    {
      fullName: "Sultana Razia",
      phone: "+15550123456",
      email: "sultana.razia@corporate.co",
      country: "Germany",
      status: LeadStatus.FOLLOW_UP,
      nextFollowUpDate: daysAhead(4, 14, 0),
      assignedToId: adminUser.id,
      serviceId: getServiceId(1),
      notes: "EU Blue Card inquiry. Currently verifying academic degree comparability on Anabin portal.",
      activityType: LeadActivityType.CALL,
      callOutcome: CallOutcome.ANSWERED,
    },
  ];

  let createdCount = 0;

  for (const item of demoLeads) {
    // Check if lead with this phone already exists to avoid duplicate clutter
    const existing = await prisma.lead.findFirst({
      where: { phone: item.phone, isDeleted: false },
    });

    if (existing) {
      // Update its follow up date to match the demo scenario
      await prisma.lead.update({
        where: { id: existing.id },
        data: {
          fullName: item.fullName,
          email: item.email,
          country: item.country,
          status: item.status,
          nextFollowUpDate: item.nextFollowUpDate,
          isFollowUpDone: false,
          followUpNotifiedAt: null,
          assignedToId: item.assignedToId,
          serviceId: item.serviceId,
        },
      });
      createdCount++;
      continue;
    }

    const lead = await prisma.lead.create({
      data: {
        fullName: item.fullName,
        phone: item.phone,
        email: item.email,
        country: item.country,
        status: item.status,
        nextFollowUpDate: item.nextFollowUpDate,
        isFollowUpDone: false,
        followUpNotifiedAt: null,
        assignedToId: item.assignedToId,
        serviceId: item.serviceId,
        createdById: adminUser.id,
        createdByName: adminUser.name,
      },
    });

    // Create an initial activity record
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        activityType: item.activityType,
        callOutcome: item.callOutcome,
        notes: item.notes,
        nextFollowUp: item.nextFollowUpDate,
        isFollowUpDone: false,
        performedById: item.assignedToId,
        performedByName:
          item.assignedToId === consultantUser.id
            ? consultantUser.name
            : adminUser.name,
      },
    });

    createdCount++;
  }

  console.log(`✅ Successfully seeded/updated ${createdCount} realistic demo follow-up leads!`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding demo leads:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
