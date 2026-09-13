# Project Knowledge & AI Architecture Playbook - AdSkill PayTrack AI Backend

> **ROLE & ARCHITECTURAL MINDSET:**
> Act as a **Staff / Senior Backend Engineer & System Architect with 10+ years of enterprise experience**.
> When writing, extending, or maintaining code in this repository, use this playbook as your single source of truth. Build clean, modular, scalable, and production-ready code that adheres to strict financial integrity, deterministic math, and least-privilege security. Any AI or developer reading this file can understand and extend the entire backend without needing to re-scan every source file.

---

## 1. Project Overview & Tech Stack

- **Product Working Title**: **AdSkill PayTrack AI**
- **Repository / Package Name**: `adskill-paytrack-backend`
- **Application Purpose**: Secure payment tracking, installment schedules, client management, invoices/receipts, notifications, and audit logging for AdSkill Consultancy Inc.
- **Runtime**: **Node.js (LTS v20+ / v24)**
- **Language**: **TypeScript 5.7+** (Strict mode enabled, zero implicit `any`)
- **Web Framework**: **Express.js 4.21+**
- **Database**: **PostgreSQL 16+**
- **ORM & Migrations**: **Prisma ORM 5.22+**
- **Validation**: **Zod 3.24+** (Runtime schema validation for body, query, params)
- **Authentication**: **JWT (`jsonwebtoken`) + HTTP Cookies / Bearer Tokens** + **`bcryptjs`**
- **Documentation**: **Swagger UI / OpenAPI 3.0** (`swagger-ui-express` mounted at `/api/v1/docs`)
- **API Base Route**: `/api/v1`

---

## 2. Directory Architecture & Responsibilities

```
AdSkill PayTrack AI Backend/
├── prisma/
│   ├── schema.prisma              # Database schema (Datasource, Enums, Models, Relations)
│   └── migrations/                # Version-controlled Prisma database migration files
│
├── src/
│   ├── app.ts                     # Express app setup, CORS, parsers, global middlewares, Swagger & root route
│   ├── server.ts                  # HTTP server bootstrapper, port listener, graceful shutdown & uncaught error traps
│   │
│   ├── config/
│   │   └── index.ts               # Centralized typed environment variables loaded from .env
│   │
│   ├── docs/
│   │   └── swagger.ts             # Complete OpenAPI 3.0 JSON specification for Swagger UI
│   │
│   ├── errors/                    # Operational error classes & specialized error formatters
│   │   ├── AppError.ts            # Custom operational error class extending Error (statusCode, message)
│   │   ├── handleZodError.ts      # Formats Zod validation issues into standardized errorSources
│   │   ├── handlePrismaError.ts   # Maps Prisma Client known request codes (P2002, P2003, P2025)
│   │   └── handleJWTError.ts      # Catches TokenExpiredError & JsonWebTokenError (401 Unauthorized)
│   │
│   ├── interface/                 # Global TypeScript types & namespace extensions
│   │   ├── error.ts               # TErrorSource & TGenericErrorResponse contracts
│   │   └── index.d.ts             # Express.Request augmentation (declares req.user: TAuthUser)
│   │
│   ├── lib/                       # Third-party client singletons & wrappers
│   │   └── prisma.ts              # Global PrismaClient singleton (prevents connection leaks during dev reload)
│   │
│   ├── middlewares/               # Express middleware chain
│   │   ├── auth.ts                # JWT authentication, Bearer parsing, active-status checks, and RBAC
│   │   ├── globalErrorHandler.ts  # Master error interceptor; sanitizes production outputs
│   │   ├── notFound.ts            # 404 handler for undefined API routes
│   │   └── validateRequest.ts     # Zod schema validation middleware for body, query, params
│   │
│   ├── modules/                   # Domain-Driven Feature Modules (Clean Modular Architecture)
│   │   ├── Health/                # Health check & system uptime endpoint
│   │   │   ├── health.controller.ts
│   │   │   └── health.route.ts
│   │   │
│   │   ├── User/                  # Staff & user account management
│   │   │   ├── user.interface.ts  # Filter interfaces, create/update payloads
│   │   │   ├── user.constant.ts   # Searchable & filterable field lists
│   │   │   ├── user.validation.ts # Zod schemas (createUser, updateUser)
│   │   │   ├── user.service.ts    # Business logic, bcrypt hashing, safe user selects
│   │   │   ├── user.controller.ts # Route handler calling service and sendResponse
│   │   │   └── user.route.ts      # Route declarations with validateRequest and auth
│   │   │
│   │   ├── Auth/                  # Authentication, JWT lifecycle, register, login, refresh, getMe
│   │   │   ├── auth.interface.ts
│   │   │   ├── auth.validation.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.controller.ts
│   │   │   └── auth.route.ts
│   │   │
│   │   ├── Role/                  # PBAC Dynamic Role & Granular Permission Management
│   │   │   ├── role.interface.ts
│   │   │   ├── role.validation.ts
│   │   │   ├── role.service.ts
│   │   │   ├── role.controller.ts
│   │   │   └── role.route.ts
│   │   ├── Service/               # Services catalog, fee categories, and pass-through fee separation (Section 5)
│   │   │   ├── service.interface.ts
│   │   │   ├── service.constant.ts
│   │   │   ├── service.validation.ts
│   │   │   ├── service.service.ts
│   │   │   ├── service.controller.ts
│   │   │   └── service.route.ts
│   │   │
│   │   ├── Client/                # [Upcoming] Client profile, agreement, assigned consultant
│   │   ├── PaymentPlan/           # [Upcoming] Payment plans, installments, schedule math (Section 6)
│   │   ├── Payment/               # [Upcoming] Transactions, Stripe webhooks, receipts (Section 7, 13)
│   │   ├── Invoice/               # [Upcoming] Branded PDF invoices, numbering policy (Section 11)
│   │   ├── Notification/          # [Upcoming] Scheduled reminders (7d, 3d, due date, overdue) (Section 12)
│   │   ├── AuditLog/              # [Upcoming] Immutable audit trail for all financial actions (Section 17)
│   │   └── AI/                    # [Upcoming] Read-only, permission-aware assistant queries (Section 14)
│   │
│   ├── routes/
│   │   └── index.ts               # Master router aggregating all module routers under /api/v1
│   │
│   └── shared/                    # Reusable cross-cutting utilities
│       ├── catchAsync.ts          # Higher-order function wrapping async controllers to route errors to next()
│       ├── sendResponse.ts        # Standardized JSON success response envelope
│       ├── paginationHelper.ts    # Reusable pagination math & meta generator with safety caps (DoS protection)
│       └── filterHelper.ts        # Reusable Prisma text search, date range & safe sort order builders
│
├── .env                           # Local environment secrets (ignored by Git)
├── .env.example                   # Environment configuration template for team members
├── .gitignore                     # Git ignore rules
├── package.json                   # Dependencies, scripts, project metadata
└── tsconfig.json                  # TypeScript compiler settings
```

---

## 3. The Modular Architecture Pattern (Apollo-Level 2 Standard)

Every feature module in `src/modules/<ModuleName>/` adheres strictly to this 6-file structure:

```
src/modules/<ModuleName>/
├── <module>.interface.ts   # Type definitions (payloads, filters, query parameters)
├── <module>.constant.ts    # Module constants (searchable fields, filterable fields, enums)
├── <module>.validation.ts  # Zod validation schemas for incoming HTTP requests
├── <module>.service.ts     # Business logic, Prisma queries, data transformation, password hashing
├── <module>.controller.ts # Express handlers: parses inputs, calls service, wraps in catchAsync & sendResponse
└── <module>.route.ts      # Express Router: binds URL path, auth() middleware, validateRequest(), and controller
```

### Data Flow Lifecycle:
1. **HTTP Request** arrives at `/api/v1/<module>`.
2. **`auth(...roles)`** verifies the JWT `Bearer <token>`, checks user active status, and enforces RBAC.
3. **`validateRequest(schema)`** validates `req.body`, `req.query`, and `req.params` against the Zod schema.
4. **`<module>.controller.ts`** extracts sanitized parameters and passes them to `<module>.service.ts`.
5. **`<module>.service.ts`** executes business logic, interacts with PostgreSQL via `prisma`, and computes deterministic values.
6. **`sendResponse(res, { statusCode, success, message, data, meta })`** returns a normalized JSON response.
7. If any error throws, **`catchAsync`** catches it and forwards it directly to **`globalErrorHandler`**.

---

## 4. Standard Response Envelope (`sendResponse`)

All successful API responses **MUST** use `sendResponse()` from `src/shared/sendResponse.ts`. Never use ad-hoc `res.json()` in controllers.

### Standard Success Contract:
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPage": 5
  },
  "data": [ ... ]
}
```

### Usage in Controllers:
```ts
sendResponse(res, {
  statusCode: httpStatus.OK,
  success: true,
  message: 'User retrieved successfully',
  data: result,
});
```

---

## 4.1 Mandatory Pagination & Filter Engine (`paginationHelper` & `filterHelper`)

> **CRITICAL ARCHITECTURAL RULE:**  
> Any endpoint or service that fetches lists of records (Users, Clients, Services, Payments, Invoices, Audit Logs, etc.) **MUST STRICTLY** use the shared `paginationHelper.ts` and `filterHelper.ts`.  
> Handcrafting ad-hoc `skip`/`take` math, manual query concatenations, or unvalidated sort fields in service files is **STRICTLY FORBIDDEN**.

### 1. `paginationHelper.ts` (`src/shared/paginationHelper.ts`)
- **`calculatePagination(options)`**:
  - `page`: default `1`, minimum `1` (`Math.max(1, ...)`).
  - `limit`: default `20`, capped between `1` and `100` (`Math.max(1, Math.min(100, ...))`) to safeguard against denial-of-service (DoS) memory overload.
  - `skip`: deterministically calculated as `(page - 1) * limit`.
  - Returns `{ page, limit, skip }`.
- **`buildPaginationMeta(page, limit, total)`**:
  - Automatically calculates `totalPage = Math.ceil(total / limit) || 1`.
  - Returns `{ page, limit, total, totalPage }` matching the standard `meta` response specification.

### 2. `filterHelper.ts` (`src/shared/filterHelper.ts`)
- **`buildSearchFilter(searchTerm, searchableFields)`**:
  - Generates Prisma `{ OR: [{ [field]: { contains: term, mode: "insensitive" } }] }`.
  - Returns `undefined` if `searchTerm` is empty, avoiding empty Prisma `OR` clauses.
- **`buildDateRangeFilter(fieldName, startDate, endDate)`**:
  - Generates `{ [fieldName]: { gte?: Date, lte?: Date } }`.
  - Automatically handles `YYYY-MM-DD` end-of-day extension (`23:59:59.999`) for accurate day-inclusive queries.
- **`buildSortOrder(options, allowedSortFields, defaultSortBy, defaultOrder)`**:
  - Validates `sortBy` against an allowed whitelist array (e.g. `userSortableFields`).
  - Falls back to `defaultSortBy` (default `"createdAt"`) and `defaultOrder` (default `"desc"`) to prevent SQL injection or invalid column runtime crashes.
- **`buildExactFilters(filters, excludeKeys)`**:
  - Generates exact match Prisma clauses for categorical fields (e.g. `status`, `country`, `roleId`).

### 3. Canonical Controller Implementation Standard:
```ts
const getAllItems = catchAsync(async (req: Request, res: Response) => {
  // 1. Extract filter parameters
  const filters = Object.fromEntries(
    Object.entries(req.query).filter(([key]) =>
      itemFilterableFields.includes(key),
    ),
  );

  // 2. Extract pagination parameters
  const paginationOptions = {
    page: req.query.page as string | undefined,
    limit: req.query.limit as string | undefined,
  };

  // 3. Extract sorting parameters
  const sortOptions = {
    sortBy: req.query.sortBy as string | undefined,
    sortOrder: req.query.sortOrder as string | undefined,
  };

  // 4. Call service
  const result = await ItemService.getAllItems(filters, paginationOptions, sortOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Items retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});
```

### 4. Canonical Service Implementation Standard:
```ts
const getAllItems = async (
  filters: TItemFilterRequest,
  paginationOptions?: IPaginationOptions,
  sortOptions?: ISortOptions,
) => {
  // 1. Calculate pagination & sorting via helpers
  const { page, limit, skip } = calculatePagination(paginationOptions);
  const orderBy = buildSortOrder(sortOptions, itemSortableFields, "createdAt", "desc");

  // 2. Build where conditions
  const { searchTerm, startDate, endDate, ...filterData } = filters;
  const andConditions: Prisma.ItemWhereInput[] = [];

  // Exclude soft-deleted by default
  andConditions.push({ isDeleted: false });

  // Reusable multi-field search
  const searchCondition = buildSearchFilter(searchTerm, itemSearchableFields);
  if (searchCondition) andConditions.push(searchCondition);

  // Reusable date range filter
  const dateRange = buildDateRangeFilter("createdAt", startDate, endDate);
  if (dateRange) andConditions.push(dateRange);

  // Exact matches
  if (Object.keys(filterData).length > 0) {
    andConditions.push(...buildExactFilters(filterData));
  }

  const whereConditions: Prisma.ItemWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  // 3. Parallel execute query & count
  const [items, total] = await Promise.all([
    prisma.item.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
    }),
    prisma.item.count({ where: whereConditions }),
  ]);

  // 4. Return meta & data
  return {
    meta: buildPaginationMeta(page, limit, total),
    data: items,
  };
};
```

---

## 5. Global Error Handling Strategy (`globalErrorHandler`)

All errors in the application are intercepted by `src/middlewares/globalErrorHandler.ts` and returned in a unified format.

### Standard Error Contract:
```json
{
  "success": false,
  "message": "Validation Error",
  "errorSources": [
    {
      "path": "email",
      "message": "Invalid email address format"
    }
  ],
  "stack": "Error: ... (Only visible in NODE_ENV=development)"
}
```

### Handled Error Categories:

| Error Type | Status Code | Formatter / Handler | Behavior |
| :--- | :--- | :--- | :--- |
| **Zod Validation Error** (`ZodError`) | `400 BAD REQUEST` | `handleZodError.ts` | Maps each issue to `{ path: field, message }`. |
| **Prisma Unique Key Violation** (`P2002`) | `409 CONFLICT` | `handlePrismaError.ts` | Identifies duplicate field (e.g., `email already exists`). |
| **Prisma Foreign Key Failed** (`P2003`) | `400 BAD REQUEST` | `handlePrismaError.ts` | Reports invalid foreign key reference. |
| **Prisma Record Not Found** (`P2025`) | `404 NOT FOUND` | `handlePrismaError.ts` | Returns "The requested record does not exist". |
| **Prisma Schema Mismatch** | `400 BAD REQUEST` | Direct mapping | Database validation error. |
| **Prisma Connection Lost** | `503 SERVICE UNAVAILABLE` | Direct mapping | Returns database connection unavailable message. |
| **JWT Expired** (`TokenExpiredError`) | `401 UNAUTHORIZED` | `handleJWTError.ts` | Clean message requesting user to log in again. |
| **JWT Invalid / Tampered** (`JsonWebTokenError`) | `401 UNAUTHORIZED` | `handleJWTError.ts` | Clean token invalid message. |
| **Operational Error** (`AppError`) | `err.statusCode` | Direct mapping | Custom business logic errors thrown deliberately. |
| **Uncaught JavaScript Error** | `500 INTERNAL SERVER ERROR` | Fallback | Generic error message (raw SQL / server paths never leaked in prod). |

---

## 6. Routing & Aggregator Architecture

All modules register their routes in `src/routes/index.ts`:

```ts
import { Router } from 'express';
import { HealthRoutes } from '../modules/Health/health.route';
import { AuthRoutes } from '../modules/Auth/auth.route';
import { UserRoutes } from '../modules/User/user.route';
import { RoleRoutes } from '../modules/Role/role.route';

const router = Router();

const moduleRoutes = [
  { path: '/health', route: HealthRoutes },
  { path: '/auth', route: AuthRoutes },
  { path: '/users', route: UserRoutes },
  { path: '/roles', route: RoleRoutes },
  { path: '/services', route: ServiceRoutes },
  // Upcoming modules:
  // { path: '/clients', route: ClientRoutes },
  // { path: '/payment-plans', route: PaymentPlanRoutes },
  // { path: '/payments', route: PaymentRoutes },
  // { path: '/invoices', route: InvoiceRoutes },
  // { path: '/notifications', route: NotificationRoutes },
  // { path: '/audit-logs', route: AuditLogRoutes },
  // { path: '/ai', route: AIRoutes },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
```

In `src/app.ts`, this router is mounted at:
```ts
app.use('/api/v1', router);
```

---

## 7. Swagger / OpenAPI 3.0 Documentation Standard

Interactive API documentation is powered by **Swagger UI** (`swagger-ui-express`).

- **Access URLs**:
  - `http://localhost:5000/api/v1/docs`
  - `http://localhost:5000/docs`
- **Spec File**: [src/docs/swagger.ts](file:///c:/AdSkill/AI%20Client%20Payment%20Tracker/AdSkill%20PayTrack%20AI%20Backend/src/docs/swagger.ts)

### ⚠️ MANDATORY RULE FOR FUTURE APIS & MODULES:
**Whenever you create or modify any endpoint or module:**
1. Open `src/docs/swagger.ts`.
2. Add or update the endpoint's path under `paths: { ... }`.
3. Specify its tags, summary, security (`bearerAuth`), request body schema, and response schemas.
4. Add any new data models or DTOs under `components.schemas`.
5. This ensures the frontend team and clients always have an up-to-date, live, testable API reference.

---

## 8. Non-Negotiable Financial & Business Rules

Based on the official AdSkill specification (*"AdSkill AI Client Payment Tracker - Complete Development Specification"*):

1. **NO Floating-Point Math for Money (Section 8)**:
   - Store all currency amounts in PostgreSQL as `Decimal(12, 2)` or integer cents.
   - Never use JavaScript `number` arithmetic for financial totals (`0.1 + 0.2 != 0.3`). Use Prisma `Decimal` or `decimal.js`.
2. **Deterministic Accounting (Section 8)**:
   - Balances, overdue amounts, installment totals, and refunds must **ALWAYS** be calculated by deterministic backend accounting logic, **NEVER** by Generative AI.
3. **Never Delete Financial Records (Section 7)**:
   - Financial transactions must never be hard-deleted from the database. Corrections must be handled via adjustments, reversals, refunds, or voids with an audit reason.
4. **Strict Client Data Isolation (Section 15)**:
   - A client must **NEVER** be able to view another client's records. Enforce `req.user.role === 'CLIENT' ? req.user.id === requestedClientId : true` in services.
5. **Fee Separation (Section 5)**:
   - AdSkill professional fees must be stored and tracked separately from attorney fees, USCIS government fees, and 3rd party expenses. Government fees must not count toward AdSkill revenue.
6. **Immutable Audit Logging (Section 17)**:
   - Every financial change (plans, installments, manual payments, refunds, fee waivers) and security modification must create a record in the `AuditLog` table capturing `actorId`, `action`, `entity`, `previousValue`, `newValue`, `reason`, and `ipAddress`.
7. **AI Boundaries (Section 14)**:
   - AI assistant features must be server-only and read-only. AI can summarize or explain schedules, but it must **NEVER** autonomously mutate financial records or invent data.

---

## 9. Step-by-Step Recipe: Adding a New Feature Module

When creating a new module (e.g., `PaymentPlan`):

1. **Update `prisma/schema.prisma`**:
   - Define model(s), relations, and enums.
   - Run `npx prisma migrate dev --name init_payment_plan` and `npx prisma generate`.
2. **Create `src/modules/PaymentPlan/`**:
   - `paymentPlan.interface.ts`: Filter & payload types.
   - `paymentPlan.constant.ts`: Searchable/filterable fields.
   - `paymentPlan.validation.ts`: Zod schemas for create/update.
   - `paymentPlan.service.ts`: Prisma database queries with decimal math.
   - `paymentPlan.controller.ts`: Wrappers with `catchAsync` and `sendResponse`.
   - `paymentPlan.route.ts`: Router with `auth(...)` and `validateRequest(...)`.
3. **Mount in `src/routes/index.ts`**:
   - Add `{ path: '/payment-plans', route: PaymentPlanRoutes }`.
4. **Update Swagger Documentation**:
   - Add paths and schemas to `src/docs/swagger.ts`.
5. **Verify**:
   - Run `npx tsc --noEmit` to guarantee 0 compiler errors.

---

## 10. Useful Development Commands

```bash
# Start development server with live reload
npm run dev

# Compile TypeScript to JavaScript in /dist
npm run build

# Start production build
npm run start

# Generate Prisma Client after schema changes
npm run db:generate

# Run Prisma database migrations
npm run db:migrate

# Open interactive Prisma database GUI
npm run db:studio

# Format codebase with Prettier
npm run prettier
```

---

## 11. Permission-Based Access Control (PBAC) & User-Level Overrides

The platform enforces least-privilege access using **Permission-Based Access Control (PBAC)** with **Individual Capability Overrides**:

### Data Flow & Resolution:
1. **Role Permissions**: Stored in `role_permissions` bridge table (`UserRole` $\leftrightarrow$ `Permission`).
2. **Direct User Overrides**: Stored in `user_permissions` bridge table (`User` $\leftrightarrow$ `Permission`).
3. **Effective Permissions**: Computed dynamically in `auth.ts` middleware and `formatAuthUser`:
   $$\text{Effective Capabilities} = \mathbf{RolePermissions} \cup \mathbf{DirectUserPermissions}$$
4. **Super Admin Bypass**: Users with `SUPER_ADMIN` automatically possess full system access and receive all 22 canonical capabilities.

### Key API Endpoints:
- `GET /api/v1/roles/permissions/all`: Canonical capability matrix grouped by module.
- `GET /api/v1/roles` & `POST /api/v1/roles`: Dynamic role listing and creation.
- `PATCH /api/v1/roles/:id/permissions`: Synchronize permissions assigned to a role.
- `GET /api/v1/users/:id/permissions`: View a user's role permissions, direct overrides, and effective capabilities.
- `PATCH /api/v1/users/:id/permissions`: Grant or revoke direct capability overrides for an individual user account.

### Real-World Example (User-Level Override):
- **Standard Client (Alice)**: Has role `CLIENT`. Effective permissions contain only default client rights (`payment:view_own`, `invoice:view_own`).
- **Special Client (Bob)**: Has role `CLIENT` + direct override `payment:verify` assigned via `PATCH /api/v1/users/:id/permissions`.
- **Result**: Bob can access verification endpoints and see verification navigation in UI; Alice is blocked. No new role needed and other clients remain untouched.


