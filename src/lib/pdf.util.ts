import PDFDocument from "pdfkit";

// ─── AdSkill Branding Constants ──────────────────────────────────────────────
export const ADSKILL = {
  legalName: "AdSkill Consultancy Inc.",
  shortName: "AdSkill",
  tagline: "Corporate & Immigration Financial Intelligence",
  address: "1234 Innovation Drive, Suite 400",
  cityState: "New York, NY 10001",
  country: "United States of America",
  phone: "+1 (800) 235-7454",
  email: "billing@adskillconsultancy.com",
  website: "portal.adskillconsultancy.com",
  taxId: "EIN: 47-8921034",
  disclaimer:
    "This document is an official financial instrument issued by AdSkill Consultancy Inc. All fees are subject to the terms of the signed client services agreement. Government filing fees (USCIS/consular) and third-party fees are pass-through costs not retained by AdSkill. AdSkill professional fees are strictly non-refundable once service milestones have commenced unless expressly agreed in writing. AdSkill Consultancy Inc. is a professional corporate & immigration consulting advisory and does not provide formal legal representation. Certified copies may be re-issued upon request without modifying original historical records.",

  // Executive brand colors
  navyDark: "#0b192c",       // Deep Midnight Navy
  brandColor: "#1e3a8a",     // Corporate Royal Navy
  brandBlue: "#2563eb",      // Vivid Accent Blue
  accentGold: "#d97706",     // Amber / Gold Accent
  accentGoldLight: "#fef3c7",// Light Gold Tint
  textDark: "#0f172a",       // Slate 900
  textMid: "#475569",        // Slate 600
  textLight: "#64748b",      // Slate 500
  lineColor: "#e2e8f0",      // Slate 200
  lineColorDark: "#cbd5e1",  // Slate 300
  cardBg: "#f8fafc",         // Slate 50
  cardBorder: "#e2e8f0",     // Slate 200
  successGreen: "#059669",   // Emerald 600
  successGreenDark: "#065f46",// Emerald 800
  successGreenBg: "#f0fdf4", // Emerald Tint
  successGreenBorder: "#bbf7d0",
};

// ─── Helper: Format Currency ─────────────────────────────────────────────────
export const formatMoney = (amount: number | string, currency = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
  }).format(Number(amount) || 0);
};

// ─── Helper: Format Date ─────────────────────────────────────────────────────
export const formatDate = (d: Date | string | null | undefined) => {
  if (!d) return "N/A";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
    typeof d === "string" ? new Date(d) : d
  );
};

// ─── Create Single-Page Optimized PDFDocument ────────────────────────────────
export function createBrandedDocument(title: string) {
  return new PDFDocument({
    size: "LETTER", // 612 x 792 pt
    margins: { top: 20, bottom: 10, left: 36, right: 36 },
    autoFirstPage: true,
    info: {
      Title: title,
      Author: ADSKILL.legalName,
      Subject: "Official Financial Document",
      Creator: "AdSkill PayTrack AI Financial Engine",
    },
  });
}

// ─── Draw Vector Brand Emblem ────────────────────────────────────────────────
export function drawBrandLogo(doc: InstanceType<typeof PDFDocument>, x: number, y: number) {
  const size = 30;
  const radius = 6;

  // Background badge
  doc.roundedRect(x, y, size, size, radius).fill(ADSKILL.navyDark);

  // Gold accent corner triangle
  doc
    .polygon([x + size - 11, y], [x + size, y], [x + size, y + 11])
    .fill(ADSKILL.accentGold);

  // Stylized "P" geometric lines
  doc.save();
  doc
    .lineWidth(2.4)
    .strokeColor("#ffffff")
    .lineCap("round")
    .lineJoin("round");

  // Vertical stem of P
  doc.moveTo(x + 10, y + 7).lineTo(x + 10, y + 23).stroke();

  // Loop of P
  doc
    .moveTo(x + 10, y + 7)
    .lineTo(x + 18, y + 7)
    .lineTo(x + 21, y + 11)
    .lineTo(x + 18, y + 15)
    .lineTo(x + 10, y + 15)
    .stroke();

  // Gold dot indicator
  doc.circle(x + 21, y + 21, 2.2).fill(ADSKILL.accentGold);
  doc.restore();

  // Text Wordmark
  doc
    .fontSize(16)
    .font("Helvetica-Bold")
    .fillColor(ADSKILL.navyDark)
    .text("ADSKILL", x + 36, y + 2, { lineBreak: false });

  doc
    .fontSize(16)
    .font("Helvetica-Bold")
    .fillColor(ADSKILL.accentGold)
    .text(" PAYTRACK", x + 107, y + 2, { lineBreak: false });

  doc
    .fontSize(6.8)
    .font("Helvetica-Bold")
    .fillColor(ADSKILL.textLight)
    .text(ADSKILL.tagline.toUpperCase(), x + 36, y + 20, { lineBreak: false });
}

// ─── Branded Executive Header ────────────────────────────────────────────────
export function drawHeader(
  doc: InstanceType<typeof PDFDocument>,
  docType: "INVOICE" | "RECEIPT",
  docNumber: string,
  docStatus: string
) {
  const pageW = doc.page.width;
  const leftX = 36;
  const isReceipt = docType === "RECEIPT";

  // 1. Top dual-tone architectural bar
  doc.rect(0, 0, pageW, 4).fill(ADSKILL.navyDark);
  doc.rect(pageW - 160, 0, 160, 4).fill(isReceipt ? ADSKILL.successGreen : ADSKILL.accentGold);

  // 2. Vector Logo & Company Identity (Left)
  drawBrandLogo(doc, leftX, 16);

  // Sub-details under logo
  doc
    .fontSize(7.2)
    .font("Helvetica")
    .fillColor(ADSKILL.textMid)
    .text(`${ADSKILL.address}, ${ADSKILL.cityState}  •  ${ADSKILL.phone}`, leftX, 50)
    .text(`${ADSKILL.email}  •  ${ADSKILL.website}  •  ${ADSKILL.taxId}`, leftX, 60);

  // 3. Document Executive Badge (Right)
  const badgeW = 175;
  const badgeH = 48;
  const badgeX = pageW - leftX - badgeW;
  const badgeY = 15;

  const headerBg = isReceipt ? ADSKILL.successGreenDark : ADSKILL.navyDark;
  const statusBg =
    isReceipt || docStatus === "PAID"
      ? ADSKILL.successGreen
      : docStatus === "VOID"
      ? "#dc2626"
      : ADSKILL.accentGold;

  // Outer container
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 6).fill(headerBg);

  // Subtle accent bottom line on badge
  doc
    .rect(badgeX, badgeY + badgeH - 2, badgeW, 2)
    .fill(isReceipt ? ADSKILL.successGreen : ADSKILL.accentGold);

  // Badge title
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor("#ffffff")
    .text(isReceipt ? "OFFICIAL PAYMENT RECEIPT" : "OFFICIAL TAX INVOICE", badgeX, badgeY + 6, {
      width: badgeW,
      align: "center",
    });

  // Document number in monospace font
  doc
    .fontSize(8.5)
    .font("Courier-Bold")
    .fillColor("#f1f5f9")
    .text(docNumber, badgeX, badgeY + 19.5, {
      width: badgeW,
      align: "center",
    });

  // Status Pill
  const pillW = 75;
  const pillH = 12;
  const pillX = badgeX + (badgeW - pillW) / 2;
  const pillY = badgeY + 32;

  doc.roundedRect(pillX, pillY, pillW, pillH, 3).fill(statusBg);
  doc
    .fontSize(6.5)
    .font("Helvetica-Bold")
    .fillColor("#ffffff")
    .text(docStatus.toUpperCase(), pillX, pillY + 2.5, {
      width: pillW,
      align: "center",
    });

  // 4. Subtle divider line
  doc
    .moveTo(leftX, 72)
    .lineTo(pageW - leftX, 72)
    .lineWidth(0.5)
    .strokeColor(ADSKILL.lineColor)
    .stroke();

  doc.y = 78;
}

// ─── Dual Metadata Cards (Billed To vs Document Details) ─────────────────────
export function drawDualMetaCards(
  doc: InstanceType<typeof PDFDocument>,
  clientFields: { label: string; value: string }[],
  docFields: { label: string; value: string }[]
) {
  const leftX = 36;
  const startY = doc.y + 2;
  const cardW = 265;
  const cardH = 70;
  const rightX = leftX + cardW + 10;

  // 1. Left Card: Client Details
  doc.roundedRect(leftX, startY, cardW, cardH, 5).fillAndStroke(ADSKILL.cardBg, ADSKILL.cardBorder);

  // Header strip
  doc.rect(leftX, startY, cardW, 16).fill("#f1f5f9");
  doc.roundedRect(leftX, startY, cardW, cardH, 5).lineWidth(0.5).strokeColor(ADSKILL.cardBorder).stroke();

  // Small blue square indicator
  doc.rect(leftX + 8, startY + 5.5, 5, 5).fill(ADSKILL.brandBlue);
  doc
    .fontSize(7.5)
    .font("Helvetica-Bold")
    .fillColor(ADSKILL.navyDark)
    .text("BILLED TO / CLIENT IDENTITY", leftX + 17, startY + 4.5);

  let cy = startY + 21;
  clientFields.forEach(({ label, value }) => {
    doc.fontSize(6.5).font("Helvetica-Bold").fillColor(ADSKILL.textLight).text(label.toUpperCase(), leftX + 10, cy, { width: 70 });
    doc.fontSize(7.5).font("Helvetica-Bold").fillColor(ADSKILL.textDark).text(value || "N/A", leftX + 82, cy, { width: cardW - 92 });
    cy += 11.5;
  });

  // 2. Right Card: Case & Billing Details
  doc.roundedRect(rightX, startY, cardW, cardH, 5).fillAndStroke(ADSKILL.cardBg, ADSKILL.cardBorder);

  // Header strip
  doc.rect(rightX, startY, cardW, 16).fill("#f1f5f9");
  doc.roundedRect(rightX, startY, cardW, cardH, 5).lineWidth(0.5).strokeColor(ADSKILL.cardBorder).stroke();

  // Small gold square indicator
  doc.rect(rightX + 8, startY + 5.5, 5, 5).fill(ADSKILL.accentGold);
  doc
    .fontSize(7.5)
    .font("Helvetica-Bold")
    .fillColor(ADSKILL.navyDark)
    .text("RECORD & BILLING REFERENCE", rightX + 17, startY + 4.5);

  let dy = startY + 21;
  docFields.forEach(({ label, value }) => {
    doc.fontSize(6.5).font("Helvetica-Bold").fillColor(ADSKILL.textLight).text(label.toUpperCase(), rightX + 10, dy, { width: 82 });
    doc.fontSize(7.5).font("Helvetica-Bold").fillColor(ADSKILL.textDark).text(value || "N/A", rightX + 94, dy, { width: cardW - 104 });
    dy += 11.5;
  });

  doc.y = startY + cardH + 6;
}

// ─── Enrolled Service Program Banner ─────────────────────────────────────────
export function drawServiceBanner(
  doc: InstanceType<typeof PDFDocument>,
  serviceName: string,
  serviceCode: string,
  category: string,
  scheduleType?: string
) {
  const leftX = 36;
  const contentW = doc.page.width - leftX * 2;
  const bannerY = doc.y;
  const bannerH = 28;

  doc.roundedRect(leftX, bannerY, contentW, bannerH, 5).fillAndStroke("#ffffff", ADSKILL.cardBorder);

  // Left accent strip
  doc.roundedRect(leftX, bannerY, 4, bannerH, 2).fill(ADSKILL.navyDark);

  // Category Tag Pill
  const pillW = 68;
  const pillH = 14;
  const pillX = leftX + 10;
  const pillY = bannerY + 7;
  doc.roundedRect(pillX, pillY, pillW, pillH, 3).fill(ADSKILL.accentGoldLight);
  doc
    .fontSize(6.5)
    .font("Helvetica-Bold")
    .fillColor(ADSKILL.accentGold)
    .text(category.toUpperCase(), pillX, pillY + 3.5, { width: pillW, align: "center" });

  // Service Name
  const maxTitleW = contentW - 220;
  doc
    .fontSize(8.5)
    .font("Helvetica-Bold")
    .fillColor(ADSKILL.navyDark)
    .text(serviceName, leftX + 86, bannerY + 5.5, { width: maxTitleW, lineBreak: false });

  // Sub-detail
  const metaText = `Category: ${category}   •   Schedule: ${scheduleType || "Milestones"}   •   AdSkill Corporate Client Retainer`;
  doc
    .fontSize(6.8)
    .font("Helvetica")
    .fillColor(ADSKILL.textLight)
    .text(metaText, leftX + 86, bannerY + 16.5);

  // Code pill on the right side
  const codeBadgeW = 85;
  const codeBadgeH = 16;
  const codeBadgeX = leftX + contentW - codeBadgeW - 10;
  const codeBadgeY = bannerY + 6;
  doc.roundedRect(codeBadgeX, codeBadgeY, codeBadgeW, codeBadgeH, 3).fill("#f1f5f9");
  doc
    .fontSize(7)
    .font("Helvetica-Bold")
    .fillColor(ADSKILL.brandBlue)
    .text(`CODE: ${serviceCode}`, codeBadgeX, codeBadgeY + 4, { width: codeBadgeW, align: "center" });

  doc.y = bannerY + bannerH + 7;
}

// ─── Itemized Fee Breakdown Table ─────────────────────────────────────────────
export interface FeeRow {
  description: string;
  categoryTag?: string;
  note?: string;
  amount: number | string;
  currency: string;
  isBold?: boolean;
  isTotal?: boolean;
  color?: string;
}

export function drawFeeTable(doc: InstanceType<typeof PDFDocument>, rows: FeeRow[]) {
  const leftX = 36;
  const pageW = doc.page.width;
  const contentW = pageW - leftX * 2; // 540 pt
  const colDesc = 290;
  const colTag = 130;
  const colAmt = 120;

  let y = doc.y;

  // Table Header
  const headH = 18;
  doc.rect(leftX, y, contentW, headH).fill(ADSKILL.navyDark);

  // Gold hairline under table header
  doc.rect(leftX, y + headH - 1.5, contentW, 1.5).fill(ADSKILL.accentGold);

  doc
    .fontSize(7)
    .font("Helvetica-Bold")
    .fillColor("#ffffff")
    .text("DESCRIPTION / ITEMIZATION", leftX + 10, y + 5.5, { width: colDesc })
    .text("CLASSIFICATION", leftX + colDesc, y + 5.5, { width: colTag })
    .text("AMOUNT", leftX + colDesc + colTag, y + 5.5, { width: colAmt - 10, align: "right" });

  y += headH;

  // Rows
  rows.forEach((row, idx) => {
    const isTotal = row.isTotal;
    const rowH = isTotal ? 23 : row.note ? 25 : 18;
    const bg = isTotal ? "#f1f5f9" : idx % 2 === 0 ? "#ffffff" : "#f8fafc";

    doc.rect(leftX, y, contentW, rowH).fill(bg);

    // Row bottom hairline
    doc
      .moveTo(leftX, y + rowH)
      .lineTo(leftX + contentW, y + rowH)
      .lineWidth(isTotal ? 1 : 0.4)
      .strokeColor(isTotal ? ADSKILL.navyDark : ADSKILL.cardBorder)
      .stroke();

    const textColor = row.color || (isTotal ? ADSKILL.navyDark : ADSKILL.textDark);
    const font = isTotal || row.isBold ? "Helvetica-Bold" : "Helvetica";

    // Description
    doc
      .fontSize(isTotal ? 8.5 : 7.5)
      .font(font)
      .fillColor(textColor)
      .text(row.description, leftX + 10, y + (row.note ? 3.5 : 5), { width: colDesc - 12 });

    if (row.note && !isTotal) {
      doc
        .fontSize(6.5)
        .font("Helvetica")
        .fillColor(ADSKILL.textLight)
        .text(row.note, leftX + 10, y + 14.5, { width: colDesc - 12 });
    }

    // Type / Tag
    if (!isTotal) {
      doc
        .fontSize(7)
        .font("Helvetica")
        .fillColor(ADSKILL.textMid)
        .text(row.categoryTag || "Standard Fee", leftX + colDesc, y + 5, { width: colTag - 5 });
    }

    // Amount
    doc
      .fontSize(isTotal ? 9.5 : 8)
      .font(font)
      .fillColor(textColor)
      .text(formatMoney(row.amount, row.currency), leftX + colDesc + colTag, y + (row.note ? 3.5 : 5), {
        width: colAmt - 10,
        align: "right",
      });

    y += rowH;
  });

  doc.y = y + 7;
}

// ─── Financial Health & Balance Box ──────────────────────────────────────────
export function drawBalanceBox(
  doc: InstanceType<typeof PDFDocument>,
  paid: number,
  total: number,
  currency: string,
  nextInstallmentLabel?: string,
  nextInstallmentDate?: string,
  docStatus?: string
) {
  const leftX = 36;
  const contentW = doc.page.width - leftX * 2;
  const remaining = Math.max(0, total - paid);
  const isPaid = remaining <= 0;

  const boxY = doc.y;
  const boxH = nextInstallmentLabel ? 54 : 46;

  // Card container
  doc.roundedRect(leftX, boxY, contentW, boxH, 5).fillAndStroke(
    isPaid ? ADSKILL.successGreenBg : "#f8fafc",
    isPaid ? ADSKILL.successGreenBorder : ADSKILL.cardBorder
  );

  const colW = contentW / 3;

  // Stat 1: Contracted Total
  doc.fontSize(6.5).font("Helvetica-Bold").fillColor(ADSKILL.textLight).text("TOTAL CONTRACTED VALUE", leftX + 14, boxY + 7);
  doc.fontSize(11).font("Helvetica-Bold").fillColor(ADSKILL.navyDark).text(formatMoney(total, currency), leftX + 14, boxY + 17);

  // Stat 2: Total Paid to Date
  doc.fontSize(6.5).font("Helvetica-Bold").fillColor(ADSKILL.textLight).text("TOTAL CLEARED TO DATE", leftX + colW + 8, boxY + 7);
  doc.fontSize(11).font("Helvetica-Bold").fillColor(ADSKILL.successGreen).text(formatMoney(paid, currency), leftX + colW + 8, boxY + 17);

  // Stat 3: Remaining Balance
  doc.fontSize(6.5).font("Helvetica-Bold").fillColor(ADSKILL.textLight).text("REMAINING BALANCE DUE", leftX + colW * 2 + 8, boxY + 7);
  doc.fontSize(11).font("Helvetica-Bold").fillColor(isPaid ? ADSKILL.successGreen : ADSKILL.accentGold).text(formatMoney(remaining, currency), leftX + colW * 2 + 8, boxY + 17);

  // Optional Next Payment Ribbon
  if (nextInstallmentLabel && nextInstallmentDate && !isPaid) {
    doc.moveTo(leftX + 8, boxY + 36).lineTo(leftX + contentW - 8, boxY + 36).lineWidth(0.4).strokeColor(ADSKILL.cardBorder).stroke();
    doc.fontSize(6.8).font("Helvetica-Bold").fillColor(ADSKILL.brandColor).text("UPCOMING MILESTONE PAYMENT:", leftX + 14, boxY + 40.5);
    doc.fontSize(7.5).font("Helvetica-Bold").fillColor(ADSKILL.textDark).text(`${nextInstallmentLabel}   •   Due: ${nextInstallmentDate}`, leftX + 154, boxY + 40.5);
  }

  doc.y = boxY + boxH + 8;
}

// ─── Corporate Official Seal & Authorization Block ────────────────────────────
export function drawInstructionsAndSeal(
  doc: InstanceType<typeof PDFDocument>,
  isReceipt: boolean,
  paymentDetails?: {
    method?: string;
    date?: string;
    reference?: string;
    verifiedBy?: string;
  }
) {
  const leftX = 36;
  const contentW = doc.page.width - leftX * 2; // 540 pt
  const boxY = doc.y;
  const boxH = 98;

  const leftW = 330;
  const rightW = contentW - leftW - 10; // 200 pt
  const rightX = leftX + leftW + 10;

  // 1. LEFT CARD: Payment Instructions / Remittance or Transaction Verification
  doc.roundedRect(leftX, boxY, leftW, boxH, 5).fillAndStroke("#ffffff", ADSKILL.cardBorder);

  // Header strip
  doc.rect(leftX, boxY, leftW, 17).fill("#f1f5f9");
  doc.roundedRect(leftX, boxY, leftW, boxH, 5).lineWidth(0.5).strokeColor(ADSKILL.cardBorder).stroke();

  if (isReceipt && paymentDetails) {
    doc.rect(leftX + 8, boxY + 5.5, 5, 5).fill(ADSKILL.successGreen);
    doc
      .fontSize(7)
      .font("Helvetica-Bold")
      .fillColor(ADSKILL.navyDark)
      .text("TRANSACTION AUDIT & SETTLEMENT PROOF", leftX + 17, boxY + 5);

    const rows = [
      { l: "PAYMENT METHOD", v: paymentDetails.method || "Electronic Transfer" },
      { l: "DATE PROCESSED", v: paymentDetails.date || formatDate(new Date()) },
      { l: "GATEWAY REF / ID", v: paymentDetails.reference || "N/A" },
      { l: "AUDITED & VERIFIED BY", v: paymentDetails.verifiedBy || "Authorized Financial Officer" },
    ];

    let ty = boxY + 23;
    rows.forEach(({ l, v }) => {
      doc.fontSize(6.5).font("Helvetica-Bold").fillColor(ADSKILL.textLight).text(l, leftX + 10, ty, { width: 100 });
      doc.fontSize(7.2).font("Helvetica-Bold").fillColor(ADSKILL.textDark).text(v, leftX + 115, ty, { width: leftW - 125 });
      ty += 14.5;
    });

    doc.fontSize(6.2).font("Helvetica").fillColor(ADSKILL.successGreen).text("✔ Funds successfully audited and credited toward retained case milestone.", leftX + 10, boxY + 83);
  } else {
    doc.rect(leftX + 8, boxY + 5.5, 5, 5).fill(ADSKILL.brandBlue);
    doc
      .fontSize(7)
      .font("Helvetica-Bold")
      .fillColor(ADSKILL.navyDark)
      .text("OFFICIAL PAYMENT REMITTANCE INSTRUCTIONS", leftX + 17, boxY + 5);

    doc
      .fontSize(7)
      .font("Helvetica-Bold")
      .fillColor(ADSKILL.textDark)
      .text("1. Online Client Portal (Instant Credit Card / ACH):", leftX + 10, boxY + 23);

    doc
      .fontSize(6.8)
      .font("Helvetica")
      .fillColor(ADSKILL.textMid)
      .text(`Log in at ${ADSKILL.website} and complete payment via Stripe gateway.`, leftX + 18, boxY + 32.5);

    doc
      .fontSize(7)
      .font("Helvetica-Bold")
      .fillColor(ADSKILL.textDark)
      .text("2. Bank Wire / Direct ACH Remittance:", leftX + 10, boxY + 46);

    doc
      .fontSize(6.8)
      .font("Helvetica")
      .fillColor(ADSKILL.textMid)
      .text(`Bank: JPMorgan Chase Bank N.A.  •  Routing: 021000021  •  Account: 8492019482\nBeneficiary: AdSkill Consultancy Inc.  (Specify Invoice Number in Wire Memo)`, leftX + 18, boxY + 55.5);

    doc
      .fontSize(6.5)
      .font("Helvetica")
      .fillColor(ADSKILL.accentGold)
      .text(`For billing queries or confirmation: ${ADSKILL.email}  |  ${ADSKILL.phone}`, leftX + 10, boxY + 83);
  }

  // 2. RIGHT CARD: Official Corporate Seal & Authorization Stamp
  doc.roundedRect(rightX, boxY, rightW, boxH, 5).fillAndStroke(ADSKILL.cardBg, ADSKILL.cardBorder);

  // Header strip
  doc.rect(rightX, boxY, rightW, 17).fill("#f1f5f9");
  doc.roundedRect(rightX, boxY, rightW, boxH, 5).lineWidth(0.5).strokeColor(ADSKILL.cardBorder).stroke();

  doc
    .fontSize(7)
    .font("Helvetica-Bold")
    .fillColor(ADSKILL.navyDark)
    .text("CORPORATE AUTHORIZATION & SEAL", rightX + 10, boxY + 5);

  // Corporate Seal Circle (center: rightX + 38, boxY + 56)
  const sealCx = rightX + 38;
  const sealCy = boxY + 56;
  const sealColor = isReceipt ? ADSKILL.successGreen : ADSKILL.brandColor;

  // Outer circle
  doc.circle(sealCx, sealCy, 26).lineWidth(1.1).strokeColor(sealColor).stroke();
  // Inner beaded circle
  doc.circle(sealCx, sealCy, 22).lineWidth(0.5).strokeColor(sealColor).stroke();

  // Seal inner text
  doc
    .fontSize(4.5)
    .font("Helvetica-Bold")
    .fillColor(sealColor)
    .text("ADSKILL", sealCx - 20, sealCy - 16, { width: 40, align: "center" })
    .text("CONSULTANCY INC.", sealCx - 20, sealCy - 10, { width: 40, align: "center" });

  doc
    .fontSize(5.5)
    .font("Helvetica-Bold")
    .fillColor(isReceipt ? ADSKILL.successGreenDark : ADSKILL.accentGold)
    .text(isReceipt ? "CLEARED" : "AUTHENTIC", sealCx - 20, sealCy - 1, { width: 40, align: "center" });

  doc
    .fontSize(4)
    .font("Helvetica")
    .fillColor(sealColor)
    .text("NEW YORK • USA", sealCx - 20, sealCy + 8, { width: 40, align: "center" });

  // Signature & Authorization text (Right of seal)
  const sigX = rightX + 74;

  // Stylized digital signature simulation
  doc.save();
  doc
    .lineWidth(1.1)
    .strokeColor(ADSKILL.brandBlue)
    .moveTo(sigX, boxY + 44)
    .bezierCurveTo(sigX + 16, boxY + 30, sigX + 28, boxY + 50, sigX + 46, boxY + 36)
    .bezierCurveTo(sigX + 58, boxY + 26, sigX + 70, boxY + 48, sigX + 90, boxY + 38)
    .stroke();
  doc.restore();

  // Signature line
  doc.moveTo(sigX, boxY + 58).lineTo(sigX + 96, boxY + 58).lineWidth(0.5).strokeColor(ADSKILL.lineColorDark).stroke();

  doc
    .fontSize(6.5)
    .font("Helvetica-Bold")
    .fillColor(ADSKILL.textDark)
    .text("Authorized Officer", sigX, boxY + 62);

  doc
    .fontSize(5.5)
    .font("Helvetica")
    .fillColor(ADSKILL.textLight)
    .text(`Certified: ${formatDate(new Date())}`, sigX, boxY + 72)
    .text(`Hash: ASK-885916`, sigX, boxY + 81);

  doc.y = boxY + boxH + 10;
}

// ─── Legal Disclaimer & Institutional Footer ─────────────────────────────────
export function drawDisclaimer(doc: InstanceType<typeof PDFDocument>) {
  const leftX = 36;
  const pageW = doc.page.width;
  const contentW = pageW - leftX * 2;

  // Fixed safe location guaranteed on page 1
  const boxY = 672;
  const boxH = 58;

  // Disclaimer box
  doc.roundedRect(leftX, boxY, contentW, boxH, 4).fillAndStroke("#f8fafc", ADSKILL.cardBorder);

  doc
    .fontSize(6.2)
    .font("Helvetica-Bold")
    .fillColor(ADSKILL.navyDark)
    .text("MANDATORY REGULATORY & FINANCIAL POLICY NOTICE", leftX + 8, boxY + 5);

  doc
    .fontSize(5.5)
    .font("Helvetica")
    .fillColor(ADSKILL.textMid)
    .text(ADSKILL.disclaimer, leftX + 8, boxY + 14.5, {
      width: contentW - 16,
      align: "justify",
      lineGap: 1.3,
    });

  // Bottom brand watermark
  doc
    .fontSize(6)
    .font("Helvetica")
    .fillColor(ADSKILL.textLight)
    .text(
      `${ADSKILL.legalName}   •   Official Accounting Document   •   Confidential   •   Page 1 of 1`,
      leftX,
      746,
      { width: contentW, align: "center" }
    );
}

// ─── Utility: Stream to Buffer ────────────────────────────────────────────────
export function streamToBuffer(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}
