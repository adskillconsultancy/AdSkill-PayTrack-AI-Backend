import prisma from "../lib/prisma";

async function main() {
  console.log("🔄 Updating timestamps and attributing operational records for 2026-10-23...");

  const todayMidday = new Date("2026-10-23T12:00:00.000Z");

  // 1. Get staff users
  const staff = await prisma.user.findMany({
    where: {
      role: { name: { not: "CLIENT" } },
      isDeleted: false,
    },
    select: { id: true, name: true, email: true, role: { select: { name: true } } },
  });

  console.log(`Found ${staff.length} staff members.`);

  const sarah1 = staff.find((s) => s.email === "manager@adskillconsultancy.com");
  const sarah2 = staff.find((s) => s.email === "sarah.jenkins@adskillconsultancy.com");
  const david1 = staff.find((s) => s.email === "consultant@adskillconsultancy.com");
  const david2 = staff.find((s) => s.email === "david.chen@adskillconsultancy.com");
  const alex = staff.find((s) => s.email === "alex.ray@adskillconsultancy.com");
  const lisa = staff.find((s) => s.email === "lisa.wong@adskillconsultancy.com");
  const admin = staff.find((s) => s.email === "admin@adskillconsultancy.com");

  const sarahId = sarah2?.id || sarah1?.id || staff[0].id;
  const davidId = david2?.id || david1?.id || staff[1]?.id || staff[0].id;
  const alexId = alex?.id || staff[2]?.id || staff[0].id;
  const lisaId = lisa?.id || staff[3]?.id || staff[0].id;

  // 2. Update existing and seeded payments to 2026-10-23T12:00:00Z
  const updatedPayments = await prisma.payment.updateMany({
    where: {
      status: { in: ["VERIFIED", "COMPLETED", "PAID"] },
      isDeleted: false,
    },
    data: {
      paymentDate: todayMidday,
    },
  });
  console.log(`✅ Updated ${updatedPayments.count} verified payments to date 2026-10-23`);

  // Ensure Sarah, David, Alex, Lisa have verified payments attributed
  const payments = await prisma.payment.findMany({
    where: { status: "VERIFIED", isDeleted: false },
    take: 10,
  });

  if (payments.length > 0) {
    if (payments[0]) await prisma.payment.update({ where: { id: payments[0].id }, data: { verifiedById: sarahId, amount: 4500.0, paymentMethod: "STRIPE" } });
    if (payments[1]) await prisma.payment.update({ where: { id: payments[1].id }, data: { verifiedById: sarahId, amount: 1200.0, paymentMethod: "BANK_TRANSFER" } });
    if (payments[2]) await prisma.payment.update({ where: { id: payments[2].id }, data: { verifiedById: davidId, amount: 3250.0, paymentMethod: "STRIPE" } });
    if (payments[3]) await prisma.payment.update({ where: { id: payments[3].id }, data: { verifiedById: davidId, amount: 750.0, paymentMethod: "CASH" } });
    if (payments[4]) await prisma.payment.update({ where: { id: payments[4].id }, data: { verifiedById: alexId, amount: 2800.0, paymentMethod: "STRIPE" } });
    if (payments[5]) await prisma.payment.update({ where: { id: payments[5].id }, data: { verifiedById: lisaId, amount: 1500.0, paymentMethod: "ZELLE" } });
  }

  // 3. Update Leads to 2026-10-23
  const updatedLeads = await prisma.lead.updateMany({
    where: { isDeleted: false },
    data: {
      createdAt: todayMidday,
    },
  });
  console.log(`✅ Updated ${updatedLeads.count} leads to createdAt 2026-10-23`);

  // 4. Update Lead Activities to 2026-10-23
  const updatedActivities = await prisma.leadActivity.updateMany({
    data: {
      createdAt: todayMidday,
    },
  });
  console.log(`✅ Updated ${updatedActivities.count} lead activities to createdAt 2026-10-23`);

  // 5. Update Case Notes to 2026-10-23
  const updatedCaseNotes = await prisma.caseNote.updateMany({
    where: { isDeleted: false },
    data: {
      createdAt: todayMidday,
    },
  });
  console.log(`✅ Updated ${updatedCaseNotes.count} case notes to createdAt 2026-10-23`);

  // 6. Update Office Expenses to 2026-10-23
  const updatedExpenses = await prisma.officeExpense.updateMany({
    where: { isDeleted: false },
    data: {
      transactionDate: todayMidday,
      createdAt: todayMidday,
    },
  });
  console.log(`✅ Updated ${updatedExpenses.count} office expenses to date 2026-10-23`);

  // 7. Update Support Messages to 2026-10-23
  const updatedSupportMessages = await prisma.supportMessage.updateMany({
    data: {
      createdAt: todayMidday,
    },
  });
  console.log(`✅ Updated ${updatedSupportMessages.count} support messages to createdAt 2026-10-23`);

  console.log("🎉 All operational records are now firmly set to 2026-10-23!");
}

main().finally(() => prisma.$disconnect());
