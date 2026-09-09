# AdSkill PayTrack AI — Complete Development Specification & System Architecture

> **Document Status:** Active Master Specification  
> **Prepared For:** AdSkill Consultancy Inc.  
> **Working Product Name:** AdSkill PayTrack AI  
> **Recommended Web Address:** `portal.[ADSKILL DOMAIN]` (Staging: `staging-portal.[ADSKILL DOMAIN]`)  
> **Initial Release:** Secure Payment Tracking, Accounting Engine & Client Portal  
> **Document Date:** September 2, 2026 (Internal Development & Approved Vendors)  
> **Confidentiality:** CONFIDENTIAL — For Internal Development and Approved Vendors Only

---

## TABLE OF CONTENTS
1. [Role-Based Feature Matrix (Features Separated by Role)](#1-role-based-feature-matrix-features-separated-by-role)
   - [1.1 Client (Client Portal)](#11-client-client-portal)
   - [1.2 Finance / Manager](#12-finance--manager)
   - [1.3 Case Manager / Consultant](#13-case-manager--consultant)
   - [1.4 Super Administrator](#14-super-administrator)
2. [Complete Project Specification (26 Document Sections)](#2-complete-project-specification-26-document-sections)
   - [Section 1: Executive Direction](#section-1-executive-direction)
   - [Section 2: Domain, Hosting, and Ownership](#section-2-domain-hosting-and-ownership)
   - [Section 3: Roles and Permissions](#section-3-roles-and-permissions)
   - [Section 4: Client Profile](#section-4-client-profile)
   - [Section 5: Services and Fee Separation](#section-5-services-and-fee-separation)
   - [Section 6: Payment Plan Creation](#section-6-payment-plan-creation)
   - [Section 7: Payment Records and Statuses](#section-7-payment-records-and-statuses)
   - [Section 8: Financial Calculation Rules](#section-8-financial-calculation-rules)
   - [Section 9: Management Dashboard and Reports](#section-9-management-dashboard-and-reports)
   - [Section 10: Client Dashboard](#section-10-client-dashboard)
   - [Section 11: Invoices and Receipts](#section-11-invoices-and-receipts)
   - [Section 12: Notifications](#section-12-notifications)
   - [Section 13: Payment Processing](#section-13-payment-processing)
   - [Section 14: AI Functions and Boundaries (Strict Guardrails)](#section-14-ai-functions-and-boundaries-strict-guardrails)
   - [Section 15: Security and Confidentiality](#section-15-security-and-confidentiality)
   - [Section 16: Privacy Controls](#section-16-privacy-controls)
   - [Section 17: Audit Log](#section-17-audit-log)
   - [Section 18: Search, Design, and Accessibility](#section-18-search-design-and-accessibility)
   - [Section 19: Suggested Technical Architecture](#section-19-suggested-technical-architecture)
   - [Section 20: MVP Deliverables](#section-20-mvp-deliverables)
   - [Section 21: Future Phases](#section-21-future-phases)
   - [Section 22: Required Testing](#section-22-required-testing)
   - [Section 23: Production Acceptance Criteria](#section-23-production-acceptance-criteria)
   - [Section 24: Handover Requirements](#section-24-handover-requirements)
   - [Section 25: Development Process](#section-25-development-process)
   - [Section 26: Contract and Governance](#section-26-contract-and-governance)
3. [Execution Roadmap: What To Do Next](#3-execution-roadmap-what-to-do-next)

---

# 1. Role-Based Feature Matrix (Features Separated by Role)

The platform operates on **4 canonical roles** with least-privilege role-based access control (RBAC). Shared staff logins are strictly prohibited.

### 🔐 User Registration & Role Assignment Workflow
1. **Default Registration (All Users Register as Client):**  
   Whenever a user signs up or self-registers through the application, their role is automatically and strictly set to **`Client`** by default. Public users cannot self-select or register into staff, manager, or admin roles.
2. **Role Promotion & Management (Super Admin Exclusive):**  
   Only a **Super Admin** has the authority to view registered users and update/promote their role to **Manager**, **Consultant**, or another **Super Admin**.
3. **Phased Evolution:**  
   The capabilities listed below represent the **Initial Core Features** for MVP. Additional features (e.g., immigration document checklists, attorney collaboration, advanced CRM) will be added in subsequent phases.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                    ACCESS HIERARCHY                                    │
├──────────────────────────┬──────────────────────────┬──────────────────────────────────┤
│ SUPER ADMIN              │ MANAGER                  │ CONSULTANT                       │
│ Full system, roles,      │ Invoices, plans, verify, │ View assigned clients, notes,    │
│ audits, integrations     │ receipts, money reports  │ payment status only              │
└──────────────────────────┴──────────────────────────┴──────────────────────────────────┘
                                        ▲
                                        │ (Promoted by Super Admin ONLY)
┌───────────────────────────────────────┴────────────────────────────────────────────────┐
│ CLIENT (DEFAULT ON REGISTRATION)                                                       │
│ Private portal: View own fees, installments, payment receipts, pay via Stripe link/card │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 1.1 Client (Initial Core Features)
* **Initial Core Scope:** *View only their own fees, schedules, payments, receipts, and secure payment options; cannot edit financial records.*
  - View enrolled service name (e.g., EB-2 NIW, EB-1A, E-2, etc.).
  - Total contracted professional fee, total amount paid, and remaining outstanding balance.
  - Next upcoming payment amount and exact due date.
  - Current account status badge (`Current`, `Due Today`, `Overdue`, `Paid in Full`).
  - Plain disclaimer statement clarifying that AdSkill professional fees are separate from government/third-party fees unless explicitly noted.
- **Installment Schedule & Milestones:**
  - Full itemized schedule of all installments (Past, Due, Upcoming).
  - Status indicator per installment (`Paid`, `Due Today`, `Overdue`, `Scheduled`, `Partially Paid`).
- **Payment Execution:**
  - One-click secure online payment button powered by Stripe Checkout / Payment Links (PCI-compliant).
  - Support for card/ACH payments through hosted pages (no credit card numbers stored on AdSkill servers).
  - Instructions for offline methods (Cash, Check, Wire, Zelle) with upload tool for proof of payment.
- **Invoices & Receipts:**
  - On-demand download of branded PDF invoices and official payment receipts.
  - Transaction history view with date, payment method, reference, and amount.
- **Communication & Profile Preferences:**
  - View contact details on record (Name, Email, WhatsApp, Phone).
  - Notification preferences (Email reminder opt-ins, preferred language).
  - Direct AdSkill support contact information.
- **Strict Client Boundaries:**
  - ❌ Cannot edit financial balances, fees, or due dates.
  - ❌ Cannot view any other client's records (enforced at database, API, and route levels).
  - ❌ Cannot access internal staff notes or consultant assignments.

---

### 1.2 Manager (Initial Core Features)
* **Initial Core Scope:** *Create plans, verify payments, issue invoices and receipts, send reminders, and view financial reports.*

- **Payment Plan Creation & Management:**
  - Create fixed, recurring, or customized milestone installment schedules for clients.
  - Capture original fee, discount amount & rationale, final contracted fee, and deposit.
  - Automatic mathematical validation: Total installments **must equal** total contracted fee before saving.
  - Support amendments to payment plans with mandatory reason logging in audit trail.
- **Transaction Processing & Verification:**
  - Record manual payments (Cash, Check, ACH, Card, Zelle, Wire transfer).
  - Verification workflow: Manual payments remain `Pending` until Finance/Manager verifies and marks them `Paid`.
  - Handle partial payments, overpayments, early payments, and single payments split across multiple installments.
  - Void, reverse, adjust, or refund transactions with **mandatory written reason** (financial records are never hard-deleted).
- **Invoices & Receipts Issuance:**
  - Generate sequential branded PDF invoices and payment receipts with unique numbering.
  - Re-issue / regenerate duplicate copies of receipts without altering the underlying ledger record.
- **Reminder & Notification Controls:**
  - Trigger manual email reminders to individual clients or batches.
  - Configure per-client reminder schedules and adjust/halt automated reminders when payment is confirmed.
- **Financial Dashboard & Reporting:**
  - Track total contracted fees, collected revenue, outstanding receivables, overdue balances.
  - View receivables categorized by aging: `Due Today`, `Due in 7 Days`, `Due in 30 Days`, `Overdue`.
  - Monthly collection trends, revenue breakdown by service, and revenue by consultant.
  - Filter by date range, service type, consultant, payment method, country, currency, and status.
  - Export financial reports to CSV, Excel, and PDF.
- **Strict Manager Boundaries:**
  - ❌ Cannot delete audit log history.
  - ❌ Cannot manage employee user accounts, system roles, or API integrations (reserved for Super Admin).

---

### 1.3 Consultant (Initial Core Features)
* **Initial Core Scope:** *View assigned clients, payment status, and notes; no deletion, refund approval, or security administration.*

- **Assigned Client Directory:**
  - Search and view assigned clients and active immigration/service cases.
  - View client profile details, agreement dates, assigned case status, and overall payment status.
  - Access client-visible notes and view internal case notes.
- **Payment Compliance Visibility:**
  - Check whether a client is current, overdue, or has missing schedules.
  - Verify if an installment has been paid before proceeding with key case milestones.
  - View uploaded payment proofs and receipts.
- **Notes & Activity Tracking:**
  - Add internal notes regarding client communications, follow-ups, and document submissions.
  - View communication logs and sent reminder history.
- **Strict Consultant Boundaries:**
  - ❌ Cannot create or alter payment plans or financial schedules.
  - ❌ Cannot approve refunds, voids, write-offs, or manual transaction verifications.
  - ❌ Cannot delete client profiles, financial records, or system audit entries.
  - ❌ Cannot access clients not assigned to them (if scoped by administrative policy).

---

### 1.4 Super Admin (Initial Core Features)
* **Initial Core Scope:** *All clients, employees, roles, financial settings, approvals, reports, integrations, and audit logs.*

- **User & Role Management:**
  - View all registered users (all new registrations default to `Client`).
  - Update and promote user roles (elevate `Client` → `Manager`, `Consultant`, or `Super Admin`).
  - Create, edit, and deactivate employee accounts.
  - Role-based permissions assignment and multi-factor authentication (MFA) enforcement.
  - Instant account deactivation when staff leaves the company.
- **Service & Catalog Configuration:**
  - Manage service offerings (e.g., EB-2 NIW, EB-1A, EB-3, E-2, L-1, Family Immigration, Visa Assistance, Business Formation, Consultation, DMV/PSB services, Custom Services).
  - Configure service base fees, fee categories, and strict separation between AdSkill professional fees and third-party/government fees.
- **System Integrations & Settings:**
  - Configure Stripe payment integration, API keys, webhook signing secrets, and hosted checkout preferences.
  - Configure transactional email providers (SendGrid, Postmark, AWS SES), SMS/WhatsApp gateways, and email reminder templates.
  - Configure cloud storage (encrypted object store) for agreements and receipts.
  - Currency management (primary USD, with multi-currency conversion frameworks).
- **Audit Log & Security Oversight:**
  - Complete immutable audit log viewer: Every creation, modification, discount, refund, permission update, login attempt, and sensitive data view with actor, timestamp, IP/device, and before/after values.
  - Access control reviews, rate-limiting monitoring, and security alerts.
  - Database backup verification and disaster recovery controls.
- **AI Configuration & Guardrail Enforcement:**
  - Monitor AI usage, verify permission-aware retrieval filters, and review AI audit traces.
  - Enforce strict AI guardrails (block autonomous financial adjustments, block legal/immigration advice generation).

---

# 2. Complete Project Specification (26 Document Sections)

---

### Section 1: Executive Direction
- **Core Purpose:** Develop a company-owned platform that gives AdSkill staff one reliable source of truth for each client's financial account and gives each client a private view of only their own records.
- **MVP Priority:**
  - Accurate deterministic accounting logic.
  - Strong role-based access control.
  - Payment schedules and milestone tracking.
  - Branded invoices and payment receipts.
  - Automated & manual reminders.
  - Comprehensive auditability.
- **Future Direction:** Immigration case stages, document checklists, appointments, staff tasks, secure messaging, and attorney collaboration (expansion into full AdSkill CRM).
- **Critical Philosophy on AI:** AI may explain and summarize verified records, but it must **never invent or independently change financial data**.
- **Deployment Recommendation:** Use the existing AdSkill domain with a subdomain such as `portal.[ADSKILL DOMAIN]`. The main website remains unchanged. Developer needs controlled DNS access only for required records. No transferring of domains, nameserver changes, or sole ownership of company assets.

---

### Section 2: Domain, Hosting, and Ownership
- **Environments:**
  - **Production:** `portal.[ADSKILL DOMAIN]` (or payment-only alternative: `payments.[ADSKILL DOMAIN]`).
  - **Staging:** `staging-portal.[ADSKILL DOMAIN]`, protected by basic auth / IP restriction from public access and search indexing.
  - **Development:** Local environments with test databases and test-mode payment keys.
- **Security & Ownership Requirements:**
  - Force HTTPS with automatically renewing SSL certificates (e.g., Let's Encrypt / AWS ACM / Cloudflare).
  - Source code must reside in a private Git repository owned and controlled by AdSkill.
  - Domain, hosting, database, email, payment (Stripe), file storage, and AI accounts must be owned or directly controlled by AdSkill.
  - **Anti-Lockout Rule:** No external developer may remain the sole administrator of an essential service or credential.

---

### Section 3: Roles and Permissions (PBAC Architecture)
The platform enforces strict least-privilege access using **Permission-Based Access Control (PBAC)**. Routes and endpoints do not check hardcoded role names; instead, they check granular permissions granted to roles via the database. Shared staff logins are strictly prohibited.

#### 📌 Registration & Role Update Governance
- **Default Registration Status:** All new users registering through the portal are automatically assigned the **`Client`** role. Public signups can never choose or grant themselves staff or management roles.
- **Role Elevation Authority:** Only a **`Super Admin`** (possessing the `user:manage-role` permission) has permission to modify, promote, or assign roles to users (promoting a Client to `Manager`, `Consultant`, or `Super Admin`).

#### 🛡️ PBAC Architecture Principles
1. **Dynamic Permissions:** Capabilities are defined in the `permissions` table and mapped to roles in `role_permissions`.
2. **Super Admin Universal Access:** Users with the `SUPER_ADMIN` role automatically possess all permissions across all modules by system design.
3. **Decoupled Route Protection:** Route guards check required permission keys (e.g. `auth('user:read')`), allowing Super Admins to create new custom roles in the database and assign permissions without backend code modifications.
4. **Universal Soft-Delete:** Both `permissions` and `role_permissions` tables adhere to the platform-wide soft delete policy (`isDeleted`, `deletedAt`).

#### 📋 Canonical Permission Matrix

| Module | Permission Key | Description | Super Admin | Manager | Consultant | Client |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **User** | `user:read` | View user profiles and directory | ✅ | ✅ | ✅ | ✅ *(own)* |
| **User** | `user:create` | Create staff or client accounts | ✅ | ✅ | ❌ | ❌ |
| **User** | `user:update` | Update user details | ✅ | ✅ | ❌ | ❌ |
| **User** | `user:delete` | Soft delete user accounts | ✅ | ❌ | ❌ | ❌ |
| **User** | `user:manage-role` | Change / elevate user roles | ✅ | ❌ | ❌ | ❌ |
| **Service** | `service:read` | View service catalog & base fees | ✅ | ✅ | ✅ | ❌ |
| **Service** | `service:manage` | Create & configure services | ✅ | ❌ | ❌ | ❌ |
| **Plan** | `plan:read` | View contracted payment plans | ✅ | ✅ | ✅ | ✅ *(own)* |
| **Plan** | `plan:create` | Create payment plans & installments | ✅ | ✅ | ❌ | ❌ |
| **Plan** | `plan:update` | Amend payment plans & milestones | ✅ | ✅ | ❌ | ❌ |
| **Plan** | `plan:delete` | Cancel or soft delete payment plans | ✅ | ❌ | ❌ | ❌ |
| **Payment** | `payment:read` | View transaction ledgers & proofs | ✅ | ✅ | ✅ | ✅ *(own)* |
| **Payment** | `payment:record` | Record manual offline payments | ✅ | ✅ | ❌ | ❌ |
| **Payment** | `payment:verify` | Verify & approve offline payments | ✅ | ✅ | ❌ | ❌ |
| **Payment** | `payment:refund` | Approve and process refunds | ✅ | ❌ | ❌ | ❌ |
| **Payment** | `payment:pay` | Pay installments via Stripe | ✅ | ❌ | ❌ | ✅ |
| **Invoice** | `invoice:read` | View & download PDF invoices | ✅ | ✅ | ✅ | ✅ *(own)* |
| **Invoice** | `invoice:generate` | Generate branded PDF invoices | ✅ | ✅ | ❌ | ❌ |
| **Receipt** | `receipt:read` | View & download payment receipts | ✅ | ✅ | ✅ | ✅ *(own)* |
| **Receipt** | `receipt:generate` | Issue official payment receipts | ✅ | ✅ | ❌ | ❌ |
| **Report** | `report:view` | View management dashboard metrics | ✅ | ✅ | ❌ | ❌ |
| **Report** | `report:export` | Export financial reports to CSV/PDF | ✅ | ✅ | ❌ | ❌ |
| **Note** | `note:read` | View client-visible notes | ✅ | ✅ | ✅ | ✅ |
| **Note** | `note:create` | Create case notes | ✅ | ✅ | ✅ | ❌ |
| **Note** | `note:read-internal` | View confidential internal staff notes | ✅ | ✅ | ✅ | ❌ |

---

### Section 4: Client Profile
- **Identity & Contact Data:**
  - Automatically generated unique Client ID (e.g., `ASK-2026-0001`).
  - Full legal name and preferred name.
  - Email address, phone number, WhatsApp number, physical address, country of origin/residence.
  - Preferred language and explicit communication consent records.
- **Service & Case Details:**
  - Service or case category (e.g., EB-2 NIW, EB-1A, Consultation).
  - Assigned consultant / case manager.
  - Agreement execution date, service start date, case status, and financial payment status.
- **Document & History Association:**
  - Uploaded retainer/service agreements, invoices, receipts, and proof of payment uploads.
  - Internal staff notes (strictly hidden from client) vs. client-visible notes.
  - Complete chronological activity timeline.
- **Duplicate Prevention:**
  - Automatic duplicate detection based on email address, phone/WhatsApp number, and matching legal names.
- **Data Minimization Rule:**
  - The payment MVP must **not** collect unnecessary immigration documents or sensitive identity data (e.g., SSN, passport originals) unless required for billing identification.

---

### Section 5: Services and Fee Separation
Administrators can configure catalog services including EB-2 NIW, EB-1A, EB-3, E-2, L-1, Family Immigration Support, Visa Application Assistance, Business Formation, Consultation, DMV/PSB Services, and Custom Services.

- **Strict Accounting Separation:**
  - AdSkill professional fees must be recorded and displayed separately from:
    - Attorney fees
    - USCIS or government filing fees
    - Business plan writing fees
    - Credential evaluations
    - Certified translations
    - CPA / corporate licensing fees
    - Other third-party expenses
- **Adjustments & Deductions:**
  - Record discounts, refunds, write-offs, and applicable taxes as separate line items with required justification.
- **Revenue Recognition:**
  - Government and third-party pass-through fees must **not** automatically count as AdSkill earned revenue.

---

### Section 6: Payment Plan Creation
- **Data Capture:**
  - Original base service price.
  - Applied discount amount and mandatory discount reason.
  - Final contracted fee and required deposit amount.
  - Installment breakdown: count, individual installment amounts, due dates, grace period (days), late-payment policy, and agreed payment method.
- **Schedule Types:**
  - Fixed schedule (e.g., deposit + 3 equal monthly payments).
  - Recurring schedule (e.g., monthly retainer until completion).
  - Fully custom schedule (milestone-based payments tied to case events or customized dates).
- **Validation Rules:**
  - Mathematical integrity check: $\sum \text{Installments} + \text{Deposit} == \text{Contracted Fee}$. The system must reject any schedule where the sum does not match.
- **Amendments & Versioning:**
  - Allow authorized staff to amend payment plans.
  - Preserve the original plan and all historical revisions in the immutable audit log.
  - Require explicit confirmation dialog before committing material financial adjustments.

---

### Section 7: Payment Records and Statuses
- **Record Schema:**
  - Payment ID (unique identifier).
  - Client ID & name.
  - Invoice number association.
  - Amount paid, currency, payment date, system recorded date.
  - Payment method (Cash, Check, ACH, Card, Zelle, Wire transfer).
  - External transaction reference / Stripe payment intent ID.
  - Applicable installment ID (or split allocation).
  - Verifying staff member ID (for offline payments).
  - Payment proof attachment (slip, screenshot, bank transfer receipt).
  - Transaction status and operational notes.
- **Complex Payment Scenarios:**
  - Partial payments (updates installment balance and recalculates remaining owed).
  - Early payments (credited forward).
  - Overpayments (held as client account credit or allocated to next milestone).
  - Single bulk payment applied across multiple upcoming installments.
  - Reversals, failed payments, credit card disputes, and approved refunds.
- **Comprehensive Status Lifecycle:**
  - `Draft`: Initial schedule item created but not published.
  - `Scheduled`: In the future, not yet active.
  - `Upcoming`: Due within the reminder horizon (e.g., 7 days).
  - `Due Today`: Milestone due on current calendar day.
  - `Partially Paid`: Received payment less than milestone amount.
  - `Paid`: Fully satisfied and verified.
  - `Overdue`: Past due date + grace period with outstanding balance.
  - `Waived`: Legally forgiven or written off by authorized admin.
  - `Refunded`: Funds returned to client.
  - `Disputed`: Flagged by card processor or bank chargeback.
  - `Cancelled`: Plan or installment terminated.
- **Immutability Principle:**
  - **Never permanently delete a financial transaction.** Corrections must be executed exclusively via void, reversal, refund, or adjustment entries accompanied by a mandatory reason.

---

### Section 8: Financial Calculation Rules
- **Deterministic Core:**
  - All balances, calculations, and ledgers must be computed by **deterministic accounting code**, NEVER generative AI or LLM approximations.
- **Calculated Values:**
  - Total Contracted Fee.
  - Total Paid to Date.
  - Total Remaining Balance.
  - Overdue Amount & Days Overdue.
  - Next Due Payment Amount & Next Due Date.
  - Discounts applied, Refunds processed, Third-party pass-through fees.
  - Net Collected AdSkill Revenue vs. Outstanding Accounts Receivable.
- **Numeric Precision:**
  - Amounts must be stored as fixed decimals or integer cents (e.g., `$1,500.00` stored as `150000` cents).
  - **Floating-point arithmetic (`0.1 + 0.2 != 0.3`) is strictly prohibited** for monetary calculations.
- **Currency Rules:**
  - Base currency is USD.
  - Architecture must support multi-currency fields.
  - Currencies must never be combined or summed without an explicit exchange rate and conversion timestamp.
- **Idempotency:**
  - Implement idempotent payment submission and webhook processing keys to prevent double-charging or duplicate ledger credits.

---

### Section 9: Management Dashboard and Reports
- **Executive KPI Cards:**
  - Total Active Clients.
  - Total Contracted Fees.
  - Total Collected Revenue.
  - Total Outstanding Receivables.
  - Total Overdue Receivables.
  - Payments Due Today.
  - Payments Due in Next 7 Days.
  - Payments Due in Next 30 Days.
  - Recent Receipts Count & Value.
  - Failed / Disputed Payments Count.
  - Accounts Missing Schedules (flagged for immediate attention).
- **Visual Analytics:**
  - Revenue breakdown by immigration/consulting service category.
  - Revenue generated by case manager / consultant.
  - Monthly collection performance trend (Target vs. Actual).
- **Dynamic Filters:**
  - Filter by date range, service category, staff member, payment status, client country, payment method, and currency.
  - Export financial reports to CSV, Excel (`.xlsx`), and formatted PDF.

---

### Section 10: Client Dashboard
- **Instant Clarity View:**
  - Enrolled service name and case code.
  - Total professional fee agreed.
  - Total amount paid to date.
  - Total remaining balance.
  - Next payment amount and upcoming due date.
  - Current account standing badge.
- **Detailed Milestone Ledger:**
  - Complete chronological schedule with milestone name, amount, due date, status, and receipt link.
- **Actions:**
  - Secure "Pay Now" button triggering Stripe Checkout / hosted payment portal.
  - One-click PDF download for past invoices and receipts.
  - Support contact button for billing inquiries.
- **Legal Notice:**
  - Explicit reminder note that AdSkill fees cover consulting services and exclude third-party/government fees unless specified in the written agreement.

---

### Section 11: Invoices and Receipts
- **Branded PDF Generation:**
  - Dynamic PDF generation with AdSkill legal entity name, corporate logo, office address, and contact information.
  - Sequential, unique numbering policy (e.g., `INV-2026-00142`, `REC-2026-00089`).
  - Client full name, client ID, service description, fee breakdown (professional fee vs. pass-through fees).
  - Payment date, payment method, transaction reference, amount paid, remaining balance, next due date, and legal disclaimer.
- **Verification Rule:**
  - A receipt is marked `Paid` **only** after automated payment-processor confirmation (Stripe webhook) or verified manual approval by authorized Finance staff.
- **Regeneration Integrity:**
  - System allows authorized staff to re-download or regenerate PDF copies at any time without mutating original ledger timestamps or values.

---

### Section 12: Notifications
- **Communication Channels:**
  - Phase 1 (MVP): Transactional Email.
  - Phase 2: SMS and WhatsApp Business integration (once core email workflow is stabilized).
- **Automated Milestone Schedule:**
  - **7 days before due date:** Friendly reminder of upcoming installment.
  - **3 days before due date:** Second upcoming reminder.
  - **Due date:** Notification of payment due today with direct payment link.
  - **3 days overdue:** First overdue reminder.
  - **7 days overdue:** Urgent overdue notice.
  - **14 days overdue:** Final demand notice and notification of case hold.
- **Controls & Logic:**
  - Per-client reminder toggle (can disable automated messages for special arrangements).
  - Immediate automated halt: Reminders must instantly stop once payment is recorded or verified.
  - Support manual on-demand reminder dispatch by Finance staff.
  - Audit log of every outbound message sent (recipient, timestamp, template used, delivery status).
  - Security rule: Never include full credit card details, bank credentials, or excessive private case documents in email/SMS notifications; direct the client to log in to the secure portal.

---

### Section 13: Payment Processing
- **Gateway Provider:**
  - AdSkill company-controlled Stripe account.
  - Implementation via Stripe Checkout, Payment Links, or Stripe Elements (PCI-DSS compliant hosted flow).
- **Zero Card Storage:**
  - Full card numbers, CVV codes, and online banking passwords must **never** touch or be stored on AdSkill application servers or databases.
- **Webhook Security:**
  - Enforce cryptographic webhook signature verification (`stripe-signature`).
  - Idempotent event processing to ignore duplicate webhook deliveries.
  - Automatically handle events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `charge.dispute.created`.
- **Manual Payment Workflow:**
  - Cash, check, Zelle, bank wire entries remain in `Pending Verification` status until approved by authorized Finance staff.

---

### Section 14: AI Functions and Boundaries (Strict Guardrails)
To maintain financial compliance, legal safety, and ethical AI deployment, AI features operate under strict guardrails:

| Permitted AI Functions (Allowed) | Prohibited AI Actions (STRICTLY FORBIDDEN) |
| :--- | :--- |
| ✅ Plain-language explanations of payment schedules for clients | ❌ **NEVER invent clients, dates, balances, fees, or transactions** |
| ✅ Drafting personalized reminder emails from approved templates | ❌ **NEVER autonomously alter fees, balances, schedules, or payments** |
| ✅ Natural language search over verified financial database records | ❌ **NEVER modify user roles, permissions, or security settings** |
| ✅ Translating approved templates into client's preferred language | ❌ **NEVER provide legal advice or predict immigration case outcomes** |
| ✅ Summarizing overdue accounts and generating staff follow-up briefs | ❌ **NEVER execute external calls without human review unless locked** |
| ✅ Anomaly detection (flagging irregular duplicate or missing schedules) | ❌ **NEVER send unvetted outbound messages to clients autonomously** |

- **Verification Requirement:** AI must retrieve facts exclusively from the database and must cite the internal record ID in its output.
- **Privacy Rule:** Client data may only be sent to an enterprise AI model endpoint operating under strict zero-data-retention and approved data processing terms.

---

### Section 15: Security and Confidentiality
- **Authentication & Sessions:**
  - Mandatory Multi-Factor Authentication (MFA / TOTP) for all internal staff accounts.
  - Industry-standard secure password hashing (Argon2id or bcrypt with appropriate cost factor).
  - Secure token-based sessions with short-lived access tokens and sliding refresh tokens.
  - Automatic session timeout on inactivity; aggressive rate limiting on login attempts to mitigate brute force.
- **Data Protection:**
  - Encryption in transit (TLS 1.3 forced across all endpoints).
  - Encryption at rest for database records and file storage (AES-256).
  - All API keys, secrets, and database credentials stored exclusively in environment variables outside version control.
- **Input Validation & Uploads:**
  - Strict input validation via Zod / schema serializers.
  - File upload restrictions: Whitelist MIME types (PDF, PNG, JPG), enforce file size limits, scan attachments, and store files in private S3/object buckets with signed URLs.
- **Multi-Tenant / Client Isolation:**
  - **Critical Rule:** A client must **never** be able to view another client's account, records, or files by manipulating URL parameters or API payloads (enforce row-level security / strict authorization middleware).
- **Backups & Disaster Recovery:**
  - Daily automated encrypted database backups with regular restoration drill testing.
  - Immediate revoking of credentials when an employee departs.

---

### Section 16: Privacy Controls
- Display clear Privacy Notice, Terms of Use, Payment Authorization terms, and Communication Consent check.
- Support data subject rights: Authorized data correction, export, and account deactivation workflows.
- Restrict employee access by role and assigned responsibility.
- Data minimization: Never log credentials, payment cards, or sensitive identity numbers in server logs.

---

### Section 17: Audit Log
- **Scope of Logging:**
  - Creation, editing, or deletion of clients, payment plans, installments, manual payments, discounts, refunds, invoices, receipts, and permissions.
  - Login successes, failed login attempts, password changes, and sensitive report exports.
- **Log Schema:**
  - `id`: Unique event ID.
  - `actor_id` & `actor_email`: Identity of user performing action.
  - `action`: Action verb (`CREATE_PLAN`, `RECORD_PAYMENT`, `ISSUE_REFUND`, etc.).
  - `target_entity`: Table and record ID modified.
  - `prior_value`: JSON snapshot of data before change.
  - `new_value`: JSON snapshot of data after change.
  - `reason`: Mandatory written justification (especially for financial modifications).
  - `ip_address` & `user_agent`: Client network details.
  - `timestamp`: UTC ISO-8601 timestamp.
- **Immutability:**
  - Audit logs are append-only. No user—including Super Admin—has the ability to edit or delete audit history.

---

### Section 18: Search, Design, and Accessibility
- **Search Capabilities:**
  - Global omni-search across Client Name, Client ID, Email, Phone Number, Service, Invoice Number, Receipt Number, Transaction Reference, Status, and Consultant.
- **Design System & Aesthetics:**
  - AdSkill corporate branding with high-contrast, modern UI typography.
  - Fully responsive across mobile smartphones, tablets, and desktop displays.
  - Keyboard accessible controls, ARIA landmarking, accessible color contrast ratios (WCAG AA).
- **Localization (i18n):**
  - Explicit date formats (e.g., `September 15, 2026`) and unambiguous currency indicators (`$ USD`).
  - Architecture ready for internationalization: English (default), Bangla, Portuguese, Spanish.

---

### Section 19: Suggested Technical Architecture
- **Frontend:** Next.js (App Router) / React / TypeScript / Tailwind CSS / Lucide Icons.
- **Backend:** Node.js (NestJS or Express) OR Python (Django REST / FastAPI).
- **Database:** PostgreSQL with relational integrity constraints and decimal types for currency.
  - **Universal Soft-Delete Policy:** Every table in the system must implement soft deletion with `isDeleted Boolean @default(false)` and `deletedAt DateTime?`. Hard physical deletion of database records is strictly prohibited across all tables.
- **File Storage:** Private encrypted S3-compatible object storage with time-limited pre-signed download URLs.
- **Authentication:** Mature auth engine (NextAuth / Supabase Auth / Auth0 / custom JWT with Argon2id + MFA).
- **Payment Processing:** Stripe Hosted Checkout, Payment Links, and Stripe Webhooks.
- **Email Delivery:** Resend / SendGrid / AWS SES with SPF, DKIM, and DMARC verification.
- **AI Layer:** Server-side proxy calls only to secure LLM endpoints with permission-filtered context; no direct client API key exposure.

---

### Section 20: MVP Deliverables
1. Staff authentication system with MFA and role-based permissions (Super Admin, Manager, Consultant, Client; all self-registrations default to Client, upgraded by Super Admin).
2. Client profile management with duplicate detection.
3. Service catalog and fee separation logic (AdSkill fee vs. third-party pass-through).
4. Payment plan creation engine (fixed, recurring, custom) with mathematical sum validation.
5. Manual payment recording and verification workflow.
6. Stripe-hosted checkout and automated webhook reconciliation.
7. Deterministic financial calculation engine (balances, overdue tracking, aging).
8. Automated and manual email reminder notifications.
9. Dynamic branded PDF invoice and receipt generation.
10. Dedicated Management Dashboard & dedicated Client Portal Dashboard.
11. Search, filtering, and CSV/Excel export tools.
12. Comprehensive immutable audit logging and daily encrypted backups.

---

### Section 21: Future Phases
- **Phase 2 (CRM Expansion):** Case-stage tracking, document checklists, appointment scheduling, internal task manager, intake forms, e-signatures, and attorney collaboration tools.
- **Phase 3 (Enterprise Integrations):** QuickBooks Online / Xero accounting sync, WhatsApp Business API messaging, SMS reminders (Twilio), multi-branch/office support, and DMV/PSB transaction workflows.

---

### Section 22: Required Testing
- **Financial Calculation Tests:** Unit tests for installment sum validation, partial payments, overpayments, discounts, refunds, currency decimal calculations, and duplicate webhook idempotency.
- **Security & Authorization Tests:** Cross-tenant isolation tests (ensuring Client A cannot read Client B's data via URL or ID tampering), RBAC permission tests, password hashing, and MFA verification.
- **Integration Tests:** Stripe webhook end-to-end lifecycle, email delivery simulation, and PDF generation rendering tests.
- **Environment Rule:** Test data only in non-production environments. Never copy real client PII or production credentials into development environments.

---

### Section 23: Production Acceptance Criteria
- [ ] Staff can create a client and an error-free, mathematically verified payment schedule.
- [ ] Paid, overdue, and remaining amounts compute deterministically and update accurately upon partial payments or refunds.
- [ ] Clients can log in and view strictly their own data, payment links, invoices, and receipts.
- [ ] Online Stripe transactions and verified manual payments update client balances once and only once.
- [ ] Invoices and receipts generate with distinct sequential numbers, accurate line items, and company branding.
- [ ] Email notifications trigger according to the defined schedule and stop immediately upon full payment.
- [ ] Every financial modification creates an auditable record with prior/new values and user attribution.
- [ ] Backups complete and restore successfully in staging without data corruption.

---

### Section 24: Handover Requirements
- Complete source code in private AdSkill Git repository with clear README and deployment scripts.
- Architecture diagrams, database schemas, and API documentation.
- Administrator guide, staff user manuals, and client portal onboarding guides.
- Credential ownership handover: Domain DNS, hosting accounts, Stripe dashboard, transactional email, and cloud storage registered to company-owned accounts.
- Written warranty period, bug-fix agreement, and ongoing maintenance terms.
- Formal IP assignment confirming AdSkill's 100% ownership of custom software and assets.

---

### Section 25: Development Process
1. **Stage 1:** Specification, wireframe alignment, and database schema approval.
2. **Stage 2:** Database models, migrations, and RBAC authentication layer.
3. **Stage 3:** Staff & Finance Portal (client management, payment plan builder, manual payment entry).
4. **Stage 4:** Client Portal (dashboard, schedule view, invoice/receipt downloads).
5. **Stage 5:** Stripe payment gateway integration, webhooks, and automated email notifications.
6. **Stage 6:** AI assistant layer with strict retrieval boundaries and guardrails.
7. **Stage 7:** End-to-end integration testing, security audit, and staging deployment.
8. **Stage 8:** Production launch, monitoring, and handover.

---

### Section 26: Contract and Governance
Before initiating production development, formal agreements must specify:
- Scope boundaries, milestone deliverables, payment schedules, and change order protocols.
- Non-disclosure and data privacy compliance.
- Third-party service inventory and estimated recurring operational costs.
- Incident reporting protocols, warranty terms, and post-launch support commitments.

---

# 3. Execution Roadmap: What To Do Next

Here is the exact step-by-step roadmap to implement this specification into our codebase:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             STEP-BY-STEP ROADMAP                                 │
└──────────────────────────────────────────────────────────────────────────────────┘
  PHASE 1: RBAC & AUTHENTICATION
  ├── Enforce 4 discrete roles: Super Admin, Finance/Manager, Consultant, Client
  ├── Protect routes & navigation by role (hide staff tools from clients)
  └── Implement Multi-Factor Authentication (MFA) flow for staff

  PHASE 2: DETERMINISTIC ACCOUNTING ENGINE
  ├── Core decimal/cents arithmetic utility (no floating point calculations)
  ├── Strict validation: Sum(Installments) == Contracted Fee
  └── Status transitions: Draft → Scheduled → Upcoming → Due Today → Paid/Overdue

  PHASE 3: STAFF FINANCIAL WORKFLOWS
  ├── Payment Plan Builder (Fixed, Recurring, Custom milestone schedules)
  ├── Fee Separation (AdSkill consulting fee vs. Attorney & Government filing fees)
  ├── Manual Payment Ledger (Pending → Verified status with receipt upload)
  └── Refund / Reversal / Adjustment modal requiring mandatory written reason

  PHASE 4: CLIENT PORTAL EXPERIENCE
  ├── Dedicated client dashboard displaying current standing & next due date
  ├── Itemized installment milestone view
  ├── Stripe Checkout / Payment Link trigger button
  └── One-click PDF invoice & receipt downloader

  PHASE 5: AUTOMATED NOTIFICATIONS & AUDIT TRAIL
  ├── Trigger emails at -7d, -3d, Due Date, +3d, +7d, +14d
  ├── Automatic reminder halting upon verified payment
  └── Immutable audit log capturing actor, timestamp, IP, old value, and new value

  PHASE 6: AI BOUNDARY & ASSISTANT LAYER
  ├── Permission-aware search across client payment records
  ├── Plain-language payment schedule explainer for clients
  └── Hardcoded guardrails: Block autonomous balance changes, hallucinated data, or legal advice
```

---
*End of Master Development Specification.*
