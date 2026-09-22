import prisma from "../../lib/prisma";
import { ISearchResponse, ISearchResultItem } from "./search.interface";

const omniSearch = async (
  searchTerm: string,
  actorUserId?: string,
  userRole?: string,
): Promise<ISearchResponse> => {
  if (!searchTerm || !searchTerm.trim() || !actorUserId) {
    return {
      clients: [],
      cases: [],
      payments: [],
      invoices: [],
      receipts: [],
      totalMatches: 0,
    };
  }

  const term = searchTerm.trim();
  // Least-privilege: anyone who is not verified staff is treated as CLIENT
  const isStaff = userRole === "SUPER_ADMIN" || userRole === "MANAGER";
  const isConsultant = userRole === "CONSULTANT";
  const isClient = !isStaff && !isConsultant;

  const [users, cases, payments, invoices, receipts] = await Promise.all([
    // 1. Clients / Users (Staff only; Consultant restricted to assigned cases; Clients NEVER get user list)
    isClient
      ? Promise.resolve([])
      : prisma.user.findMany({
          where: {
            isDeleted: false,
            OR: [
              { name: { contains: term, mode: "insensitive" } },
              { preferredName: { contains: term, mode: "insensitive" } },
              { email: { contains: term, mode: "insensitive" } },
              { phone: { contains: term, mode: "insensitive" } },
              { whatsapp: { contains: term, mode: "insensitive" } },
              { clientId: { contains: term, mode: "insensitive" } },
            ],
            ...(isConsultant
              ? {
                  clientCases: {
                    some: { assignedConsultantId: actorUserId, isDeleted: false },
                  },
                }
              : {}),
          },
          take: 8,
          select: {
            id: true,
            name: true,
            preferredName: true,
            email: true,
            phone: true,
            clientId: true,
            status: true,
            country: true,
            role: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        }),

    // 2. Client Cases
    prisma.clientCase.findMany({
      where: {
        isDeleted: false,
        ...(isClient ? { userId: actorUserId } : {}),
        ...(isConsultant ? { assignedConsultantId: actorUserId } : {}),
        OR: [
          { caseCode: { contains: term, mode: "insensitive" } },
          { serviceNameSnapshot: { contains: term, mode: "insensitive" } },
          { serviceCodeSnapshot: { contains: term, mode: "insensitive" } },
          { destinationCountry: { contains: term, mode: "insensitive" } },
          { caseCategory: { contains: term, mode: "insensitive" } },
          { user: { name: { contains: term, mode: "insensitive" } } },
          { user: { email: { contains: term, mode: "insensitive" } } },
          { user: { clientId: { contains: term, mode: "insensitive" } } },
          { user: { phone: { contains: term, mode: "insensitive" } } },
          { assignedConsultant: { name: { contains: term, mode: "insensitive" } } },
        ],
      },
      take: 8,
      include: {
        user: { select: { id: true, name: true, clientId: true, email: true, phone: true } },
        assignedConsultant: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),

    // 3. Payments & Transactions
    prisma.payment.findMany({
      where: {
        isDeleted: false,
        ...(isClient ? { case: { userId: actorUserId } } : {}),
        ...(isConsultant ? { case: { assignedConsultantId: actorUserId } } : {}),
        OR: [
          { externalReference: { contains: term, mode: "insensitive" } },
          { operationalNotes: { contains: term, mode: "insensitive" } },
          { paymentMethod: { contains: term, mode: "insensitive" } },
          { case: { caseCode: { contains: term, mode: "insensitive" } } },
          { case: { serviceNameSnapshot: { contains: term, mode: "insensitive" } } },
          { case: { user: { name: { contains: term, mode: "insensitive" } } } },
          { case: { user: { clientId: { contains: term, mode: "insensitive" } } } },
          { case: { user: { email: { contains: term, mode: "insensitive" } } } },
          { case: { user: { phone: { contains: term, mode: "insensitive" } } } },
          { case: { assignedConsultant: { name: { contains: term, mode: "insensitive" } } } },
          { receipts: { some: { receiptNumber: { contains: term, mode: "insensitive" } } } },
          { case: { invoices: { some: { invoiceNumber: { contains: term, mode: "insensitive" } } } } },
        ],
      },
      take: 8,
      include: {
        case: {
          select: {
            id: true,
            caseCode: true,
            serviceNameSnapshot: true,
            user: { select: { id: true, name: true, clientId: true, email: true, phone: true } },
            assignedConsultant: { select: { name: true } },
          },
        },
        receipts: { select: { receiptNumber: true } },
      },
      orderBy: { paymentDate: "desc" },
    }),

    // 4. Invoices
    prisma.invoice.findMany({
      where: {
        isDeleted: false,
        ...(isClient ? { case: { userId: actorUserId } } : {}),
        ...(isConsultant ? { case: { assignedConsultantId: actorUserId } } : {}),
        OR: [
          { invoiceNumber: { contains: term, mode: "insensitive" } },
          { status: { contains: term, mode: "insensitive" } },
          { case: { caseCode: { contains: term, mode: "insensitive" } } },
          { case: { serviceNameSnapshot: { contains: term, mode: "insensitive" } } },
          { case: { user: { name: { contains: term, mode: "insensitive" } } } },
          { case: { user: { clientId: { contains: term, mode: "insensitive" } } } },
          { case: { user: { email: { contains: term, mode: "insensitive" } } } },
          { case: { user: { phone: { contains: term, mode: "insensitive" } } } },
          { case: { assignedConsultant: { name: { contains: term, mode: "insensitive" } } } },
        ],
      },
      take: 8,
      include: {
        case: {
          select: {
            id: true,
            caseCode: true,
            serviceNameSnapshot: true,
            user: { select: { id: true, name: true, clientId: true, email: true, phone: true } },
            assignedConsultant: { select: { name: true } },
          },
        },
      },
      orderBy: { issuedAt: "desc" },
    }),

    // 5. Receipts
    prisma.receipt.findMany({
      where: {
        isDeleted: false,
        ...(isClient ? { case: { userId: actorUserId } } : {}),
        ...(isConsultant ? { case: { assignedConsultantId: actorUserId } } : {}),
        OR: [
          { receiptNumber: { contains: term, mode: "insensitive" } },
          { status: { contains: term, mode: "insensitive" } },
          { payment: { externalReference: { contains: term, mode: "insensitive" } } },
          { case: { caseCode: { contains: term, mode: "insensitive" } } },
          { case: { serviceNameSnapshot: { contains: term, mode: "insensitive" } } },
          { case: { user: { name: { contains: term, mode: "insensitive" } } } },
          { case: { user: { clientId: { contains: term, mode: "insensitive" } } } },
          { case: { user: { email: { contains: term, mode: "insensitive" } } } },
          { case: { user: { phone: { contains: term, mode: "insensitive" } } } },
          { case: { assignedConsultant: { name: { contains: term, mode: "insensitive" } } } },
        ],
      },
      take: 8,
      include: {
        case: {
          select: {
            id: true,
            caseCode: true,
            serviceNameSnapshot: true,
            user: { select: { id: true, name: true, clientId: true, email: true, phone: true } },
            assignedConsultant: { select: { name: true } },
          },
        },
        payment: { select: { externalReference: true, paymentMethod: true } },
      },
      orderBy: { issuedAt: "desc" },
    }),
  ]);

  // Format Clients into ISearchResultItem
  const clientItems: ISearchResultItem[] = users.map((u) => ({
    id: u.id,
    type: "client",
    title: u.name,
    subtitle: `${u.clientId || "No Client ID"} · ${u.email}`,
    badge: u.role?.name || "Client",
    status: u.status,
    url: `/users/${u.id}`,
    details: {
      email: u.email,
      phone: u.phone || undefined,
      clientId: u.clientId || undefined,
    },
  }));

  // Format Cases into ISearchResultItem
  const caseItems: ISearchResultItem[] = cases.map((c) => ({
    id: c.id,
    type: "case",
    title: `${c.user?.name || "Client"} — ${c.serviceNameSnapshot || c.caseCategory}`,
    subtitle: `Case: ${c.caseCode} · ${c.destinationCountry || "Global"}`,
    badge: c.caseStatus,
    status: c.caseStatus,
    url: `/clients/${c.id}`,
    details: {
      caseCode: c.caseCode,
      serviceName: c.serviceNameSnapshot,
      email: c.user?.email,
      phone: c.user?.phone || undefined,
      clientId: c.user?.clientId || undefined,
      consultantName: c.assignedConsultant?.name,
    },
  }));

  // Format Payments into ISearchResultItem
  const paymentItems: ISearchResultItem[] = payments.map((p) => ({
    id: p.id,
    type: "payment",
    title: `${p.case?.user?.name || "Client"} · ${p.paymentMethod}`,
    subtitle: `Ref: ${p.externalReference || "N/A"} · Case: ${p.case?.caseCode || "N/A"}`,
    badge: p.status,
    status: p.status,
    amount: p.amount.toString(),
    currency: p.currency,
    date: p.paymentDate.toISOString(),
    url: `/payments/${p.id}`,
    details: {
      caseCode: p.case?.caseCode,
      serviceName: p.case?.serviceNameSnapshot,
      transactionRef: p.externalReference || undefined,
      receiptNumber: p.receipts?.[0]?.receiptNumber,
      consultantName: p.case?.assignedConsultant?.name,
    },
  }));

  // Format Invoices into ISearchResultItem
  const invoiceItems: ISearchResultItem[] = invoices.map((inv) => ({
    id: inv.id,
    type: "invoice",
    title: inv.invoiceNumber,
    subtitle: `${inv.case?.user?.name || "Client"} · Case: ${inv.case?.caseCode || "N/A"}`,
    badge: inv.status,
    status: inv.status,
    amount: inv.amount.toString(),
    currency: inv.currency,
    date: inv.issuedAt.toISOString(),
    url: `/invoices-receipts?caseId=${inv.caseId}&tab=invoices`,
    details: {
      invoiceNumber: inv.invoiceNumber,
      caseCode: inv.case?.caseCode,
      serviceName: inv.case?.serviceNameSnapshot,
      email: inv.case?.user?.email,
      clientId: inv.case?.user?.clientId || undefined,
      consultantName: inv.case?.assignedConsultant?.name,
    },
  }));

  // Format Receipts into ISearchResultItem
  const receiptItems: ISearchResultItem[] = receipts.map((rct) => ({
    id: rct.id,
    type: "receipt",
    title: rct.receiptNumber,
    subtitle: `${rct.case?.user?.name || "Client"} · Case: ${rct.case?.caseCode || "N/A"}`,
    badge: rct.status,
    status: rct.status,
    amount: rct.amount.toString(),
    currency: rct.currency,
    date: rct.issuedAt.toISOString(),
    url: `/invoices-receipts?caseId=${rct.caseId}&tab=receipts`,
    details: {
      receiptNumber: rct.receiptNumber,
      caseCode: rct.case?.caseCode,
      serviceName: rct.case?.serviceNameSnapshot,
      transactionRef: rct.payment?.externalReference || undefined,
      email: rct.case?.user?.email,
      clientId: rct.case?.user?.clientId || undefined,
      consultantName: rct.case?.assignedConsultant?.name,
    },
  }));

  return {
    clients: clientItems,
    cases: caseItems,
    payments: paymentItems,
    invoices: invoiceItems,
    receipts: receiptItems,
    totalMatches:
      clientItems.length +
      caseItems.length +
      paymentItems.length +
      invoiceItems.length +
      receiptItems.length,
  };
};

export const SearchService = {
  omniSearch,
};
