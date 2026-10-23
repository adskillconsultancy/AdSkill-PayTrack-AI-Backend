import prisma from "../lib/prisma";
import { ServiceCategory } from "@prisma/client";

interface ServiceData {
  name: string;
  code: string;
  category: ServiceCategory;
  baseFee: number;
  description: string;
  currency: string;
  defaultDeposit?: number;
  defaultInstallments?: number;
  estimatedDuration?: string;
  estimatedGovFee?: number;
  estimatedAttorneyFee?: number;
  estimatedThirdPartyFee?: number;
}

const ADSKILL_SERVICES: ServiceData[] = [
  // ==================== 1. EMPLOYMENT-BASED GREEN CARD SERVICES ====================
  {
    name: "EB-1A — Extraordinary Ability",
    code: "EB1-A",
    category: ServiceCategory.IMMIGRATION,
    baseFee: 10000.0,
    description:
      "Consultancy and documentation services for individuals with extraordinary ability in sciences, arts, education, business, or athletics. Excl. Govt Fees | Subject to change.",
    currency: "USD",
    defaultDeposit: 3000.0,
    defaultInstallments: 3,
    estimatedDuration: "9-15 months",
    estimatedGovFee: 715.0,
  },
  {
    name: "EB-2 NIW — National Interest Waiver",
    code: "EB2-NIW",
    category: ServiceCategory.IMMIGRATION,
    baseFee: 8000.0,
    description:
      "Full consultancy, documentation, and petition package for advanced degree professionals or exceptional ability individuals whose endeavor has national importance. Excl. Govt Fees | Subject to change.",
    currency: "USD",
    defaultDeposit: 2500.0,
    defaultInstallments: 3,
    estimatedDuration: "6-12 months",
    estimatedGovFee: 715.0,
  },
  {
    name: "EB-3 — Skilled / Professional / Unskilled",
    code: "EB-3",
    category: ServiceCategory.IMMIGRATION,
    baseFee: 24000.0,
    description:
      "Individual: $24,000 | Dependent <14 yrs: +$1,000 | 14+ yrs: +$1,500. Comprehensive employment-based third preference petition support.",
    currency: "USD",
    defaultDeposit: 6000.0,
    defaultInstallments: 4,
    estimatedDuration: "18-24 months",
    estimatedGovFee: 715.0,
  },

  // ==================== 2. INVESTOR & BUSINESS IMMIGRATION ====================
  {
    name: "E-2 Investor Visa",
    code: "E-2",
    category: ServiceCategory.IMMIGRATION,
    baseFee: 15000.0,
    description:
      "Excl. Govt Fees. Advisory, documentation, business coordination, and consular preparation for treaty investors investing substantial capital in U.S. business.",
    currency: "USD",
    defaultDeposit: 5000.0,
    defaultInstallments: 3,
    estimatedDuration: "4-8 months",
    estimatedGovFee: 315.0,
  },
  {
    name: "EB-5 Investor Green Card (I-526)",
    code: "EB-5",
    category: ServiceCategory.IMMIGRATION,
    baseFee: 35655.0,
    description:
      "Targeted employment area (TEA) and commercial enterprise investment consulting. Initial payment: $10,655 | Remaining: $5,000/month.",
    currency: "USD",
    defaultDeposit: 10655.0,
    defaultInstallments: 6,
    estimatedDuration: "12-24 months",
    estimatedGovFee: 11160.0,
  },

  // ==================== 3. FAMILY & INDIVIDUAL IMMIGRATION ====================
  {
    name: "Family-Based Immigration (I-130)",
    code: "I-130",
    category: ServiceCategory.IMMIGRATION,
    baseFee: 0.0,
    description:
      "Petition for Alien Relative documentation preparation and consular coordination for immediate relatives and preference family members. Contact for custom pricing.",
    currency: "USD",
    defaultDeposit: 0.0,
    defaultInstallments: 1,
    estimatedDuration: "6-12 months",
    estimatedGovFee: 675.0,
  },
  {
    name: "Adjustment of Status (I-485)",
    code: "I-485",
    category: ServiceCategory.IMMIGRATION,
    baseFee: 0.0,
    description:
      "Application to Register Permanent Residence or Adjust Status in the United States, including work authorization (I-765) and travel permit (I-131). Contact for custom pricing.",
    currency: "USD",
    defaultDeposit: 0.0,
    defaultInstallments: 1,
    estimatedDuration: "8-14 months",
    estimatedGovFee: 1440.0,
  },
  {
    name: "Naturalization / Citizenship (N-400)",
    code: "N-400",
    category: ServiceCategory.IMMIGRATION,
    baseFee: 0.0,
    description:
      "U.S. Naturalization and Citizenship document filing, continuous residence review, and interview readiness coaching. Contact for custom pricing.",
    currency: "USD",
    defaultDeposit: 0.0,
    defaultInstallments: 1,
    estimatedDuration: "5-9 months",
    estimatedGovFee: 760.0,
  },
  {
    name: "Visitor Visa (B1/B2) Guidance",
    code: "B1-B2",
    category: ServiceCategory.IMMIGRATION,
    baseFee: 0.0,
    description:
      "Business and Tourism visitor visa consulting, DS-160 application assistance, financial proof compilation, and embassy interview coaching. Contact for custom pricing.",
    currency: "USD",
    defaultDeposit: 0.0,
    defaultInstallments: 1,
    estimatedDuration: "1-2 months",
    estimatedGovFee: 185.0,
  },

  // ==================== 4. STUDENT & CHANGE OF STATUS ====================
  {
    name: "F-1 Student Visa Processing",
    code: "F-1",
    category: ServiceCategory.IMMIGRATION,
    baseFee: 800.0,
    description:
      "Excl. SEVIS fee + Embassy fee. Form DS-160 preparation, financial sponsorship documentation, and visa appointment strategy.",
    currency: "USD",
    defaultDeposit: 400.0,
    defaultInstallments: 2,
    estimatedDuration: "1-3 months",
    estimatedGovFee: 185.0,
  },
  {
    name: "Change of Status (B1/B2 → F-1)",
    code: "COS-B1-F1",
    category: ServiceCategory.IMMIGRATION,
    baseFee: 1250.0,
    description:
      "Change of nonimmigrant status application with USCIS, Form I-539 document preparation, and university admission coordination. Subject to change.",
    currency: "USD",
    defaultDeposit: 625.0,
    defaultInstallments: 2,
    estimatedDuration: "4-9 months",
    estimatedGovFee: 470.0,
  },
  {
    name: "I-20 Support Coordination",
    code: "I-20-COORD",
    category: ServiceCategory.IMMIGRATION,
    baseFee: 300.0,
    description:
      "University liaison and academic enrollment certificate (Form I-20) acquisition assistance. Up to $300.",
    currency: "USD",
    defaultDeposit: 300.0,
    defaultInstallments: 1,
    estimatedDuration: "2-4 weeks",
  },
  {
    name: "ESL / University Admission Support",
    code: "UNIV-ADMISSION",
    category: ServiceCategory.IMMIGRATION,
    baseFee: 0.0,
    description:
      "English as a Second Language institute admissions, degree placement, transfer I-20, and university application support. Contact for custom pricing.",
    currency: "USD",
    defaultDeposit: 0.0,
    defaultInstallments: 1,
    estimatedDuration: "1-3 months",
  },

  // ==================== 5. PROFILE BUILDING & STRATEGIC SERVICES ====================
  {
    name: "EB-1A / EB-2 NIW Profile Mentoring",
    code: "PROFILE-MENTOR",
    category: ServiceCategory.CONSULTATION,
    baseFee: 0.0,
    description:
      "Long-term academic and professional profile building: citations, judging, scholarly publications, media coverage, and critical roles. Contact for custom pricing.",
    currency: "USD",
    defaultDeposit: 0.0,
    defaultInstallments: 1,
    estimatedDuration: "6-18 months",
  },
  {
    name: "Petition Drafting & Documentation",
    code: "PETITION-DRAFT",
    category: ServiceCategory.CONSULTATION,
    baseFee: 0.0,
    description:
      "Exhaustive legal petition brief drafting, exhibit compilation, legal citations, and index formatting for immigration filings. Contact for custom pricing.",
    currency: "USD",
    defaultDeposit: 0.0,
    defaultInstallments: 1,
    estimatedDuration: "1-2 months",
  },
  {
    name: "Recommendation Letter Drafting",
    code: "REC-LETTERS",
    category: ServiceCategory.CONSULTATION,
    baseFee: 0.0,
    description:
      "Drafting persuasive expert opinion and peer reference letters tailored to USCIS evidentiary standards. Contact for custom pricing.",
    currency: "USD",
    defaultDeposit: 0.0,
    defaultInstallments: 1,
    estimatedDuration: "2-4 weeks",
  },
  {
    name: "RFE Response Support",
    code: "RFE-RESPONSE",
    category: ServiceCategory.CONSULTATION,
    baseFee: 0.0,
    description:
      "Strategic analysis and comprehensive document preparation in response to USCIS Request for Evidence (RFE) or Notice of Intent to Deny (NOID). Contact for custom pricing.",
    currency: "USD",
    defaultDeposit: 0.0,
    defaultInstallments: 1,
    estimatedDuration: "1-2 months",
  },

  // ==================== 6. BUSINESS & STARTUP SUPPORT ====================
  {
    name: "U.S. Business Formation (LLC / Corporation)",
    code: "BIZ-FORMATION",
    category: ServiceCategory.BUSINESS,
    baseFee: 0.0,
    description:
      "State entity registration, Articles of Organization/Incorporation, Operating Agreement, and initial corporate resolution package. Contact for custom pricing.",
    currency: "USD",
    defaultDeposit: 0.0,
    defaultInstallments: 1,
    estimatedDuration: "1-3 weeks",
  },
  {
    name: "EIN Processing",
    code: "EIN-PROC",
    category: ServiceCategory.BUSINESS,
    baseFee: 0.0,
    description:
      "Federal Employer Identification Number registration with the IRS for resident and non-resident international business owners. Contact for custom pricing.",
    currency: "USD",
    defaultDeposit: 0.0,
    defaultInstallments: 1,
    estimatedDuration: "1-2 weeks",
  },
  {
    name: "Business Plan Development (E-2)",
    code: "BP-E2",
    category: ServiceCategory.BUSINESS,
    baseFee: 0.0,
    description:
      "5-year comprehensive immigration-compliant business plans with hiring schedules, marketing analysis, financial projections, and capitalization details. Contact for custom pricing.",
    currency: "USD",
    defaultDeposit: 0.0,
    defaultInstallments: 1,
    estimatedDuration: "2-4 weeks",
  },
  {
    name: "Financial Projection & Investment Structuring",
    code: "FIN-PROJECTION",
    category: ServiceCategory.BUSINESS,
    baseFee: 0.0,
    description:
      "Detailed financial modeling, pro-forma balance sheets, cash flow forecasts, and escrow investment structuring for treaty investor visas. Contact for custom pricing.",
    currency: "USD",
    defaultDeposit: 0.0,
    defaultInstallments: 1,
    estimatedDuration: "2-3 weeks",
  },
  {
    name: "Business Acquisition Support",
    code: "BIZ-ACQUISITION",
    category: ServiceCategory.BUSINESS,
    baseFee: 0.0,
    description:
      "Due diligence advisory, asset purchase agreement support, franchise review, and business valuation consulting for visa applicants. Contact for custom pricing.",
    currency: "USD",
    defaultDeposit: 0.0,
    defaultInstallments: 1,
    estimatedDuration: "1-3 months",
  },
  {
    name: "Lease Negotiation Guidance",
    code: "LEASE-GUIDANCE",
    category: ServiceCategory.BUSINESS,
    baseFee: 0.0,
    description:
      "Commercial lease review, landlord contingency clause drafting, and location feasibility advisory for business visas. Contact for custom pricing.",
    currency: "USD",
    defaultDeposit: 0.0,
    defaultInstallments: 1,
    estimatedDuration: "2-4 weeks",
  },

  // ==================== 7. CASE MANAGEMENT & ADDITIONAL SERVICES ====================
  {
    name: "End-to-End Case Management",
    code: "E2E-CASE-MGMT",
    category: ServiceCategory.CONSULTATION,
    baseFee: 0.0,
    description:
      "Dedicated milestone tracking, timeline management, caseworker coordination, and document repository oversight. Contact for custom pricing.",
    currency: "USD",
    defaultDeposit: 0.0,
    defaultInstallments: 1,
    estimatedDuration: "Ongoing",
  },
  {
    name: "Attorney Coordination & Filing Support",
    code: "ATTY-COORD",
    category: ServiceCategory.CONSULTATION,
    baseFee: 0.0,
    description:
      "Liaison between independent immigration legal counsel and client for G-28 filing and petition review. Contact for custom pricing.",
    currency: "USD",
    defaultDeposit: 0.0,
    defaultInstallments: 1,
    estimatedDuration: "1-3 months",
  },
  {
    name: "Digital Client Workflow & CRM Tracking",
    code: "DIGITAL-CRM",
    category: ServiceCategory.CONSULTATION,
    baseFee: 0.0,
    description:
      "Access to AdSkill PayTrack AI portal, digital milestone notifications, automated sequential receipts, and online Stripe checkout. Contact for custom pricing.",
    currency: "USD",
    defaultDeposit: 0.0,
    defaultInstallments: 1,
    estimatedDuration: "Ongoing",
  },
  {
    name: "Free / Paid Profile Evaluation",
    code: "PROFILE-EVAL",
    category: ServiceCategory.CONSULTATION,
    baseFee: 0.0,
    description:
      "Comprehensive eligibility assessment across EB-1A, EB-2 NIW, and other visa categories with strengths and weaknesses analysis. Contact for custom pricing.",
    currency: "USD",
    defaultDeposit: 0.0,
    defaultInstallments: 1,
    estimatedDuration: "3-5 business days",
  },
  {
    name: "Immigration Strategy Consulting",
    code: "STRATEGY-CONSULT",
    category: ServiceCategory.CONSULTATION,
    baseFee: 0.0,
    description:
      "1-on-1 strategic advisory session to determine the optimal non-immigrant or immigrant pathway based on career goals and qualifications. Contact for custom pricing.",
    currency: "USD",
    defaultDeposit: 0.0,
    defaultInstallments: 1,
    estimatedDuration: "1 hour",
  },
];

async function main() {
  console.log("🌱 Seeding Official AdSkill Consultancy Catalog Services...");

  // 1. Resolve Super Admin user for actor audit traceability
  const superAdmin = await prisma.user.findFirst({
    where: { role: { name: "SUPER_ADMIN" }, isDeleted: false },
    select: { id: true, name: true, email: true },
  });

  if (!superAdmin) {
    throw new Error("Super Admin user not found in database. Run seed first.");
  }

  console.log(`👤 Using Super Admin: ${superAdmin.name} (${superAdmin.email}) as creator.`);

  // Wipe existing services first for a clean sequence
  console.log("🧹 Clearing all existing services...");
  await prisma.service.deleteMany({});

  const baseTime = Date.now();
  const records = ADSKILL_SERVICES.map((item, index) => ({
    name: item.name,
    code: item.code,
    category: item.category,
    baseFee: item.baseFee,
    description: item.description,
    currency: item.currency,
    defaultDeposit: item.defaultDeposit || null,
    defaultInstallments: item.defaultInstallments || null,
    estimatedDuration: item.estimatedDuration || null,
    estimatedGovFee: item.estimatedGovFee || 0.0,
    isActive: true,
    createdAt: new Date(baseTime - index * 60000),
    createdById: superAdmin.id,
  }));

  const res = await prisma.service.createMany({
    data: records,
    skipDuplicates: true,
  });

  console.log(`\n🎉 Official Service Catalog Seeding Complete!`);
  console.log(`• Successfully Inserted: ${res.count} services in exact requested order.`);

  const totalInDb = await prisma.service.count({ where: { isDeleted: false } });
  console.log(`• Active Services in Database: ${totalInDb}`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding services:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
