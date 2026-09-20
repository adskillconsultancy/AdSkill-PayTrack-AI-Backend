-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('INTAKE', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');
CREATE TYPE "FinancialStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE');
CREATE TYPE "DocumentType" AS ENUM ('AGREEMENT', 'INVOICE', 'RECEIPT', 'PAYMENT_PROOF', 'IDENTITY', 'SUPPORTING', 'OTHER');
CREATE TYPE "DocumentScanStatus" AS ENUM ('PENDING', 'CLEAN', 'REJECTED');

CREATE TABLE "client_cases" (
  "id" TEXT NOT NULL,
  "caseCode" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "serviceCodeSnapshot" TEXT NOT NULL,
  "serviceNameSnapshot" TEXT NOT NULL,
  "serviceCategorySnapshot" "ServiceCategory" NOT NULL,
  "destinationCountry" TEXT,
  "caseCategory" TEXT,
  "caseSubcategory" TEXT,
  "assignedConsultantId" TEXT,
  "agreementDate" TIMESTAMP(3),
  "serviceStartDate" TIMESTAMP(3),
  "caseStatus" "CaseStatus" NOT NULL DEFAULT 'INTAKE',
  "financialStatus" "FinancialStatus" NOT NULL DEFAULT 'UNPAID',
  "clientVisibleNotes" TEXT,
  "internalNotes" TEXT,
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  "deletedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "client_cases_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "client_cases_caseCode_key" ON "client_cases"("caseCode");
CREATE INDEX "client_cases_userId_isDeleted_createdAt_idx" ON "client_cases"("userId", "isDeleted", "createdAt");
CREATE INDEX "client_cases_serviceId_idx" ON "client_cases"("serviceId");

CREATE TABLE "payment_plans" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "baseFeeSnapshot" DECIMAL(12,2) NOT NULL,
  "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  "discountReason" TEXT,
  "contractedFee" DECIMAL(12,2) NOT NULL,
  "depositAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  "scheduleType" TEXT NOT NULL,
  "paymentMethod" TEXT,
  "gracePeriodDays" INTEGER NOT NULL DEFAULT 0,
  "latePaymentPolicy" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_plans_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "payment_plans_caseId_isDeleted_idx" ON "payment_plans"("caseId", "isDeleted");

CREATE TABLE "installments" (
  "id" TEXT NOT NULL,
  "paymentPlanId" TEXT NOT NULL,
  "sequenceNumber" INTEGER NOT NULL,
  "title" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "installments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "installments_paymentPlanId_sequenceNumber_key" ON "installments"("paymentPlanId", "sequenceNumber");

CREATE TABLE "payments" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "installmentId" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL,
  "paymentDate" TIMESTAMP(3) NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paymentMethod" TEXT NOT NULL,
  "externalReference" TEXT,
  "stripePaymentIntentId" TEXT,
  "idempotencyKey" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "verifiedById" TEXT,
  "operationalNotes" TEXT,
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payments_idempotencyKey_key" ON "payments"("idempotencyKey");
CREATE INDEX "payments_caseId_isDeleted_paymentDate_idx" ON "payments"("caseId", "isDeleted", "paymentDate");

CREATE TABLE "documents" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "paymentId" TEXT,
  "documentType" "DocumentType" NOT NULL DEFAULT 'SUPPORTING',
  "objectKey" TEXT NOT NULL,
  "bucket" TEXT NOT NULL,
  "storedName" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "scanStatus" "DocumentScanStatus" NOT NULL DEFAULT 'PENDING',
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "documents_objectKey_key" ON "documents"("objectKey");
CREATE INDEX "documents_userId_caseId_isDeleted_idx" ON "documents"("userId", "caseId", "isDeleted");

CREATE TABLE "invoices" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ISSUED',
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");
CREATE INDEX "invoices_caseId_isDeleted_idx" ON "invoices"("caseId", "isDeleted");

CREATE TABLE "receipts" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "invoiceId" TEXT,
  "paymentId" TEXT,
  "receiptNumber" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "receipts_receiptNumber_key" ON "receipts"("receiptNumber");
CREATE INDEX "receipts_caseId_isDeleted_idx" ON "receipts"("caseId", "isDeleted");

CREATE TABLE "audit_logs" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "actorEmail" TEXT,
  "action" TEXT NOT NULL,
  "targetEntity" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "beforeValue" JSONB,
  "afterValue" JSONB,
  "reason" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_logs_targetEntity_targetId_createdAt_idx" ON "audit_logs"("targetEntity", "targetId", "createdAt");
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt");

ALTER TABLE "client_cases" ADD CONSTRAINT "client_cases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "client_cases" ADD CONSTRAINT "client_cases_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "client_cases" ADD CONSTRAINT "client_cases_assignedConsultantId_fkey" FOREIGN KEY ("assignedConsultantId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_plans" ADD CONSTRAINT "payment_plans_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "client_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "installments" ADD CONSTRAINT "installments_paymentPlanId_fkey" FOREIGN KEY ("paymentPlanId") REFERENCES "payment_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "client_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "installments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "client_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "client_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "client_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
