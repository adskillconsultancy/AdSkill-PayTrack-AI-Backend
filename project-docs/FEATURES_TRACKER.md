# AdSkill PayTrack AI — Master Feature & Role Tracker

> **Project Name:** AdSkill PayTrack AI (AI Client Payment Tracker)  
> **Client:** AdSkill Consultancy Inc.  
> **Tracker Purpose:** Live tracking of all features, roles, and specification deliverables.  
> **Status Legend:**  
> - ⏳ `[ ] Pending` (Awaiting implementation)  
> - 🔄 `[/] In Progress` (Currently under active development)  
> - ✅ `[x] Done` (Implemented, verified & tested)

---

## 🔐 Core Architecture & Registration Rule

| Rule / Governance Requirement | Status | Notes |
| :--- | :---: | :--- |
| **Default Registration:** All new users registering through the portal are automatically assigned the **`Client`** role by default. | ✅ `[x] Done` | Backend: Auto-assigned in `auth.service.ts` register. Frontend: Self-registration complete. |
| **Role Elevation Authority:** Only **`Super Admin`** has permission to view registered users and promote/update their role. | 🔄 `[/] In Progress` | Backend: `PATCH /users/:id` and `/roles` fully guarded. Frontend: Role settings UI pending. |
| **Least-Privilege PBAC & Overrides:** Dynamic permissions with individual user-level capability overrides. | 🔄 `[/] In Progress` | Backend: 100% complete (DB, middleware, API). Frontend: Sidebar complete; Management UI pending. |

---

## 🛡️ PBAC Capability & Dynamic Role Engine Status (Full Breakdown)

### 🖥️ Backend Implementation (`AdSkill PayTrack AI Backend`)
- [x] **Done** — **Database Schema**: `UserRole`, `Permission`, `RolePermission`, and `UserPermission` models in PostgreSQL with universal soft delete policy.
- [x] **Done** — **Canonical Seeding**: Seeded 22 granular capabilities across 7 modules (`USER`, `SERVICE`, `PLAN`, `PAYMENT`, `INVOICE`, `RECEIPT`, `REPORT`, `NOTE`).
- [x] **Done** — **PBAC Auth Middleware**: Dynamic verification of required capabilities (`auth(...)`) with universal bypass for `SUPER_ADMIN`.
- [x] **Done** — **User-Level Capability Overrides Engine**: Merges `RolePermissions` + `DirectUserPermissions` into unified `effectivePermissions`.
- [x] **Done** — **Role Management API**: `GET /api/v1/roles`, `POST /api/v1/roles`, `GET /api/v1/roles/:id`, `PATCH /api/v1/roles/:id/permissions`, `DELETE /api/v1/roles/:id`.
- [x] **Done** — **Permission Matrix API**: `GET /api/v1/roles/permissions/all` (grouped by module for admin checkbox grid).
- [x] **Done** — **User Direct Permissions API**: `GET /api/v1/users/:id/permissions` and `PATCH /api/v1/users/:id/permissions`.
- [x] **Done** — **DRY Pagination & Filter/Sort Engine**: Centralized `paginationHelper.ts` (DoS-protected limit capping 1-100, default 20) and `filterHelper.ts` (search, date range, whitelist sorting) strictly mandated for all list endpoints.
- [x] **Done** — **API Documentation**: Full OpenAPI 3.0 specification in `src/docs/swagger.ts`.

### 🎨 Frontend Implementation (`AdSkill PayTrack AI Frontend`)
- [x] **Done** — **Dynamic PBAC Sidebar (`Sidebar.tsx`)**: Replaced all hardcoded role strings with pure capability evaluation.
- [x] **Done** — **Capability Hook (`usePermissions.ts`)**: Provides `hasPermission()`, `hasAnyPermission()`, and `SUPER_ADMIN` universal access.
- [x] **Done** — **Live User State in Layout**: Header and footer display live user name, initials avatar, and dynamic role title.
- [ ] **Pending** — **Role & PBAC Management UI (`/settings/roles`)**: Dedicated page for Super Admin to view and create custom roles.
- [ ] **Pending** — **Permission Matrix Checkbox Grid Component**: Interactive UI grid allowing Super Admin to check/uncheck capabilities per role.
- [ ] **Pending** — **User Capability Override Modal**: Modal on Client/Staff profile allowing Super Admin to grant individual overrides (e.g. giving one client `payment:verify`).
- [ ] **Pending** — **RTK Query Role API Slice**: `src/services/api/roles/roleApi.ts` injecting endpoints for `/roles` and `/users/:id/permissions`.

---

# 1. Role-by-Role Feature Checklist ("What To Do")

---

### 👑 1.1 Super Admin ("What Super Admin Does")
*Scope: All clients, employees, roles, financial settings, approvals, reports, integrations, and audit logs.*

- [ ] **Pending** — **User & Employee Management:**
  - [ ] View list of all registered portal users (clients and staff).
  - [ ] Update / promote user roles (`Client` → `Manager`, `Consultant`, `Super Admin`).
  - [ ] Create, edit, and deactivate employee accounts.
  - [ ] Instant account deactivation when an employee departs.
  - [ ] Enforce Multi-Factor Authentication (MFA / TOTP) for all internal staff accounts.
- [ ] **Pending** — **Service Catalog & Fee Separation Settings:**
  - [ ] Manage service catalog offerings (EB-2 NIW, EB-1A, EB-3, E-2, L-1, Family Immigration, Business Formation, Consultation, DMV/PSB, Custom).
  - [ ] Configure fee categorization rules: strictly separate AdSkill professional fees from third-party fees (Attorney fees, USCIS government fees, Business plans, Evaluations, Translations, CPA licensing).
  - [ ] Define accounting rule: pass-through and third-party fees do not count as AdSkill revenue.
- [ ] **Pending** — **System Integrations & Financial Configurations:**
  - [ ] Configure Stripe payment keys, webhook signing secrets, and hosted checkout settings.
  - [ ] Configure transactional email providers (SendGrid, Postmark, AWS SES) and reminder templates.
  - [ ] Configure secure encrypted cloud storage for agreements and receipts.
  - [ ] Multi-currency configuration (USD base with exchange rate framework).
- [ ] **Pending** — **Immutable Audit Log Oversight:**
  - [ ] Full-system audit log viewer: view every create, update, delete, discount, refund, permission change, and login event.
  - [ ] Inspect event details: actor ID/email, timestamp, IP/device, entity ID, prior value, and new value.
  - [ ] Ensure audit logs are strictly append-only (cannot be modified or deleted by anyone).
- [ ] **Pending** — **AI Governance & Guardrails Oversight:**
  - [ ] Verify AI operates on server-side only with permission-aware retrieval filters.
  - [ ] Enforce strict AI guardrails: block autonomous fee/balance updates, block fake/hallucinated data, block legal/immigration outcome advice.

---

### 💼 1.2 Manager / Finance ("What Manager Does")
*Scope: Create plans, verify payments, issue invoices and receipts, send reminders, and view financial reports.*

- [ ] **Pending** — **Payment Plan Creation & Management:**
  - [ ] Build payment plans for clients: Fixed, recurring, or customized milestone schedules.
  - [ ] Capture original price, discount amount, mandatory discount reason, final fee, and deposit.
  - [ ] **Deterministic Math Validation:** Validate that $\sum \text{Installments} + \text{Deposit} == \text{Contracted Fee}$ before saving.
  - [ ] Allow authorized plan amendments with mandatory reason logging in audit log.
  - [ ] Confirmation prompt required before committing any material financial adjustment.
- [ ] **Pending** — **Payment Recording & Verification Workflow:**
  - [ ] Record offline/manual payments (Cash, Check, ACH, Card, Zelle, Wire transfer).
  - [ ] Verification state: Manual payment entries remain `Pending Verification` until Manager verifies and marks them `Paid`.
  - [ ] Upload and attach proof of payment (receipt, wire confirmation, check image).
  - [ ] Support complex payment scenarios: partial payments, overpayments, early payments, and single bulk payment split across installments.
  - [ ] Process adjustments, reversals, voids, and refunds with **mandatory written reason** (no hard-deletions allowed).
- [ ] **Pending** — **Invoices & Receipts Issuance:**
  - [ ] Generate branded PDF invoices and payment receipts with AdSkill logo, legal name, address, and client details.
  - [ ] Enforce unique sequential numbering policy (`INV-YYYY-XXXX`, `REC-YYYY-XXXX`).
  - [ ] Mark receipts `Paid` only after manual staff verification or verified Stripe webhook.
  - [ ] Allow staff to re-download or regenerate duplicate copies without altering historical ledger timestamps.
- [ ] **Pending** — **Payment Reminder Controls:**
  - [ ] Configure per-client reminder preferences (toggle automated reminders on/off).
  - [ ] Trigger manual email reminders to individual clients or batch reminders.
  - [ ] Automatic halt: Reminders must instantly stop once an installment or fee is paid.
- [ ] **Pending** — **Financial Dashboard & Reporting:**
  - [ ] Executive KPI cards: Active Clients, Total Contracted Fees, Total Collected, Total Outstanding Receivables, Overdue Receivables.
  - [ ] Receivables aging breakdown: Due Today, Due in 7 Days, Due in 30 Days, Overdue.
  - [ ] Revenue analytics: Monthly collection trends, revenue breakdown by service category, revenue by consultant.
  - [ ] Dynamic multi-attribute filtering (date range, service, staff, status, country, payment method, currency).
  - [ ] Export financial reports to CSV, Excel, and PDF.

---

### 📋 1.3 Consultant ("What Consultant Does")
*Scope: View assigned clients, payment status, and notes; no deletion, refund approval, or security administration.*

- [ ] **Pending** — **Assigned Client Directory:**
  - [ ] Search and view assigned clients and active immigration cases.
  - [ ] View client profile: full name, contact info, agreement date, service/case type, assigned consultant.
  - [ ] Access client-visible notes and view internal case notes.
- [ ] **Pending** — **Payment Compliance & Status Verification:**
  - [ ] Check client financial standing before performing key case actions (e.g. verify if deposit or milestone is cleared).
  - [ ] View installment payment statuses (`Paid`, `Due Today`, `Overdue`, `Scheduled`, `Partially Paid`).
  - [ ] View uploaded payment proofs and downloaded receipts.
- [ ] **Pending** — **Notes & Activity Logging:**
  - [ ] Add internal case notes regarding document progress, consultations, and follow-ups.
  - [ ] View client communication history and sent reminder logs.
- [ ] **Pending** — **Enforce Strict Consultant Boundaries:**
  - [ ] ❌ Cannot create or alter payment plans or financial schedules.
  - [ ] ❌ Cannot approve refunds, voids, write-offs, or verify manual transactions.
  - [ ] ❌ Cannot delete client profiles, financial records, or system audit entries.
  - [ ] ❌ Cannot access clients outside assigned portfolio (when scoped by admin policy).

---

### 👤 1.4 Client ("What Client Does — Client Portal")
*Scope: View only their own fees, schedules, payments, receipts, and secure payment options; cannot edit financial records.*

- [ ] **Pending** — **Client Self-Registration & Onboarding:**
  - [ ] Self-register with Name, Email, Phone/WhatsApp, Country, Service needed, and electronic consent.
  - [ ] Automatically assigned default `Client` role upon registration.
- [ ] **Pending** — **Client Dashboard Overview:**
  - [ ] View enrolled service name (e.g., EB-2 NIW, EB-1A, E-2).
  - [ ] View total contracted professional fee, total amount paid, and remaining balance.
  - [ ] View next upcoming payment amount and exact due date.
  - [ ] Account standing badge (`Current`, `Due Today`, `Overdue`, `Paid in Full`).
  - [ ] Prominent legal disclaimer: AdSkill professional fees cover consulting services and exclude third-party/government fees unless specified.
- [ ] **Pending** — **Installment Milestone Schedule:**
  - [ ] View full itemized schedule of past, current, and upcoming installments.
  - [ ] Real-time status indicators per milestone.
- [ ] **Pending** — **Online Payment Execution:**
  - [ ] One-click secure "Pay Now" button triggering PCI-compliant Stripe Checkout / Payment Links.
  - [ ] Hosted card / ACH payments (zero card data stored on AdSkill servers).
  - [ ] Offline payment guidelines (Cash, Wire, Zelle, Check) with file upload for payment proof.
- [ ] **Pending** — **Invoices & Receipts Downloads:**
  - [ ] On-demand download of branded PDF invoices and official receipts.
  - [ ] View transaction history with date, method, reference, and amount paid.
- [ ] **Pending** — **Preferences & Support:**
  - [ ] View profile contact info and communication preferences.
  - [ ] Access AdSkill billing support contact information.
- [ ] **Pending** — **Enforce Strict Client Boundaries:**
  - [ ] ❌ Cannot edit financial balances, fees, or due dates.
  - [ ] ❌ Cannot view any other client's records (strict cross-tenant isolation).
  - [ ] ❌ Cannot access internal staff notes or internal consultant assignments.

---

# 2. Detailed Technical & Specification Checklist (Sections 4 – 23)

---

### Section 4: Client Profile
- [ ] **Pending** — Automatically generated Client ID (e.g., `ASK-2026-0001`).
- [ ] **Pending** — Full legal name and preferred name.
- [ ] **Pending** — Email, phone, WhatsApp, address, country, preferred language, communication consent.
- [ ] **Pending** — Service/case type, assigned consultant, agreement date, service start date, case status, payment status.
- [ ] **Pending** — Uploaded agreement, invoices, receipts, payment proof, internal notes, client-visible notes, activity history.
- [ ] **Pending** — Automatic duplicate detection using email, phone/WhatsApp number, and matching names.
- [ ] **Pending** — Data minimization: Do not collect unnecessary immigration documents or sensitive identity data in MVP.

---

### Section 5: Services and Fee Separation
- [x] **Done** — Catalog of services: EB-2 NIW, EB-1A, EB-3, E-2, L-1, Family Immigration, Visa Assistance, Business Formation, Consultation, DMV/PSB, Custom (`src/modules/Service/`).
- [x] **Done** — Strict fee separation: `baseFee` (AdSkill professional fee) segregated from `estimatedGovFee` (USCIS), `estimatedAttorneyFee`, and `estimatedThirdPartyFee` (translations, evaluations, business plans).
- [x] **Done** — Actor traceability: `createdById` and `updatedById` linking to `User` table for full administrative accountability.
- [x] **Done** — Decimal(12, 2) fixed precision: zero floating-point arithmetic.
- [ ] **Pending** — Separate accounting for discounts, refunds, write-offs, and taxes (implemented in Payment Plan & Payment modules).
- [x] **Done** — Revenue recognition rule: Pass-through fees explicitly separated from company revenue calculations.

---

### Section 6: Payment Plan Creation
- [ ] **Pending** — Capture original price, discount & reason, final contracted fee, deposit, installment count, amount, due date, grace period, late-payment policy, payment method.
- [ ] **Pending** — Support fixed, recurring, and fully custom milestone schedules.
- [ ] **Pending** — Validate that installment totals equal contracted fee before saving.
- [ ] **Pending** — Allow authorized amendments while preserving original schedule in audit log.
- [ ] **Pending** — Require confirmation prompt before material financial changes.

---

### Section 7: Payment Records and Statuses
- [ ] **Pending** — Record schema: Payment ID, client, invoice number, amount, payment date, recorded date, method, transaction reference, applicable installment, verifier, proof, status, notes.
- [ ] **Pending** — Payment types: partial payments, early payments, overpayments, one payment across multiple installments, cash, check, ACH, card, Zelle, wire, refunds, discounts, reversals, failed payments, disputes.
- [ ] **Pending** — 11 Lifecycle statuses: `Draft`, `Scheduled`, `Upcoming`, `Due Today`, `Partially Paid`, `Paid`, `Overdue`, `Waived`, `Refunded`, `Disputed`, `Cancelled`.
- [ ] **Pending** — Never permanently delete a financial transaction; correct only via void, reversal, refund, or adjustment with mandatory written reason.

---

### Section 8: Financial Calculation Rules
- [ ] **Pending** — Balances calculated exclusively by deterministic accounting logic (NEVER generative AI).
- [ ] **Pending** — Deterministic calculation of contracted fee, paid amount, remaining balance, overdue amount, next amount/date, discounts, refunds, third-party fees, collected revenue, receivables.
- [ ] **Pending** — Store amounts as fixed decimal values or integer cents (no floating-point arithmetic).
- [ ] **Pending** — Base USD currency with multi-currency architecture (no combining currencies without exchange-rate conversion).
- [ ] **Pending** — Idempotency keys to prevent duplicate payment or webhook processing.

---

### Section 9: Management Dashboard and Reports
- [ ] **Pending** — Metrics: Active clients, contracted fees, collected amount, outstanding amount, overdue amount, due today, due in 7 days, due in 30 days, recent receipts, failed payments, accounts missing schedules.
- [ ] **Pending** — Visual analytics: Revenue by service, revenue by consultant, monthly collection trend.
- [ ] **Pending** — Multi-filters: Date, service, employee, status, country, payment method, currency.
- [ ] **Pending** — Report exports: CSV, Excel, PDF.

---

### Section 10: Client Dashboard
- [ ] **Pending** — Immediate summary: Service name, total professional fee, total paid, remaining balance, next payment amount, next due date, status badge.
- [ ] **Pending** — Complete milestone schedule and transaction history with downloadable invoices and receipts.
- [ ] **Pending** — Secure "Pay Now" button and AdSkill contact support information.
- [ ] **Pending** — Clear disclaimer that professional fees are separate from government/third-party fees.

---

### Section 11: Invoices and Receipts
- [ ] **Pending** — Branded PDF generator: AdSkill legal name, logo, address, contact details, unique number, client name/ID, service, fee breakdown, amount, date, method, remaining balance, next payment, disclaimer.
- [ ] **Pending** — Unique sequential numbering policy (`INV-YYYY-XXXX`, `REC-YYYY-XXXX`).
- [ ] **Pending** — Mark receipt `Paid` only after manual verification or payment-processor confirmation.
- [ ] **Pending** — Allow staff to re-download or regenerate duplicate copies without mutating ledger records.

---

### Section 12: Notifications
- [ ] **Pending** — Transactional email reminders on schedule:
  - 7 days before due date
  - 3 days before due date
  - On due date
  - 3 days overdue
  - 7 days overdue
  - 14 days overdue
- [ ] **Pending** — Per-client reminder controls and manual dispatch trigger.
- [ ] **Pending** — Automatic stop/adjustment immediately upon payment confirmation.
- [ ] **Pending** — Outbound message audit log (recipient, timestamp, template, delivery status).
- [ ] **Pending** — Security: Never include sensitive payment credentials in emails; direct client to secure portal.

---

### Section 13: Payment Processing
- [ ] **Pending** — Stripe Checkout / Payment Links integration (PCI-compliant).
- [ ] **Pending** — Zero card storage: Never store card numbers, CVV, or banking credentials on local servers.
- [ ] **Pending** — Webhook signature verification (`stripe-signature`) and idempotency duplicate prevention.
- [ ] **Pending** — Automatic reflection of successful, failed, refunded, reversed, and disputed transactions.
- [ ] **Pending** — Manual payment entries (cash, check, wire, Zelle) remain `Pending` until verified.

---

### Section 14: AI Functions and Boundaries
- [ ] **Pending** — Allowed AI tools: Permission-aware search, schedule explanations, reminder drafting, approved-template translation, overdue summaries, anomaly flags, staff follow-up summaries.
- [ ] **Pending** — AI fact retrieval: Retrieve financial facts exclusively from database with internal record citation.
- [ ] **Pending** — **Strict Boundary 1:** AI must never invent clients, dates, balances, amounts, payment status, or transactions.
- [ ] **Pending** — **Strict Boundary 2:** AI must never autonomously change fees, balances, schedules, payments, refunds, or permissions.
- [ ] **Pending** — **Strict Boundary 3:** AI must not provide legal advice or predict immigration outcomes.
- [ ] **Pending** — **Strict Boundary 4:** Outbound AI messages require human staff review unless using locked pre-approved templates.

---

### Section 15: Security and Confidentiality
- [ ] **Pending** — Multi-Factor Authentication (MFA / TOTP) required for staff.
- [ ] **Pending** — Secure password hashing (Argon2id or bcrypt) and rate-limiting on login attempts.
- [ ] **Pending** — Encryption in transit (TLS 1.3) and encryption at rest for database and documents.
- [ ] **Pending** — Multi-tenant isolation: A client must never be able to view another client's account via URL or API tampering.
- [ ] **Pending** — Daily encrypted backups and tested restoration procedures.
- [ ] **Pending** — Prompt access deactivation upon employee departure.

---

### Section 16: Privacy Controls
- [ ] **Pending** — Privacy notice, terms of use, payment authorization, and communication consent.
- [ ] **Pending** — Data correction, export, and account deactivation processes.
- [ ] **Pending** — Restrict employee access by assigned role.
- [ ] **Pending** — Minimize collected data and redact sensitive data from logs.

---

### Section 17: Audit Log
- [ ] **Pending** — Record creation/modification of clients, fees, schedules, payments, discounts, refunds, invoices, receipts, permissions, security settings.
- [ ] **Pending** — Store actor ID, timestamp, prior value, new value, reason, IP/device.
- [ ] **Pending** — Append-only immutability: No user can edit or delete audit history.

---

### Section 18: Search, Design, and Accessibility
- [ ] **Pending** — Search by client name/ID, email, phone, service, invoice, receipt, transaction reference, status, consultant.
- [ ] **Pending** — Responsive mobile, tablet, and desktop layouts with AdSkill branding.
- [ ] **Pending** — Explicit dates (`September 15, 2026`) and currency indicators (`$ USD`).
- [ ] **Pending** — Internationalization architecture (English, Bangla, Portuguese, Spanish).

---

### Section 22: Required Testing Suite
- [ ] **Pending** — Financial math tests: installment sums, partial payments, overpayments, discounts, refunds, currency decimal calculations, webhook idempotency.
- [ ] **Pending** — Security & isolation tests: client-to-client data isolation, RBAC enforcement, MFA, password reset.
- [ ] **Pending** — Integration tests: Stripe webhooks, email delivery, PDF layout, mobile/desktop UI.

---

### Section 23: Production Acceptance Criteria
- [ ] **Pending** — Staff can create a client and a complete, mathematically verified schedule.
- [ ] **Pending** — Paid and remaining amounts compute deterministically and update accurately through partial payments and adjustments.
- [ ] **Pending** — Clients securely view only their own records.
- [ ] **Pending** — Online Stripe payments and verified manual payments update records once and only once.
- [ ] **Pending** — Invoices and receipts generate with accurate data, unique sequential numbers, and company branding.
- [ ] **Pending** — Reminders work as approved and halt immediately upon payment.
- [ ] **Pending** — Every financial modification is logged in the audit trail with before/after values and mandatory reason.
- [x] **Completed** — Universal Soft-Delete Policy: All database tables implement `isDeleted` and `deletedAt`. Records are never physically deleted.
- [ ] **Pending** — Backups restore successfully in staging.

---
*Tracker maintained live in `project-docs/FEATURES_TRACKER.md`.*
